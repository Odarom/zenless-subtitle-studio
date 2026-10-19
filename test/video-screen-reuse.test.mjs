import test from 'node:test';
import assert from 'node:assert/strict';
import { groupScreenTranslations, screenTranslationItems, expandScreenTranslations, mergeContinuousScreenCues, stabilizeOcrCues } from '../video/screen-reuse.mjs';
import { buildCueIndex, activeCuesAt } from '../video/geometry.mjs';
import { translateBatch, IncompleteTranslationError } from '../video/translation.mjs';
import { translationPlan } from '../video/translation-plan.mjs';

const region = { x: .1, y: .2, w: .3, h: .04 };
const cue = (id, startMs, endMs, extra = {}) => ({ id, startMs, endMs, kind: 'screen', sourceText: 'Keep this shield active.', region: { ...region }, ...extra });
test('low-confidence one-frame OCR spelling flicker can merge, but numbers, negation, gaps and stable changes cannot',()=>{
  const make=(middle,extra={})=>[cue('1',0,3000,{sourceText:'Keep this shield active while attacking.',confidence:.99}),cue('2',3000,4000,{sourceText:middle,confidence:.85,...extra}),cue('3',4000,7000,{sourceText:'Keep this shield active while attacking.',confidence:.99})];
  const input=make('Keep this shield active while attacklng.');
  const fixed=mergeContinuousScreenCues(stabilizeOcrCues(input,1000));assert.equal(fixed.length,1);assert.equal(fixed[0].endMs,7000);assert(input[1].sourceText.includes('attacklng'));
  for(const sample of [make('Keep this shield active while attacking.',{sourceText:'Keep this shield active while attacking 1.'}),make('Keep this shield not active while attacking.'),make('Keep this shield active while attacklng.',{confidence:.99}),make('Keep this shield active while attacklng.',{startMs:3100}),make('Keep this shield active while attacklng.',{endMs:5000})]){
    assert.equal(stabilizeOcrCues(sample,1000)[1].sourceText,sample[1].sourceText);
  }
});

test('continuous identical stationary captions merge but disappearance gaps stay empty', () => {
  const input = [cue('1', 0, 1000), cue('2', 1000, 2000, { region: { ...region, x: .102 } }), cue('3', 4000, 6000)];
  const merged = mergeContinuousScreenCues(input);
  assert.equal(merged.length, 2); assert.deepEqual(merged.map(c => [c.startMs, c.endMs]), [[0,2000],[4000,6000]]);
  assert.equal(activeCuesAt(buildCueIndex(merged), 3000).length, 0);
  assert.equal(merged[0].positions[1].x, .102);
  const noIds = mergeContinuousScreenCues(input.map(({id, ...item})=>item));
  assert.equal(noIds.length, 2);
});

test('reuse preserves each occurrence and separates other positions, changed values, speech and moving text', () => {
  const input = [cue('1',0,2000),cue('2',4000,6000,{region:{...region,x:.103}}),
    cue('3',0,2000,{region:{...region,y:.4}}),cue('4',0,2000,{sourceText:'Keep this shield active!'}),
    cue('5',0,2000,{sourceText:'Score 100'}),cue('6',2000,4000,{sourceText:'Score 101'}),
    cue('7',0,2000,{kind:'speech'}),cue('8',0,2000,{positions:[{timeMs:0,...region},{timeMs:1000,...region,x:.3}]}),
    cue('9',0,2000,{sourceText:'KEEP THIS SHIELD ACTIVE.'})];
  const grouped = groupScreenTranslations(input); assert.equal(grouped.cues.length, 8);
  const items=screenTranslationItems(grouped); assert.equal(items[0].occurrences.length,2);
  const expanded = expandScreenTranslations(grouped.cues.map(item=>({...item,translatedText:`번역 ${item.id}`})), input, grouped.groups);
  assert.equal(expanded.length,input.length); assert.equal(expanded[1].translatedText,expanded[0].translatedText);
  assert.deepEqual(expanded.map(({translatedText,...item})=>item),input);
});

const options={sourceLanguage:'en',targetLanguage:'ko'},config={provider:'gemini',model:'gemini-3.1-flash-lite',apiKey:'DUMMY',timeoutMs:1000,maxOutputTokens:65536,dailyLimit:10};
const run = (cues, fetcher) => translateBatch({allCues:cues,batch:cues,options,config,glossaryPath:'glossary/zzz.json',usage:{reserve:()=> 'day',record:()=>{}},fetcher});
const response = cues => new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({cues})}]}}]}));
test('one real request shape translates repeated screen text once then restores original timestamps and IDs',async()=>{
  const input=[cue('1',0,2000),cue('2',4000,6000),cue('3',1000,3000,{kind:'speech'})];let calls=0;
  const output=await run(input,async(_url,init)=>{
    calls++;const body=JSON.parse(init.body),data=JSON.parse(body.contents[0].parts[0].text);
    assert.equal(data.cues.length,2); assert.equal(data.translationTask.requiredScreenTranslations,1);
    assert.equal(data.cues[0].occurrences.length,2);assert.equal(data.glossary.entries.length,2314);
    return response(data.cues.map(item=>({id:item.id,text:item.kind==='screen'?'방어막을 유지하세요.':'음성 번역'})));
  });
  assert.equal(calls,1);assert.equal(output.length,3);assert.equal(output[0].translatedText,output[1].translatedText);
  assert.deepEqual(output.map(({id,startMs,endMs,region})=>({id,startMs,endMs,region})),input.map(({id,startMs,endMs,region})=>({id,startMs,endMs,region})));
  assert.equal(activeCuesAt(buildCueIndex(output),3500).length,0);
  const plan=translationPlan(input,config,options);assert.equal(plan.requests,1);assert.equal(plan.screenTranslationCount,1);assert.equal(plan.reusedScreenCueCount,1);
});
test('a conflicting representative cannot overwrite any of its repeated occurrences',async()=>{
  const input=[cue('1',0,2000),cue('2',4000,6000),cue('3',1000,3000,{kind:'speech'})];let calls=0;
  await assert.rejects(run(input,async()=>{calls++;return response([{id:'1',text:'첫 답'},{id:'1',text:'다른 답'},{id:'3',text:'보관할 음성'}]);}),error=>{
    assert(error instanceof IncompleteTranslationError);assert.deepEqual(error.partialCues.map(c=>c.id),['3']);
    assert.equal(error.translationIssue.expected,3);assert.equal(error.translationIssue.requested,2);assert.equal(error.translationIssue.missing,2);return true;
  });assert.equal(calls,1);
});
