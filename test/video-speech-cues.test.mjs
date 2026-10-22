import test from 'node:test';
import assert from 'node:assert/strict';
import {speechDisplayCues} from '../video/speech-cues.mjs';
import {serializeSubtitles, parseSubtitles} from '../video/subtitles.mjs';
import {buildCueIndex, activeCuesAt} from '../video/geometry.mjs';
import {translationPlan} from '../video/translation-plan.mjs';

const joined = text => text.replace(/\s+/gu,'');
const speech = {id:'7', startMs:1200, endMs:21200,
 sourceText:'Do not misunderstand. This team provides a substantial improvement, even without an attribute advantage. The increase is at least 15%. Keep the rotation consistent and save the next attack for the stun window.',
 translatedText:'오해하지 마세요. 이 팀이 제공하는 향상은 엄청납니다. 약점 속성 이점을 얻지 못해도 최소 15%는 좋습니다. 순서를 일정하게 유지하고 다음 공격은 그로기 구간까지 아껴 두세요.'};

test('completed paragraphs display as short consecutive speech captions without changing paid translation units',()=>{
 const original=structuredClone(speech), parts=speechDisplayCues([speech]);
 assert.equal(parts.length,3);assert(parts.every(p=>[...p.translatedText].length<=55));
 assert(parts.every(p=>/[.!?。！？]$/u.test(p.translatedText)));
 assert.equal(joined(parts.map(p=>p.translatedText).join('')),joined(speech.translatedText));
 assert.equal(parts[0].startMs,speech.startMs);assert.equal(parts.at(-1).endMs,speech.endMs);
 for(let i=0;i<parts.length;i++){
  assert(parts[i].endMs>parts[i].startMs);assert.equal(parts[i].id,speech.id);assert.equal(parts[i].parentCue,speech);
  if(i)assert.equal(parts[i-1].endMs,parts[i].startMs);
 }
 const index=buildCueIndex(parts);
 for(const p of parts)assert.deepEqual(activeCuesAt(index,p.startMs),[p]);
 assert.equal(activeCuesAt(index,speech.endMs).length,0);
 assert.deepEqual(speech,original);
 const plan=translationPlan([speech],{provider:'gemini',model:'gemini-3.1-flash-lite'});
 assert.equal(plan.requests,1);assert.equal(plan.batches[0].length,1);
});

test('source and bilingual captions retain all words; whitespace-free scripts and emoji stay intact',()=>{
 for(const value of [speech.translatedText,speech.sourceText,'这是没有空格的字幕。为了在播放时便于阅读，需要分成多个连续的短片段。所有文字都必须保留，不能截断或省略。'.repeat(3),'เสียงบรรยายนี้ยาวมากและควรแสดงทีละช่วงเพื่อให้อ่านได้สะดวก'.repeat(4),'長い字幕を順番に表示します。👩‍💻家族👨‍👩‍👧‍👦の絵文字も壊しません。'.repeat(4)]){
  const cue={...speech,sourceText:value,translatedText:value};
  for(const mode of ['source','translated','bilingual']){
   const parts=speechDisplayCues([cue],{mode});assert(parts.length>1);
   assert.equal(joined(parts.map(p=>mode==='source'?p.sourceText:p.translatedText).join('')),joined(value));
   if(mode==='bilingual')assert.equal(joined(parts.map(p=>p.sourceText).join('')),joined(value));
   for(const p of parts){assert(!/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/u.test(p.sourceText));assert(!p.sourceText.startsWith('\u200d'));}
  }
 }
 const short={...speech,startMs:0,endMs:500,sourceText:'Quick Assist',translatedText:'빠른 지원'};
 assert.equal(speechDisplayCues([short]).length,1);
});

test('screen captions and originals remain intact; exported speech uses the same segmentation and saved height',()=>{
 const screen={id:'8',startMs:2000,endMs:8000,sourceText:'Original screen',translatedText:'화면 글자',kind:'screen',region:{x:.1,y:.2,w:.3,h:.1}};
 const hidden={...speech,id:'9',excluded:true}, cues=[speech,screen,hidden], before=structuredClone(cues);
 const parts=speechDisplayCues(cues);
 assert(parts.every(p=>p.id==='7'));
 const vtt=serializeSubtitles(cues,{format:'vtt',positioned:true,speechHeight:.4});
 const exported=parseSubtitles(vtt), voice=exported.filter(c=>c.kind!=='screen');
 assert.equal(voice.length,parts.length);assert.equal(exported.filter(c=>c.kind==='screen').length,1);
 assert.deepEqual(voice.map(c=>[c.startMs,c.endMs,c.sourceText]),parts.map(c=>[c.startMs,c.endMs,c.translatedText]));
 assert(vtt.includes('line:60.00%,end'));assert(vtt.includes('line:20.00%,start'));
 assert.equal(parseSubtitles(serializeSubtitles(cues,{track:'screen'})).length,1);
 for(const mode of ['source','bilingual']){
  const saved=parseSubtitles(serializeSubtitles(cues,{track:'speech',mode}));
  const expected=speechDisplayCues(cues,{mode});assert.equal(saved.length,expected.length);
  assert.equal(joined(saved.map(c=>c.sourceText).join('')),joined(expected.map(c=>mode==='source'?c.sourceText:`${c.sourceText}\n${c.translatedText}`).join('')));
 }
 assert.deepEqual(cues,before);
});
