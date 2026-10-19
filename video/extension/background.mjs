const BASE = 'http://127.0.0.1:4318';
export async function cueAction(message, sender, { extensionId, getToken, fetcher = fetch } = {}) {
  let url; try { url = new URL(sender.tab?.url || sender.url); } catch {}
  const videoId = url?.pathname === '/watch' ? url.searchParams.get('v') : /^\/shorts\/([\w-]{11})$/.exec(url?.pathname || '')?.[1];
  if (sender.id !== extensionId || !Number.isInteger(sender.tab?.id) || sender.frameId && sender.frameId !== 0
    || url?.protocol !== 'https:' || url.port || !['www.youtube.com','m.youtube.com'].includes(url.hostname) || videoId !== message.videoId
    || !['exclude','report'].includes(message.action) || !/^[a-f0-9-]{36}$/.test(message.jobId || '') || !/^\d{1,8}$/.test(message.cueId || '')) throw new Error('유튜브 영상과 연결된 자막을 확인하세요.');
  const token = await getToken();
  if (!/^[a-f0-9]{64}$/.test(token || '')) throw new Error('작업실 설정의 PC 연결 코드를 입력하세요.');
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
  let reportId=message.reportId;
  if(reportId) {
    if(!/^V-\d{8}-[a-f0-9]{12}$/.test(reportId))throw new Error('신고 번호를 확인하세요.');
    const report=(await api(`/api/reports/${reportId}/export`)).reports?.[0];
    if(report?.video?.cueId!==cue.id||report.source?.text!==cue.sourceText||report.target?.text!==(cue.translatedText||cue.sourceText))throw new Error('유튜브 영상과 연결된 자막을 확인하세요.');
  } else {
    const issue=message.issue || {};
    const created=await api('/api/reports','POST',{jobId:job.id,cueId:cue.id,type:issue.type,explanation:issue.explanation,suggestion:issue.suggestion,includeVideoUrl:issue.includeVideoUrl===true});
    reportId=created.report.id;
  }
  try { const receipt=await api(`/api/reports/${reportId}/send`,'POST',{});return {ok:true,reportId,receiptId:receipt.receiptId}; }
  catch(error) { return {error:error.message,reportId}; }
}

if(typeof chrome!=='undefined' && chrome.runtime?.onMessage && chrome.storage?.local) {
  void chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}).catch(()=>{});
  const pending=new Set();
  chrome.runtime.onMessage.addListener((message,sender,respond)=>{
    if(message?.type!=='ZZZ_CUE_ACTION')return;
    const key=`${sender.tab?.id}:${message.jobId}:${message.cueId}`;
    if(pending.has(key)){respond({error:'이 자막을 처리하고 있습니다.'});return;}
    pending.add(key);
    cueAction(message,sender,{extensionId:chrome.runtime.id,getToken:async()=>(await chrome.storage.local.get('connectionToken')).connectionToken})
      .then(respond,error=>respond({error:error.message})).finally(()=>pending.delete(key));return true;
  });
}
