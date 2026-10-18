import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tools } from '../video/media.mjs';
import { runProcess } from '../video/downloads.mjs';
import { UPDATE_EXIT_CODE } from '../video/program-updates.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('이 배포본은 Windows x64용입니다.');
  const t = tools(root);
  if (!t.ready.whisper || !t.ready.model || !t.ready.ytdlp || !t.ready.ffmpeg || !t.ready.cpu) {
    console.log('처음 실행에 필요한 음성 인식·영상 도구를 준비합니다. 모델과 도구 다운로드에는 인터넷 연결이 필요합니다.');
    await runProcess(process.execPath, [join(root, 'scripts', 'video-setup.mjs'), '--portable']);
  }
  for (;;) {
    try { await runProcess(process.execPath, [join(root, 'video', 'server.mjs'), ...(process.argv.includes('--no-open') ? [] : ['--open'])]); break; }
    catch (error) {
      if (error.exitCode !== UPDATE_EXIT_CODE) throw error;
      try { await runProcess(process.execPath, [join(root, 'scripts', 'video-update-apply.mjs')]); }
      catch { console.error('업데이트를 적용하지 못해 이전 버전으로 다시 시작합니다.'); }
    }
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
