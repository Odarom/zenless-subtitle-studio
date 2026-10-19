import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { zipOperation, sha256File } from '../video/downloads.mjs';
import { DEFAULT_PROGRAM_REPOSITORY } from '../video/distribution.mjs';

const root = resolve(import.meta.dirname, '..'), release = JSON.parse(readFileSync(join(root, 'dist/video-release.json'), 'utf8'));
if (await sha256File(release.output) !== release.sha256) throw new Error('배포 ZIP 검증 실패');
const directory = mkdtempSync(join(root, '.tools/video-package/[update] 한글 공백 '));
await zipOperation(release.output, directory);
const folder = join(directory, `Zenless-Subtitle-Studio-${release.version}-win-x64`), app = join(folder, 'app');
// Simulate an older installation that already has the updater. The actual
// 0.3.0 release predates the updater and still requires a one-time full install.
writeFileSync(join(app, 'video/version.mjs'), "export const VIDEO_VERSION = '0.3.99';\n");
const archive = readFileSync(release.output), digest = value => createHash('sha256').update(value).digest('hex');
const feed = { schema: 1, app: 'zenless-subtitle-studio', version: release.version, platform: 'win32-x64', minimumNode: '24.17.0', bytes: archive.length, sha256: release.sha256, url: `https://github.com/${DEFAULT_PROGRAM_REPOSITORY}/releases/download/v${release.version}/zenless-subtitle-studio-${release.version}-win-x64.zip` };
const source = createServer((req, res) => { res.writeHead(200, { 'Content-Type': req.url === '/feed' ? 'application/json' : 'application/zip' }); res.end(req.url === '/feed' ? JSON.stringify(feed) : archive); });
source.listen(0, '127.0.0.1'); await once(source, 'listening');
const fixtureBase = `http://127.0.0.1:${source.address().port}`;
let backend = readFileSync(join(app, 'video/server.mjs'), 'utf8');
const marker = 'createVideoServer({ onProgramRestart:';
if (!backend.includes(marker)) throw new Error('업데이트 검사 진입점을 찾지 못했습니다.');
backend = backend.replace(marker, `createVideoServer({ programOptions: { fetcher: (url, options) => fetch(url.endsWith('program-latest.json') ? '${fixtureBase}/feed' : '${fixtureBase}/archive', options) }, onProgramRestart:`);
writeFileSync(join(app, 'video/server.mjs'), backend);
mkdirSync(join(app, '.tools/video'), { recursive: true }); writeFileSync(join(app, '.tools/video/qa-marker'), 'KEEP-TOOLS');
writeFileSync(join(app, '.tools/video/tools.json'), JSON.stringify(Object.fromEntries(['whisperCpu', 'model', 'ytdlp', 'ffmpeg'].map(name => [name, '.tools/video/qa-marker']))));
mkdirSync(join(app, '.models')); writeFileSync(join(app, '.models/qa-marker'), 'KEEP-MODELS');
// Reserve another local port before launching the actual bundled supervisor.
const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening'); const port = probe.address().port; await new Promise(r => probe.close(r));
const base = `http://127.0.0.1:${port}`, env = { ...process.env, PATH: '', ZZZ_VIDEO_PORT: String(port) };
const child = spawn(join(folder, 'runtime/node.exe'), [join(app, 'scripts/video-launch.mjs'), '--no-open'], { cwd: folder, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; for (const pipe of [child.stdout, child.stderr]) pipe.on('data', part => { log = (log + part).slice(-20000); });
const delay = () => new Promise(r => setTimeout(r, 200));
const health = async version => {
  for (let i = 0; i < 300; i++) {
    if (child.exitCode !== null) throw new Error(log || '업데이트 시작 파일 종료');
    try { const result = await (await fetch(base + '/api/health', { signal: AbortSignal.timeout(1000) })).json(); if (result.version === version) return; } catch {}
    await delay();
  }
  throw new Error('업데이트 후 재시작 확인 실패: ' + log);
};
try {
  await health('0.3.99');
  const { token } = await (await fetch(base + '/api/session', { headers: { 'X-ZZZ-Local': '1' } })).json();
  const headers = { Authorization: `Bearer ${token}` };
  const api = async (path, method = 'GET', body) => {
    const r = await fetch(base + path, { method, headers: { ...headers, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await r.json(); if (!r.ok) throw new Error(data.error); return data;
  };
  await api('/api/settings', 'POST', { provider: 'gemini', model: 'gemini-3.1-flash-lite', apiKey: 'AIza' + 'Q'.repeat(36), dailyLimit: 3, requestsPerMinute: 1 });
  const payload = '1\n00:00:00,000 --> 00:00:02,000\nQuick Assist.\n';
  const uploaded = await (await fetch(base + '/api/uploads?name=update-qa.srt', { method: 'POST', headers, body: payload })).json();
  const job = await api('/api/jobs', 'POST', { input: { fileId: uploaded.id }, options: { transcribeOnly: true } });
  for (let i = 0; i < 100 && (await api('/api/jobs/' + job.id)).status !== 'completed'; i++) await delay();
  if ((await api('/api/jobs/' + job.id)).status !== 'completed') throw new Error('검사용 원문 작업 실패');
  await api('/api/jobs/' + job.id, 'PATCH', { changes: [{ id: '1', excluded: true }] });
  const keep = ['data/video/api-vault.json', '.secrets/video-api.key', '.secrets/video-connection.key', '.models/qa-marker', '.tools/video/qa-marker', `data/video/jobs/${job.id}/job.json`];
  const before = new Map(keep.map(path => [path, digest(readFileSync(join(app, path)))]));
  const checked = await api('/api/program/check', 'POST', {});
  if (checked.available?.version !== release.version) throw new Error('업데이트 확인 실패');
  await api('/api/program/update', 'POST', {}); await health(release.version);
  if (!(await api('/api/settings')).hasKey || (await api('/api/jobs/' + job.id)).status !== 'completed') throw new Error('설정 또는 기록 유지 실패');
  if (!(await api('/api/jobs/' + job.id)).cues[0].excluded) throw new Error('자막 삭제 상태 유지 실패');
  if (!existsSync(join(folder, 'video-extension/background.mjs')) || JSON.parse(readFileSync(join(folder, 'video-extension/manifest.json'))).version !== release.version) throw new Error('확장 업데이트 확인 실패');
  for (const [path, hash] of before) if (digest(readFileSync(join(app, path))) !== hash) throw new Error('사용자 자료 변경: ' + path);
  const manifest = JSON.parse(readFileSync(join(folder, 'release-manifest.json'), 'utf8'));
  if (manifest.version !== release.version || !manifest.installedRuntimePreserved || !JSON.parse(readFileSync(join(app, 'data/video/program-update-receipt.json'))).installedAt) throw new Error('설치 결과 확인 실패');
  const result = { version: release.version, archiveSha256: release.sha256, simulatedPreviousVersion: '0.3.99 (updater already installed)', realZipExtraction: true, bundledSupervisorRestart: true, bracketKoreanSpacePath: true, globalPathDisabled: true, settingsKeysModelsToolsHistoryPreserved: true, runtimePreserved: true, translationApiCalls: 0 };
  writeFileSync(join(root, 'dist/video-update-qa.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} finally {
  if (child.exitCode === null) spawnSync(join(process.env.SystemRoot || 'C:/Windows', 'System32/taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  source.closeAllConnections(); await new Promise(r => source.close(r));
}
