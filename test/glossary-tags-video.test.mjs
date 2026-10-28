import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { applyTermTags, TERM_TAGS } from '../src/glossary-tags.js';
import { videoGlossary } from '../video/translation.mjs';

const strip = catalog => {
  const { classificationVersion, classificationCounts, ...base } = catalog;
  return { ...base, entries: catalog.entries.map(({ tags, classification, ...entry }) => entry) };
};

test('tag-only classification preserves every existing term and leaves the video API glossary byte-identical', t => {
  const catalog = JSON.parse(fs.readFileSync('glossary/zzz.json')), community = JSON.parse(fs.readFileSync('glossary/community.json')), policy = JSON.parse(fs.readFileSync('glossary/classification.json'));
  const classified = applyTermTags(catalog, community, policy); assert.deepEqual(strip(classified), strip(catalog));
  assert.equal(classified.entries.length, catalog.entries.length);
  fs.mkdirSync(resolve('.tools'), { recursive: true });
  const folder = fs.mkdtempSync(resolve('.tools/tag-payload-')); t.after(() => { assert(!relative(resolve('.tools'), folder).startsWith('..')); fs.rmSync(folder, { recursive: true, force: true }); });
  const before = join(folder, 'before.json'), after = join(folder, 'after.json'); fs.writeFileSync(before, JSON.stringify(strip(catalog))); fs.writeFileSync(after, JSON.stringify(classified));
  const cues = [{ sourceText: 'YSG uses EX Special Attack and gains DMG Bonus.' }];
  for (const style of ['official', 'community']) for (const glossaryMode of ['full', 'relevant']) assert.equal(JSON.stringify(videoGlossary(cues, { sourceLanguage: 'en', targetLanguage: 'ko', style, glossaryMode }, before)), JSON.stringify(videoGlossary(cues, { sourceLanguage: 'en', targetLanguage: 'ko', style, glossaryMode }, after)));
  for (const entry of classified.entries) {
    assert(entry.tags.length); const aliases = TERM_TAGS.flatMap(tag => entry.classification.aliases[tag]);
    assert.equal(new Set(aliases).size, aliases.length); assert.deepEqual(new Set(aliases), new Set(entry.aliases));
  }
});
