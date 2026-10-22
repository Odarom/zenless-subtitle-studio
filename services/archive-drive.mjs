import {readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
const API='https://www.googleapis.com/drive/v3';
export class ArchiveDrive{
 constructor({credentialsPath,fetcher=fetch}){Object.assign(this,{credentialsPath,fetcher});this.access=null;this.refreshing=null;}
 credentials(){let c;try{c=JSON.parse(readFileSync(this.credentialsPath,'utf8'));}catch{throw Error('아카이브 저장소 연결을 준비하고 있습니다.');}if(!c.clientId||!c.clientSecret||!c.refreshToken||!c.folderId)throw Error('아카이브 저장소 연결을 확인하세요.');return c;}
 configured(){try{this.credentials();return true;}catch{return false;}}
 async token(){
  if(this.access?.until>Date.now()+60000)return this.access.token;
  if(this.refreshing)return this.refreshing;
  this.refreshing=(async()=>{const c=this.credentials();const r=await this.fetcher('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:c.clientId,client_secret:c.clientSecret,refresh_token:c.refreshToken,grant_type:'refresh_token'}),redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('구글 저장소 연결을 갱신하지 못했습니다.');const value=await r.json();if(typeof value.access_token!=='string')throw Error('구글 저장소 응답을 확인하세요.');this.access={token:value.access_token,until:Date.now()+Math.min(3600,Number(value.expires_in)||300)*1000};return this.access.token;})();
  try{return await this.refreshing;}finally{this.refreshing=null;}
 }
 async request(url,init={}){const r=await this.fetcher(url,{...init,headers:{...init.headers,Authorization:'Bearer '+await this.token()},redirect:'error',signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('구글 자막 저장소에 접근하지 못했습니다.');return r;}
 async put(id,bytes){
  const c=this.credentials(),boundary='zzz-archive-'+id;
  const metadata=JSON.stringify({name:id+'.json',parents:[c.folderId],mimeType:'application/json',appProperties:{zzzArchive:id}});
  const body=Buffer.concat([Buffer.from('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+metadata+'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'),bytes,Buffer.from('\r\n--'+boundary+'--\r\n')]);
  const r=await this.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,size',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});const value=await r.json();if(!/^[\w-]+$/.test(value.id||''))throw Error('저장된 자막 파일을 확인하지 못했습니다.');return value.id;
 }
 async get(fileId,maxBytes){
  if(!/^[\w-]+$/.test(fileId||''))throw Error('공유 파일을 확인하세요.');const r=await this.request(API+'/files/'+fileId+'?alt=media');let size=0;const parts=[];
  for await(const part of r.body){size+=part.byteLength;if(size>maxBytes)throw Error('공유 자막 크기 제한을 초과했습니다.');parts.push(part);}return Buffer.concat(parts);
 }
 async remove(fileId){if(!/^[\w-]+$/.test(fileId||''))throw Error('공유 파일을 확인하세요.');await this.request(API+'/files/'+fileId,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({trashed:true})});}
 async quota(){const r=await this.request(API+'/about?fields=storageQuota');return(await r.json()).storageQuota;}
}
export function saveDriveCredentials(path,value){mkdirSync(dirname(path),{recursive:true});writeFileSync(path+'.tmp',JSON.stringify(value),{mode:0o600});renameSync(path+'.tmp',path);}
export const archiveHash=bytes=>createHash('sha256').update(bytes).digest('hex');
