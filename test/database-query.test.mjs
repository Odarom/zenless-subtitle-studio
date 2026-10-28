import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase } from '../database/index.mjs';
import { relevantTerms } from '../src/glossary-match.js';
import { relevantTerms as translatorTerms } from '../src/translator.js';

const languages = ['ko', 'en', 'ja', 'zh-CN', 'zh-Hant', 'de', 'fr', 'es', 'pt', 'ru', 'th', 'vi', 'id'];
function concept(id, aliases, overrides = {}) {
  return {
    id, category: 'combat-action', names: { en: id, ko: `이름 ${id}` }, aliases, communityOutputs: {},
    usage: { meaning: 'A fictional test concept.', rule: 'Use only for the named action; preserve unless, numbers and target.' },
    context: {}, availability: { releaseStatus: 'live', autoUse: true },
    classification: { names: { en: 'official', ko: 'official' }, aliases: { official: aliases, unofficial: [], 'needs-review': [] }, communityOutputs: {} },
    tags: ['official'], ...overrides,
  };
}
const catalog = concepts => ({
  format: 'zzz-translation-concepts', schemaVersion: 1, languages,
  source: { sha256: 'a'.repeat(64), sourceVersion: 'test', retrievedAt: '2026-10-27' }, concepts,
});
const ids = values => values.map(value => value.id);

test('SDK exact lookup keeps all meanings and input aliases separate from selected output', () => {
  const input = catalog([
    concept('first', ['ABC', 'Alpha'], { communityOutputs: { en: 'Chosen output' } }),
    concept('second', ['ABC', 'abc']),
  ]);
  const db = createDatabase(input);
  assert.deepEqual(ids(db.lookup('aBc')), ['first', 'second']);
  assert.deepEqual(db.lookup('Chosen output'), []);
  assert.deepEqual(db.lookup(' ABC '), []);
  assert.deepEqual(db.lookup('ＡＢＣ'), []);
  assert.equal(db.get('ABC'), undefined);
  assert.equal(db.get('first').communityOutputs.en, 'Chosen output');
  assert.deepEqual(ids(db.search('ABC and Alpha')), ['first', 'second']);
});

test('SDK search uses shared longest spans, whole-word boundaries and compact stat prefixes', () => {
  const db = createDatabase(catalog([
    concept('assault', ['Assault']), concept('mode', ['Deadly Assault'], { category: 'game-mode' }),
    concept('atk', ['ATK%']), concept('stat-flat-atk', ['fatk']), concept('stat-flat-pen', ['fpen']),
  ]));
  assert.deepEqual(ids(db.search('Deadly Assault')), ['mode']);
  assert.deepEqual(ids(db.search('Deadly Assault, then Assault')), ['mode', 'assault']);
  assert.deepEqual(db.search('CATK% fatkfoo x3fpen'), []);
  assert.deepEqual(ids(db.search('4fatk 3fpen ATK%')).sort(), ['atk', 'stat-flat-atk', 'stat-flat-pen']);
  assert.deepEqual(db.search('Deadly\nAssault').map(entry => entry.id), ['assault']);
  assert.deepEqual(db.search('Ｄｅａｄｌｙ Ａｓｓａｕｌｔ'), []);
  assert.strictEqual(translatorTerms, relevantTerms);
});

test('SDK search preserves tied ambiguity beyond the existing apps default 30-entry cap', () => {
  const input = catalog(Array.from({ length: 45 }, (_, index) => concept(`meaning-${index}`, ['ambiguous'])));
  const db = createDatabase(input);
  assert.equal(db.lookup('ambiguous').length, 45);
  assert.equal(db.search('ambiguous').length, 45);
});

test('SDK filters disabled and prerelease candidates by default, exposes statuses on explicit opt-in', () => {
  const db = createDatabase(catalog([
    concept('live', ['same']),
    concept('disabled', ['same'], { availability: { releaseStatus: 'live', autoUse: false } }),
    concept('future', ['same'], { availability: { releaseStatus: 'prerelease', autoUse: true, releaseVersion: 'future' } }),
    concept('both', ['same'], { availability: { releaseStatus: 'prerelease', autoUse: false } }),
  ]));
  for (const method of ['search', 'lookup']) {
    assert.deepEqual(ids(db[method]('same')), ['live']);
    assert.deepEqual(ids(db[method]('same', { includeDisabled: true })), ['live', 'disabled']);
    assert.deepEqual(ids(db[method]('same', { includePrerelease: true })), ['live', 'future']);
    assert.deepEqual(ids(db[method]('same', { includeDisabled: true, includePrerelease: true })), ['live', 'disabled', 'future', 'both']);
  }
  assert.equal(db.get('disabled').availability.autoUse, false);
  const output = db.prompt([db.get('disabled'), db.get('future')], { text: 'alias', languages: ['ko'] });
  assert.equal(output[0].autoUse, false);
  assert.equal(output[1].releaseStatus, 'prerelease');
  assert.equal(output[1].releaseVersion, 'future');
});

test('SDK owns an immutable snapshot so edits cannot stale lookup or cached search indexes', () => {
  const input = catalog([concept('one', ['before'])]), db = createDatabase(input);
  assert.deepEqual(ids(db.search('before')), ['one']);
  input.concepts[0].aliases.push('after');
  input.concepts[0].names.ko = 'changed';
  input.languages.push('fictional');
  assert.deepEqual(db.search('after'), []);
  assert.deepEqual(db.lookup('after'), []);
  assert.equal(db.get('one').names.ko, '이름 one');
  assert.throws(() => db.get('one').aliases.push('after'), TypeError);
  assert.throws(() => { db.get('one').usage.rule = 'changed'; }, TypeError);
  assert.throws(() => db.languages.push('fictional'), TypeError);
  const returned = db.lookup('before'); returned.length = 0;
  assert.equal(db.lookup('before').length, 1);
  assert.equal(db.size, 1);
  assert.equal(db.source.sha256, 'a'.repeat(64));
});

test('SDK prompt projects selected languages and outputs while preserving context and conditions', () => {
  const names = Object.fromEntries(languages.map(language => [language, `name-${language}`]));
  const entry = concept('action', ['alias'], {
    names, communityOutputs: { ko: '선택된 출력', en: 'chosen', ja: '別名' },
    usage: { meaning: 'One attack, unless shielded.', rule: 'Owner only; not every attack. Keep 3 hits.', communityRule: 'A hold does not universally imply EBA.' },
    context: { characterId: 'owner', characterName: names, relatedSkills: names },
    availability: { autoUse: true, releaseStatus: 'live', sourceVersion: '1', releaseVersion: '1' },
    ignoredManagementField: 'must not enter prompt',
  });
  const db = createDatabase(catalog([entry]));
  const full = db.get('action');
  const [output] = db.prompt([full, full], { text: 'alias', languages: ['ko', 'en', 'ko'], style: 'community' });
  assert.deepEqual(output.names, { ko: 'name-ko', en: 'name-en' });
  assert.deepEqual(output.outputPreferred, { ko: '선택된 출력', en: 'chosen' });
  assert.deepEqual(output.characterName, output.names);
  assert.deepEqual(output.relatedSkills, output.names);
  assert.equal(output.characterId, 'owner');
  assert.equal(output.meaning, entry.usage.meaning);
  assert.equal(output.rule, entry.usage.rule);
  assert.equal(output.communityRule, entry.usage.communityRule);
  assert.equal(output.sourceVersion, '1');
  for (const field of ['aliases', 'classification', 'tags', 'ignoredManagementField']) assert(!Object.hasOwn(output, field));
  assert.equal(db.prompt([full, full], { text: 'alias', languages: ['ko'] }).length, 1);
  const [official] = db.prompt([full], { text: 'alias', languages: ['ko'], style: 'official' });
  assert(!Object.hasOwn(official, 'outputPreferred'));
  assert.equal(official.communityRule, entry.usage.communityRule);
  assert.deepEqual(Object.keys(db.prompt([full], { text: 'alias', languages })[0].names), languages);
  output.names.ko = 'caller changed';
  assert.equal(db.get('action').names.ko, 'name-ko');
});

test('SDK prompt does not invent missing names or select aliases as community output', () => {
  const db = createDatabase(catalog([
    concept('missing', ['unselected alias'], { context: { relatedSkills: { en: 'Skill' } } }),
    concept('same', ['alias'], { communityOutputs: { en: 'same' } }),
  ]));
  const [missing] = db.prompt([db.get('missing')], { text: 'alias', languages: ['ja'], style: 'community' });
  assert.deepEqual(missing.names, {});
  assert(!Object.hasOwn(missing, 'outputPreferred'));
  assert.deepEqual(missing.relatedSkills, { en: 'Skill' });
  const [same] = db.prompt([db.get('same')], { text: 'alias', languages: ['en'], style: 'community' });
  assert(!Object.hasOwn(same, 'outputPreferred'));
});

test('SDK prompt retains one known context label when selected languages have no owner or skill names', () => {
  const db = createDatabase(catalog([
    concept('english-context', ['alias'], {
      context: { characterName: { ko: '소유 캐릭터', en: 'Owner' }, relatedSkills: { ko: '스킬', en: 'Skill' } },
    }),
    concept('ordered-context', ['alias'], {
      context: { characterName: { ja: '所有者', ko: '소유 캐릭터' }, relatedSkills: {} },
    }),
  ]));
  const first = db.get('english-context'), second = db.get('ordered-context');
  const [english, ordered] = db.prompt([first, second], { text: 'alias', languages: ['de', 'fr'] });
  assert.deepEqual(english.names, {});
  assert(!Object.hasOwn(english, 'outputPreferred'));
  assert.deepEqual(english.characterName, { en: 'Owner' });
  assert.deepEqual(english.relatedSkills, { en: 'Skill' });
  assert.deepEqual(ordered.characterName, { ko: '소유 캐릭터' });
  assert(!Object.hasOwn(ordered, 'relatedSkills'));
  const [selected] = db.prompt([first], { text: 'alias', languages: ['ko', 'de'] });
  assert.deepEqual(selected.characterName, { ko: '소유 캐릭터' });
  assert.deepEqual(selected.relatedSkills, { ko: '스킬' });
  for (const language of languages.filter(language => !['en', 'ko'].includes(language))) {
    const [output] = db.prompt([first], { text: 'alias', languages: [language] });
    assert.deepEqual(output.characterName, { en: 'Owner' });
    assert.deepEqual(output.relatedSkills, { en: 'Skill' });
    assert.deepEqual(output.names, {});
  }
});

test('SDK prompt keeps observed aliases attached to every competing concept even without requested names', () => {
  const db = createDatabase(catalog([
    concept('first', ['ABC', 'not present']), concept('second', ['ABC', 'also absent']),
    concept('third', ['XYZ']), concept('stat-flat-atk', ['fatk', 'flat ATK']), concept('atk', ['ATK%']),
  ]));
  const text = 'ABC, XYZ, 4fatk and CATK%';
  const prompt = db.prompt(db.search(text), { text, languages: ['ja'] });
  const byId = new Map(prompt.map(entry => [entry.id, entry]));
  assert.deepEqual(byId.get('first').matchedAliases, ['ABC']);
  assert.deepEqual(byId.get('second').matchedAliases, ['ABC']);
  assert.deepEqual(byId.get('third').matchedAliases, ['XYZ']);
  assert.deepEqual(byId.get('stat-flat-atk').matchedAliases, ['fatk']);
  assert.deepEqual(byId.get('first').names, {});
  assert(!byId.has('atk'));
  assert.deepEqual(db.prompt([db.get('atk')], { text, languages: ['en'] })[0].matchedAliases, []);
  assert.deepEqual(db.prompt([db.get('first')], { text: '', languages: ['en'] })[0].matchedAliases, []);
  assert.throws(() => db.prompt([db.get('first')], { languages: ['en'] }), TypeError);
  assert.throws(() => db.prompt([db.get('first')], { text: [], languages: ['en'] }), TypeError);
});

test('SDK rejects malformed data and invalid API requests before constructing model payloads', () => {
  const input = catalog([concept('one', ['alias'])]);
  for (const mutate of [
    value => { value.schemaVersion = 2; },
    value => { value.languages.push('en'); },
    value => { value.concepts.push(value.concepts[0]); },
    value => { value.concepts[0].aliases = ['']; },
    value => { value.concepts[0].names.en = 1; },
    value => { value.concepts[0].availability.autoUse = 'false'; },
    value => { value.concepts[0].context.relatedSkills = ['not a language map']; },
    value => { value.concepts[0].usage.rule = ''; },
    value => { value.source.sha256 = '../unexpected'; },
    value => { value.concepts[0].classification.names.ko = 'unknown'; },
  ]) {
    const altered = structuredClone(input); mutate(altered);
    assert.throws(() => createDatabase(altered), TypeError);
  }
  const db = createDatabase(input), other = createDatabase(input), entry = db.get('one');
  assert.throws(() => db.get(null), TypeError);
  assert.throws(() => db.lookup({}), TypeError);
  assert.throws(() => db.search(null), TypeError);
  assert.throws(() => db.search('alias', { includeDisabled: 'yes' }), TypeError);
  assert.throws(() => db.lookup('alias', null), TypeError);
  assert.throws(() => db.prompt([other.get('one')], { text: 'alias', languages: ['en'] }), TypeError);
  assert.throws(() => db.prompt([structuredClone(entry)], { text: 'alias', languages: ['en'] }), TypeError);
  assert.throws(() => db.prompt([entry]), TypeError);
  assert.throws(() => db.prompt([entry], { text: 'alias', languages: [] }), TypeError);
  assert.throws(() => db.prompt([entry], { text: 'alias', languages: ['xx'] }), TypeError);
  assert.throws(() => db.prompt([entry], { text: 'alias', languages: ['en'], style: 'invent' }), TypeError);
});
