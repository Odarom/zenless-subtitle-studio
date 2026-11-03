import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as geometry from '../video/geometry.mjs';
import {createI18n} from '../video/public/i18n.mjs';

const videoId='abcdefghijk', archiveId='a'.repeat(32), jobId='b'.repeat(8)+'-1234-1234-1234-'+ 'b'.repeat(12);
const cues=[{id:'1',startMs:0,endMs:5000,sourceText:'Speech',translatedText:'음성 번역'},{id:'2',startMs:0,endMs:5000,sourceText:'Screen',translatedText:'화면 번역',kind:'screen',region:{x:.2,y:.2,w:.4,h:.1}}];
class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.attributes={};this.hidden=false;this.textContent='';this.value='';this.listeners={};this.checked=true;}
  append(...items){for(const item of items){item.parentNode=this;this.children.push(item);}}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);}
  setAttribute(key,value){this.attributes[key]=value;}
  attachShadow(){this.shadow=new Element();return this.shadow;}
  getBoundingClientRect(){return{left:0,top:0,width:1280,height:720};}
  addEventListener(type,callback){this.listeners[type]=callback;}
  replaceChildren(...items){this.children=[];this.append(...items);}
}
function content(archive=false){
  const player=new Element(),video={currentTime:1,videoWidth:1280,videoHeight:720,paused:true,getBoundingClientRect:()=>({left:0,top:0,width:1280,height:720})};
  player.querySelector=()=>video;player.classList={contains:()=>false};
  let frame,listener,requests=0;
  const context={URL,location:{href:'https://www.youtube.com/watch?v='+videoId+(archive?'&zzzArchive='+archiveId:'')},document:{querySelector:()=>player,createElement:tag=>new Element(tag)},requestAnimationFrame:fn=>frame=fn,__zzzGeometry:geometry,__zzzSpeechPosition:{speechHeight:value=>value,speechPlacement:()=>({top:0}),bindSpeechDrag:()=>()=>{}},chrome:{runtime:{id:'extension-test',onMessage:{addListener:fn=>listener=fn},sendMessage:async()=>{requests++;return{archiveId,videoId,cues,settings:{speechHeight:.4,fontSize:32}};}}}};
  vm.runInNewContext(fs.readFileSync('video/extension/content.js','utf8'),context);
  return{context,player,video,requests:()=>requests,frame:now=>frame(now),message:(type,fields={},sender='extension-test')=>{let result;listener({type,...fields},{id:sender},value=>result=value);return result;}};
}

test('hide/show keeps speech and screen cues loaded and restores them at the current video time without a PC/API call',()=>{
  const f=content();
  assert.equal(f.message('ZZZ_SUBTITLES_STATE').loaded,false);
  assert.match(f.message('ZZZ_SUBTITLES_TOGGLE').error,/먼저 자막/);
  f.message('ZZZ_SUBTITLES_LOAD',{videoId,jobId,cues,settings:{speechHeight:.4,fontSize:32}});f.frame(0);
  const host=f.player.children.find(e=>e.shadow);assert(host);assert.equal(host.hidden,false);
  const speech=host.shadow.children.find(e=>e.className==='speech');assert.equal(speech.children[0].textContent,'음성 번역');
  assert.equal(f.message('ZZZ_SUBTITLES_TOGGLE').hidden,true);f.frame(600);assert.equal(host.hidden,true);
  const hidden=f.message('ZZZ_SUBTITLES_STATE');assert.equal(hidden.loaded,true);assert.equal(hidden.hidden,true);
  f.message('ZZZ_SUBTITLES_SETTINGS',{settings:{fontSize:35}});f.frame(700);assert.equal(host.hidden,true);
  assert.equal(f.message('ZZZ_SUBTITLES_TOGGLE').hidden,false);f.frame(800);assert.equal(host.hidden,false);
  assert.equal(f.player.children.find(e=>e.shadow),host);assert.equal(speech.children[0].textContent,'음성 번역');
  assert.equal(f.requests(),0);
  assert.equal(f.message('ZZZ_SUBTITLES_STATE',{},'other-extension'),undefined);
  f.context.location.href='https://www.youtube.com/watch?v=other-video';f.frame(1400);
  assert.equal(f.message('ZZZ_SUBTITLES_STATE').loaded,false);assert.match(f.message('ZZZ_SUBTITLES_SHOW').error,/먼저 자막/);
});

test('archive captions can be shown again without refetching, reapplying or needing the PC studio',async()=>{
  const f=content(true);f.frame(0);await new Promise(done=>setImmediate(done));f.frame(100);
  assert.equal(f.requests(),1);const host=f.player.children.find(e=>e.shadow);assert(host&&!host.hidden);
  f.message('ZZZ_SUBTITLES_HIDE');f.frame(600);assert.equal(host.hidden,true);assert.equal(f.message('ZZZ_SUBTITLES_STATE').loaded,true);
  f.message('ZZZ_SUBTITLES_SHOW');f.frame(1200);assert.equal(host.hidden,false);assert.equal(f.requests(),1);
  f.message('ZZZ_SUBTITLES_HIDE');f.message('ZZZ_SUBTITLES_LOAD',{videoId,cues,settings:{}});f.frame(1300);
  assert.equal(f.message('ZZZ_SUBTITLES_STATE').hidden,false);
});

test('popup reads hidden state when reopened and toggles its label in all four UI languages without accessing PC/API',async()=>{
  const source=fs.readFileSync('video/extension/popup.mjs','utf8').replace(/^import .+;\r?\n/gm,'');
  for(const[locale,show,hide]of[['ko','자막 보이기','자막 숨기기'],['en','Show subtitles','Hide subtitles'],['ja','字幕を表示','字幕を非表示'],['zh-CN','显示字幕','隐藏字幕']]){
    let hidden=true;const elements=new Map(),sent=[];
    const element=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
    const context={createI18n,bindDocument:()=>()=>{},parseSubtitles:()=>[],validateCues:x=>x,youtubeVideoId:()=>videoId,subtitleSpeechHeight:()=>.11,speechHeight:value=>value??.11,DEFAULT_SPEECH_HEIGHT:.11,navigator:{languages:[locale]},document:{getElementById:element},fetch:()=>assert.fail('PC/API must not be contacted'),chrome:{tabs:{query:async()=>[{id:1,url:'https://www.youtube.com/watch?v='+videoId,title:'Video'}],sendMessage:async(_,message)=>{sent.push(message.type);if(message.type==='ZZZ_SUBTITLES_TOGGLE')hidden=!hidden;return{ok:true,loaded:true,hidden};}},storage:{local:{setAccessLevel:async()=>{},get:async()=>({uiLanguage:locale}),set:async()=>{}},onChanged:{addListener:()=>{}}}}};
    await vm.runInNewContext('(async()=>{'+source+'})()',context);
    assert.equal(element('hide').textContent,show,locale);assert.equal(element('hide').disabled,false);
    await element('hide').listeners.click();assert.equal(element('hide').textContent,hide,locale);
    await element('hide').listeners.click();assert.equal(element('hide').textContent,show,locale);
    assert.deepEqual(sent,['ZZZ_SUBTITLES_STATE','ZZZ_SUBTITLES_TOGGLE','ZZZ_SUBTITLES_TOGGLE']);
  }
});
