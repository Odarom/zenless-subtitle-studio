import {loadArchive,reportArchive} from './archive.mjs';
const BASE = 'http://127.0.0.1:4318';
export async function saveSpeechPosition(message, sender, { extensionId, storage, getToken, fetcher = fetch } = {}) {
  let url; try { url = new URL(sender.tab?.url || sender.url); } catch {}
  const videoId = url?.pathname === '/watch' ? url.searchParams.get('v') : /^\/shorts\/([\w-]{11})$/.exec(url?.pathname || '')?.[1];
  if (sender.id !== extensionId || !Number.isInteger(sender.tab?.id) || sender.frameId && sender.frameId !== 0
    || url?.protocol !== 'https:' || url.port || !['www.youtube.com','m.youtube.com'].includes(url.hostname)
    || !/^[\w-]{11}$/.test(message.videoId || '') || videoId !== message.videoId
    || !Number.isFinite(message.speechHeight) || message.speechHeight < 0 || message.speechHeight > 0.9
    || message.jobId !== undefined && !/^[a-f0-9-]{36}$/.test(message.jobId || '')) throw new Error('자막 위치를 확인하세요.');
  if (message.jobId) {
    const token = await getToken?.(); if (!/^[a-f0-9]{64}$/.test(token || '')) throw new Error('PC 연결을 확인하세요.');
    const api = async (method, body) => {
      const response = await fetcher(`${BASE}/api/jobs/${message.jobId}`,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${token}`,...(body ? {'Content-Type':'application/json'} : {})},...(body?{body:JSON.stringify(body)}:{})});
      if (!response.ok) throw new Error('PC에 자막 위치를 저장하지 못했습니다.'); return response.json();
    };
    const job = await api('GET'); if (job.status !== 'completed' || job.videoId !== message.videoId) throw new Error('유튜브 영상과 연결된 자막을 확인하세요.');
    await api('PATCH',{speechHeight:message.speechHeight});
  }
  const saved = await storage.get('displaySettings');
  await storage.set({ displaySettings: { ...saved.displaySettings, speechHeight:message.speechHeight } });
  return { ok:true };
}
export async function cueAction(message, sender, { extensionId, getToken, fetcher = fetch } = {}) {
  let url; try { url = new URL(sender.tab?.url || sender.url); } catch {}
  const videoId = url?.pathname === '/watch' ? url.searchParams.get('v') : /^\/shorts\/([\w-]{11})$/.exec(url?.pathname || '')?.[1];
  if (sender.id !== extensionId || !Number.isInteger(sender.tab?.id) || sender.frameId && sender.frameId !== 0
    || url?.protocol !== 'https:' || url.port || !['www.youtube.com','m.youtube.com'].includes(url.hostname) || videoId !== message.videoId
    || !['exclude','report'].includes(message.action) || !/^[a-f0-9-]{36}$/.test(message.jobId || '') || !/^\d{1,8}$/.test(message.cueId || '')) throw new Error('유튜브 영상과 연결된 자막을 확인하세요.');
  const token = await getToken();
  if (!/^[a-f0-9]{64}$/.test(token || '')) throw new Error('프로그램 왼쪽 「API 및 연결 설정」에서 「PC 연결 코드 복사」를 눌러 코드를 입력하세요.');
  const api = async (path, method = 'GET', body) => {
    let response; try { response = await fetcher(BASE + path, { method, redirect:'error', signal:AbortSignal.timeout(25000), headers:{Authorization:`Bearer ${token}`,...(body === undefined ? {} : {'Content-Type':'application/json'})}, ...(body === undefined ? {} : {body:JSON.stringify(body)}) }); }
    catch { throw new Error('PC 프로그램에 연결하지 못했습니다. video-run.cmd를 실행하세요.'); }
    const value = await response.json(); if(!response.ok)throw new Error(value.error || 'PC 연결을 확인하세요.'); return value;
  };
  const job = await api(`/api/jobs/${message.jobId}`),cue=job.cues?.find(item=>item.id===message.cueId);
  if(job.status!=='completed'||job.videoId!==videoId||!cue)throw new Error('유튜브 영상과 연결된 자막을 확인하세요.');
  if(message.action==='exclude') {
    if(typeof message.excluded!=='boolean')throw new Error('수정할 자막 내용이 올바르지 않습니다.');
    await api(`/api/jobs/${message.jobId}`,'PATCH',{changes:[{id:message.cueId,excluded:message.excluded}]});
    return {ok:true,excluded:message.excluded};
  }
  if(message.expectedCue !== undefined && (message.expectedCue?.sourceText !== cue.sourceText || message.expectedCue?.translatedText !== (cue.translatedText||cue.sourceText)))throw new Error('자막이 변경되었습니다. 자막을 다시 열고 신고하세요.');
  let reportId=message.reportId;
  if(reportId) {
    if(!/^V-\d{8}-[a-f0-9]{12}$/.test(reportId))throw new Error('신고 번호를 확인하세요.');
    const report=(await api(`/api/reports/${reportId}/export`)).reports?.[0];
    if(report?.video?.cueId!==cue.id||report.source?.text!==cue.sourceText||report.target?.text!==(cue.translatedText||cue.sourceText))throw new Error('유튜브 영상과 연결된 자막을 확인하세요.');
  } else {
    const issue=message.issue || {};
    const created=await api('/api/reports','POST',{jobId:job.id,cueId:cue.id,type:issue.type,explanation:issue.explanation,suggestion:issue.suggestion,includeVideoUrl:issue.includeVideoUrl===true,...(message.expectedCue?{expectedCue:message.expectedCue}:{})});
    reportId=created.report.id;
  }
  try { const receipt=await api(`/api/reports/${reportId}/send`,'POST',{});return {ok:true,reportId,receiptId:receipt.receiptId}; }
  catch(error) { return {error:error.message,reportId}; }
}

if(typeof chrome!=='undefined' && chrome.runtime?.onMessage && chrome.storage?.local) {
  void chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}).catch(()=>{});
  const pending=new Set();
  let positionWrite = Promise.resolve();
  chrome.runtime.onMessage.addListener((message,sender,respond)=>{
    if(message?.type==='ZZZ_ARCHIVE_LOAD'||message?.type==='ZZZ_ARCHIVE_REPORT'){
      const action=message.type==='ZZZ_ARCHIVE_LOAD'?loadArchive:reportArchive;
      action(message,sender,{extensionId:chrome.runtime.id,storage:chrome.storage.local}).then(respond,error=>respond({error:error.message}));return true;
    }
    if (message?.type === 'ZZZ_SPEECH_POSITION') {
      positionWrite = positionWrite.catch(() => {}).then(() => saveSpeechPosition(message,sender,{extensionId:chrome.runtime.id,storage:chrome.storage.local,getToken:async()=>(await chrome.storage.local.get('connectionToken')).connectionToken}));
      positionWrite.then(respond, () => respond({error:'자막 위치를 저장하지 못했습니다.'})); return true;
    }
    if(message?.type!=='ZZZ_CUE_ACTION')return;
    const key=`${sender.tab?.id}:${message.jobId}:${message.cueId}`;
    if(pending.has(key)){respond({error:'이 자막을 처리하고 있습니다.'});return;}
    pending.add(key);
    cueAction(message,sender,{extensionId:chrome.runtime.id,getToken:async()=>(await chrome.storage.local.get('connectionToken')).connectionToken})
      .then(respond,error=>respond({error:error.message})).finally(()=>pending.delete(key));return true;
  });
}
