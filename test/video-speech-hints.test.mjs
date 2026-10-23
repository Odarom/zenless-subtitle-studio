import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {speechTermHints} from '../video/speech-term-hints.mjs';
import {videoGlossary,translateBatch} from '../video/translation.mjs';
import {translationPlan} from '../video/translation-plan.mjs';
import {VideoReports} from '../video/reports.mjs';

const term=(id,name,extra={})=>({id,category:'agent',preferred:{en:name,ko:'테스트 명칭'},aliases:[name],releaseStatus:'live',meaning:'Test game concept',rule:'Only when game context fits. Preserve uncertainty.',...extra});
const cue=(sourceText,id='1',extra={})=>({id,startMs:0,endMs:10000,sourceText,...extra});
const options={sourceLanguage:'en',targetLanguage:'ko',style:'official'};
function fixture(t,entries){const parent=path.resolve('.tools/speech-hints-tests');fs.mkdirSync(parent,{recursive:true});const root=fs.mkdtempSync(path.join(parent,'case-')),glossaryPath=path.join(root,'zzz.json');fs.writeFileSync(glossaryPath,JSON.stringify({version:1,entries}));t.after(()=>{const target=fs.realpathSync(root);assert(target.startsWith(parent+path.sep));fs.rmSync(root,{recursive:true,force:true});});return{root,glossaryPath};}

test('spelling and transposition hints use registered names/aliases while preserving exact observed fragments',()=>{
 const entries=[term('miyabi','Miyabi'),term('assist','Quick Assist',{category:'combat-action',aliases:['Quick Assist','Quik Assist']})];
 const cues=[cue("Miyabii's damage is higher. Use Quik Assit."),cue('Quick Asisst follows.', '2')],before=structuredClone(cues);
 const hints=speechTermHints(cues,entries,options);
 assert.equal(hints.get('miyabi')[0].observed,'Miyabii');assert.equal(hints.get('miyabi')[0].matchedName,'Miyabi');
 assert(hints.get('assist').some(h=>h.observed==='Quik Assit'&&h.matchedName==='Quik Assist'));
 assert(hints.get('assist').some(h=>h.observed==='Quick Asisst'));
 for(const values of hints.values())for(const h of values)assert(cues.find(c=>c.id===h.cueId).sourceText.includes(h.observed));
 assert.deepEqual(cues,before);assert.equal(entries[0].aliases.length,1);
});

test('short words, digits, negatives, exact known terms, screens and disabled/prerelease terms are not fuzzy replacements',()=>{
 const entries=[term('short','Ellen'),term('number','Level 20'),term('blocked','Luminara',{autoUse:false}),term('future','Asteriana',{releaseStatus:'prerelease'}),term('ambiguous','Luminaro'),term('negative','Not Stunned')];
 const hints=speechTermHints([cue('Ellan Level 21 Luminara Asterianna Not Stunnad'),cue('Luminari','2',{kind:'screen'})],entries,options);
 assert.equal(hints.size,0);
 const input=[cue('Do not use 20% with Miyabii unless conditions change.')],before=structuredClone(input);
 const result=speechTermHints(input,[term('miyabi','Miyabi')],options);assert.equal(result.get('miyabi')[0].observed,'Miyabii');assert.deepEqual(input,before);
});

test('ambiguous matches remain several candidates, and chosen source/target language restricts lookup',()=>{
 const entries=[term('one','Luminara'),term('two','Luminaro')];
 const hints=speechTermHints([cue('Luminari can attack.')],entries,options);assert.deepEqual([...hints.keys()].sort(),['one','two']);
 const multilingual=[term('assist','Quick Assist',{category:'combat-action',preferred:{en:'Quick Assist',ko:'빠른 지원'},localizedNames:{de:'Schnelle Hilfe'},aliases:['Quick Assist','Schnelle Hilfe']})];
 assert.equal(speechTermHints([cue('Schnelle Hilfa')],multilingual,options).size,0);
 assert(speechTermHints([cue('Schnelle Hilfa')],multilingual,{...options,sourceLanguage:'de'}).has('assist'));
 assert(speechTermHints([cue('Schnelle Hilfa')],multilingual,{...options,sourceLanguage:'auto'}).has('assist'));
 assert.equal(speechTermHints([cue('Schnelle Hilfa')],multilingual,{sourceLanguage:'de',targetLanguage:'ja'}).size,0);
 const hangul=[term('hangul','Example',{preferred:{ko:'호시미미야비',en:'Example'},aliases:['호시미미야비']})];
 assert(speechTermHints([cue('호시미미야삐')],hangul,{sourceLanguage:'ko',targetLanguage:'en'}).has('hangul'));
});

test('hint budgets are bounded without altering or dropping speech and exact DB output preferences',()=>{
 const entries=Array.from({length:100},(_,i)=>term(String(i),'Starlight'+String.fromCharCode(65+Math.floor(i/26),65+i%26))),cues=entries.map((e,i)=>cue(e.preferred.en.replace('light','ligt'),String(i+1))),before=structuredClone(cues);
 const hints=speechTermHints(cues,entries,options),rows=[...hints.values()].flat();
 assert(rows.length>0&&rows.length<=64);assert(rows.reduce((sum,row)=>sum+Buffer.byteLength(JSON.stringify(row)),0)<=12000);assert.deepEqual(cues,before);
});

test('relevant glossary includes candidate rules; one translation request and reports preserve the original source/translation pair',async t=>{
 const entries=[term('miyabi','Miyabi',{communityPreferred:{ko:'사용자 지정 대표값'}}),term('unused','Unrelated Name')],{root,glossaryPath}=fixture(t,entries);
 const cues=[cue('Do not use Miyabii at 20% unless the condition is met.')],before=structuredClone(cues),settings={...options,glossaryMode:'relevant',style:'community'};
 const glossary=videoGlossary(cues,settings,glossaryPath);assert.equal(glossary.length,1);assert.equal(glossary[0].id,'miyabi');assert.equal(glossary[0].rule,entries[0].rule);assert.equal(glossary[0].outputPreferred.ko,'사용자 지정 대표값');assert.equal(glossary[0].speechHints[0].observed,'Miyabii');
 const config={provider:'gemini',model:'gemini-3.1-flash-lite',apiKey:'DUMMY',timeoutMs:1000,maxOutputTokens:65536,dailyLimit:10};
 assert.equal(translationPlan(cues,config,settings,glossary).requests,1);let calls=0;
 const translated=await translateBatch({allCues:cues,batch:cues,options:settings,config,glossaryPath,glossary,usage:{reserve:()=> 'test',record:()=>{}},fetcher:async(_url,init)=>{
  calls++;const body=JSON.parse(init.body),payload=JSON.parse(body.contents[0].parts[0].text);
  assert.equal(payload.cues[0].text,cues[0].sourceText);assert.equal(payload.glossary[0].speechHints[0].observed,'Miyabii');
  assert(body.systemInstruction.parts[0].text.includes('UNVERIFIED spelling candidates'));assert(body.systemInstruction.parts[0].text.includes('Never repair a number'));
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({cues:[{id:'1',text:'조건이 충족되지 않는 한 20%에서 사용자 지정 대표값을 사용하지 마세요.'}]})}]}}]});
 }});
 assert.equal(calls,1);assert.deepEqual(cues,before);assert.equal(translated[0].sourceText,cues[0].sourceText);
 const job={status:'completed',cues:translated,options:settings},reports=new VideoReports({dataDir:root,jobs:{get:()=>job}});
 const {report}=reports.create({jobId:'test',cueId:'1',type:'meaning',explanation:'Test only',expectedCue:{sourceText:cues[0].sourceText,translatedText:translated[0].translatedText}});
 assert.equal(report.source.text,cues[0].sourceText);assert.equal(report.target.text,translated[0].translatedText);
 const deepL=videoGlossary(cues,{...settings,provider:'deepl'},glossaryPath);assert(deepL.every(entry=>!entry.speechHints));
});
