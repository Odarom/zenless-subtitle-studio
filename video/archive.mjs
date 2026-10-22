import {validateCues} from './subtitles.mjs';
export const ARCHIVE_SITE='https://odarom.github.io/zenless-subtitle-studio/archive/';
export const ARCHIVE_API='https://reports.140-238-54-74.sslip.io/api/archive';
export const ARCHIVE_ID=/^[a-f0-9]{32}$/;
export const ARCHIVE_MAX_BYTES=16*1048576;
export const ARCHIVE_LANGUAGES=['ko','en','ja','zh-CN','zh-TW','de','fr','es','pt','ru','th','vi','id'];
export function archiveDisplay(input={}){
 const out={mode:'translated',offsetMs:0,fontSize:28,showSpeech:true,showScreen:true,maskSpeech:true,maskScreen:true,speechHeight:.11};
 if(['translated','bilingual','source'].includes(input.mode))out.mode=input.mode;
 for(const key of ['showSpeech','showScreen','maskSpeech','maskScreen'])if(typeof input[key]==='boolean')out[key]=input[key];
 for(const[key,min,max]of[['offsetMs',-3600000,3600000],['fontSize',16,48],['speechHeight',0,.9]])if(Number.isFinite(input[key])&&input[key]>=min&&input[key]<=max)out[key]=input[key];
 return out;
}
export function archiveProject(input){
 if(input?.schema!==1||!/^[-\w]{11}$/.test(input.videoId||''))throw Error('공유할 원본 유튜브 영상을 확인하세요.');
 if(!['auto',...ARCHIVE_LANGUAGES].includes(input.sourceLanguage)||!ARCHIVE_LANGUAGES.includes(input.targetLanguage))throw Error('공유 자막의 언어를 확인하세요.');
 const cues=validateCues(input.cues).filter(c=>!c.excluded).map(({id,startMs,endMs,sourceText,translatedText,kind,region,positions})=>({id,startMs,endMs,sourceText,...(translatedText!==undefined?{translatedText}:{}),...(kind==='screen'?{kind,region,...(positions?{positions}:{})}:{})}));
 if(!cues.length)throw Error('공유할 자막이 없습니다.');
 return{schema:1,videoId:input.videoId,sourceLanguage:input.sourceLanguage,targetLanguage:input.targetLanguage,style:input.style==='community'?'community':'official',display:archiveDisplay(input.display),cues};
}
export function archiveWatchUrl(id,videoId){if(!ARCHIVE_ID.test(id||'')||!/^[-\w]{11}$/.test(videoId||''))throw Error('공유 자막 주소를 확인하세요.');return`https://www.youtube.com/watch?v=${videoId}&zzzArchive=${id}`;}
export function archiveFromJob(job,display={}){
 if(job?.status!=='completed'||!job.videoId||job.options?.transcribeOnly)throw Error('번역이 완료된 유튜브 영상만 공유할 수 있습니다.');
 return archiveProject({schema:1,videoId:job.videoId,sourceLanguage:job.sourceLanguage||job.options.sourceLanguage,targetLanguage:job.options.targetLanguage,style:job.options.style,cues:job.cues,display:{...display,...(Number.isFinite(job.speechHeight)?{speechHeight:job.speechHeight}:{})}});
}
