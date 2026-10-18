import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, closeSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { settings, UserError } from '../src/config.js';
import { checkLocalModel } from '../src/ollama.js';

const config = settings({ ...process.env, TRANSLATION_PROVIDER: 'ollama' }, { requireSecrets: false });
let child;
let stopping = false;
const cleanup = () => {
  if (stopping || !child?.pid || child.exitCode !== null) return;
  stopping = true;
  // Kill only the server this launcher owns, including its model workers.
  // Killing just ollama.exe can leave llama-server.exe using GPU memory.
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 10000 });
  } else child.kill();
};
process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
process.on('exit', cleanup);
const running = async () => {
  try { return (await fetch(`${config.ollamaUrl}/api/version`, { signal: AbortSignal.timeout(1000), redirect: 'error' })).ok; }
  catch { return false; }
};
try {
  if (!await running()) {
    const candidates = [resolve('.tools/ollama/ollama.exe'), join(process.env.LOCALAPPDATA || '', 'Programs/Ollama/ollama.exe')];
    const exe = candidates.find(existsSync);
    if (!exe) throw new UserError('Ollama가 없습니다. https://ollama.com/download/windows 에서 설치하고 다시 실행하세요.');
    mkdirSync('.models', { recursive: true }); mkdirSync('.tools', { recursive: true });
    const log = openSync('.tools/ollama.log', 'a');
    child = spawn(exe, ['serve'], { windowsHide: true, stdio: ['ignore', log, log], env: {
      ...process.env, OLLAMA_HOST: new URL(config.ollamaUrl).host,
      OLLAMA_MODELS: resolve('.models'), OLLAMA_NO_CLOUD: '1', OLLAMA_NUM_PARALLEL: '1',
    } });
    closeSync(log);
    child.on('error', () => { console.error('Ollama 실행 실패. 설치를 확인하세요.'); process.exit(1); });
    let ready = false;
    for (let i = 0; i < 40; i++) { if (await running()) { ready = true; break; } await delay(500); }
    if (!ready) throw new UserError('Ollama가 시작되지 않았습니다. .tools/ollama.log를 확인하세요.');
  }
  const model = await fetch(`${config.ollamaUrl}/api/show`, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model }), signal: AbortSignal.timeout(10000) });
  if (model.status === 404) {
    console.log(`${config.model} 모델 다운로드를 시작합니다. qwen3:8b는 약 5.2GB입니다. 최초 한 번만 필요합니다.`);
    const response = await fetch(`${config.ollamaUrl}/api/pull`, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model, stream: true }), signal: AbortSignal.timeout(3600000) });
    if (!response.ok) throw new UserError(`모델 다운로드 실패 (HTTP ${response.status})`);
    const decoder = new TextDecoder(); let pending = ''; let last = 0; let success = false;
    for await (const chunk of response.body) {
      pending += decoder.decode(chunk, { stream: true });
      let end;
      while ((end = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, end); pending = pending.slice(end + 1);
        if (!line.trim()) continue;
        const progress = JSON.parse(line);
        if (progress.error) throw new UserError('모델 다운로드 실패. 인터넷 연결과 모델 이름을 확인하세요.');
        if (progress.status === 'success') success = true;
        if (Date.now() - last > 10000 || success) {
          console.log(progress.total ? `모델 다운로드: ${Math.round((progress.completed || 0) / progress.total * 100)}%` : success ? '모델 다운로드 완료' : '모델 준비 중…');
          last = Date.now();
        }
      }
    }
    if (!success) throw new UserError('모델 다운로드가 완료되지 않았습니다. 다시 실행하면 이어서 받습니다.');
  }
  await checkLocalModel(config);
  console.log(`로컬 AI 준비 완료: ${config.model}. run.cmd에서 번역 봇을 실행하세요.`);
  if (child) console.log('이 창을 열어 두세요. 로컬 AI 종료: Ctrl+C');
  else console.log('이미 실행 중인 Ollama를 사용합니다. 이 준비 창은 닫아도 됩니다.');
} catch (error) {
  console.error(error instanceof UserError ? error.message : '로컬 AI 준비 실패. 설치·인터넷 연결·디스크 공간을 확인하세요.');
  cleanup(); process.exitCode = 1;
}
