import http from 'node:http';
import fs from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {ARCHIVE_ID,ARCHIVE_MAX_BYTES,ARCHIVE_LANGUAGES,archiveProject} from '../video/archive.mjs';
import {ArchiveDrive,archiveHash} from './archive-drive.mjs';
const failure=(statusCode,message)=>Object.assign(Error(message),{statusCode});
export function createArchive({directory,drive,fetcher=fetch,now=Date.now}={}){
 fs.mkdirSync(directory,{recursive:true,mode:0o700});const secretPath=join(directory,'abuse.key');if(!fs.existsSync(secretPath))fs.writeFileSync(secretPath,randomBytes(32),{mode:0o600,flag:'wx'});const secret=fs.readFileSync(secretPath);
 const db=new DatabaseSync(join(directory,'archive.sqlite'));db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=2000;CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY,owner TEXT NOT NULL,hash TEXT NOT NULL,file TEXT NOT NULL,bytes INTEGER NOT NULL,videoId TEXT NOT NULL,title TEXT NOT NULL,author TEXT NOT NULL,authorUrl TEXT NOT NULL,sourceLanguage TEXT NOT NULL,targetLanguage TEXT NOT NULL,style TEXT NOT NULL,display TEXT NOT NULL,speechCount INTEGER NOT NULL,screenCount INTEGER NOT NULL,createdAt INTEGER NOT NULL,updatedAt INTEGER NOT NULL,removed INTEGER NOT NULL DEFAULT 0);CREATE INDEX IF NOT EXISTS archive_recent ON entries(removed,createdAt);CREATE TABLE IF NOT EXISTS limits(subject TEXT NOT NULL,day INTEGER NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(subject,day));`);
 const cache=new Map();let cacheBytes=0,inflight=0,reads=0;const pending=new Map(),pendingReads=new Map();
 const owner=value=>{if(!/^[a-f0-9]{64}$/.test(value||''))throw failure(401,'공유 자막 관리 설정을 확인하세요.');return createHash('sha256').update(value).digest('hex');};
 const ipHash=value=>createHmac('sha256',secret).update(String(value)).digest('hex');
 const reserve=(keys)=>{const day=Math.floor(now()/86400000);db.prepare('DELETE FROM limits WHERE day<?').run(day-2);for(const key of keys){const row=db.prepare('SELECT count FROM limits WHERE subject=? AND day=?').get(key,day);if(row?.count>=20)throw failure(429,'오늘의 공유 등록 한도에 도달했습니다.');}for(const key of keys)db.prepare('INSERT INTO limits VALUES(?,?,1) ON CONFLICT(subject,day) DO UPDATE SET count=count+1').run(key,day);};
 const publicEntry=r=>({id:r.id,videoId:r.videoId,title:r.title,author:r.author,authorUrl:r.authorUrl,sourceLanguage:r.sourceLanguage,targetLanguage:r.targetLanguage,style:r.style,display:JSON.parse(r.display),speechCount:r.speechCount,screenCount:r.screenCount,createdAt:r.createdAt,updatedAt:r.updatedAt});
 const row=id=>{if(!ARCHIVE_ID.test(id||''))throw failure(404,'공유 자막을 찾지 못했습니다.');const r=db.prepare('SELECT * FROM entries WHERE id=? AND removed=0').get(id);if(!r)throw failure(404,'공유 자막을 찾지 못했습니다.');return r;};
 async function videoInfo(videoId){
  const url='https://www.youtube.com/oembed?format=json&url='+encodeURIComponent('https://www.youtube.com/watch?v='+videoId);const r=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(12000)});if(!r.ok)throw failure(400,'공개된 원본 유튜브 영상을 확인할 수 없습니다.');const v=await r.json();let author;try{author=new URL(v.author_url);}catch{}
  if(typeof v.title!=='string'||!v.title.trim()||v.title.length>500||typeof v.author_name!=='string'||v.author_name.length>200||!author||author.protocol!=='https:'||author.hostname!=='www.youtube.com'||author.port||author.username||author.password)throw failure(400,'원본 유튜브 영상 정보를 확인하세요.');
  return{title:v.title.trim(),author:v.author_name,authorUrl:author.href};
 }
 async function publish(input,credential,ip){
  const owned=owner(credential),project=archiveProject(input),bytes=Buffer.from(JSON.stringify(project));if(bytes.length>ARCHIVE_MAX_BYTES)throw failure(413,'공유 자막은 16MB까지 지원합니다.');const hash=archiveHash(bytes);
  const existing=db.prepare('SELECT * FROM entries WHERE owner=? AND hash=? AND removed=0').get(owned,hash);if(existing)return publicEntry(existing);
  const key=owned+':'+hash;if(pending.has(key))return pending.get(key);if(inflight>=2)throw failure(503,'공유 등록 요청을 처리하고 있습니다. 잠시 후 다시 시도하세요.');
  reserve(['owner:'+owned,'ip:'+ipHash(ip)]);inflight++;
  const operation=(async()=>{
   const info=await videoInfo(project.videoId);const quota=await drive.quota();if(Number(quota.limit)&&Number(quota.limit)-Number(quota.usage)<bytes.length+100*1048576)throw failure(503,'아카이브 저장소 여유 공간을 확인하고 있습니다.');
   const id=randomBytes(16).toString('hex'),file=await drive.put(id,bytes),at=now(),screenCount=project.cues.filter(c=>c.kind==='screen').length;
   try{db.prepare('INSERT INTO entries(id,owner,hash,file,bytes,videoId,title,author,authorUrl,sourceLanguage,targetLanguage,style,display,speechCount,screenCount,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,owned,hash,file,bytes.length,project.videoId,info.title,info.author,info.authorUrl,project.sourceLanguage,project.targetLanguage,project.style,JSON.stringify(project.display),project.cues.length-screenCount,screenCount,at,at);}catch(error){await drive.remove(file).catch(()=>{});throw error;}return publicEntry(row(id));
  })();pending.set(key,operation);try{return await operation;}finally{pending.delete(key);inflight--;}
 }
 async function readProject(id,videoId){
  const r=row(id);if(videoId!==r.videoId)throw failure(403,'등록된 원본 유튜브 영상에서만 볼 수 있습니다.');
  let cached=cache.get(id);if(cached&&cached.until<=now()){cache.delete(id);cacheBytes-=cached.bytes;cached=null;}
  if(!cached){const bytes=await drive.get(r.file,ARCHIVE_MAX_BYTES);if(archiveHash(bytes)!==r.hash)throw failure(503,'공유 자막 파일이 변경되어 확인이 필요합니다.');const project=archiveProject(JSON.parse(bytes));if(project.videoId!==videoId)throw failure(403,'원본 영상이 일치하지 않습니다.');cached={project,bytes:bytes.length,until:now()+15*60000};while(cache.size&&cacheBytes+bytes.length>32*1048576){const[key,value]=cache.entries().next().value;cache.delete(key);cacheBytes-=value.bytes;}if(bytes.length<=32*1048576){cache.set(id,cached);cacheBytes+=bytes.length;}}
  row(id);return{entry:publicEntry(r),project:cached.project};
 }
 async function play(id,videoId){
  const r=row(id);if(videoId!==r.videoId)throw failure(403,'등록된 원본 유튜브 영상에서만 볼 수 있습니다.');
  if(pendingReads.has(id))return pendingReads.get(id);
  if(reads>=2)throw failure(503,'공유 자막을 처리하지 못했습니다. 잠시 후 다시 시도하세요.');
  reads++;const operation=readProject(id,videoId);pendingReads.set(id,operation);
  try{return await operation;}finally{pendingReads.delete(id);reads--;}
 }
 function list({query='',language='',offset=0}={}){
  if(typeof query!=='string'||query.length>200||language&&!ARCHIVE_LANGUAGES.includes(language)||!Number.isSafeInteger(offset)||offset<0||offset>100000)throw failure(400,'검색 조건을 확인하세요.');
  const q='%'+query.trim().replace(/[\\%_]/g,'\\$&')+'%';const rows=db.prepare("SELECT * FROM entries WHERE removed=0 AND (?='' OR targetLanguage=?) AND (title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\') ORDER BY createdAt DESC,id DESC LIMIT 51 OFFSET ?").all(language,language,q,q,offset);
  return{entries:rows.slice(0,50).map(publicEntry),nextOffset:rows.length>50?offset+50:null};
 }
 async function remove(id,credential){if(!ARCHIVE_ID.test(id||''))throw failure(404,'공유 자막을 찾지 못했습니다.');const r=db.prepare('SELECT * FROM entries WHERE id=?').get(id);if(!r)throw failure(404,'공유 자막을 찾지 못했습니다.');if(owner(credential)!==r.owner)throw failure(403,'이 공유 자막을 관리할 수 없습니다.');db.prepare('UPDATE entries SET removed=1,updatedAt=? WHERE id=?').run(now(),id);const cached=cache.get(id);if(cached){cache.delete(id);cacheBytes-=cached.bytes;}await drive.remove(r.file);return{removed:true};}
 return{publish,play,list,remove,close:()=>db.close(),health:()=>({ready:true,storageConfigured:typeof drive?.configured==='function'?drive.configured():!!drive})};
}
async function jsonBody(req){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw failure(415,'JSON 요청 형식을 확인하세요.');if(Number(req.headers['content-length'])>ARCHIVE_MAX_BYTES)throw failure(413,'공유 자막은 16MB까지 지원합니다.');const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>ARCHIVE_MAX_BYTES)throw failure(413,'공유 자막은 16MB까지 지원합니다.');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks));}catch{throw failure(400,'공유 자막 형식을 확인하세요.');}}
export function archiveServer(archive){
 let receiving=0;const allowedOrigin='https://odarom.github.io';const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
  const origin=req.headers.origin;if(origin){if(origin!==allowedOrigin&&!/^chrome-extension:\/\/[a-p]{32}$/.test(origin)){res.writeHead(403);res.end();return;}res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
  try{if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-ZZZ-Archive-Owner'});res.end();return;}const url=new URL(req.url,'http://localhost');
   if(req.method==='GET'&&url.pathname==='/api/archive/health')return send(200,archive.health());
   if(url.pathname==='/api/archive/entries'){if(req.method==='GET')return send(200,archive.list({query:url.searchParams.get('q')||'',language:url.searchParams.get('language')||'',offset:Number(url.searchParams.get('offset')||0)}));if(req.method==='POST'){if(!/^[a-f0-9]{64}$/.test(req.headers['x-zzz-archive-owner']||'')){req.resume();throw failure(401,'공유 자막 관리 설정을 확인하세요.');}if(receiving){req.resume();throw failure(503,'공유 등록 요청을 처리하고 있습니다. 잠시 후 다시 시도하세요.');}receiving++;try{return send(201,await archive.publish(await jsonBody(req),req.headers['x-zzz-archive-owner'],req.headers['x-forwarded-for']||req.socket.remoteAddress));}finally{receiving--;}}}
   const match=/^\/api\/archive\/entries\/([a-f0-9]{32})(\/play)?$/.exec(url.pathname);if(match){if(req.method==='GET'&&match[2])return send(200,await archive.play(match[1],url.searchParams.get('videoId')));if(req.method==='DELETE'&&!match[2])return send(200,await archive.remove(match[1],req.headers['x-zzz-archive-owner']));}send(404,{error:'요청한 공유 기능을 찾지 못했습니다.'});
  }catch(error){if(!res.headersSent)send(error.statusCode||400,{error:error.statusCode?error.message:'공유 자막을 처리하지 못했습니다. 잠시 후 다시 시도하세요.'});else res.end();}
 });server.requestTimeout=65000;server.headersTimeout=10000;server.maxConnections=50;return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const directory=resolve(process.env.ZZZ_ARCHIVE_DATA||'data/archive');const archive=createArchive({directory,drive:new ArchiveDrive({credentialsPath:join(directory,'google.json')})});const server=archiveServer(archive);server.listen(4324,'127.0.0.1');for(const signal of['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>{archive.close();process.exit(0);}));}
