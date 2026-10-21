import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as position from '../video/speech-position.mjs';
import * as geometry from '../video/geometry.mjs';
import {saveSpeechPosition} from '../video/extension/background.mjs';
import {translations} from '../video/public/locales.mjs';

const videoId='dQw4w9WgXcQ',extensionId='test';
const event=(extra={})=>({button:0,isPrimary:true,pointerId:1,clientY:500,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra});

test('speech handle captures dragging without caption clicks; saves on release, cancels on loss and supports keyboard reset',()=>{
 const handle={dataset:{},setPointerCapture(id){this.capture=id;},hasPointerCapture(id){return this.capture===id;},releasePointerCapture(){this.capture=null;}};
 let height=.11;const saves=[];
 const cancel=position.bindSpeechDrag(handle,{getHeight:()=>height,getRect:()=>({height:500}),setHeight:value=>{height=value;},commit:value=>saves.push(value)});
 const down=event();handle.onpointerdown(down);assert(down.prevented&&down.stopped);assert.equal(handle.capture,1);
 handle.onpointermove(event({clientY:499}));assert.equal(height,.11);
 handle.onpointermove(event({clientY:350,pointerId:2}));assert.equal(height,.11);
 handle.onpointermove(event({clientY:350}));assert(Math.abs(height-.41)<.00001);assert.equal(saves.length,0);
 handle.onpointerup(event());assert.deepEqual(saves,[height]);assert.equal(handle.capture,null);
 const click=event();handle.onclick(click);assert(click.prevented&&click.stopped);assert.equal(saves.length,1);
 handle.onpointerdown(event());handle.onpointermove(event({clientY:0}));assert.equal(height,.9);handle.onlostpointercapture(event());assert.equal(height,saves[0]);
 handle.onpointerdown(event());handle.onpointermove(event({clientY:0}));cancel();assert.equal(height,saves[0]);assert.equal(handle.dataset.dragging,undefined);
 const key=event({key:'ArrowUp'});handle.onkeydown(key);assert(key.prevented&&key.stopped);assert(height>saves[0]);
 handle.onkeydown(event({key:'Home'}));assert.equal(height,.11);assert.equal(saves.at(-1),.11);
 const count=saves.length;handle.onpointerdown(event({button:2}));handle.onpointermove(event({clientY:50}));handle.onpointerup(event());assert.equal(saves.length,count);
});

test('letterboxing, fullscreen resizing, tall captions and cropped video keep speech inside the visible player',()=>{
 for(const [width,height]of[[1280,720],[1920,1080],[600,900]]){
  const outer={left:15,top:30,width,height},content=geometry.videoContentRect(outer,1920,1080);
  const base=position.speechPlacement(content,outer,.11,80),moved=position.speechPlacement(content,outer,.5,80);
  assert(moved.top<base.top);assert(base.left>=0&&base.width<=width);
  const edge=position.speechPlacement(content,outer,.9,Math.min(content.height-16,300));assert(edge.top>=content.top-outer.top);
  const bottom=position.speechPlacement(content,outer,0,80);assert(bottom.top+80<=content.top-outer.top+content.height);
  const safeBottom=Math.min(content.top-outer.top+content.height,height-64);
  assert(base.top+80<safeBottom);assert(bottom.top+80<=safeBottom);
 }
 const outer={left:0,top:0,width:500,height:500},crop=geometry.videoContentRect(outer,1920,1080,'cover');
 const placed=position.speechPlacement(crop,outer,.5,100);assert(placed.left>=0);assert(placed.left+placed.width<=500);assert(placed.top>=0&&placed.top+100<=500);
 const tallControls=position.speechPlacement(outer,outer,0,80,110);assert(tallControls.top+80<=390);
 assert.equal(position.speechHeight(NaN),.11);assert.equal(position.speechHeight(-1),0);
});

test('extension only saves a numeric viewing height from its own YouTube content script, without reading or returning secrets',async()=>{
 const sender={id:extensionId,frameId:0,url:`https://www.youtube.com/watch?v=${videoId}`,tab:{id:5}};
 const reads=[],writes=[],saved={mode:'source',fontSize:32,showScreen:false};
 const storage={get:async key=>{reads.push(key);return{displaySettings:saved};},set:async value=>writes.push(value)};
 const message={videoId,speechHeight:.5,connectionToken:'not-to-be-stored',sourceText:'not-to-be-stored'};
 for(const origin of [{...sender,id:'other'},{...sender,frameId:3},{...sender,url:'https://evil.example/watch?v='+videoId},{...sender,url:'https://www.youtube.com:99/watch?v='+videoId}])await assert.rejects(saveSpeechPosition(message,origin,{extensionId,storage}));
 for(const speechHeight of [-1,1,'0.5',NaN])await assert.rejects(saveSpeechPosition({...message,speechHeight},sender,{extensionId,storage}));
 assert.equal(reads.length,0);
 assert.deepEqual(await saveSpeechPosition(message,sender,{extensionId,storage}),{ok:true});
 assert.deepEqual(reads,['displaySettings']);assert.deepEqual(writes,[{displaySettings:{...saved,speechHeight:.5}}]);
});

test('YouTube speech dragging does not open the report menu or pause playback, while caption click still does',async()=>{
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.style={setProperty(k,v){this[k]=v;}};this.dataset={};this.attributes={};this.textContent='';this.hidden=false;}
  append(...items){for(const item of items){item.parentNode=this;this.children.push(item);}}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(item=>item!==this);}
  setAttribute(k,v){this.attributes[k]=v;}attachShadow(){return this.shadow=new Element();}
  getBoundingClientRect(){return this===player?{left:0,top:0,width:1280,height:720}:{left:0,top:0,width:1152,height:85};}
  setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}
  showModal(){this.open=true;}close(){this.open=false;}
 }
 let listener,frame;const messages=[];
 const video={currentTime:1,videoWidth:1280,videoHeight:720,paused:false,pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();},getBoundingClientRect:()=>player.getBoundingClientRect()};
 let controlsHidden=false;const control={getBoundingClientRect:()=>({left:0,top:600,width:1280,height:120})};
 const player=new Element();player.querySelector=()=>video;player.querySelectorAll=()=>[control];player.classList={contains:name=>name==='ytp-autohide'&&controlsHidden};
 const context={URL,location:{href:`https://www.youtube.com/watch?v=${videoId}`},getComputedStyle:()=>({opacity:'1',visibility:'visible',display:'block',objectFit:'contain'}),document:{querySelector:()=>player,createElement:tag=>new Element(tag)},requestAnimationFrame:fn=>{frame=fn;},__zzzGeometry:geometry,__zzzSpeechPosition:position,__zzzOverlayI18n:translations,
 chrome:{runtime:{id:extensionId,onMessage:{addListener:fn=>{listener=fn;}},sendMessage:async value=>{messages.push(value);return{ok:true};}}}};
 vm.runInNewContext(fs.readFileSync('video/extension/content.js','utf8'),context);
 const send=value=>{let response;listener(value,{id:extensionId},r=>{response=r;});assert(response.ok,response.error);};
 const cues=[{id:'1',startMs:0,endMs:5000,sourceText:'Speech',translatedText:'음성 자막'},{id:'2',kind:'screen',startMs:0,endMs:5000,sourceText:'Screen',region:{x:.2,y:.78,w:.3,h:.1}},{id:'3',startMs:5000,endMs:10000,sourceText:'Next speech line',translatedText:'다음 음성 자막'}],before=JSON.stringify(cues);
 send({type:'ZZZ_SUBTITLES_LOAD',videoId,cues,settings:{uiLanguage:'en'}});frame(1);
 const host=player.children[0],speech=host.shadow.children[1],screen=host.shadow.children[2],label=speech.children[0],handle=speech.children[1],top=parseFloat(speech.style.top),ocrTop=screen.children[0].style.top;
 handle.onpointerdown(event());handle.onpointermove(event({clientY:300}));handle.onpointerup(event());handle.onclick(event());frame(2);await Promise.resolve();
 assert(parseFloat(speech.style.top)<top);assert.equal(video.paused,false);assert.equal(host.shadow.children.length,3);assert.equal(screen.children[0].style.top,ocrTop);assert.equal(JSON.stringify(cues),before);
 assert.equal(parseFloat(ocrTop),720*.78);assert(Math.abs(parseFloat(screen.children[0].style['--zzz-hit-cut'])-54.6)<.001);
 controlsHidden=true;frame(2.5);assert.equal(screen.children[0].style.top,ocrTop);assert.equal(screen.children[0].style['--zzz-hit-cut'],'0px');
 const movedTop=speech.style.top;video.currentTime=6;frame(2.6);assert.equal(label.textContent,'다음 음성 자막');assert.equal(speech.style.top,movedTop);
 video.currentTime=1;frame(2.7);
 assert.equal(messages.length,1);assert.equal(messages[0].type,'ZZZ_SPEECH_POSITION');assert(!JSON.stringify(messages).includes('음성'));
 label.onclick(event());assert.equal(video.paused,true);assert.equal(host.shadow.children.at(-1).open,true);
 await new Promise(resolve=>listener({type:'ZZZ_SUBTITLES_SETTINGS',settings:{speechHeight:.11}},{id:extensionId},value=>{assert(value.ok);resolve();}));frame(3);assert.equal(parseFloat(speech.style.top),top);
});
