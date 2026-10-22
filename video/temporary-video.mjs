import {existsSync,lstatSync,readdirSync,realpathSync,unlinkSync} from 'node:fs';
import {isAbsolute,join,relative,resolve} from 'node:path';

// Only application-created YouTube video copies are eligible. Original uploads,
// subtitle files and files downloaded separately by the browser are excluded.
const generatedVideo=/^(?:screen-video|saved-video)(?:\.f[\w-]+)?\.(?:mp4|mkv|webm|mov|m4v|avi)(?:\.(?:part|ytdl))?$/;
export function temporaryVideos(jobsPath,id){
 if(!/^[a-f0-9-]{36}$/.test(id))throw Error('작업 경로가 올바르지 않습니다.');
 const root=realpathSync(jobsPath),directory=resolve(jobsPath,id);
 if(!existsSync(directory))return[];
 if(lstatSync(directory).isSymbolicLink()||relative(root,realpathSync(directory))!==id)throw Error('작업 경로가 올바르지 않습니다.');
 return readdirSync(directory).filter(name=>generatedVideo.test(name)).map(name=>{
  const path=join(directory,name),stat=lstatSync(path),scope=relative(root,realpathSync(path));
  if(!stat.isFile()||stat.isSymbolicLink()||isAbsolute(scope)||scope!==join(id,name))throw Error('임시 영상 경로를 확인하세요.');
  return{path,bytes:stat.size};
 });
}
export function removeTemporaryVideos(files){
 let removedBytes=0,removedFiles=0;
 for(const file of files){unlinkSync(file.path);removedBytes+=file.bytes;removedFiles++;}
 return{removedFiles,removedBytes};
}
