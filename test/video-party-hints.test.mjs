import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chinesePartyHints } from '../src/party-shorthand.js';
import { Translator, loadGlossary } from '../src/translator.js';
import { videoGlossary, translateBatch } from '../video/translation.mjs';
import { translationPlan } from '../video/translation-plan.mjs';

const roster = loadGlossary('glossary/zzz.json').filter(e=>e.id!=='community:party-yixuan-dialyn-lucia');
const ids = ['character:1371','character:1481','character:1451'];
const agent = (id, name, extra = {}) => ({id,category:'agent',preferred:{'zh-CN':name,en:id,ko:id},aliases:[name],releaseStatus:'live',meaning:'Agent',rule:'Use only with context',...extra});

test('video relevant glossary includes hints in input budget and keeps exact source/ID in one response', async t => {
  const parent=path.resolve('.tools/party-hints-tests');fs.mkdirSync(parent,{recursive:true});const root=fs.mkdtempSync(path.join(parent,'case-')),glossaryPath=path.join(root,'zzz.json');
  fs.writeFileSync(glossaryPath,JSON.stringify({version:1,entries:roster.filter(e=>ids.includes(e.id))}));
  t.after(()=>{assert(fs.realpathSync(root).startsWith(parent+path.sep));fs.rmSync(root,{recursive:true});});
  const cues=[{id:'1',sourceText:'仪琉卢伤害不错',startMs:0,endMs:5000,kind:'screen'}],before=structuredClone(cues);
  const options={provider:'gemini',sourceLanguage:'zh-CN',targetLanguage:'ko',glossaryMode:'relevant',style:'community'};
  const glossary=videoGlossary(cues,options,glossaryPath);assert.equal(glossary.length,3);assert(glossary.every(e=>e.partyHints.length));
  const config={provider:'gemini',model:'gemini-3.1-flash-lite',apiKey:'fixture',timeoutMs:1000,maxOutputTokens:65536,dailyLimit:10};
  const plan=translationPlan(cues,config,options,glossary);assert.equal(plan.requests,1);assert(plan.glossaryInputBytes>0);
  let calls=0;
  const result=await translateBatch({allCues:cues,batch:cues,options,config,glossaryPath,glossary,usage:{reserve(){return 'day';},record(){}},fetcher:async(_url,init)=>{
    calls++;const body=JSON.parse(init.body),payload=JSON.parse(body.contents[0].parts[0].text);
    assert.equal(payload.cues[0].text,cues[0].sourceText);assert.match(body.systemInstruction.parts[0].text,/Do not infer team members from Korean/);
    const rows=Array.isArray(payload.glossary)?payload.glossary:payload.glossary.entries;
    const korean=ids.map(id=>rows.find(e=>e.id===id).partyInitialKo).join('');assert.equal(korean,'의다루');
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({cues:[{id:'1',text:korean+' 파티'}]})}]}}]});
  }});
  assert.equal(calls,1);assert.deepEqual(cues,before);assert.equal(result[0].sourceText,cues[0].sourceText);assert.equal(result[0].id,'1');
  assert(videoGlossary(cues,{...options,provider:'deepl'},glossaryPath).every(e=>!e.partyHints));
});
