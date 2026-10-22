import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, readdirSync, copyFileSync, linkSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { zipOperation, sha256File } from '../video/downloads.mjs';
import { parseSubtitles } from '../video/subtitles.mjs';
import { pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const release = JSON.parse(readFileSync(join(root, 'dist', 'video-release.json'), 'utf8'));
if (await sha256File(release.output) !== release.sha256) throw new Error('배포 ZIP 체크섬이 다릅니다.');
const qa = mkdtempSync(join(root, '.tools', 'video-package', '[zzz] 외부 사용자 테스트 '));
await zipOperation(release.output, qa);
const folder = join(qa, readdirSync(qa).find(name => name.startsWith('Zenless-Subtitle-Studio-'))), app = join(folder, 'app');
const manifest = JSON.parse(readFileSync(join(folder, 'release-manifest.json'), 'utf8'));
for (const file of manifest.files) {
  if (isAbsolute(file.path) || file.path.split('/').some(part => ['..', '.secrets', '.env', 'data', 'reports', '.tools', '.models'].includes(part))) throw new Error('배포 파일에 개인 자료 경로가 있습니다.');
  if (await sha256File(join(folder, file.path)) !== file.sha256) throw new Error(`배포 파일 무결성 오류: ${file.path}`);
}
for (const locale of ['ko', 'en', 'ja', 'zh-CN']) if (!existsSync(join(folder, `README-${locale}.md`))) throw new Error('4개 언어 설명서가 없습니다.');
for (const file of ['geometry.js', 'geometry.mjs', 'i18n.mjs', 'locales.mjs', '_locales/ja/messages.json']) if (!existsSync(join(folder, 'video-extension', file))) throw new Error('확장 프로그램 언어·위치 모듈이 없습니다.');
const extensionManifest = JSON.parse(readFileSync(join(folder, 'video-extension/manifest.json'), 'utf8'));
for (const file of [...extensionManifest.content_scripts.flatMap(item => item.js), extensionManifest.background.service_worker]) if (!existsSync(join(folder, 'video-extension', file))) throw new Error('자막 클릭 메뉴의 확장 파일이 없습니다.');
for(const file of ['archive.mjs','archive-protocol.mjs','subtitles.mjs','geometry.mjs'])if(!existsSync(join(folder,'video-extension',file)))throw new Error('공유 아카이브의 확장 파일이 없습니다.');
const archiveExtension=await import(pathToFileURL(join(folder,'video-extension/archive.mjs')));if(typeof archiveExtension.loadArchive!=='function'||typeof archiveExtension.reportArchive!=='function')throw new Error('공유 자막의 독립 실행 모듈을 불러오지 못했습니다.');
if(await sha256File(join(folder,'video-extension/archive-protocol.mjs'))!==await sha256File(join(root,'video/archive.mjs')))throw new Error('확장의 공유 자막 규격 파일이 다릅니다.');
if (!readFileSync(join(folder, 'video-extension/content.js'), 'utf8').includes("attachShadow({ mode: 'closed' })")) throw new Error('배포 확장의 화면 영역 설정이 변경되었습니다.');
function mirror(source, target) {
  mkdirSync(dirname(target), { recursive: true });
  if (readdirIfDirectory(source)) {
    mkdirSync(target, { recursive: true });
    for (const entry of readdirSync(source, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('테스트 도구의 심볼릭 링크는 허용하지 않습니다.');
      mirror(join(source, entry.name), join(target, entry.name));
    }
  } else { try { linkSync(source, target); } catch { copyFileSync(source, target); } }
}
function readdirIfDirectory(path) { try { readdirSync(path); return true; } catch { return false; } }
const toolManifest = JSON.parse(readFileSync(join(root, '.tools', 'video', 'tools.json'), 'utf8'));
for (const key of ['ytdlp', 'whisperCpu', 'whisperVulkan', 'model', 'ffmpeg']) if (!toolManifest[key] || isAbsolute(toolManifest[key]) || relative(root, resolve(root, toolManifest[key])).startsWith('..')) throw new Error('도구 준비 결과가 이동 가능한 상대 경로가 아닙니다.');
// Reuse only public downloads; the packaged installer must verify and extract
// the real archives itself, using Windows' built-in PowerShell and no PATH.
for (const name of ['7zr-26.04.exe', 'whisper-vulkan-x64.zip', 'whisper-blas-bin-x64.zip', 'ffmpeg-master-latest-win64-gpl-shared.zip']) {
  mirror(join(root, '.tools', 'video', name), join(app, '.tools', 'video', name));
}
for (const file of [toolManifest.ytdlp, toolManifest.model]) mirror(join(root, file), join(app, file));
mirror(join(root, '.tools/video/RapidOCR-json_v0.2.0.7z'), join(app, '.tools/video/RapidOCR-json_v0.2.0.7z'));
const port = await new Promise((resolvePort, reject) => { const probe = net.createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const number = probe.address().port; probe.close(() => resolvePort(number)); }); });
const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'ComSpec', 'USERPROFILE', 'TEMP', 'TMP', 'ProgramFiles'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
env.PATH = ''; env.ZZZ_VIDEO_PORT = String(port);
console.log('대괄호·한글·공백 경로에서 배포본의 첫 도구 준비를 확인하고 있습니다.');
await new Promise((resolveSetup, reject) => {
  const setup = spawn(join(folder, 'runtime', 'node.exe'), [join(app, 'scripts', 'video-setup.mjs'), '--portable'], { cwd: folder, windowsHide: true, env, shell: false, stdio: 'inherit' });
  setup.once('error', reject);
  setup.once('close', code => code === 0 ? resolveSetup() : reject(new Error(`배포본 첫 도구 준비 실패 (${code})`)));
});
const child = spawn(join(folder, 'runtime', 'node.exe'), [join(app, 'video', 'server.mjs')], { cwd: folder, windowsHide: true, env, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = ''; child.stdout.on('data', chunk => { logs += chunk; }); child.stderr.on('data', chunk => { logs += chunk; });
const base = `http://127.0.0.1:${port}`;
let report;
try {
  let health;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { const response = await fetch(`${base}/api/health`); if (response.ok) { health = await response.json(); break; } } catch {}
    if (child.exitCode !== null) throw new Error(logs || '배포 프로그램 실행 실패');
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  if (!health || health.version !== release.version) throw new Error('배포 프로그램의 시작 상태를 확인하지 못했습니다.');
  // Load the browser's dependency graph from the extracted release, not the
  // checkout. Missing named exports prevent every UI event handler from loading.
  const modules = new Map();
  async function browserModule(url) {
    if (modules.has(url)) return modules.get(url);
    const response = await fetch(url), source = await response.text();
    if (!response.ok || !source.trim() || !response.headers.get('content-type')?.startsWith('text/javascript')) throw new Error(`Browser module unavailable: ${new URL(url).pathname}`);
    let rewritten = source;
    for (const match of source.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g)) {
      const dependency = new URL(match[2], url);
      if (dependency.origin !== base) throw new Error('Unexpected external browser dependency.');
      const loaded = await browserModule(dependency.href);
      for (const name of match[1].split(',').map(value => value.trim().split(/\s+as\s+/)[0]).filter(Boolean)) if (!Object.hasOwn(loaded.exports, name)) throw new Error(`Missing browser export ${name}: ${dependency.pathname}`);
      rewritten = rewritten.replace(match[0], match[0].replace(match[2], loaded.dataUrl));
    }
    const dataUrl = 'data:text/javascript;base64,' + Buffer.from(rewritten).toString('base64');
    const value = { dataUrl, exports: url.endsWith('/app.js') ? null : await import(dataUrl) };
    modules.set(url, value); return value;
  }
  await browserModule(`${base}/app.js`);
  console.log(`배포본의 화면 모듈 ${modules.size}개와 연결된 내보내기를 확인했습니다.`);
  const session = await (await fetch(`${base}/api/session`, { headers: { 'X-ZZZ-Local': '1' } })).json();
  const headers = { Authorization: `Bearer ${session.token}` };
  const api = async (path, method = 'GET', body) => {
    const response = await fetch(`${base}${path}`, { method, headers: { ...headers, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const value = await response.json(); if (!response.ok) throw new Error(value.error); return value;
  };
  const initialSettings = await api('/api/settings'), initialJobs = await api('/api/jobs');
  if (initialSettings.hasKey || initialJobs.length) throw new Error('깨끗한 배포본에 기존 사용자 자료가 나타났습니다.');
  await api('/api/settings/speech', 'POST', { speechDevice: 'cpu', speechThreads: 0 });
  const ready = await api('/api/tools');
  if (!ready.ready.cpu || !ready.ready.ffmpeg || !ready.ready.model) throw new Error('이동한 폴더에서 로컬 도구를 찾지 못했습니다.');
  const audio = readFileSync(join(root, 'data', 'video', 'smoke', 'jfk.wav'));
  const uploadResponse = await fetch(`${base}/api/uploads?name=public-hardware-test.wav`, { method: 'POST', headers, body: audio });
  const upload = await uploadResponse.json(); if (!uploadResponse.ok) throw new Error(upload.error);
  const created = await api('/api/jobs', 'POST', { title: '외부 배포본 CPU 검증', input: { fileId: upload.id }, options: { sourceLanguage: 'en', targetLanguage: 'ko', transcribeOnly: true } });
  console.log('이동한 배포 폴더의 Node·FFmpeg·CPU 인식 경로를 확인하고 있습니다.');
  const started = Date.now();
  let job;
  for (let attempt = 0; attempt < 300; attempt++) {
    job = await api(`/api/jobs/${created.id}`);
    if (job.status === 'completed') break;
    if (['failed', 'cancelled', 'interrupted'].includes(job.status)) throw new Error(job.error || job.message);
    await new Promise(resolveWait => setTimeout(resolveWait, 500));
  }
  if (job.status !== 'completed' || !/CPU/.test(job.runtime)) throw new Error('배포본 CPU 인식을 완료하지 못했습니다.');
  const output = await fetch(`${base}/api/jobs/${job.id}/export?format=srt&mode=source`, { headers });
  const cues = parseSubtitles(await output.text()); if (!/ask not/i.test(cues.map(cue => cue.sourceText).join(' '))) throw new Error('배포본 자막 결과를 확인하지 못했습니다.');
  if (job.options.screenText !== false) throw new Error('OCR 기본값이 꺼짐이 아닙니다.');
  const ocrVideo = readFileSync(join(root, 'data/video/smoke/ocr/position-test.mp4'));
  const videoResponse = await fetch(`${base}/api/uploads?name=screen-position-test.mp4`, { method: 'POST', headers, body: ocrVideo });
  const videoUpload = await videoResponse.json(); if (!videoResponse.ok) throw new Error(videoUpload.error);
  const ocrCreated = await api('/api/jobs', 'POST', { input: { fileId: videoUpload.id, youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }, options: { speech: false, screenText: true, screenLanguage: 'en', transcribeOnly: true } });
  let ocrJob;
  for (let attempt = 0; attempt < 180; attempt++) {
    ocrJob = await api(`/api/jobs/${ocrCreated.id}`);
    if (ocrJob.status === 'completed') break;
    if (['failed', 'cancelled', 'interrupted'].includes(ocrJob.status)) throw new Error(ocrJob.error || ocrJob.message);
    await new Promise(resolveWait => setTimeout(resolveWait, 500));
  }
  if (ocrJob.status !== 'completed' || !ocrJob.cues.some(cue => cue.kind === 'screen' && cue.positions?.length >= 2)) throw new Error('배포본 화면 OCR을 완료하지 못했습니다.');
  const project = await api(`/api/jobs/${ocrJob.id}/export?format=json`);
  if (project.app !== 'zenless-subtitle-studio' || !project.cues[0].region) throw new Error('화면 프로젝트 저장을 확인하지 못했습니다.');
  const screenOnly = await api(`/api/jobs/${ocrJob.id}/export?format=json&track=screen`), speechOnly = await api(`/api/jobs/${ocrJob.id}/export?format=json&track=speech`);
  if (screenOnly.cues.length !== project.cues.length || screenOnly.cues.some(cue => cue.kind !== 'screen') || speechOnly.cues.length) throw new Error('자막 저장 종류를 확인하지 못했습니다.');
  const selectedCue = project.cues[0].id;
  await api(`/api/jobs/${ocrJob.id}`, 'PATCH', { changes: [{ id: selectedCue, excluded: true }] });
  if ((await api(`/api/jobs/${ocrJob.id}/export?format=json`)).cues.some(cue => cue.id === selectedCue)) throw new Error('삭제한 자막이 저장 파일에 포함되었습니다.');
  await api(`/api/jobs/${ocrJob.id}`, 'PATCH', { changes: [{ id: selectedCue, excluded: false }] });
  if (JSON.stringify(await api(`/api/jobs/${ocrJob.id}/export?format=json`)) !== JSON.stringify(project)) throw new Error('삭제 취소 후 자막 시간·위치가 변경되었습니다.');
  // Seed the save cache with our own public OCR test fixture. Exercise the real
  // packaged HTTP download path without contacting YouTube or a translation API.
  const cachedVideo = join(app, `data/video/jobs/${ocrJob.id}/saved-video.mp4`);
  copyFileSync(join(root, 'data/video/smoke/ocr/position-test.mp4'), cachedVideo);
  writeFileSync(join(app, `data/video/jobs/${ocrJob.id}/saved-video.json`), JSON.stringify({ videoId: ocrJob.videoId, name: 'saved-video.mp4' }));
  const videoTicket = await api(`/api/jobs/${ocrJob.id}/video`, 'POST');
  const download = await fetch(base + videoTicket.url);
  if (!download.ok || !download.headers.get('content-disposition')?.includes('attachment')) throw new Error('별도 영상 다운로드 응답을 확인하지 못했습니다.');
  const separatelySaved = join(folder, 'separately-saved-video.mp4'); writeFileSync(separatelySaved, Buffer.from(await download.arrayBuffer()));
  if (await sha256File(separatelySaved) !== await sha256File(cachedVideo)) throw new Error('별도 영상 저장 결과가 다릅니다.');
  await api(`/api/jobs/${ocrJob.id}`, 'DELETE'); await api(`/api/jobs/${job.id}`, 'DELETE');
  for (const path of [`data/video/jobs/${ocrJob.id}`, `data/video/jobs/${job.id}`, `data/video/uploads/${videoUpload.id}.mp4`, `data/video/uploads/${videoUpload.id}.json`, `data/video/uploads/${upload.id}.wav`, `data/video/uploads/${upload.id}.json`]) if (existsSync(join(app, path))) throw new Error('기록 삭제 후 작업 파일이 남았습니다.');
  if (!existsSync(separatelySaved) || !existsSync(join(root, 'data/video/smoke/ocr/position-test.mp4'))) throw new Error('원본 또는 별도 저장 영상이 삭제되었습니다.');
  const glossaryCheck = await api('/api/glossary/check', 'POST', {});
  const updatedGlossary = await api('/api/glossary/update', 'POST', {});
  const expectedGlossary = glossaryCheck.available || glossaryCheck.current;
  if (updatedGlossary.current.count !== expectedGlossary.count || updatedGlossary.current.sha256 !== expectedGlossary.sha256) throw new Error('공개 GitHub 용어집 연결을 확인하지 못했습니다.');
  report = { version: release.version, archiveSha256: release.sha256, bundledNode: release.nodeVersion, archiveVerified: true, cleanKeys: !initialSettings.hasKey, initialJobs: initialJobs.length, globalPathDisabled: true, nonAsciiAndSpacePath: true, bracketPath: true, firstTimeSetup: 'completed (verified cached downloads)', archiveExtractor: 'Windows PowerShell 5.1 + .NET', cpuTranscription: 'completed', optionalCpuOcr: 'completed', projectExport: true, speechScreenExports: true, reversibleCueDeletion: true, jobDeletionRemovesMediaAndUploadCopies: true, separateVideoDownload: 'verified with own cached test video (no live YouTube request)', separateOriginalsAndDownloadsPreserved: true, extensionCueActionFiles: true, productionShadowClosed: true, githubGlossaryUpdate: true, fourLanguageReadmes: true, elapsedMs: Date.now() - started, cueCount: cues.length, translationApiCalls: 0 };
  writeFileSync(join(root, 'dist', 'video-package-qa.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
} finally { child.kill(); await new Promise(resolveExit => { if (child.exitCode !== null) resolveExit(); else child.once('close', resolveExit); }); }
