import {randomBytes} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ARCHIVE_API,ARCHIVE_ID,ARCHIVE_MAX_BYTES,archiveFromJob} from './archive.mjs';
export class ArchiveClient{
 constructor({root,fetcher=fetch}){Object.assign(this,{root,fetcher});this.sending=new Set();}
 owner(){const folder=join(this.root,'.secrets'),path=join(folder,'video-archive.key');mkdirSync(folder,{recursive:true});if(!existsSync(path))writeFileSync(path,randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});const value=readFileSync(path,'utf8').trim();if(!/^[a-f0-9]{64}$/.test(value))throw Error('공유 자막 관리 설정을 확인하세요.');return value;}
 async publish(job,input){
  if(input?.consent!==true)throw Error('자막을 공개 공유하는 데 동의한 뒤 등록하세요.');if(this.sending.has(job.id))throw Error('공유 자막을 등록하고 있습니다.');
  const project=archiveFromJob(job,input.display),body=JSON.stringify(project);if(Buffer.byteLength(body)>ARCHIVE_MAX_BYTES)throw Error('공유 자막은 16MB까지 지원합니다.');
  this.sending.add(job.id);try{
   const r=await this.fetcher(ARCHIVE_API+'/entries',{method:'POST',headers:{'Content-Type':'application/json','X-ZZZ-Archive-Owner':this.owner()},body,redirect:'error',signal:AbortSignal.timeout(60000)});
   const value=await r.json();if(!r.ok)throw Error(typeof value.error==='string'?value.error:'공유 자막을 등록하지 못했습니다.');if(!ARCHIVE_ID.test(value.id||''))throw Error('공유 자막 접수 정보를 확인하세요.');return{id:value.id,videoId:project.videoId};
  }finally{this.sending.delete(job.id);}
 }
 async remove(id){if(!ARCHIVE_ID.test(id||''))throw Error('공유 자막 정보를 확인하세요.');const r=await this.fetcher(ARCHIVE_API+'/entries/'+id,{method:'DELETE',headers:{'X-ZZZ-Archive-Owner':this.owner()},redirect:'error',signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('공유 등록을 취소하지 못했습니다. 잠시 후 다시 시도하세요.');return{removed:true};}
}
