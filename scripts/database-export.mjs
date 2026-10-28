import { copyFileSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { TEXT_LANGUAGES } from '../src/languages.js';
import { createDatabase } from '../database/index.mjs';

// Explicit public assets only; never walk the workspace or copy private inputs.
export const DATABASE_SOURCE_FILES = Object.freeze([
  'database/index.mjs', 'database/catalog.schema.json', 'database/package.json',
  'database/README.md', 'database/README-ko.md', 'database/README-en.md',
  'database/README-ja.md', 'database/README-zh-CN.md', 'database/examples/query.mjs'
]);
const tags = ['official', 'unofficial', 'needs-review'];
const languageMap = value => Object.fromEntries(Object.entries(value || {}).map(([language, text]) => {
  if (!Object.hasOwn(TEXT_LANGUAGES, language) || typeof text !== 'string' || !text.trim()) throw new Error('Invalid public language map');
  return [language, text];
}));
const optional = (entry, keys) => Object.fromEntries(keys.filter(key => entry[key] !== undefined).map(key => [key, entry[key]]));
// Old context maps can contain empty placeholders. They are missing names,
// not usable translations; keep every nonempty context value verbatim.
const contextNames = value => languageMap(Object.fromEntries(Object.entries(value || {}).filter(([, text]) => typeof text !== 'string' || text.trim())));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function projectConceptCatalog(catalog, sourceSha256) {
  if (catalog?.version !== 1 || !Array.isArray(catalog.entries) || !/^[a-f0-9]{64}$/.test(sourceSha256)) throw new Error('Invalid source catalog');
  const concepts = catalog.entries.map(entry => {
    if (entry.classification?.version !== 1) throw new Error(`Missing classification: ${entry.id}`);
    const names = { ...languageMap(entry.preferred), ...languageMap(entry.localizedNames) };
    const nameTags = { ...languageMap(entry.classification.names), ...languageMap(entry.classification.localizedNames) };
    const outputTags = languageMap(entry.classification.communityOutputs);
    const aliases = Object.fromEntries(tags.map(tag => [tag, [...(entry.classification.aliases?.[tag] || [])]]));
    if (Object.keys(names).some(language => !tags.includes(nameTags[language]))
      || Object.keys(entry.communityPreferred || {}).some(language => !tags.includes(outputTags[language]))
      || entry.aliases.some(alias => !Object.values(aliases).some(values => values.includes(alias)))) {
      throw new Error(`Incomplete classification: ${entry.id}`);
    }
    // The one concept record is complete for consumers. No maintenance evidence,
    // draft output choices, source locations or report material crosses this boundary.
    return {
      id: entry.id, category: entry.category, names, aliases: [...entry.aliases],
      communityOutputs: languageMap(entry.communityPreferred),
      usage: { meaning: entry.meaning, rule: entry.rule, ...optional(entry, ['communityRule']) },
      context: {
        ...optional(entry, ['characterId']),
        ...(entry.characterName !== undefined ? { characterName: contextNames(entry.characterName) } : {}),
        ...(entry.relatedSkills !== undefined ? { relatedSkills: contextNames(entry.relatedSkills) } : {})
      },
      availability: {
        releaseStatus: entry.releaseStatus ?? 'unspecified', autoUse: entry.autoUse !== false,
        ...optional(entry, ['releaseVersion', 'sourceVersion'])
      },
      classification: { names: nameTags, aliases, communityOutputs: outputTags },
      tags: [...(entry.tags || [])]
    };
  });
  const result = {
    format: 'zzz-translation-concepts', schemaVersion: 1,
    source: { sha256: sourceSha256, sourceVersion: catalog.sourceVersion ?? null, retrievedAt: catalog.retrievedAt ?? null },
    languages: Object.keys(TEXT_LANGUAGES), concepts
  };
  createDatabase(result); // Fail the build before publishing an unusable view.
  return result;
}

export function databaseReleasePaths(manifest) {
  if (manifest?.schema !== 1 || manifest.format !== 'zzz-translation-concepts' || manifest.schemaVersion !== 1
    || !/^[a-f0-9]{64}$/.test(manifest.sha256 || '') || manifest.file !== `releases/concepts-v1-${manifest.sha256}.json`) {
    throw new Error('Invalid public concept release path');
  }
  return [...DATABASE_SOURCE_FILES, '.gitattributes', 'database/match.mjs', 'database/latest.json', 'catalog/concepts.json', manifest.file];
}

export function buildConceptRelease(root, output, catalog, sourceSha256) {
  const projected = projectConceptCatalog(catalog, sourceSha256);
  const bytes = Buffer.from(`${JSON.stringify(projected)}\n`), hash = sha256(bytes);
  const manifest = {
    schema: 1, format: projected.format, schemaVersion: 1, sha256: hash, bytes: bytes.length,
    count: projected.concepts.length, file: `releases/concepts-v1-${hash}.json`, sourceSha256
  };
  for (const file of DATABASE_SOURCE_FILES) {
    if (!lstatSync(join(root, file)).isFile()) throw new Error(`Invalid public database asset: ${file}`);
    mkdirSync(dirname(join(output, file)), { recursive: true });
    if (file === 'database/index.mjs') {
      const source = readFileSync(join(root, file), 'utf8');
      const original = "'../src/glossary-match.js'";
      if (source.split(original).length !== 2) throw new Error('SDK matcher import changed; review the public export');
      writeFileSync(join(output, file), source.replace(original, "'./match.mjs'"));
    } else copyFileSync(join(root, file), join(output, file));
  }
  copyFileSync(join(root, 'src/glossary-match.js'), join(output, 'database/match.mjs'));
  for (const file of ['catalog/concepts.json', manifest.file]) {
    mkdirSync(dirname(join(output, file)), { recursive: true });
    writeFileSync(join(output, file), bytes);
  }
  writeFileSync(join(output, 'database/latest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  // Git for Windows must not alter checksum-addressed JSON during checkout.
  writeFileSync(join(output, '.gitattributes'), '# Keep JSON release bytes unchanged on every checkout platform.\n*.json -text\n');
  return { manifest, files: databaseReleasePaths(manifest) };
}
