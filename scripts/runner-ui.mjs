import { resolve } from 'node:path';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { RunnerProfiles, runnerUiServer } from '../src/runner-ui-server.js';
const root = resolve(import.meta.dirname, '..');
const open = url => {
  const command = process.platform === 'win32' ? [resolve(process.env.SystemRoot || 'C:/Windows', 'System32/rundll32.exe'), ['url.dll,FileProtocolHandler', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  const child = spawn(command[0], command[1], { shell: false, windowsHide: true, detached: true, stdio: 'ignore' }); child.on('error', () => console.log(url)); child.unref();
};
async function main() {
  const info = resolve(root, 'data/runner-ui/window.json');
  if (existsSync(info)) {
    try { const saved = JSON.parse(readFileSync(info)); if (/^http:\/\/127\.0\.0\.1:4323\/#token=[a-f0-9]{64}$/.test(saved.url)) {
      const reply = await fetch('http://127.0.0.1:4323/api/state', { headers: { 'X-Runner-Session': saved.url.split('=')[1] }, signal: AbortSignal.timeout(1000) });
      if (reply.ok) { if (!process.argv.includes('--no-open')) open(saved.url); return; }
    } } catch {}
  }
  const controller = new RunnerProfiles(root), { server, secret } = runnerUiServer(controller);
  await new Promise((done, reject) => { server.once('error', reject); server.listen(4323, '127.0.0.1', done); });
  const url = `http://127.0.0.1:4323/#token=${secret}`; mkdirSync(resolve(root, 'data/runner-ui'), { recursive: true }); writeFileSync(info, JSON.stringify({ url }), { mode: 0o600 });
  console.log('Personal translation / 개인 번역 연결: http://127.0.0.1:4323'); if (!process.argv.includes('--no-open')) open(url);
  controller.resume(); const monitor = setInterval(() => controller.resume(), 30000); monitor.unref();
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { clearInterval(monitor); controller.stopAll(); server.close(() => process.exit(0)); });
}
main().catch(() => { console.error('Could not open the local runner / 개인 번역 설정 화면을 열지 못했습니다.'); process.exitCode = 1; });
