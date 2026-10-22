import http from 'node:http';
import fs from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {saveDriveCredentials} from '../services/archive-drive.mjs';
const root=resolve(import.meta.dirname,'..'),clientPath=resolve(root,'.secrets/archive-oauth-client.json'),output=resolve(root,'.secrets/archive-google.json');
let config;try{config=JSON.parse(fs.readFileSync(clientPath,'utf8')).installed;}catch{}
if(!config?.client_id||!config?.client_secret)throw Error('운영자용 데스크톱 OAuth 설정 파일을 먼저 준비하세요.');
const session=randomBytes(32).toString('hex'),port=14325,origin='http://127.0.0.1:'+port,redirect=origin+'/oauth/callback';let pending,completed=false;
const page='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ZZZ 아카이브 저장소 연결</title><style>body{max-width:650px;margin:80px auto;background:#111712;color:#f2f5ec;font:17px/1.8 system-ui;padding:24px}h1{font-size:30px}button{background:#d9fd68;border:0;border-radius:7px;padding:14px 22px;font:inherit;cursor:pointer}p{color:#c0c9bd}#status{white-space:pre-wrap}</style><h1>아카이브용 구글 드라이브 연결</h1><p>공유용 구글 계정으로 연결하세요. 앱이 만들거나 직접 선택한 파일만 접근하는 권한을 요청합니다. 연결 정보는 공개 배포 파일에 넣지 않습니다.</p><button id="connect">구글 계정 연결</button><p id="status" role="status"></p><script src="/connect.js"></script></html>';
const js=`const session=location.hash.slice(1);history.replaceState(null,'','/');document.getElementById('connect').onclick=async()=>{const r=await fetch('/start',{method:'POST',headers:{'X-ZZZ-Session':session}});const v=await r.json();if(!r.ok){document.getElementById('status').textContent=v.error;return;}location.href=v.url;};`;
const server=http.createServer(async(req,res)=>{
 const send=(code,type,value)=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"});res.end(value);};
 try{
  if(req.headers.host!=='127.0.0.1:'+port||req.headers.origin&&req.headers.origin!==origin)return send(403,'text/plain','로컬 연결 화면에서 사용하세요.');
  const url=new URL(req.url,origin);
  if(req.method==='GET'&&url.pathname==='/')return send(200,'text/html; charset=utf-8',page);
  if(req.method==='GET'&&url.pathname==='/connect.js')return send(200,'text/javascript; charset=utf-8',js);
  if(req.method==='POST'&&url.pathname==='/start'){
   if(req.headers['x-zzz-session']!==session||completed)return send(403,'application/json',JSON.stringify({error:'연결 화면을 다시 열어주세요.'}));
   const verifier=randomBytes(48).toString('base64url'),state=randomBytes(32).toString('hex');pending={state,verifier,until:Date.now()+10*60000};
   const auth=new URL('https://accounts.google.com/o/oauth2/v2/auth');for(const[key,value]of Object.entries({client_id:config.client_id,redirect_uri:redirect,response_type:'code',scope:'https://www.googleapis.com/auth/drive.file',access_type:'offline',prompt:'consent select_account',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}))auth.searchParams.set(key,value);
   return send(200,'application/json',JSON.stringify({url:auth.href}));
  }
  if(req.method==='GET'&&url.pathname==='/oauth/callback'){
   if(!pending||pending.until<Date.now()||pending.state!==url.searchParams.get('state')||!url.searchParams.get('code'))return send(400,'text/plain; charset=utf-8','구글 연결이 취소되었거나 만료되었습니다. 연결 화면에서 다시 시작하세요.');
   const active=pending;pending=null;const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),body:new URLSearchParams({code:url.searchParams.get('code'),client_id:config.client_id,client_secret:config.client_secret,redirect_uri:redirect,grant_type:'authorization_code',code_verifier:active.verifier})});
   if(!r.ok)throw Error('구글 계정 연결을 완료하지 못했습니다.');const token=await r.json();if(!token.refresh_token||!token.access_token)throw Error('장기 연결 권한을 받지 못했습니다.');
   const folder=await fetch('https://www.googleapis.com/drive/v3/files?fields=id',{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:JSON.stringify({name:'ZZZ Subtitle Archive',mimeType:'application/vnd.google-apps.folder',appProperties:{zzzSubtitleArchive:'1'}})});if(!folder.ok)throw Error('구글 드라이브 공유 자막 폴더를 만들지 못했습니다.');const value=await folder.json();if(!/^[\w-]+$/.test(value.id||''))throw Error('저장소 정보를 확인하지 못했습니다.');
   saveDriveCredentials(output,{clientId:config.client_id,clientSecret:config.client_secret,refreshToken:token.refresh_token,folderId:value.id});completed=true;
   console.log('Drive connection saved privately.');return send(200,'text/html; charset=utf-8','<!doctype html><html lang="ko"><meta charset="utf-8"><title>구글 연결 완료</title><body><h1>공유 자막 저장소 연결 완료</h1><p>이 창을 닫아도 됩니다. 연결 정보는 비공개로 저장되었습니다.</p></body></html>');
  }
  send(404,'text/plain','Not found');
 }catch{send(400,'text/plain; charset=utf-8','구글 연결에 실패했습니다. 연결 화면을 다시 열어주세요.');}
});server.listen(port,'127.0.0.1',()=>{const url=origin+'/#'+session;fs.mkdirSync(resolve(root,'.tools'),{recursive:true});fs.writeFileSync(resolve(root,'.tools/archive-drive-window.json'),JSON.stringify({url}),{mode:0o600});console.log('Drive connection UI ready at http://127.0.0.1:'+port);if(process.argv.includes('--open'))spawn('powershell.exe',['-NoProfile','-Command',"Start-Process -FilePath '"+url+"'"],{windowsHide:true,stdio:'ignore'}).unref();});
for(const signal of['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
