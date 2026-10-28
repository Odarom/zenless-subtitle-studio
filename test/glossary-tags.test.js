import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTermTags, TERM_TAGS } from '../src/glossary-tags.js';

const row = (id, preferred, aliases, extra = {}) => ({ id, category: 'agent', preferred, aliases, meaning: 'A scoped concept.', rule: 'Apply only in context.', ...extra });
const strip = catalog => {
  const { classificationVersion, classificationCounts, ...base } = catalog;
  return { ...base, entries: catalog.entries.map(({ tags, classification, ...entry }) => entry) };
};
test('official names, extra languages and community aliases are tagged separately without choosing new outputs', () => {
  const catalog = { version: 1, entries: [row('character:1', { ko: '엽빛나', en: 'Ye Shunguang' }, ['엽빛나', 'Ye Shunguang', 'YSG', '빛나', 'Old Name'], { status: 'source-matched', localizedNames: { de: 'Ye Shunguang' }, communityPreferred: { ko: '빛나', en: 'YSG', de: 'Ye Shunguang' }, communityPreferredDrafts: { fr: null }, nameHistory: [{ preferred: { en: 'Old Name' } }], releaseStatus: 'prerelease', autoUse: false })] };
  const community = { version: 1, entries: [{ id: 'short', targetId: 'character:1', aliases: ['YSG', '빛나', 'Ye Shunguang'] }] }, policy = { version: 1, entries: [] };
  const classified = applyTermTags(catalog, community, policy), entry = classified.entries[0];
  assert.deepEqual(strip(classified), catalog); assert.deepEqual(entry.tags, ['official', 'unofficial']);
  assert.equal(entry.classification.names.ko, 'official'); assert.equal(entry.classification.localizedNames.de, 'official');
  assert(entry.classification.aliases.official.includes('Old Name')); assert(entry.classification.aliases.unofficial.includes('YSG'));
  assert.equal(entry.classification.communityOutputs.de, 'official'); assert.equal(entry.classification.communityOutputs.ko, 'unofficial');
  assert.deepEqual(applyTermTags(classified, community, policy), classified);
});
test('a community concept can contain a confirmed official name and unresolved names in other languages', () => {
  const catalog = { version: 1, entries: [row('community:damage', { ko: '피해 증가', en: 'DMG Bonus' }, ['피증', 'DMG Bonus'], { status: 'reviewed-community', communityPreferred: { ko: '피증' } })] };
  const tagged = applyTermTags(catalog, { version: 1, entries: [{ id: 'community:damage', aliases: ['피증', 'DMG Bonus'] }] }, { version: 1, entries: [{ id: 'community:damage', names: { ko: 'official' } }] });
  assert.deepEqual(tagged.entries[0].tags, TERM_TAGS); assert.equal(tagged.entries[0].classification.names.en, 'needs-review');
  assert.equal(tagged.entries[0].classification.communityOutputs.ko, 'unofficial'); assert.deepEqual(strip(tagged), catalog);
});
test('non-official expressions remain non-official even when they contain words from official names', () => {
  const catalog = { version: 1, entries: [row('community:combo', { en: 'EX Special Attack → Basic Attack' }, ['EX → BA'], { status: 'user-provided' })] };
  const classified = applyTermTags(catalog, { version: 1, entries: [{ id: 'community:combo', aliases: ['EX → BA'] }] }, { version: 1, entries: [{ id: 'community:combo', default: 'unofficial' }] });
  assert.deepEqual(classified.entries[0].tags, ['unofficial']); assert.deepEqual(strip(classified), catalog);
});
test('classification rejects misspelled tags, unknown roles and overrides that could silently change output values', () => {
  const catalog = { version: 1, entries: [row('one', { en: 'One' }, ['One'])] }, community = { version: 1, entries: [] };
  for (const entry of [{ id: 'missing', default: 'official' }, { id: 'one', default: 'offical' }, { id: 'one', names: { fr: 'official' } }, { id: 'one', communityOutputs: { en: 'unofficial' } }, { id: 'one', preferred: { en: 'Changed' } }]) assert.throws(() => applyTermTags(catalog, community, { version: 1, entries: [entry] }), /Invalid terminology/);
});
