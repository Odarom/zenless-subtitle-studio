import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {once} from 'node:events';
import vm from 'node:vm';
import {createVideoServer} from '../video/server.mjs';
import {cueAction,saveSpeechPosition} from '../video/extension/background.mjs';
import {parseSubtitles,subtitleSpeechHeight} from '../video/subtitles.mjs';
import {reviewCues} from '../video/review.mjs';
import {translations} from '../video/public/locales.mjs';
import * as geometry from '../video/geometry.mjs';
import {speechDisplayCues} from '../video/speech-cues.mjs';

const videoId='dQw4w9WgXcQ',extensionId='test-extension',token='a'.repeat(64);
const sender={id:extensionId,frameId:0,tab:{id:12,url:`https://www.youtube.com/watch?v=${videoId}`}};
const region={x:.2,y:.2,w:.3,h:.05};
const input=[{id:'1',startMs:0,endMs:3000,sourceText:'Speech line.'},{id:'2',startMs:0,endMs:3000,sourceText:'First screen.',kind:'screen',region},{id:'3',startMs:4000,endMs:5000,sourceText:'Second screen.',kind:'screen',region}];
const tick=()=>new Promise(done=>setTimeout(done,5));
async function fixture(t){
 const parent=resolve('.tools/cue-action-tests');fs.mkdirSync(parent,{recursive:true});const root=fs.mkdtempSync(join(parent,'case-'));
 fs.mkdirSync(join(root,'glossary'));fs.copyFileSync('glossary/zzz.json',join(root,'glossary/zzz.json'));
 const app=createVideoServer({root,token,jobsOptions:{prepare:async()=>({cues:input,origin:'test'})}});app.glossary.configure({enabled:false,autoCheck:false});
 t.after(async()=>{if(app.server.listening){app.server.closeAllConnections();await new Promise(done=>app.server.close(done));}const scope=relative(parent,resolve(root));assert(scope&&!scope.startsWith('..'));fs.rmSync(root,{recursive:true,force:true});});
 const job=app.jobs.create({input:{youtubeUrl:`https://www.youtube.com/watch?v=${videoId}`},options:{transcribeOnly:true,screenText:true}});
 for(let i=0;i<100&&app.jobs.get(job.id).status!=='completed';i++)await tick();assert.equal(app.jobs.get(job.id).status,'completed');
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
 const base=`http://127.0.0.1:${app.server.address().port}`;
 const api=(path,options={})=>fetch(base+path,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...options.headers}});
 return{app,job,api,base};
}

test('individual deletion is reversible, persists, filters all export formats and leaves other cues untouched',async t=>{
 const{app,job,api}=await fixture(t),before=await(await api(`/api/jobs/${job.id}/export?format=srt`)).text();
 const change=excluded=>api(`/api/jobs/${job.id}`,{method:'PATCH',body:JSON.stringify({changes:[{id:'2',excluded}]})});
 assert.equal((await change(true)).status,200);
 const saved=JSON.parse(fs.readFileSync(join(app.jobs.directory(job.id),'job.json')));assert.equal(saved.cues[1].excluded,true);assert.equal(saved.cues[0].sourceText,input[0].sourceText);
 assert.deepEqual(reviewCues(saved.cues,{track:'deleted'}).map(c=>c.id),['2']);assert.equal(reviewCues(saved.cues,{track:'all'}).length,2);
 for(const format of ['srt','vtt','json'])for(const track of ['all','speech','screen']){
   const response=await api(`/api/jobs/${job.id}/export?format=${format}&track=${track}`);assert.equal(response.status,200);const text=await response.text();assert(!text.includes('First screen.'));
   assert.equal(text.includes('Speech line.'),track!=='screen');assert.equal(text.includes('Second screen.'),track!=='speech');
 }
 const positioned=await(await api(`/api/jobs/${job.id}/export?format=vtt&track=screen&positioned=1`)).text();assert(positioned.includes('position:20.00%'));
 assert.equal((await api(`/api/jobs/${job.id}/export?track=wrong`)).status,400);
 assert.equal((await api(`/api/jobs/${job.id}`,{method:'PATCH',body:JSON.stringify({changes:[{id:'2',excluded:'yes'}]})})).status,400);
 await change(false);assert.equal(await(await api(`/api/jobs/${job.id}/export?format=srt`)).text(),before);
});

test('YouTube action relay validates origin, video and cue before using the local connection token',async()=>{
 const message={action:'exclude',jobId:'a'.repeat(36),cueId:'2',videoId,excluded:true};let tokenReads=0,calls=0;
 const deps={extensionId,getToken:async()=>{tokenReads++;return token;},fetcher:async()=>{calls++;throw new Error('must not fetch');}};
 for(const [request,origin]of [[message,{...sender,id:'other'}],[message,{...sender,frameId:3}],[message,{...sender,tab:{id:12,url:'https://evil.example/watch?v='+videoId}}],[message,{...sender,tab:{id:12,url:'https://www.youtube.com:444/watch?v='+videoId}}],[{...message,videoId:'abcdefghijk'},sender],[{...message,cueId:'../settings'},sender],[{...message,jobId:'../settings'},sender]])await assert.rejects(cueAction(request,origin,deps));
 assert.equal(tokenReads,0);assert.equal(calls,0);
});

test('speech position and edits persist into JSON and positioned VTT, leave SRT timing unchanged, and restore when reimported',async t=>{
 const {app,job,api,base}=await fixture(t),original=JSON.stringify(app.jobs.get(job.id).cues);
 const store={get:async()=>({displaySettings:{fontSize:28}}),set:async()=>{}};
 await saveSpeechPosition({videoId,jobId:job.id,speechHeight:.4},sender,{extensionId,storage:store,getToken:async()=>token,fetcher:(url,init)=>fetch(url.replace('http://127.0.0.1:4318',base),init)});
 assert.equal(JSON.parse(fs.readFileSync(join(app.jobs.directory(job.id),'job.json'))).speechHeight,.4);
 assert.equal(JSON.stringify(app.jobs.get(job.id).cues),original);
 const patch=await api(`/api/jobs/${job.id}`,{method:'PATCH',body:JSON.stringify({changes:[{id:'1',translatedText:'수정한 음성 자막'},{id:'2',excluded:true}]})});assert.equal(patch.status,200);
 const project=await(await api(`/api/jobs/${job.id}/export?format=json`)).json();assert.equal(project.display.speechHeight,.4);assert.equal(project.cues[0].translatedText,'수정한 음성 자막');assert.equal(project.cues.some(c=>c.id==='2'),false);
 const vtt=await(await api(`/api/jobs/${job.id}/export?format=vtt&positioned=1`)).text();assert(vtt.includes('line:60.00%,end position:50.00%,center'));assert(vtt.includes('position:20.00%,line-left'));assert(vtt.includes('수정한 음성 자막'));assert(!vtt.includes('First screen.'));
 assert.equal(subtitleSpeechHeight(vtt),.4);assert.equal(parseSubtitles(vtt)[0].kind,undefined);assert.equal(parseSubtitles(vtt)[1].kind,'screen');
 const srt=await(await api(`/api/jobs/${job.id}/export?format=srt&positioned=1`)).text();assert(!srt.includes('position:'));assert(srt.includes('00:00:00,000 --> 00:00:03,000'));assert(srt.includes('수정한 음성 자막'));
 for(const speechHeight of [null,'0.5',-1,1])assert.equal((await api(`/api/jobs/${job.id}`,{method:'PATCH',body:JSON.stringify({speechHeight})})).status,400);
 assert.equal(app.jobs.get(job.id).speechHeight,.4);
 const calls=[];await assert.rejects(saveSpeechPosition({videoId,jobId:job.id,speechHeight:.6},sender,{extensionId,storage:store,getToken:async()=>token,fetcher:async(_url,init)=>{calls.push(init.method);return new Response(JSON.stringify({status:'completed',videoId:'abcdefghijk'}));}}));assert.deepEqual(calls,['GET']);
});

test('relay edits only the selected job and retries a saved report without creating it twice or exposing keys',async t=>{
 const{app,job,base}=await fixture(t);let creates=0,sends=0;const paths=[];
 const deps={extensionId,getToken:async()=>token,fetcher:async(url,init)=>{
   assert(url.startsWith('http://127.0.0.1:4318/'));paths.push(new URL(url).pathname);
   if(url.endsWith('/send')){sends++;return new Response(JSON.stringify(sends===1?{error:'Test send unavailable'}:{receiptId:'A-20261019-123456abcdef'}),{status:sends===1?503:200});}
   if(url.endsWith('/api/reports')&&init.method==='POST')creates++;
   return fetch(url.replace('http://127.0.0.1:4318',base),init);
 }};
 const bound={jobId:job.id,cueId:'2',videoId};
 assert.deepEqual(await cueAction({...bound,action:'exclude',excluded:true},sender,deps),{ok:true,excluded:true});assert.equal(app.jobs.get(job.id).cues[1].excluded,true);
 const issue={type:'meaning',explanation:'Test report',suggestion:'',includeVideoUrl:false};
 const failed=await cueAction({...bound,action:'report',issue},sender,deps);assert(failed.error);assert(failed.reportId);
 const done=await cueAction({...bound,action:'report',issue,reportId:failed.reportId},sender,deps);assert.equal(done.receiptId,'A-20261019-123456abcdef');assert.equal(creates,1);assert.equal(sends,2);
 assert(!JSON.stringify(done).includes(token));assert(paths.every(path=>/^\/api\/(?:jobs|reports)\//.test(path)||path==='/api/reports'));
 await cueAction({...bound,action:'exclude',excluded:false},{...sender,tab:{id:12},url:sender.tab.url},deps);assert.equal(app.jobs.get(job.id).cues[1].excluded,false);
});

test('reporting a short display piece saves the full matching source/translation pair and rejects stale captions',async t=>{
 const{app,job,base,api}=await fixture(t);
 const cue={id:'1',startMs:0,endMs:20000,sourceText:'The first sentence establishes the context. The second sentence explains the condition. The final sentence states the result.',translatedText:'첫 문장은 문맥을 설명합니다. 두 번째 문장은 조건을 설명합니다. 마지막 문장은 그 조건에 맞는 결과를 알려 줍니다. 긴 문장도 빠뜨리지 않습니다.'};
 const saved=app.jobs.get(job.id);saved.cues=[cue];saved.options.transcribeOnly=false;saved.options.targetLanguage='ko';app.jobs.save(saved);
 const piece=speechDisplayCues(saved.cues).at(-1);assert.notEqual(piece.translatedText,cue.translatedText);
 const expectedCue={sourceText:piece.parentCue.sourceText,translatedText:piece.parentCue.translatedText};
 const deps={extensionId,getToken:async()=>token,fetcher:async(url,init)=>url.endsWith('/send')?Response.json({receiptId:'A-20261023-123456abcdef'}):fetch(url.replace('http://127.0.0.1:4318',base),init)};
 const request={action:'report',jobId:job.id,videoId,cueId:piece.parentCue.id,expectedCue,issue:{type:'meaning',explanation:'Incorrect condition',suggestion:''}};
 const result=await cueAction(request,sender,deps);assert(result.ok);const report=app.reports.get(result.reportId);
 assert.equal(report.source.text,cue.sourceText);assert.equal(report.target.text,cue.translatedText);assert.equal(report.video.startMs,cue.startMs);assert.equal(report.video.endMs,cue.endMs);
 saved.cues[0]={...cue,translatedText:'Changed after opening the menu'};app.jobs.save(saved);
 await assert.rejects(cueAction(request,sender,deps),/자막이 변경/);assert.equal(app.reports.list().length,1);
 const response=await api('/api/reports',{method:'POST',body:JSON.stringify({jobId:job.id,cueId:cue.id,expectedCue,type:'meaning',explanation:'Stale direct submission'})});assert.equal(response.status,400);assert.equal(app.reports.list().length,1);
});

test('clicking YouTube screen subtitles opens a localized menu, stops player click propagation, reports and restores deletion',async()=>{
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.style={};this.attributes={};this.hidden=false;this.textContent='';this.value='';}
  append(...items){for(const item of items){item.parentNode=this;this.children.push(item);if(this.tagName==='SELECT'&&this.children.length===1)this.value=item.value;}}
  prepend(item){item.parentNode=this;this.children.unshift(item);}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(item=>item!==this);}
  setAttribute(key,value){this.attributes[key]=value;}
  attachShadow(){this.shadow=new Element('shadow');return this.shadow;}
  getBoundingClientRect(){return{left:0,top:0,width:1280,height:720};}
  showModal(){this.open=true;}close(){this.open=false;}focus(){}
 }
 let listener,frame;const messages=[];
 const video={currentTime:1,videoWidth:1280,videoHeight:720,paused:false,pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();},getBoundingClientRect:()=>({left:0,top:0,width:1280,height:720})};
 const player=new Element();player.querySelector=()=>video;player.classList={contains:()=>false};
 const context={URL,location:{href:`https://www.youtube.com/watch?v=${videoId}`},document:{querySelector:()=>player,createElement:tag=>new Element(tag)},requestAnimationFrame:fn=>{frame=fn;},__zzzGeometry:geometry,__zzzOverlayI18n:translations,
  chrome:{runtime:{id:extensionId,onMessage:{addListener:fn=>{listener=fn;}},sendMessage:async message=>{messages.push(message);return message.action==='exclude'?{ok:true,excluded:message.excluded}:{ok:true,reportId:'V-20261019-123456abcdef',receiptId:'A-20261019-123456abcdef'};}}}};
 vm.runInNewContext(fs.readFileSync('video/extension/content.js','utf8'),context);
 let response;listener({type:'ZZZ_SUBTITLES_LOAD',jobId:'a'.repeat(36),videoId,cues:[{...input[1],id:'53',translatedText:'<img src=x onerror=alert(1)>'}],settings:{uiLanguage:'en'}},{id:extensionId},value=>{response=value;});assert(response.ok);frame(0);
 const host=player.children[0],screen=host.shadow.children[2],caption=screen.children[0].children[1];let prevented=0,stopped=0;const event={preventDefault:()=>{prevented++;},stopPropagation:()=>{stopped++;}};
 assert.equal(caption.tagName,'BUTTON');assert.equal(caption.style.pointerEvents,'auto');caption.onclick(event);assert.equal(prevented,1);assert.equal(stopped,1);assert.equal(video.paused,true);
 const dialog=host.shadow.children.at(-1),buttons=dialog.children.find(el=>el.tagName==='DIV'),form=dialog.children.find(el=>el.tagName==='FORM');
 assert.equal(buttons.children[1].textContent,'Delete subtitle');assert.equal(dialog.children[2].textContent,'<img src=x onerror=alert(1)>');
 await buttons.children[1].onclick();frame(10);assert.equal(screen.children.length,0);assert.equal(messages[0].cueId,'53');assert.equal(buttons.children[1].textContent,'Restore subtitle');
 await buttons.children[1].onclick();frame(20);assert.equal(screen.children.length,1);
 buttons.children[2].onclick();assert.equal(form.hidden,false);
 form.children[1].children[0].value='Test report';await form.onsubmit(event);assert.equal(messages.at(-1).issue.explanation,'Test report');assert.equal(messages.at(-1).issue.includeVideoUrl,false);
 assert(dialog.children.at(-1).textContent.includes('A-20261019-123456abcdef'));
 buttons.children[0].onclick();assert.equal(video.paused,false);assert.equal(dialog.open,false);assert(!JSON.stringify(messages).includes(token));
});
