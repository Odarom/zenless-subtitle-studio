import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyPromptEntries } from '../src/glossary-prompt.js';

test('prompt projection retains conditional rules, known output choices and one existing context label when languages differ', () => {
  const entries = [{ id:'effect', category:'effect', aliases:['Effect','효과','unused'],
    preferred:{en:'Effect',ko:'효과'}, localizedNames:{de:'Effekt'}, communityPreferred:{ko:'사용자 지정'},
    meaning:'Only while the shield is active; never for allies.', rule:'Preserve 25%, unless disabled.', communityRule:'Do not shorten the condition.',
    characterId:'character:1', characterName:{en:'Agent',ko:'캐릭터'}, relatedSkills:{ko:'조건부 스킬',en:''},
    releaseStatus:'prerelease', autoUse:false, releaseVersion:'future', sourceVersion:'test', classification:{private:'unused'} }];
  const original=structuredClone(entries);
  const [row]=legacyPromptEntries(entries,{languages:['de','fr'],style:'community',text:'Effect',fallbackLanguages:['ko','en','de','fr']});
  assert.deepEqual(row.preferred,{de:'Effekt'}); // Never invent the missing French output.
  assert.equal(row.outputPreferred,undefined);
  assert.deepEqual(row.aliases,['Effect']);
  assert.deepEqual(row.characterName,{en:'Agent'});
  assert.deepEqual(row.relatedSkills,{ko:'조건부 스킬'});
  for(const field of ['meaning','rule','communityRule','characterId','releaseStatus','autoUse','releaseVersion','sourceVersion']) assert.deepEqual(row[field],entries[0][field]);
  assert.equal(row.classification,undefined);
  const [korean]=legacyPromptEntries(entries,{languages:['ko'],style:'community',text:'효과'});
  assert.equal(korean.outputPreferred.ko,'사용자 지정');
  assert.deepEqual(entries,original);
});

test('prompt projection does not remove competing concepts or create missing availability flags', () => {
  const entries=[{id:'one',preferred:{en:'One'},aliases:['DA'],meaning:'first',rule:'Only in mode context'},
    {id:'two',preferred:{en:'Two'},aliases:['DA'],meaning:'second',rule:'Only in action context'}];
  const rows=legacyPromptEntries(entries,{languages:['en'],text:'DA'});
  assert.deepEqual(rows.map(row=>row.id),['one','two']);
  assert(rows.every(row=>row.aliases[0]==='DA' && row.autoUse===undefined && row.releaseStatus===undefined));
});
