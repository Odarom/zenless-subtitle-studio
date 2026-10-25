import test from 'node:test';
import assert from 'node:assert/strict';
import { chinesePartyHints, koreanPartyInitial } from '../src/party-shorthand.js';
import { Translator, loadGlossary } from '../src/translator.js';

const roster = loadGlossary('glossary/zzz.json').filter(e=>e.id!=='community:party-yixuan-dialyn-lucia');
const ids = ['character:1371','character:1481','character:1451'];
const agent = (id, name, extra = {}) => ({id,category:'agent',preferred:{'zh-CN':name,en:id,ko:id},aliases:[name],releaseStatus:'live',meaning:'Agent',rule:'Use only with context',...extra});

test('Chinese party initials retrieve live agents dynamically, preserving slot order and ambiguity', () => {
  const result=chinesePartyHints(roster,'仪琉卢这队怎么样？');
  for(const id of ids) assert(result.has(id));
  assert.deepEqual(result.get(ids[0])[0].slots.map(slot=>slot.ids),ids.map(id=>[id]));
  for(const text of ['仪琉卢伤害不错','这'.repeat(55)+'仪琉卢伤害不错'])assert(chinesePartyHints(roster,text).has(ids[0]));
  assert.equal(ids.map(id=>koreanPartyInitial(roster.find(e=>e.id===id))).join(''),'의다루');
  assert.equal(koreanPartyInitial({preferred:{ko:'「11호」'}}),null);
  assert(!loadGlossary('glossary/zzz.json').some(e=>e.id==='community:party-yixuan-dialyn-lucia'));
  const entries=[agent('one','甲一'),agent('alternative','甲四'),agent('two','乙二'),agent('three','丙三')];
  const hints=chinesePartyHints(entries,'甲乙丙');
  assert.deepEqual(hints.get('one')[0].slots[0].ids,['one','alternative']);
  assert.equal(hints.get('one')[0].observed,'甲乙丙');
  assert(chinesePartyHints([agent('one','雅'),agent('two','乙二'),agent('three','丙三')],'雅乙丙队').has('one'));
});

test('Korean initials, ordinary prose, full names, disabled and prerelease agents are excluded', () => {
  assert.equal(chinesePartyHints(roster,'의다루 파티 어때요?').size,0);
  assert.equal(chinesePartyHints(roster,'仪玄和琉音还有卢西娅').size,0);
  assert.equal(chinesePartyHints(roster,'这是一段普通中文句子。').size,0);
  assert.equal(chinesePartyHints([agent('a','甲乙丙'),agent('b','乙二'),agent('c','丙三')],'甲乙丙').size,0);
  for(const extra of [{autoUse:false},{releaseStatus:'prerelease'}])
    assert.equal(chinesePartyHints([agent('a','甲一',extra),agent('b','乙二'),agent('c','丙三')],'甲乙丙队').size,0);
  assert.equal(chinesePartyHints([agent('a','甲一')],'甲甲甲').size,0);
  assert.equal(chinesePartyHints(roster,'x'.repeat(50000)+'仪琉卢').size,0);
});

test('Discord supplies all candidate agents in one request without rewriting original text', async () => {
  let calls=0; const text='仪琉卢这队怎么样？';
  const translator=new Translator({provider:'openai',style:'official',apiKey:'fixture',model:'fixture',dailyLimit:10,timeoutMs:1000,maxOutputTokens:1000},
    {reserve(){return 'day';},recordUsage(){}},'glossary/zzz.json',async(_url,init)=>{
      calls++;const body=JSON.parse(init.body),payload=JSON.parse(body.input);
      assert.equal(payload.message.text,text);
      for(const id of ids){const row=payload.glossary.find(entry=>entry.id===id);assert(row?.partyHints.length);assert.equal(row.partyInitialKo,koreanPartyInitial(roster.find(e=>e.id===id)));}
      assert.match(body.instructions,/concatenate the resolved agents partyInitialKo/);
      assert.match(body.instructions,/If any member remains ambiguous/);
      return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({ko:'의현·다이아린·루시아 파티는 어때요?'})}]}]});
    },{entries:roster});
  assert.deepEqual(await translator.translate({text,sourceLanguage:'zh-CN',targets:['ko']}),{ko:'의현·다이아린·루시아 파티는 어때요?'});
  assert.equal(calls,1);
});


