import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve, relative, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { buildGlossaryRelease } from '../scripts/video-glossary-build.mjs';
import { projectConceptCatalog, databaseReleasePaths, DATABASE_SOURCE_FILES } from '../scripts/database-export.mjs';
import { moduleFiles } from '../scripts/video-package.mjs';
import { runnerModules } from '../scripts/runner-build.mjs';
import { updatePathAllowed } from '../video/program-updates.mjs';
import { publicSource } from '../scripts/video-publish.mjs';
import { botSource } from '../scripts/hosted-bot-publish.mjs';

const root = resolve(import.meta.dirname, '..');
const bytes = readFileSync(join(root, 'glossary/zzz.json'));
const legacy = JSON.parse(bytes), hash = createHash('sha256').update(bytes).digest('hex');
const projected = projectConceptCatalog(legacy, hash);

test('all concepts retain names, aliases, selected outputs, context and classification without editing the source', () => {
  assert.equal(projected.concepts.length, legacy.entries.length);
  for (let index = 0; index < legacy.entries.length; index++) {
    const before = legacy.entries[index], after = projected.concepts[index];
    assert.equal(after.id, before.id);
    assert.equal(after.category, before.category);
    assert.deepEqual(after.names, { ...before.preferred, ...before.localizedNames });
    assert.deepEqual(after.aliases, before.aliases);
    assert.deepEqual(after.communityOutputs, before.communityPreferred || {});
    for (const key of ['meaning', 'rule', 'communityRule']) assert.deepEqual(after.usage[key], before[key]);
    assert.equal(after.context.characterId, before.characterId);
    for (const key of ['characterName', 'relatedSkills']) {
      if (before[key] === undefined) assert.equal(after.context[key], undefined);
      else {
        for (const [language, name] of Object.entries(before[key])) {
          if (name.trim()) assert.equal(after.context[key][language], name);
          else assert(!Object.hasOwn(after.context[key], language));
        }
        assert(Object.values(after.context[key]).every(name => name.trim()));
      }
    }
    for (const key of ['releaseStatus', 'releaseVersion', 'sourceVersion']) assert.deepEqual(after.availability[key], before[key]);
    assert.equal(after.availability.autoUse, before.autoUse !== false);
    assert.deepEqual(after.classification.names, { ...before.classification.names, ...before.classification.localizedNames });
    assert.deepEqual(after.classification.aliases, before.classification.aliases);
    assert.deepEqual(after.classification.communityOutputs, before.classification.communityOutputs || {});
    assert.deepEqual(after.tags, before.tags);
  }
  assert.equal(createHash('sha256').update(readFileSync(join(root, 'glossary/zzz.json'))).digest('hex'), hash);
});

test('export uses an explicit field allowlist and rejects missing classifications', () => {
  const input = structuredClone(legacy); input.entries = [input.entries[0]];
  const entry = input.entries[0];
  for (const key of ['sourceKey', 'sources', 'communityPreferredDrafts', 'reviewNotes', 'futurePrivateField']) entry[key] = 'DO_NOT_EXPORT_THIS';
  entry.classification.futurePrivateField = 'DO_NOT_EXPORT_THIS';
  input.reviewNotes = 'DO_NOT_EXPORT_THIS';
  assert(!JSON.stringify(projectConceptCatalog(input, hash)).includes('DO_NOT_EXPORT_THIS'));
  delete entry.classification.names.ko;
  assert.throws(() => projectConceptCatalog(input, hash), /classification/);
  assert.throws(() => projectConceptCatalog(legacy, '../secret'), /source catalog/);
});

test('public release remains compatible and SDK/example run outside the authoring workspace', async t => {
  const parent = join(root, '.tools'); mkdirSync(parent, { recursive: true });
  const folder = mkdtempSync(join(parent, 'database-export-test-'));
  t.after(() => { assert(!relative(parent, folder).startsWith('..')); rmSync(folder, { recursive: true, force: true }); });
  const release = buildGlossaryRelease(root, folder);
  const originalManifest = {
    schema: 1, version: `${legacy.retrievedAt || 'reviewed'}-${hash.slice(0, 12)}`, sha256: hash,
    bytes: bytes.length, count: legacy.entries.length, file: `releases/${hash}.json`,
    sourceVersion: legacy.sourceVersion || null, languages: legacy.textLanguages || ['ko', 'en', 'ja', 'zh-CN'],
    coverage: legacy.localizationCoverage || null
  };
  assert.deepEqual(release.manifest, originalManifest);
  assert.deepEqual(readFileSync(join(folder, 'catalog/zzz.json')), bytes);
  assert.deepEqual(readFileSync(join(folder, originalManifest.file)), bytes);
  assert.equal(readFileSync(join(folder, 'latest.json'), 'utf8'), `${JSON.stringify(originalManifest, null, 2)}\n`);
  const manifest = release.conceptRelease.manifest;
  const newBytes = readFileSync(join(folder, manifest.file));
  assert.equal(newBytes.length, manifest.bytes);
  assert.equal(createHash('sha256').update(newBytes).digest('hex'), manifest.sha256);
  assert.equal(manifest.sourceSha256, hash);
  assert.deepEqual(newBytes, readFileSync(join(folder, 'catalog/concepts.json')));
  assert.deepEqual(JSON.parse(newBytes), projected);
  assert.deepEqual(readFileSync(join(folder, 'database/match.mjs')), readFileSync(join(root, 'src/glossary-match.js')));
  const { createDatabase } = await import(pathToFileURL(join(folder, 'database/index.mjs')));
  const db = createDatabase(JSON.parse(newBytes));
  assert.equal(db.size, legacy.entries.length);
  const candidates = db.search('Deadly Assault');
  assert(candidates.length > 0);
  assert(candidates.every(concept => !concept.aliases.includes('Assault')));
  assert(db.prompt(candidates, { text: 'Deadly Assault', languages: ['en', 'ko'] }).length > 0);
  const other = join(folder, 'unrelated-working-directory'); mkdirSync(other);
  const example = spawnSync(process.execPath, [join(folder, 'database/examples/query.mjs'), 'Deadly Assault', 'ko', 'en'], { cwd: other, encoding: 'utf8', windowsHide: true });
  assert.equal(example.status, 0, example.stderr);
  const result = JSON.parse(example.stdout);
  assert(result.glossary.length > 0);
  const safe = databaseReleasePaths(manifest);
  assert(safe.includes('database/index.mjs') && safe.includes(manifest.file));
  assert(!safe.some(file => /(?:^|\/)(?:reports|data|\.secrets|\.env)(?:\/|$)/.test(file)));
  assert.throws(() => databaseReleasePaths({ ...manifest, file: '../reports/private.json' }), /path/);
  // Release documentation links resolve within the explicit staged artifacts.
  for (const file of DATABASE_SOURCE_FILES.filter(file => file.endsWith('.md'))) {
    const guide = readFileSync(join(folder, file), 'utf8');
    for (const [, link] of guide.matchAll(/\]\(([^\s)]+)\)/g)) {
      if (/^https?:/.test(link) || link.startsWith('#')) continue;
      const target = posix.normalize(posix.join(posix.dirname(file), link.split('#')[0]));
      assert(!target.startsWith('../'), `${file} escapes root`);
      assert.doesNotThrow(() => readFileSync(join(folder, target)), `${file} -> ${link}`);
    }
  }
});

test('shared matcher stays inside existing portable update paths and both source distributions', () => {
  const files = moduleFiles(root, ['video/server.mjs', 'scripts/video-launch.mjs', 'scripts/video-setup.mjs']).map(file => file.replaceAll('\\', '/'));
  assert(files.includes('src/glossary-match.js'));
  for (const file of files) assert(updatePathAllowed(`app/${file}`), file);
  const runner = runnerModules(root).map(file => file.replaceAll('\\', '/'));
  assert(runner.includes('src/glossary-match.js'));
  const studio = publicSource(root), bot = botSource(root);
  assert(studio.has('src/glossary-match.js') && bot.has('src/glossary-match.js'));
  for (const file of DATABASE_SOURCE_FILES) assert(studio.has(file), file);
  const exportedPackage = JSON.parse(bot.get('package.json'));
  assert(!Object.keys(exportedPackage.scripts).some(name => name.startsWith('database:')));
});
