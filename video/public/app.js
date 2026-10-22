import { videoContentRect, cueRegionAt, buildCueIndex, activeCuesAt } from './geometry.mjs';
import { speechHeight, speechPlacement, bindSpeechDrag, DEFAULT_SPEECH_HEIGHT } from './speech-position.mjs';
import { reviewCues, reviewTime } from './review.mjs';
import { bindDocument, createI18n, UI_LANGUAGE_STORAGE_KEY } from './i18n.mjs';
const i18n = createI18n(navigator.languages);
try { const saved = localStorage.getItem(UI_LANGUAGE_STORAGE_KEY); if (saved) i18n.setLocale(saved); } catch {}
const t = (...args) => i18n.t(...args);
const applyStaticLanguage = bindDocument(document, i18n);
applyStaticLanguage();
const $ = id => document.getElementById(id);
const state = { token: '', settings: null, mode: 'url', file: null, jobs: [], selected: null, detail: null, shownVersion: null, page: 0, drafts: new Map(), previewUrls: new Map(), videoSaves: new Map(), uploadController: null, actions: new Set(), refreshSerial: 0 };
state.speechHeight = DEFAULT_SPEECH_HEIGHT;
state.positionDrafts = new Map(); state.positionSaves = new Map();
try { const saved = JSON.parse(localStorage.getItem('zzz-preview-backgrounds') || '{}'); for (const key of ['previewMaskSpeech','previewMaskScreen']) if (typeof saved[key] === 'boolean') state[key] = saved[key]; } catch {}
const statusLabel = (status, cancelling = false) => cancelling ? t('중단 중') : ({ queued: t('대기 중'), running: t('처리 중'), completed: t('완료'), failed: t('실패'), cancelled: t('중단됨'), interrupted: t('이어하기 가능') })[status] || status;
function node(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) element.addEventListener(key.slice(2), value);
    else if (key === 'class') element.className = value;
    else if (key === 'text') element.textContent = value;
    else if (key in element) element[key] = value;
    else element.setAttribute(key, value);
  }
  for (const child of children.flat()) if (child != null) element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return element;
}
let toastTimer;
function toast(message, error = false) { $('toast').textContent = i18n.message(message); $('toast').className = error ? 'error' : ''; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, error ? 9000 : 4500); }
async function api(path, { method = 'GET', body, raw, signal } = {}) {
  const headers = { Authorization: `Bearer ${state.token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, { method, headers, body: body === undefined ? raw : JSON.stringify(body), signal });
  if (!response.ok) { const value = await response.json().catch(() => ({})); throw new Error(value.error || t('요청 실패 ({status})', { status: response.status })); }
  return response;
}
const apiJson = async (path, options) => (await api(path, options)).json();
function view(name) {
  $('studioView').hidden = name !== 'studio'; $('settingsView').hidden = name !== 'settings'; $('historyView').hidden = name !== 'history';
  for (const button of document.querySelectorAll('[data-view]')) button.classList.toggle('selected', button.dataset.view === name);
}
function mode(name) { state.mode = name; $('urlInput').hidden = name !== 'url'; $('fileInput').hidden = name !== 'file'; $('urlTab').classList.toggle('active', name === 'url'); $('fileTab').classList.toggle('active', name === 'file'); }
function selectedFile(file) { state.file = file; $('fileName').textContent = file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : t('영상·음성·자막 파일 선택'); }
function time(ms) { const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
function bindModelOptions(changeModel = false) {
  const presets = state.settings?.presets?.[$('provider').value] || [];
  $('modelOptions').replaceChildren(...presets.map(preset => node('option', { value: preset.value, label: i18n.message(preset.label) })));
  if (changeModel) $('model').value = presets[0]?.value || ($('provider').value === 'ollama' ? 'qwen3:8b' : '');
  const local = $('provider').value === 'ollama', deepl = $('provider').value === 'deepl';
  $('modelField').hidden = deepl; $('model').required = !deepl; $('planField').hidden = !deepl; $('keyField').hidden = local;
  $('providerHelp').textContent = local ? t('Ollama를 설치하고 모델을 내려받아 실행하세요. 번역은 이 PC에서 처리하며 API 키가 필요 없습니다.') : deepl ? t('DeepL API Free/Pro 키를 사용합니다. 무료 한도와 지원 지역은 DeepL 계정에서 확인하세요.') : '';
  if (changeModel && deepl) $('deeplPlan').value = presets[0]?.value || 'deepl-free';
}
async function loadSettings() {
  state.settings = await apiJson('/api/settings');
  const s = state.settings;
  $('provider').value = s.provider; $('model').value = s.model; if (s.provider === 'deepl') $('deeplPlan').value = s.model; $('dailyLimit').value = s.dailyLimit; $('requestsPerMinute').value = s.requestsPerMinute || 1;
  $('speechDevice').value = s.speechDevice || 'auto'; $('speechThreads').value = s.speechThreads || 0;
  renderSettingsLabels();
}
function renderSettingsLabels() {
  const s = state.settings; if (!s) return;
  $('keyState').textContent = s.configured ? t('설정 완료') : t('설정 필요'); $('apiNotice').hidden = s.configured || $('transcribeOnly').checked;
  bindModelOptions();
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const usage = s.usage[day] || {};
  $('usage').textContent = t('오늘 요청 {requests}회 · 입력 {input} / 출력 {output} 토큰', { requests: usage.requests || 0, input: (usage.inputTokens || 0).toLocaleString(i18n.locale), output: (usage.outputTokens || 0).toLocaleString(i18n.locale) }) + (usage.characters ? ' · ' + t('DeepL {count}자', { count: usage.characters.toLocaleString(i18n.locale) }) : '');
}
async function loadTools() {
  state.tools = await apiJson('/api/tools'); renderTools();
}
function renderTools() {
  const result = state.tools; if (!result) return;
  const labels = { cpu: t('CPU 음성 인식'), vulkan: t('GPU 음성 인식 (Vulkan)'), model: t('다국어 음성 모델'), ytdlp: t('유튜브 영상 처리'), ffmpeg: t('오디오 변환'), ocr: t('화면 글자 인식 (OCR)') };
  $('toolStatus').replaceChildren(...Object.entries(labels).map(([key, label]) => node('div', { class: 'tool-row' }, node('span', { text: label }), node('span', { class: result.ready[key] ? 'ok' : 'missing', text: result.ready[key] ? t('● 준비됨') : t('○ 준비 필요') }))));
  const ready = result.ready.whisper && result.ready.model && result.ready.ytdlp && result.ready.ffmpeg;
  $('toolHelp').textContent = ready ? t('{model} · 문장 번역에는 등록한 API를 사용합니다.', { model: result.modelName }) : t('시작 파일을 실행하면 필요한 음성·영상 도구를 자동으로 준비합니다. SRT/VTT 파일은 음성 도구 없이도 번역할 수 있습니다.');
  $('hardwareInfo').textContent = t('{cpu} · 메모리 {memory}GB', { cpu: result.cpuLabel, memory: result.memoryGiB });
}
function renderJobLists() {
  $('jobCount').textContent = state.jobs.length;
  $('historyList').replaceChildren(...(state.jobs.length ? state.jobs.map(job => node('article', { class: 'card history-item' }, node('button', { class: 'history-open', type: 'button', onclick: () => selectJob(job.id) }, node('strong', { text: job.title || t('영상 준비 중') }), node('span', { text: t('{status} · {count}개 구간', { status: statusLabel(job.status, job.cancelRequested), count: job.cueCount }) }), node('small', { text: new Date(job.createdAt).toLocaleString(i18n.locale, { timeZone: 'Asia/Seoul' }) })), jobButtons(job))) : [node('p', { class: 'description', text: t('아직 작업 기록이 없습니다. 영상이나 자막 파일을 선택해 첫 작업을 시작하세요.') })]));
  $('jobList').replaceChildren(...(state.jobs.length ? state.jobs.map(job => node('button', { class: state.selected === job.id ? 'active' : '', type: 'button', onclick: () => selectJob(job.id) }, node('strong', { text: job.title || t('영상 준비 중') }), node('small', { text: t('{status} · {count}개 구간', { status: statusLabel(job.status, job.cancelRequested), count: job.cueCount }) }))) : [node('p', { class: 'empty-jobs', text: t('새 작업을 시작하면 여기에 차곡차곡 보관됩니다.') })]));
}
async function refreshJobs() {
  if (state.actions.size) return;
  const serial = ++state.refreshSerial, jobs = await apiJson('/api/jobs');
  if (serial !== state.refreshSerial) return;
  state.jobs = jobs; renderJobLists();
  if (state.selected) {
    const summary = state.jobs.find(job => job.id === state.selected);
    if (!summary) { clearSelectedJob(); return; }
    if (summary && (summary.updatedAt !== state.shownVersion || summary.videoSaving !== state.detail?.videoSaving || !state.detail)) {
      const id = state.selected; let detail;
      try { detail = await apiJson(`/api/jobs/${id}`); }
      catch (error) { if (serial !== state.refreshSerial || state.selected !== id) return; throw error; }
      if (serial !== state.refreshSerial || state.selected !== id) return;
      state.detail = detail; state.shownVersion = state.detail.updatedAt; renderDetail();
    }
  }
}
async function selectJob(id) { state.selected = id; state.shownVersion = null; state.page = 0; view('studio'); await refreshJobs(); $('jobDetail').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function clearSelectedJob() {
  state.previewVideo?.pause(); state.selected = null; state.detail = null; state.renderedJob = null; state.shownVersion = null; state.previewVideo = null;
  $('jobDetail').replaceChildren(); $('jobDetail').hidden = true;
  const url = new URL(location.href); url.searchParams.delete('job'); history.replaceState(null, '', url);
}
function jobButtons(job) {
  const busy = ['queued', 'running'].includes(job.status), pending = state.actions.has(job.id), controls = node('div', { class: 'button-row' });
  if (busy) controls.append(node('button', { class: 'secondary', type: 'button', text: t(job.cancelRequested ? '중단 중' : '작업 중단'), disabled: pending || job.cancelRequested, onclick: () => action('cancel', job.id) }));
  if (['failed', 'cancelled', 'interrupted'].includes(job.status)) controls.append(node('button', { class: 'primary', type: 'button', text: t('이어하기'), disabled: pending, onclick: () => action('resume', job.id) }));
  if(job.temporaryVideoBytes>0)controls.append(node('button',{class:'secondary',type:'button',text:t('임시 영상 삭제 ({size} MB)',{size:(job.temporaryVideoBytes/1048576).toLocaleString(i18n.locale,{maximumFractionDigits:1})}),disabled:pending||job.videoSaving||state.videoSaves.has(job.id),onclick:()=>removeTemporaryVideo(job)}));
  controls.append(node('button', { class: 'secondary', type: 'button', text: t('기록 삭제'), disabled: pending || job.status === 'running' || job.cancelRequested || job.videoSaving || state.videoSaves.has(job.id), title: job.videoSaving ? t('영상 저장을 마치거나 중단한 뒤 기록을 삭제하세요.') : job.status === 'running' ? t('실행 중인 작업은 먼저 중단한 뒤 삭제하세요.') : '', onclick: () => action('delete', job.id) }));
  return controls;
}
async function removeTemporaryVideo(job){
  if(state.actions.has(job.id)||$('temporaryVideoDialog'))return;
  const accepted=await new Promise(resolve=>{
    const dialog=node('dialog',{id:'temporaryVideoDialog','aria-labelledby':'temporaryVideoTitle'}),finish=value=>{dialog.close();dialog.remove();resolve(value);};
    dialog.append(node('h2',{id:'temporaryVideoTitle',text:t('임시 영상만 삭제')}),node('p',{text:t('프로그램에 보관된 이 작업의 임시 영상 {size} MB를 삭제할까요? 자막·수정 내용·작업 기록과 따로 다운로드한 파일은 유지합니다.',{size:(job.temporaryVideoBytes/1048576).toLocaleString(i18n.locale,{maximumFractionDigits:1})})}),node('p',{class:'description',text:t('유튜브에서 자막 보기와 자막 수정·다운로드는 계속 가능합니다. 영상 저장을 다시 누르면 영상을 새로 다운로드합니다.')}),node('div',{class:'button-row'},node('button',{class:'secondary',type:'button',text:t('닫기'),onclick:()=>finish(false)}),node('button',{class:'primary',type:'button',text:t('임시 영상만 삭제'),onclick:()=>finish(true)})));
    dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false);},{once:true});document.body.append(dialog);dialog.showModal();
  });
  if(!accepted)return;state.actions.add(job.id);state.refreshSerial++;renderJobLists();if(state.detail)renderDetail();
  try{const result=await apiJson(`/api/jobs/${job.id}/temporary-video`,{method:'DELETE'});toast(t('임시 영상을 삭제해 {size} MB를 확보했습니다.',{size:(result.removedBytes/1048576).toLocaleString(i18n.locale,{maximumFractionDigits:1})}));}
  catch(error){toast(error.message,true);}
  finally{state.actions.delete(job.id);try{await refreshJobs();}catch(error){toast(error.message,true);}}
}
function confirmJobDeletion(job) {
  if ($('deleteJobDialog')) return Promise.resolve(false);
  return new Promise(resolve => {
    const dialog = node('dialog', { id: 'deleteJobDialog', 'aria-labelledby': 'deleteJobTitle' });
    const finish = accepted => { dialog.close(); dialog.remove(); resolve(accepted); };
    if(job?.archiveShareId)dialog.append(node('p',{class:'hint',text:t('이 기록을 삭제해도 아카이브 공유는 유지됩니다. 공유도 내리려면 먼저 공유 등록을 취소하세요.')}));
    dialog.append(node('h2', { id: 'deleteJobTitle', text: t('기록 삭제') }),
      node('p', { text: t('이 작업의 기록과 프로그램에 보관된 영상·자막·임시 파일을 삭제할까요? 따로 저장한 원본·다운로드 파일과 API 설정은 유지합니다.') }),
      node('p', { class: 'description', text: t('다른 작업도 사용하는 영상 사본은 마지막 작업 기록을 삭제할 때 정리합니다.') }),
      node('div', { class: 'button-row' },
        node('button', { class: 'secondary', type: 'button', text: t('닫기'), onclick: () => finish(false) }),
        node('button', { class: 'primary', type: 'button', text: t('기록 삭제'), onclick: () => finish(true) })));
    dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); }, { once: true });
    document.body.append(dialog); dialog.showModal();
  });
}
async function action(name, id = state.selected) {
  if (!id || state.actions.has(id)) return;
  if (name === 'delete' && !await confirmJobDeletion(state.jobs.find(job=>job.id===id))) return;
  state.actions.add(id); state.refreshSerial++; renderJobLists(); if (state.detail) renderDetail();
  try {
    await apiJson(name === 'delete' ? `/api/jobs/${id}` : `/api/jobs/${id}/${name}`, { method: name === 'delete' ? 'DELETE' : 'POST' });
    if (name === 'delete') { if (state.selected === id) clearSelectedJob(); const preview = state.previewUrls.get(id); if (preview) URL.revokeObjectURL(preview); state.previewUrls.delete(id); toast(t('작업 기록을 삭제했습니다.')); }
  } catch (error) { toast(error.message, true); }
  finally { state.actions.delete(id); try { await refreshJobs(); } catch (error) { toast(error.message, true); } if (state.detail) renderDetail(); }
}
async function download(format, positioned = false) {
  try {
    const id = state.selected;
    await state.positionSaves.get(id);
    if (state.positionDrafts.has(id)) await persistSpeechHeight(id,state.positionDrafts.get(id));
    await saveSubtitleDrafts(id);
    if (state.selected !== id) throw new Error(t('완료된 자막을 선택하세요.'));
    renderDetail();
    const mode = $('downloadMode')?.value || 'translated';
    const track = $('downloadTrack')?.value || 'all';
    const response = await api(`/api/jobs/${state.selected}/export?format=${format}&mode=${mode}&track=${track}&positioned=${positioned ? 1 : 0}`);
    const url = URL.createObjectURL(await response.blob());
    const anchor = node('a', { href: url, download: `${(state.detail.title || t('젠레스 자막')).replace(/[<>:"/\\|?*]/g, '_')}.${mode}${track === 'all' ? '' : '.' + track}${positioned ? ".positioned" : ""}.${format}` });
    document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (error) { toast(error.message, true); }
}
function openArchiveShare(job){
 const dialog=node('dialog',{'aria-label':t('아카이브에 공유')});
 const close=()=>{dialog.close();dialog.remove();};
 const speech=node('input',{type:'checkbox',checked:true}),screen=node('input',{type:'checkbox',checked:true}),maskSpeech=node('input',{type:'checkbox',checked:state.previewMaskSpeech!==false}),maskScreen=node('input',{type:'checkbox',checked:state.previewMaskScreen!==false}),font=node('input',{type:'number',min:16,max:48,value:28}),offset=node('input',{type:'number',min:-3600,max:3600,step:.1,value:0}),consent=node('input',{type:'checkbox'}),status=node('p',{role:'status'});
 const submit=node('button',{class:'primary',type:'button',text:t('동의하고 공유'),disabled:true}),cancel=node('button',{class:'secondary',type:'button',text:t('닫기'),onclick:close});
 dialog.append(node('h2',{text:t('아카이브에 공유')}),node('p',{text:job.title}),node('p',{text:t('자막·원본 유튜브 정보·표시 설정을 공개 공유합니다. API 키·PC 경로·원본 영상 파일은 보내지 않습니다.')}),node('p',{class:'hint',text:t('공유 자막은 등록된 원본 유튜브 영상에서만 표시됩니다. 공유 등록 후에도 다른 사람이 받은 데이터의 복사 자체를 막을 수는 없습니다.')}),node('label',{},speech,t('음성 자막 표시')),node('label',{},screen,t('화면 번역 표시')),node('label',{},maskSpeech,t('음성 자막 뒤에 배경 표시')),node('label',{},maskScreen,t('화면 글자 뒤에 배경 표시')),node('label',{},t('글자 크기'),font),node('label',{},t('자막 지연 (초)'),offset),node('label',{},consent,t('이 자막을 공개 공유하는 데 동의합니다.')),node('div',{class:'button-row'},submit,cancel),status);
 consent.onchange=()=>submit.disabled=!consent.checked;
 submit.onclick=async()=>{submit.disabled=true;cancel.disabled=true;try{
  if(!consent.checked)throw Error(t('자막을 공개 공유하는 데 동의한 뒤 등록하세요.'));const id=job.id;await state.positionSaves.get(id);if(state.positionDrafts.has(id))await persistSpeechHeight(id,state.positionDrafts.get(id));await saveSubtitleDrafts(id);
  const result=await apiJson(`/api/jobs/${id}/share`,{method:'POST',body:{consent:true,display:{showSpeech:speech.checked,showScreen:screen.checked,maskSpeech:maskSpeech.checked,maskScreen:maskScreen.checked,fontSize:Number(font.value),offsetMs:Math.round(Number(offset.value)*1000)}}});
  if(state.detail?.id===id)state.detail.archiveShareId=result.id;close();renderDetail();toast(t('공유 자막을 등록했습니다. 아카이브에서 확인하세요.'));
 }catch(error){status.textContent=i18n.message(error.message);submit.disabled=!consent.checked;}finally{cancel.disabled=false;}};
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(!cancel.disabled)close();});document.body.append(dialog);dialog.showModal();
}
async function unshareArchive(job){
 const dialog=node('dialog',{'aria-label':t('공유 등록 취소')}),close=()=>{dialog.close();dialog.remove();},status=node('p',{role:'status'});
 const confirm=node('button',{class:'primary',type:'button',text:t('공유 등록 취소')}),cancel=node('button',{class:'secondary',type:'button',text:t('닫기'),onclick:close});dialog.append(node('h2',{text:t('공유 등록 취소')}),node('p',{text:t('아카이브에서 이 공유 자막을 내립니다. PC 작업과 별도로 받은 사본은 유지됩니다.')}),node('div',{class:'button-row'},confirm,cancel),status);
 confirm.onclick=async()=>{confirm.disabled=true;try{await apiJson(`/api/jobs/${job.id}/unshare`,{method:'POST',body:{}});if(state.detail?.id===job.id)state.detail.archiveShareId=null;close();renderDetail();toast(t('공유 등록을 취소했습니다.'));}catch(error){status.textContent=i18n.message(error.message);confirm.disabled=false;}};dialog.addEventListener('cancel',event=>{event.preventDefault();close();});document.body.append(dialog);dialog.showModal();
}
async function persistSpeechHeight(id, value) {
  const previous = state.positionSaves.get(id);
  const saving = Promise.resolve(previous).catch(() => {}).then(async () => {
    const result = await apiJson(`/api/jobs/${id}`,{method:'PATCH',body:{speechHeight:value}});
    if (state.detail?.id === id) { state.detail.speechHeight = value; state.shownVersion = result.updatedAt; }
    if (state.positionDrafts.get(id) === value) state.positionDrafts.delete(id);
  });
  state.positionSaves.set(id,saving); return saving;
}
async function saveSubtitleDrafts(id) {
  const drafts = state.drafts.get(id); if (!drafts?.size) return;
  const changes = [...drafts].map(([id,translatedText]) => ({id,translatedText}));
  const result = await apiJson(`/api/jobs/${id}`,{method:'PATCH',body:{changes}});
  for (const change of changes) if (drafts.get(change.id) === change.translatedText) drafts.delete(change.id);
  if (state.detail?.id === id) { state.detail = result; state.shownVersion = result.updatedAt; }
}
async function saveVideo(job) {
  if (state.videoSaves.has(job.id)) { state.videoSaves.get(job.id).abort(); return; }
  const controller = new AbortController(); state.videoSaves.set(job.id, controller);
  renderJobLists(); renderDetail(); toast(t('음성이 포함된 유튜브 영상을 준비하고 있습니다. 영상 저장 취소로 중단할 수 있습니다.'));
  try {
    const result = await apiJson(`/api/jobs/${job.id}/video`, { method: 'POST', signal: controller.signal });
    controller.signal.throwIfAborted();
    const anchor = node('a', { href: result.url, download: result.filename }); document.body.append(anchor); anchor.click(); anchor.remove();
    toast(t('브라우저의 다운로드 목록에서 영상 저장을 확인하세요. 저장한 영상에는 번역 자막이 합쳐지지 않습니다.'));
  } catch (error) { toast(error.name === 'AbortError' ? t('영상 저장을 취소했습니다.') : error.message, error.name !== 'AbortError'); }
  finally { state.videoSaves.delete(job.id); try { await refreshJobs(); } catch {} renderJobLists(); if (state.detail) renderDetail(); }
}
function renderPreview(job) {
  state.previewCleanup?.(); state.previewCleanup = null; state.previewUpdate = null;
  state.speechHeight = speechHeight(state.positionDrafts.get(job.id) ?? job.speechHeight ?? DEFAULT_SPEECH_HEIGHT);
  const fileInput = node('input', { type: 'file', accept: 'video/*,audio/*', hidden: true, onchange: () => {
    const file = fileInput.files[0]; if (!file) return;
    const old = state.previewUrls.get(job.id); if (old) URL.revokeObjectURL(old);
    state.previewUrls.set(job.id, URL.createObjectURL(file)); renderDetail();
  } });
  const container = node('div', {}, node('div', { class: 'button-row' }, node('button', { class: 'secondary', type: 'button', text: t('로컬 영상으로 자막 미리보기'), onclick: () => fileInput.click() }), fileInput));
  const url = state.previewUrls.get(job.id); if (!url) return container;
  const video = node('video', { controls: true, src: url });
  const label = node('span'); const caption = node('button', { type: 'button', class: 'preview-caption', title: t('자막 메뉴'), onclick: () => {
    const cue = activeCuesAt(speechIndex, video.currentTime * 1000 - Number(offset.value || 0) * 1000)[0]; if (cue) { video.pause(); openCueActions(job, cue); }
  } }, label);
  const moveHandle = node('button', { type:'button', class:'speech-move', text:t('↕ 이동'), title:t('끌어서 음성 자막 높이 조절 · ↑↓ 키로 이동 · Home 키로 초기화'), 'aria-label':t('음성 자막 높이') });
  const speech = node('div', { class:'preview-speech', hidden:true }, caption, moveHandle);
  const placeSpeech = () => {
    if (speech.hidden || !video.parentElement) return;
    const outer = video.parentElement.getBoundingClientRect(), rect = videoContentRect(video.getBoundingClientRect(), video.videoWidth, video.videoHeight);
    const area = speechPlacement(rect, outer, state.speechHeight);
    Object.assign(speech.style, {left:`${area.left}px`,width:`${area.width}px`,maxHeight:`${area.height}px`});
    speech.style.top = `${speechPlacement(rect, outer, state.speechHeight, speech.getBoundingClientRect().height).top}px`;
  };
  const height = node('input', { type:'range', min:'0', max:'90', value:String(Math.round(state.speechHeight * 100)), 'aria-label':t('음성 자막 높이') });
  const setHeight = value => { state.speechHeight = speechHeight(value); state.positionDrafts.set(job.id,state.speechHeight); height.value = String(Math.round(state.speechHeight * 100)); placeSpeech(); };
  const saveHeight = async () => { const value = state.speechHeight; try { await persistSpeechHeight(job.id,value); }
    catch (error) { toast(t('자막 위치를 저장하지 못했습니다. 다음에 열면 기본 위치로 표시될 수 있습니다.'),true); throw error; } };
  height.addEventListener('input', () => setHeight(Number(height.value) / 100));
  height.addEventListener('change', () => { void saveHeight().catch(() => {}); });
  const stopDrag = bindSpeechDrag(moveHandle, { getHeight:() => state.speechHeight,
    getRect:() => { const outer = video.parentElement.getBoundingClientRect(), content = videoContentRect(video.getBoundingClientRect(), video.videoWidth, video.videoHeight); return {height:speechPlacement(content,outer,state.speechHeight).travel}; }, setHeight, commit:saveHeight });
  const resetPosition = node('button', {type:'button',class:'secondary',text:t('기본 위치'),onclick:() => { stopDrag(); setHeight(DEFAULT_SPEECH_HEIGHT); void saveHeight().catch(() => {}); }});
  const screen = node('div', { class: 'screen-preview' });
  let previewHover = false;
  const speechToggle = node('input', { type: 'checkbox', checked: state.previewSpeech !== false, onchange: () => { state.previewSpeech = speechToggle.checked; update(); } });
  const screenToggle = node('input', { type: 'checkbox', checked: state.previewScreen !== false, onchange: () => { state.previewScreen = screenToggle.checked; update(); } });
  const saveBackgrounds = () => { try {localStorage.setItem('zzz-preview-backgrounds',JSON.stringify({previewMaskSpeech:state.previewMaskSpeech !== false,previewMaskScreen:state.previewMaskScreen !== false}));} catch {} update(); };
  const speechBackground = node('input',{type:'checkbox',checked:state.previewMaskSpeech !== false,onchange:() => {state.previewMaskSpeech=speechBackground.checked;saveBackgrounds();}});
  const screenBackground = node('input',{type:'checkbox',checked:state.previewMaskScreen !== false,onchange:() => {state.previewMaskScreen=screenBackground.checked;saveBackgrounds();}});
  const speechIndex = buildCueIndex(job.cues.filter(cue => !cue.excluded && cue.kind !== 'screen'));
  const screenIndex = buildCueIndex(job.cues.filter(cue => !cue.excluded && cue.kind === 'screen'));
  const offset = node('input', { id: 'previewOffset', type: 'number', value: '0', step: '0.1', min: '-3600', max: '3600', 'aria-label': t('자막 지연 초') });
  const update = () => {
    const now = video.currentTime * 1000 - Number(offset.value || 0) * 1000;
    const mode = $('downloadMode')?.value || 'translated';
    const text = cue => { const translated = state.drafts.get(job.id)?.get(cue.id) ?? cue.translatedText ?? cue.sourceText; return mode === 'source' || job.options.transcribeOnly ? cue.sourceText : mode === 'bilingual' ? `${cue.sourceText}\n${translated}` : translated; };
    label.textContent = speechToggle.checked ? activeCuesAt(speechIndex, now).map(text).join('\n') : '';
    label.style.background = speechBackground.checked ? 'rgba(0,0,0,.76)' : 'transparent';
    caption.hidden = !label.textContent;
    speech.hidden = caption.hidden; if (speech.hidden) stopDrag();
    placeSpeech();
    const outer = video.parentElement.getBoundingClientRect(), rect = videoContentRect(video.getBoundingClientRect(), video.videoWidth, video.videoHeight);
    screen.replaceChildren(...(screenToggle.checked ? activeCuesAt(screenIndex, now) : []).map(cue => {
      const region = cueRegionAt(cue, now), hit = node('button',{type:'button',class:'screen-hit','aria-label':t('자막 메뉴'),title:t('자막 메뉴'),onclick:event=>{event.preventDefault();event.stopPropagation();video.pause();openCueActions(job,cue);}});
      const block = node('div', {class:'screen-caption'},node('span',{text:text(cue)}),hit);
      Object.assign(block.style, { left: `${rect.left - outer.left + region.x * rect.width}px`, top: `${rect.top - outer.top + region.y * rect.height}px`, width: `${region.w * rect.width}px`, minHeight: `${region.h * rect.height}px`, fontSize: `${Math.max(10, Math.min(28, region.h * rect.height * 0.7))}px` });
      block.style.background = screenBackground.checked ? 'rgba(8,10,15,.92)' : 'transparent';
      return block;
    }));
    for (const block of screen.children) {
      const height = block.getBoundingClientRect().height, controlsTop = outer.height - Math.min(64,outer.height * 0.45);
      const cut = previewHover || video.paused ? Math.min(height, Math.max(0,parseFloat(block.style.top) + height - controlsTop)) : 0;
      const hit=block.querySelector('.screen-hit');hit.style.height=`${Math.max(0,height-cut)}px`;hit.hidden=height-cut<1;
    }
  };
  video.addEventListener('timeupdate', update); video.addEventListener('seeked', update); offset.addEventListener('input', update);
  $('downloadMode').addEventListener('change', update);
  video.addEventListener('loadedmetadata', update);
  video.addEventListener('play', update); video.addEventListener('pause', update);
  const resize = new ResizeObserver(update); resize.observe(video);
  state.previewCleanup = () => { stopDrag(); resize.disconnect(); }; state.previewUpdate = update;
  video.addEventListener('error', () => toast(t('이 파일 형식은 브라우저에서 재생하지 못할 수 있습니다. 자막 파일을 외부 플레이어에서 적용할 수 있습니다.'), true));
  container.append(node('div', { class: 'video-preview', onpointerenter:() => {previewHover=true;update();},onpointerleave:() => {previewHover=false;update();} }, video, screen, speech), node('div', { class: 'preview-tools' }, node('label', {}, speechToggle, t('음성 자막 표시')), node('label', {}, screenToggle, t('화면 번역 표시')), node('label', { htmlFor: 'previewOffset', text: t('자막 지연 (초)') }), offset, node('span', { class: 'hint', text: t('양수는 자막을 늦게 표시합니다.') })),
    node('div',{class:'preview-tools'},node('label',{},speechBackground,t('음성 자막 뒤에 배경 표시')),node('label',{},screenBackground,t('화면 글자 뒤에 배경 표시'))),
    node('div',{class:'preview-tools speech-position-tools'},node('label',{},t('음성 자막 높이'),height),resetPosition),node('p',{class:'hint',text:t('자막 클릭: 신고·삭제 / ↕ 이동 손잡이: 모든 음성 자막 높이 조절. 위치는 자동 저장되며 VTT·프로젝트 JSON 다운로드에 반영됩니다.')}));
  state.previewVideo = video; return container;
}
function renderReview(job, element, drafts) {
  state.reviewFilters ||= new Map();
  if (!state.reviewFilters.has(job.id)) state.reviewFilters.set(job.id, { track: job.cues.some(c => c.kind !== 'screen') ? 'speech' : 'screen', search: '', time: '' });
  const filter = state.reviewFilters.get(job.id), list = node('div', { class: 'review-list', id: 'reviewList' }), count = node('p', { class: 'hint', id: 'reviewCount' }), pager = node('div', { class: 'pager' });
  const tabs = node('div', { class: 'review-tabs', role: 'tablist', 'aria-label': t('검토할 번역 종류') });
  const render = () => {
    for (const button of tabs.children) { const selected = button.dataset.track === filter.track; button.classList.toggle('active', selected); button.setAttribute('aria-selected', selected); }
    const now = reviewTime(filter.time);
    if (Number.isNaN(now)) { count.textContent = t('시간은 초 또는 시:분:초로 입력하세요.'); return; }
    const filtered = reviewCues(job.cues, { track: filter.track, search: filter.search, timeMs: now });
    const pages = Math.max(1, Math.ceil(filtered.length / 20)); state.page = Math.min(state.page, pages - 1);
    count.textContent = t('검색 결과 {count}개 구간', { count: filtered.length });
    list.replaceChildren(...filtered.slice(state.page * 20, (state.page + 1) * 20).map(cue => {
      const input = node('textarea', { value: drafts.get(cue.id) ?? cue.translatedText ?? cue.sourceText, disabled: cue.excluded === true, 'aria-label': t('{id}번 자막 수정', { id: cue.id }), oninput: event => {if(event.target.value === (cue.translatedText ?? cue.sourceText)) drafts.delete(cue.id); else drafts.set(cue.id, event.target.value);state.previewUpdate?.();} });
      const seek = node('button', { class: 'text-button', type: 'button', text: time(cue.startMs) + ' – ' + time(cue.endMs) + ' · #' + cue.id, onclick: () => { if (state.previewVideo) state.previewVideo.currentTime = cue.startMs / 1000; } });
      return node('article', { class: 'review-cue', 'data-cue-id': cue.id }, node('div', { class: 'review-cue-header' }, node('span', { class: 'track-badge', text: cue.kind === 'screen' ? t('화면 글자') : t('음성 자막') }), seek, node('button', { class: 'report-button', type: 'button', text: t('오역 신고'), onclick: () => openReport(job, cue) }), node('button', { class: 'report-button', type: 'button', text: t(cue.excluded ? '자막 복원' : '자막 삭제'), onclick: () => toggleCue(job, cue, !cue.excluded).catch(error => toast(error.message, true)) })), node('div', { class: 'review-columns' }, node('div', {}, node('small', { text: t('원문') }), node('p', { class: 'cue-source', text: cue.sourceText })), node('div', {}, node('small', { text: t(cue.excluded ? '삭제된 자막' : '번역') }), input)), cue.warnings?.length ? node('p', { class: 'cue-warning', text: t('확인: {warnings}', { warnings: cue.warnings.map(warning => i18n.message(warning)).join(' · ') }) }) : null);
    }));
    if (!filtered.length) list.append(node('p', { class: 'description', text: t('이 조건에 맞는 구간이 없습니다. 검색어나 시간을 지우거나 다른 탭을 선택하세요.') }));
    pager.replaceChildren(node('button', { class: 'secondary', type: 'button', text: t('이전'), disabled: state.page === 0, onclick: () => { state.page--; render(); } }), node('span', { text: (state.page + 1) + ' / ' + pages }), node('button', { class: 'secondary', type: 'button', text: t('다음'), disabled: state.page >= pages - 1, onclick: () => { state.page++; render(); } }));
  };
  for (const [track, label] of [['speech', t('음성 자막')], ['screen', t('화면 글자')], ['all', t('전체 보기')], ['deleted', t('삭제한 자막')]]) {
    const n = job.cues.filter(c => (track === 'deleted' ? c.excluded === true : !c.excluded) && (track === 'all' || track === 'deleted' || (c.kind === 'screen' ? 'screen' : 'speech') === track)).length;
    const button = node('button', { type: 'button', role: 'tab', text: label + ' · ' + n, onclick: () => { filter.track = track; state.page = 0; render(); } }); button.dataset.track = track; tabs.append(button);
  }
  const search = node('input', { id: 'reviewSearch', type: 'search', value: filter.search, placeholder: t('원문·번역문·구간 번호 검색'), 'aria-label': t('원문·번역문·구간 번호 검색'), oninput: e => { filter.search = e.target.value; state.page = 0; render(); } });
  const timeInput = node('input', { type: 'text', value: filter.time, placeholder: '00:12:30', 'aria-label': t('시간으로 찾기'), oninput: e => { filter.time = e.target.value; state.page = 0; render(); } });
  element.append(tabs, node('div', { class: 'review-search' }, search, node('label', {}, t('시간으로 찾기'), timeInput), node('button', { class: 'secondary', type: 'button', text: t('현재 재생 위치'), disabled: !state.previewVideo, onclick: () => { filter.time = state.previewVideo.currentTime.toFixed(1); timeInput.value = filter.time; state.page = 0; render(); } }), node('button', { class: 'text-button', type: 'button', text: t('검색 초기화'), onclick: () => { filter.search = ''; filter.time = ''; search.value = ''; timeInput.value = ''; state.page = 0; render(); } })), count, list, pager);
  render();
}

function renderDetail() {
  const job = state.detail; if (!job) return;
  const sameJob = state.renderedJob === job.id;
  const preview = sameJob && state.previewVideo ? { time: state.previewVideo.currentTime, paused: state.previewVideo.paused, volume: state.previewVideo.volume } : null;
  const savedMode = sameJob ? $('downloadMode')?.value : null;
  const savedTrack = sameJob ? $('downloadTrack')?.value : null;
  const savedOffset = sameJob ? $('previewOffset')?.value : null;
  state.renderedJob = job.id; state.previewVideo = null;
  const element = $('jobDetail'); element.hidden = false;
  const controls = jobButtons(job);
  element.replaceChildren(node('div', { class: 'detail-header' }, node('div', {}, node('div', { class: 'eyebrow', text: 'YOUR SUBTITLE PROJECT' }), node('h2', { text: job.title || t('영상 준비 중') }), node('small', { text: t('{status} · {languages} · {count}개 구간', { status: statusLabel(job.status, job.cancelRequested), languages: job.options.transcribeOnly ? t('원문 자막') : `${job.options.sourceLanguage} → ${job.options.targetLanguage}`, count: job.cues.filter(cue => !cue.excluded).length }) })), controls));
  if (job.translationPlan) element.append(node('p', { class: 'hint', text: t('문장 {speech}개 · 화면 글자 {screen}개 · 용어 {terms}개 · 번역 요청 {requests}회', { speech: job.translationPlan.sentenceCount, screen: job.translationPlan.screenCount, terms: job.translationPlan.glossaryCount, requests: job.translationPlan.requests }) }));
  if (job.translationPlan?.reusedScreenCueCount > 0) element.append(node('p', { class: 'hint', text: t('화면 문구 {unique}개를 번역하고 같은 위치·문구의 {reused}개 구간에 재사용합니다. 표시 시간은 각각 유지합니다.', { unique: job.translationPlan.screenTranslationCount, reused: job.translationPlan.reusedScreenCueCount }) }));
  if (Number.isFinite(job.translationPlan?.glossaryInputBytes)) element.append(node('p', { class: 'hint', text: t('용어집 전송량 약 {size}KB · 분당 입력량 한도는 요청 횟수와 별도로 적용됩니다.', { size: Math.ceil(job.translationPlan.glossaryInputBytes / 1024).toLocaleString(i18n.locale) }) }));
  if (job.status !== 'completed') {
    const running = job.status === 'running' && !job.cancelRequested, determinate = Number.isFinite(job.stageProgress);
    const progress = determinate && running ? job.stageProgress : (job.completedCues || 0) / Math.max(1, job.cues.length) * 100;
    const bar = node('div'); bar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    const animate = running && !determinate; if (animate) bar.style.width = '';
    element.append(node('div', { class: `progress-track${animate ? ' indeterminate' : ''}`, 'aria-busy': String(running) }, bar), node('p', { class: 'progress-message', text: i18n.message(job.message) }), node('p', { class: 'hint', text: t('완료된 번역 {done} / {total}개 구간 · 모든 구간이 준비되면 자막을 저장하고 적용할 수 있습니다.', { done: job.completedCues || 0, total: job.cues.length || '—' }) }));
    if (job.error) element.append(node('div', { class: 'error-box', text: i18n.message(job.error) }));
    if (job.apiLimit?.limits?.length) {
      const labels = { 'input-tokens-minute': '분당 입력 토큰', 'requests-minute': '분당 요청 수', 'requests-day': '하루 요청 수', other: '기타 할당량' };
      for (const limit of job.apiLimit.limits) element.append(node('p', { class: 'hint', text: t('Google이 반환한 한도 — {type}: {limit}', { type: t(labels[limit.type] || labels.other), limit: Number.isSafeInteger(limit.limit) ? limit.limit.toLocaleString(i18n.locale) : t('값 미제공') }) }));
    }
    return;
  }
  const downloadMode = node('select', { id: 'downloadMode', 'aria-label': t('저장할 자막 내용') }, node('option', { value: 'translated', text: job.options.transcribeOnly ? t('원문 자막') : t('번역 자막') }), ...(!job.options.transcribeOnly ? [node('option', { value: 'bilingual', text: t('원문 + 번역 병기') }), node('option', { value: 'source', text: t('원문 자막') })] : []));
  const downloadTrack = node('select', { id: 'downloadTrack', 'aria-label': t('저장할 자막 종류') }, node('option', { value: 'all', text: t('음성 자막 + 화면 자막') }), node('option', { value: 'speech', text: t('음성 자막만') }), node('option', { value: 'screen', text: t('화면 자막만') }));
  const buttons = node('div', { class: 'button-row' }, downloadTrack, downloadMode, node('button', { class: 'primary', type: 'button', text: t('SRT 저장 ↓'), onclick: () => download('srt') }), node('button', { class: 'secondary', type: 'button', text: t('VTT 저장 ↓'), onclick: () => download('vtt', true) }), node('button', { class: 'secondary', type: 'button', text: t('프로젝트 JSON ↓'), onclick: () => download('json') }));
  if (job.videoId) buttons.append(node('button', { class: 'secondary', type: 'button', text: t(state.videoSaves.has(job.id) ? '영상 저장 취소' : job.videoSaving ? '영상 저장 중' : '유튜브 영상 저장 ↓'), disabled: job.videoSaving && !state.videoSaves.has(job.id), onclick: () => saveVideo(job) }), node('a', { class: 'secondary', href: `https://www.youtube.com/watch?v=${job.videoId}`, target: '_blank', rel: 'noopener', text: t('유튜브에서 열기 ↗') }));
  element.append(node('p', { class: 'progress-message', text: i18n.message(job.message) }), buttons);
  if(job.videoId&&!job.options.transcribeOnly)element.append(node('div',{class:'button-row archive-actions'},node('a',{class:'secondary',href:'https://odarom.github.io/zenless-subtitle-studio/archive/',target:'_blank',rel:'noopener noreferrer',text:t('공유된 자막 아카이브')}),job.archiveShareId?node('button',{class:'secondary',type:'button',text:t('공유 등록 취소'),onclick:()=>unshareArchive(job)}):node('button',{class:'secondary',type:'button',text:t('아카이브에 공유'),onclick:()=>openArchiveShare(job)})));
  element.append(node('p', { class: 'meta-line', text: `${job.origin?.includes('auto') ? t('유튜브 자동 자막 기반 · 원문 오류를 확인하세요.') : job.origin === 'whisper' ? t('음성 인식 기반 · {runtime}', { runtime: i18n.message(job.runtime) || t('로컬 처리') }) : t('기존 원어 자막 기반')}${job.translationConfig ? ` · ${job.translationConfig.provider} / ${job.translationConfig.model}` : ''} · ${t('확인 표시 {count}개 구간', { count: job.cues.filter(cue => cue.warnings?.length).length })}` }));
  if (job.videoId) element.append(node('p', { class: 'hint', text: t('유튜브 영상에서 확장 프로그램을 열고 이 작업의 자막을 적용하세요.') }));
  element.append(node('p', { class: 'hint', text: t('화면 위치는 프로젝트 JSON 또는 위치 포함 VTT로 저장하세요. YouTube CC의 모양은 시청자 설정에 따라 달라집니다.') }));
  element.append(node('aside', {class:'report-help',role:'note','aria-label':t('오역 신고')},
    node('strong',{text:t("오역 신고로 ZZZ 용어 DB를 함께 개선해요")}),node('p',{text:t("게임 용어·약어·번역 오류를 알려주세요. 신고를 검토해 젠레스 게임 용어 DB와 번역 품질을 개선합니다.")}),
    node('p',{text:t("영상의 자막 클릭 → 오역 신고 → 설명 작성 → 신고 보내기. 아래 자막 목록에서도 신고할 수 있습니다.")}),node('p',{class:'hint',text:t("올바른 번역을 몰라도 잘못된 부분만 알려주세요. GitHub 로그인 없이 비공개로 접수됩니다.")})));
  element.append(renderPreview(job));
  const drafts = state.drafts.get(job.id) || new Map(); state.drafts.set(job.id, drafts);
  const save = node('button', { class: 'secondary', type: 'button', text: t('수정 내용 저장'), onclick: async () => {
    if (!drafts.size) return toast(t('수정된 내용이 없습니다.'));
    try { await saveSubtitleDrafts(job.id); renderDetail(); toast(t('수정한 자막 파일을 저장했습니다.')); }
    catch (error) { toast(error.message, true); }
  } });
  element.append(node('div', { class: 'editor-toolbar' }, node('strong', { text: t('자막 확인 및 수정') }), save));
  renderReview(job, element, drafts);
  if (savedMode && $('downloadMode')) $('downloadMode').value = savedMode;
  if (savedTrack && $('downloadTrack')) $('downloadTrack').value = savedTrack;
  if (savedOffset != null && $('previewOffset')) $('previewOffset').value = savedOffset;
  if (preview && state.previewVideo) {
    const video = state.previewVideo;
    video.addEventListener('loadedmetadata', () => { video.currentTime = preview.time; video.volume = preview.volume; if (!preview.paused) video.play().catch(() => {}); }, { once: true });
  }
}

$('uiLanguage').value = i18n.locale;
$('uiLanguage').addEventListener('change', () => {
  i18n.setLocale($('uiLanguage').value);
  try { localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, i18n.locale); } catch {}
  applyStaticLanguage(); selectedFile(state.file);
  renderSettingsLabels(); renderTools(); renderJobLists(); renderDetail(); renderGlossary(); renderProgram(); renderStorageCleanup();
  if ($('reportDialog').open) $('reportDialog').close();
  $('toast').hidden = true;
});

for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => view(button.dataset.view));
$('urlTab').addEventListener('click', () => mode('url')); $('fileTab').addEventListener('click', () => mode('file'));
$('sourceFile').addEventListener('change', event => selectedFile(event.target.files[0]));
$('goSettings').addEventListener('click', () => view('settings'));
$('provider').addEventListener('change', () => bindModelOptions(true));
$('transcribeOnly').addEventListener('change', () => { $('apiNotice').hidden = state.settings?.configured || $('transcribeOnly').checked; });
$('screenText').addEventListener('change', () => { $('screenOptions').hidden = !$('screenText').checked; });
$('refreshTools').addEventListener('click', () => loadTools().catch(error => toast(error.message, true)));
$('copyToken').addEventListener('click', async () => { try { await navigator.clipboard.writeText(state.token); toast(t('PC 연결 코드를 복사했습니다. 확장 프로그램에 붙여 넣으세요.')); } catch { toast(t('클립보드 권한을 허용한 뒤 다시 눌러 주세요.'), true); } });
$('settingsForm').addEventListener('submit', async event => {
  event.preventDefault();
  try { await apiJson('/api/settings', { method: 'POST', body: { provider: $('provider').value, model: $('provider').value === 'deepl' ? $('deeplPlan').value : $('model').value, apiKey: $('apiKey').value, dailyLimit: Number($('dailyLimit').value), requestsPerMinute: Number($('requestsPerMinute').value) } }); $('apiKey').value = ''; await loadSettings(); toast(t('번역 설정을 저장했습니다.')); }
  catch (error) { toast(error.message, true); }
});
$('speechForm').addEventListener('submit', async event => {
  event.preventDefault();
  try { state.settings = await apiJson('/api/settings/speech', { method: 'POST', body: { speechDevice: $('speechDevice').value, speechThreads: Number($('speechThreads').value) } }); toast(t('새 작업에 사용할 음성 인식 장치를 저장했습니다.')); }
  catch (error) { toast(error.message, true); }
});
$('deleteKey').addEventListener('click', async () => { try { await apiJson('/api/settings/key', { method: 'DELETE' }); await loadSettings(); toast(t('영상 번역용 API 키를 삭제했습니다.')); } catch (error) { toast(error.message, true); } });
$('cancelUpload').addEventListener('click', () => state.uploadController?.abort());
$('jobForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!$('transcribeOnly').checked && !state.settings?.configured) { view('settings'); return toast(t('번역 API를 먼저 설정하세요.'), true); }
  $('startButton').disabled = true;
  try {
    let fileId, title;
    const youtubeUrl = state.mode === 'url' ? $('youtubeUrl').value.trim() : $('associateUrl').value.trim();
    if (state.mode === 'file') {
      if (!state.file) throw new Error(t('먼저 파일을 선택하세요.'));
      state.uploadController = new AbortController(); $('cancelUpload').hidden = false; $('startHint').textContent = t('선택한 파일을 PC 처리 프로그램에 준비하고 있습니다.');
      const upload = await apiJson(`/api/uploads?name=${encodeURIComponent(state.file.name)}`, { method: 'POST', raw: state.file, signal: state.uploadController.signal });
      fileId = upload.id; title = upload.name;
    }
    const job = await apiJson('/api/jobs', { method: 'POST', body: { title, input: { fileId, youtubeUrl }, options: { sourceLanguage: $('sourceLanguage').value, targetLanguage: $('targetLanguage').value, style: $('style').value, translationMode: $('translationMode').value, glossaryMode: $('glossaryMode').value, speech: $('speech').checked, screenText: $('screenText').checked, screenLanguage: $('screenLanguage').value, screenIntervalMs: Number($('screenInterval').value), screenStartMs: Math.round(Number($('screenStart').value) * 1000), screenEndMs: $('screenEnd').value ? Math.round(Number($('screenEnd').value) * 1000) : null, forceAsr: $('forceAsr').checked, transcribeOnly: $('transcribeOnly').checked } } });
    if (state.file && !/\.(srt|vtt)$/i.test(state.file.name)) state.previewUrls.set(job.id, URL.createObjectURL(state.file));
    await selectJob(job.id); toast(t('작업을 시작했습니다. 전체 자막이 준비되면 저장할 수 있습니다.'));
  } catch (error) { toast(error.name === 'AbortError' ? t('파일 준비를 중단했습니다.') : error.message, error.name !== 'AbortError'); }
  finally { $('startButton').disabled = false; $('cancelUpload').hidden = true; state.uploadController = null; $('startHint').textContent = t('음성 인식 → 용어집 번역 → 자막 저장 → 감상'); }
});
async function poll() { try { if (!state.restarting) await refreshJobs(); } catch (error) { if (document.visibilityState === 'visible') toast(t('PC 프로그램 연결을 확인하세요. {error}', { error: i18n.message(error.message) }), true); } finally { setTimeout(poll, state.jobs.some(job => ['queued', 'running'].includes(job.status)) ? 1800 : 7000); } }
async function loadGlossary() {
  state.glossary = await apiJson('/api/glossary');
  $('glossaryRepository').value = state.glossary.repository;
  $('glossaryAutoCheck').checked = state.glossary.autoCheck; renderGlossary();
}
function renderGlossary() {
  const info = state.glossary; if (!info) return;
  $('glossaryCount').textContent = info.current.count.toLocaleString(i18n.locale);
  const languageCount = info.current.languages.length.toLocaleString(i18n.locale);
  $('glossaryLanguageCount').textContent = languageCount;
  $('glossaryDescription').textContent = t('{count}개 언어 명칭을 연결한 ZZZ 용어집을', { count: languageCount });
  $('glossaryStatus').textContent = t('사용 중: {version} · {count}개 항목', { version: info.current.version, count: info.current.count.toLocaleString(i18n.locale) });
  if (info.available) $('glossaryStatus').textContent += info.available.sha256 === info.current.sha256 ? ` · ${t('최신 용어집입니다.')}` : ` · ${t('새 용어집: {version}', { version: info.available.version })}`;
  $('glossaryError').textContent = i18n.message(info.error);
  $('updateGlossary').disabled = !info.available || info.available.sha256 === info.current.sha256;
}
async function glossaryAction(action) {
  $('checkGlossary').disabled = true; $('updateGlossary').disabled = true;
  try { state.glossary = await apiJson(`/api/glossary/${action}`, { method: 'POST' }); renderGlossary(); toast(t(action === 'update' ? '새 용어집을 적용했습니다. 새 번역부터 사용합니다.' : '용어집 버전을 확인했습니다.')); }
  catch (error) { toast(error.message, true); }
  finally { $('checkGlossary').disabled = false; renderGlossary(); }
}
$('glossaryForm').addEventListener('submit', async event => {
  event.preventDefault();
  try { state.glossary = await apiJson('/api/glossary/config', { method: 'POST', body: { repository: $('glossaryRepository').value, autoCheck: $('glossaryAutoCheck').checked } }); renderGlossary(); toast(t('업데이트 설정을 저장했습니다.')); }
  catch (error) { toast(error.message, true); }
});
$('checkGlossary').addEventListener('click', () => glossaryAction('check'));
$('updateGlossary').addEventListener('click', () => glossaryAction('update'));
async function toggleCue(job, cue, excluded) {
  const detail = await apiJson(`/api/jobs/${job.id}`, { method: 'PATCH', body: { changes: [{ id: cue.id, excluded }] } });
  if(state.selected !== job.id)return;
  state.detail=detail;
  state.shownVersion = state.detail.updatedAt; renderDetail();
  toast(t(excluded ? '자막을 삭제했습니다. 삭제한 자막 탭에서 복원할 수 있습니다.' : '자막을 복원했습니다.'));
}
function openCueActions(job, cue) {
  const dialog = node('dialog', { 'aria-label': t('자막 메뉴') });
  const close = () => { dialog.close(); dialog.remove(); };
  dialog.append(node('h2', { text: t('자막 메뉴') }), node('p', { text: cue.sourceText }), node('p', { text: cue.translatedText || cue.sourceText }),
    node('div', { class: 'button-row' }, node('button', { class: 'secondary', type: 'button', text: t('닫기'), onclick: close }),
      node('button', { class: 'secondary', type: 'button', text: t('자막 삭제'), onclick: async () => { try { await toggleCue(job, cue, true); close(); } catch(error) { toast(error.message, true); } } }),
      node('button', { class: 'primary', type: 'button', text: t('오역 신고'), onclick: () => { close(); openReport(job, cue); } })));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); }); document.body.append(dialog); dialog.showModal();
}
function openReport(job, cue) {
  state.reportDraft = null; state.reportFingerprint = null;
  state.reportTarget = { jobId: job.id, cueId: cue.id };
  $('reportCueInfo').textContent = `${cue.kind === 'screen' ? t('화면 글자') : t('음성 자막')} · ${time(cue.startMs)} – ${time(cue.endMs)} · #${cue.id}`;
  $('reportSource').value = cue.sourceText; $('reportTranslation').value = cue.translatedText || cue.sourceText;
  $('reportExplanation').value = ''; $('reportSuggestion').value = ''; $('reportVideoUrl').checked = false;
  $('reportReady').hidden = true; $('saveReport').disabled = false; $('reportDialog').showModal();
}
$('closeReport').addEventListener('click', () => $('reportDialog').close());
$('reportForm').addEventListener('submit', async event => {
  event.preventDefault(); $('saveReport').disabled = true;
  try {
    const body = { ...state.reportTarget, type: $('reportType').value, explanation: $('reportExplanation').value, suggestion: $('reportSuggestion').value, includeVideoUrl: $('reportVideoUrl').checked }, fingerprint = JSON.stringify(body);
    if (state.reportFingerprint !== fingerprint) { state.reportDraft = await apiJson('/api/reports', { method: 'POST', body }); state.reportFingerprint = fingerprint; }
    $('reportReady').hidden = false; $('reportReceipt').textContent = t('PC에 저장했습니다. 운영자에게 전송하고 있습니다.');
    const delivery = await apiJson(`/api/reports/${state.reportDraft.report.id}/send`, { method: 'POST', body: {} });
    $('reportReceipt').textContent = t('비공개 신고를 접수했습니다. 접수 번호: {id}', { id: delivery.receiptId });
    toast(t('신고를 보냈습니다. 운영자가 검토합니다.'));
  } catch (error) { $('saveReport').disabled = false; if (state.reportDraft) $('reportReceipt').textContent = t('신고 전송을 완료하지 못했습니다. PC에 저장된 신고를 다시 보낼 수 있습니다.'); toast(error.message, true); }
});
$('exportReport').addEventListener('click', async () => {
  try {
    const id = state.reportDraft.report.id, response = await api(`/api/reports/${id}/export`), url = URL.createObjectURL(await response.blob());
    const link = node('a', { href: url, download: `${id}.json` }); document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (error) { toast(error.message, true); }
});
try {
  const session = await fetch('/api/session', { headers: { 'X-ZZZ-Local': '1' } }); if (!session.ok) throw new Error(t('로컬 연결을 시작하지 못했습니다.'));
  state.token = (await session.json()).token;
  await Promise.all([loadSettings(), loadTools(), loadGlossary(), loadProgram(), loadStorageCleanup()]);
  const youtube = new URLSearchParams(location.search).get('youtube'); if (youtube) $('youtubeUrl').value = youtube;
  const selectedJob = new URLSearchParams(location.search).get('job');
  await refreshJobs(); if (selectedJob && state.jobs.some(job => job.id === selectedJob)) await selectJob(selectedJob); else if (state.jobs.length && !youtube) await selectJob(state.jobs[0].id);
  setTimeout(poll, 1800);
} catch (error) { toast(error.message, true); }

async function loadProgram() { state.program = await apiJson('/api/program'); renderProgram(); }
async function loadStorageCleanup() { state.storageCleanup = (await apiJson('/api/storage')).cleanup; renderStorageCleanup(); }
function renderStorageCleanup() {
  const info = state.storageCleanup, notice = $('storageCleanupNotice');
  notice.hidden = !info || !info.removedFiles && !info.failedFiles;
  if (!info) return;
  notice.textContent = (info.removedFiles ? t('기록에 없는 영상·임시 파일 {count}개를 정리했습니다. 확보한 공간: {size} MB', { count: info.removedFiles, size: (info.removedBytes / 1048576).toLocaleString(i18n.locale, { maximumFractionDigits: 1 }) }) : '')
    + (info.failedFiles ? ' ' + t('일부 남은 파일을 정리하지 못했습니다. 파일을 사용하는 프로그램을 닫고 작업실을 다시 실행하세요.') : '');
}
function renderProgram() {
  const info = state.program; if (!info) return;
  $('programStatus').textContent = t('현재 프로그램 {version}', { version: info.currentVersion }) + (info.available ? ' · ' + t('새 버전 {version}', { version: info.available.version }) : '');
  $('programError').textContent = i18n.message(info.error) || (!info.installSupported ? t('자동 설치는 외부 배포본에서 사용할 수 있습니다.') : '');
  $('updateProgram').disabled = !info.installSupported || !info.available || info.working;
}
$('checkProgram').addEventListener('click', async () => {
  $('checkProgram').disabled = true;
  try { state.program = await apiJson('/api/program/check', { method: 'POST', body: {} }); renderProgram(); toast(t('프로그램 버전을 확인했습니다.')); }
  catch (error) { toast(error.message, true); }
  finally { $('checkProgram').disabled = false; }
});
$('updateProgram').addEventListener('click', async () => {
  $('updateProgram').disabled = true;
  try {
    toast(t('프로그램 업데이트를 준비하고 있습니다.'));
    await apiJson('/api/program/update', { method: 'POST', body: {} }); state.restarting = true; toast(t('프로그램을 업데이트하고 다시 시작하는 중입니다.'));
    let attempts = 0;
    const waitForRestart = async () => {
      try { const health = await (await fetch('/api/health')).json(); if (health.version === state.program.available.version) { location.reload(); return; } } catch {}
      if (++attempts >= 90) { state.restarting = false; await loadProgram().catch(() => {}); toast(t('업데이트 결과를 확인하지 못했습니다. 시작 창의 안내를 확인하세요.'), true); return; }
      setTimeout(waitForRestart, 2000);
    }; setTimeout(waitForRestart, 2000);
  } catch (error) { toast(error.message, true); renderProgram(); }
});
