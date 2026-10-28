import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { RuntimeGlossaryCache, loadGlossary } from '../src/glossary-runtime.js';
import { relevantTerms, Translator } from '../src/translator.js';
import { relevantTerms as before } from './fixtures/relevant-terms-before-runtime.js';
import { localizedNames } from '../src/languages.js';
import { settings } from '../src/config.js';
const catalogPath = new URL('../glossary/zzz.json', import.meta.url);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const ids = entries => entries.map(entry => entry.id);
const document = name => JSON.stringify({ version:1, entries:[{ id:'sample', preferred:{en:name}, aliases:[name], meaning:'meaning', rule:'rule', classification:{label:'official'} }] });

test('snapshot caches unchanged bytes, reloads same-size replacements and refuses invalid/missing files', t => {
  const folder = mkdtempSync(join(tmpdir(),'zzz-runtime-')); t.after(()=>rmSync(folder,{recursive:true,force:true}));
  const path = join(folder,'glossary.json'), other = join(folder,'other.json');
  writeFileSync(path,document('Alpha')); writeFileSync(other,document('Other'));
  const cache = new RuntimeGlossaryCache(), first = cache.get(path);
  assert.equal(cache.get(path),first); assert.equal(cache.get(pathToFileURL(path)),first);
  assert.equal(first.hash,digest(readFileSync(path)));
  assert(Object.isFrozen(first.entries[0].aliases));
  assert.throws(()=>{first.entries[0].preferred.en='Changed';},TypeError);
  assert.equal(first.entries[0].classification,undefined);
  assert.equal(loadGlossary(path)[0].classification.label,'official');
  writeFileSync(path+'.tmp',document('Bravo')); renameSync(path+'.tmp',path);
  const next=cache.get(path); assert.notEqual(next,first); assert.equal(next.entries[0].preferred.en,'Bravo');
  assert.equal(first.entries[0].preferred.en,'Alpha'); assert.equal(next.hash,digest(readFileSync(path)));
  writeFileSync(path,document('Delta')); assert.equal(cache.get(path).entries[0].preferred.en,'Delta');
  writeFileSync(path,'{}'); assert.throws(()=>cache.get(path));
  writeFileSync(path,document('Valid')); const valid=cache.get(path);
  cache.get(other); assert.notEqual(cache.get(path),valid); // Bounded cache evicts old catalogs.
  rmSync(path); assert.throws(()=>cache.get(path));
});

test('optimized matcher preserves reference ordering across every registered alias and Unicode case folding', () => {
  const full=loadGlossary(catalogPath), runtime=new RuntimeGlossaryCache().get(catalogPath).entries;
  const aliases=[...new Set(full.flatMap(entry=>entry.aliases))];
  const cases=['',' ', '3fpen 4fatk CATK% ATK% fatkfoo', 'Deadly Assault Assault DA QA san-z EX → EX → BA',
    '강강평 강꾹 명심경 섬광 귀결 극치', 'K Ｋ ſ S ς Σ σ İ I ı ß SS', 'ATK% not CATK% or ATK%foo'];
  // Each alias occurs in the corpus, including all thirteen text languages.
  for(let offset=0;offset<aliases.length;offset+=512) cases.push(aliases.slice(offset,offset+512).join(' | '));
  for(const text of cases) assert.deepEqual(ids(relevantTerms(runtime,text,100)),ids(before(full,text,100)),text.slice(0,120));
  const custom=[
    {id:'stat-flat-atk',aliases:['fatk'],category:'stat'},
    {id:'unicode',aliases:['s','k','σ','ß','[x]','a+b','a\\b','あ'],category:'name'},
    {id:'ambiguous',aliases:['s'],category:'community'},
    {id:'hidden',aliases:['Hidden'],autoUse:false},
  ];
  const frozen=Object.freeze(custom.map(entry=>Object.freeze({...entry,aliases:Object.freeze([...entry.aliases])})));
  for(const text of ['ſ K ς','3fatk 4fatkfoo fatk','[x] a+b a\\b あ','Hidden s s','SS ß']) assert.deepEqual(ids(relevantTerms(frozen,text)),ids(before(custom,text)));
  const mutable=[{id:'edit',aliases:['Before']}]; relevantTerms(mutable,'Before'); mutable[0].aliases=['After'];
  assert.deepEqual(ids(relevantTerms(mutable,'After')),['edit']);
});

test('provider payload retains all original term fields, style, context and snapshot identity during a database update', async t => {
  const folder=mkdtempSync(join(tmpdir(),'zzz-runtime-payload-')); t.after(()=>rmSync(folder,{recursive:true,force:true}));
  const path=join(folder,'glossary.json'); writeFileSync(path,readFileSync(catalogPath));
  const cache=new RuntimeGlossaryCache(), snapshot=cache.get(path), full=loadGlossary(path);
  const input={text:'QA 공퍼 YSG 강강평 극치 san-z',sourceLanguage:'ko',targets:['en','ja'],context:[{text:'Deadly Assault 3fpen'}],reply:{text:'Return to Dust'}};
  const selected=[...new Map([...before(full,input.text),...before(full,[input.reply.text,...input.context.map(c=>c.text)].join('\n'))].map(entry=>[entry.id,entry])).values()].slice(0,30);
  // A job already polled with the old digest must use that same snapshot.
  writeFileSync(path,document('Replacement')); cache.get(path);
  for(const style of ['official','community']) {
    const config=settings({TRANSLATION_PROVIDER:'openai',OPENAI_API_KEY:'fixture',TRANSLATION_STYLE:style},{requireSecrets:false});
    const store={reserve(){return 'day';},recordUsage(){}}; let calls=0;
    const translator=new Translator(config,store,path,async(_url,init)=>{
      calls++; const body=JSON.parse(init.body), payload=JSON.parse(body.input);
      const expected=selected.map(entry=>({...entry,preferred:localizedNames(entry)})).map(({id,preferred,communityPreferred,aliases,category,meaning,rule,communityRule,relatedSkills,characterId,characterName,releaseStatus,releaseVersion,sourceVersion})=>({id,preferred,outputPreferred:style==='community'?{...preferred,...communityPreferred}:preferred,aliases,category,meaning,rule,communityRule,relatedSkills,characterId,characterName,releaseStatus,releaseVersion,sourceVersion}));
      assert.deepEqual(payload.glossary,JSON.parse(JSON.stringify(expected)));
      assert.deepEqual(payload.context,input.context); assert.deepEqual(payload.reply,input.reply);
      assert.deepEqual(payload.targets,input.targets);
      return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({en:'Fixture output',ja:'確認用の訳文'})}]}]})};
    },snapshot);
    assert.deepEqual(await translator.translate(input),{en:'Fixture output',ja:'確認用の訳文'}); assert.equal(calls,1);
  }
});
