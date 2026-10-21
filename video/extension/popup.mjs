import { bindDocument, createI18n } from './i18n.mjs';
const i18n = createI18n(navigator.languages);
const t = (...args) => i18n.t(...args);
const applyStaticLanguage = bindDocument(document, i18n);
applyStaticLanguage();
let loadedJobs = null;
import { parseSubtitles, validateCues, youtubeVideoId, subtitleSpeechHeight } from './subtitles.mjs';
import { speechHeight, DEFAULT_SPEECH_HEIGHT } from './speech-position.mjs';
const BASE = 'http://127.0.0.1:4318';
const $ = id => document.getElementById(id);
let tab, videoId, token = '';
const say = (text, error = false) => { $('message').textContent = i18n.message(text); $('message').className = error ? 'error' : ''; };
async function api(path) {
  if (!token) throw new Error(t('프로그램 왼쪽 「API 및 연결 설정」에서 「PC 연결 코드 복사」를 눌러 코드를 입력하세요.'));
  let response;
  try { response = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }); }
  catch { throw new Error(t('PC 프로그램에 연결하지 못했습니다. 프로그램 폴더의 Start.cmd를 실행하세요.')); }
  const value = await response.json(); if (!response.ok) throw new Error(value.error || t('PC 연결을 확인하세요.')); return value;
}
async function send(message) {
  if (!tab?.id || !videoId) throw new Error(t('유튜브 영상 페이지에서 사용하세요.'));
  let result;
  try { result = await chrome.tabs.sendMessage(tab.id, message); } catch { throw new Error(t('유튜브 페이지를 새로고침한 뒤 다시 적용하세요.')); }
  if (result?.error) throw new Error(result.error); return result;
}
const display = () => ({ mode: $('mode').value, offsetMs: Math.round(Number($('offset').value || 0) * 1000), fontSize: Number($('fontSize').value), showSpeech: $('showSpeech').checked, showScreen: $('showScreen').checked, maskScreen: $('maskScreen').checked, uiLanguage:i18n.locale, speechHeight:speechHeight(Number($('speechHeight').value) / 100) });
async function refresh() {
  loadedJobs = await api('/api/jobs'); renderJobs();
}
function renderJobs() {
  if (!loadedJobs) return;
  const jobs = loadedJobs, selected = $('job').value;
  const matches = jobs.filter(job => job.status === 'completed' && (!job.videoId || job.videoId === videoId));
  $('job').replaceChildren();
  for (const job of matches) { const option = document.createElement('option'); option.value = job.id; option.textContent = t('{title} · {count}구간', { title: `${job.options.transcribeOnly ? t('[원문] ') : ''}${job.title || t('자막')}`, count: job.cueCount }); $('job').append(option); }
  if (!matches.length) { const option = document.createElement('option'); option.value = ''; option.textContent = t('이 영상에 적용할 완료된 작업이 없습니다.'); $('job').append(option); }
  if (matches.some(job => job.id === selected)) $('job').value = selected;
  say(matches.length ? t('PC 연결 완료 · 자막 {count}개', { count: matches.length }) : t('PC 연결 완료. 작업실에서 이 영상을 먼저 번역하세요.'));
}
function handle(id, callback) { $(id).addEventListener('click', async () => { try { $(id).disabled = true; await callback(); } catch (error) { say(error.message, true); } finally { $(id).disabled = false; } }); }
handle('connect', async () => { token = $('token').value.trim(); if (!/^[a-f0-9]{64}$/.test(token)) throw new Error(t('프로그램 왼쪽 「API 및 연결 설정」에서 「PC 연결 코드 복사」를 눌러 코드를 입력하세요.')); await refresh(); await chrome.storage.local.set({ connectionToken: token }); });
handle('refresh', refresh);
handle('openStudio', async () => { await chrome.tabs.create({ url: `${BASE}/?youtube=${encodeURIComponent(videoId ? `https://www.youtube.com/watch?v=${videoId}` : '')}` }); });
handle('apply', async () => {
  const id = $('job').value; if (!id) throw new Error(t('완료된 자막을 선택하세요.'));
  const job = await api(`/api/jobs/${id}`);
  if (job.status !== 'completed') throw new Error(t('자막 처리가 완료되지 않았습니다.'));
  const settings = {...display(),speechHeight:Number.isFinite(job.speechHeight)?job.speechHeight:DEFAULT_SPEECH_HEIGHT}; $('speechHeight').value = String(Math.round(settings.speechHeight * 100));
  await send({ type: 'ZZZ_SUBTITLES_LOAD', videoId: job.videoId || videoId, jobId:job.id, cues: job.cues, settings });
  say(t('완성된 자막을 적용했습니다. 영상을 재생하세요.'));
});
handle('displaySettings', async () => { await send({ type: 'ZZZ_SUBTITLES_SETTINGS', settings: display() }); await chrome.storage.local.set({ displaySettings: display() }); say(t('표시 설정을 적용했습니다.')); });
handle('hide', async () => { await send({ type: 'ZZZ_SUBTITLES_HIDE' }); say(t('자막을 숨겼습니다.')); });
async function applyHeight() {
  const value = speechHeight(Number($('speechHeight').value) / 100);
  await send({type:'ZZZ_SUBTITLES_SETTINGS',settings:{speechHeight:value}});
  const saved = await chrome.storage.local.get('displaySettings');
  await chrome.storage.local.set({displaySettings:{...saved.displaySettings,speechHeight:value}});
}
$('speechHeight').addEventListener('change', async () => { try { await applyHeight(); say(t('표시 설정을 적용했습니다.')); } catch (error) { say(error.message,true); } });
handle('resetSpeechPosition', async () => { $('speechHeight').value = String(DEFAULT_SPEECH_HEIGHT * 100); await applyHeight(); say(t('음성 자막을 기본 위치로 되돌렸습니다.')); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.displaySettings) $('speechHeight').value = String(Math.round(speechHeight(changes.displaySettings.newValue?.speechHeight) * 100));
});
$('file').addEventListener('change', async () => {
  try {
    const file = $('file').files[0]; if (!file) return;
    const project = /\.json$/i.test(file.name);
    if (file.size > (project ? 32 : 8) * 1048576) throw new Error(t('SRT/VTT는 8MB, 프로젝트 JSON은 32MB까지 불러올 수 있습니다.'));
    const input = await file.text();
    let cues, height;
    if (project) {
      const data = JSON.parse(input);
      if (data.app !== 'zenless-subtitle-studio' || data.version !== 1 || data.videoId && data.videoId !== videoId) throw new Error(t('이 영상에 맞는 자막 프로젝트 파일을 선택하세요.'));
      cues = validateCues(data.cues);
      height = data.display?.speechHeight;
    } else { cues = parseSubtitles(input).map(cue => ({ ...cue, translatedText: cue.sourceText })); height = subtitleSpeechHeight(input); }
    const settings = {...display(),...(Number.isFinite(height)&&height>=0&&height<=.9?{speechHeight:height}:{})}; $('speechHeight').value = String(Math.round(settings.speechHeight * 100));
    await send({ type: 'ZZZ_SUBTITLES_LOAD', videoId, cues, settings }); say(t('{file} · {count}개 구간을 적용했습니다.', { file: file.name, count: cues.length }));
  } catch (error) { say(error.message, true); }
});
try {
  await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  const saved = await chrome.storage.local.get(['connectionToken', 'displaySettings', 'uiLanguage']);
  if (saved.uiLanguage) i18n.setLocale(saved.uiLanguage);
  applyStaticLanguage(); $('uiLanguage').value = i18n.locale;
  token = saved.connectionToken || ''; $('token').value = token;
  if (saved.displaySettings) { $('mode').value = saved.displaySettings.mode; $('offset').value = saved.displaySettings.offsetMs / 1000; $('fontSize').value = saved.displaySettings.fontSize; }
  for (const key of ['showSpeech', 'showScreen', 'maskScreen']) $(key).checked = saved.displaySettings?.[key] !== false;
  $('speechHeight').value = String(Math.round(speechHeight(saved.displaySettings?.speechHeight) * 100));
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try { videoId = youtubeVideoId(tab?.url || ''); } catch {}
  renderVideoTitle();
  if (token) await refresh();
} catch (error) { say(error.message, true); }

function renderVideoTitle() { $('videoTitle').textContent = videoId ? tab.title || t('유튜브 영상') : t('유튜브 영상 페이지에서 열어 주세요.'); }
$('uiLanguage').value = i18n.locale;
$('uiLanguage').addEventListener('change', async () => {
  i18n.setLocale($('uiLanguage').value); applyStaticLanguage(); renderVideoTitle(); renderJobs(); $('message').textContent = '';
  try { await chrome.storage.local.set({ uiLanguage: i18n.locale }); } catch (error) { say(error.message, true); }
});
