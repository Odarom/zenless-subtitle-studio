import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve, isAbsolute } from 'node:path';
import { spawn } from 'node:child_process';
import { downloadVerified, findFile } from './downloads.mjs';
import { readJson, saveJson } from './state.mjs';

const RELEASE = 'https://github.com/hiroi-sora/RapidOCR-json/releases/download/v0.2.0/RapidOCR-json_v0.2.0.7z';
const DIGEST = '7ad9b283d03436c6cd0296723188699299cb4e5cf9140b410c59543aa5793c40';
const preparations = new Map();
function tar(args, { signal } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), args, { signal, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', error = '';
    child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { error = (error + chunk).slice(-2000); });
    child.once('error', reject); child.once('close', code => code === 0 ? resolveRun(output) : reject(new Error(`OCR 압축 해제 실패 (${code}). ${error}`)));
  });
}
export async function ensureOcr(root, { signal } = {}) {
  const toolsPath = join(root, '.tools', 'video', 'tools.json'), installed = readJson(toolsPath, {});
  if (installed.ocr && existsSync(resolve(root, installed.ocr))) return resolve(root, installed.ocr);
  if (preparations.has(root)) return preparations.get(root);
  const preparation = (async () => {
    const directory = join(root, '.tools', 'video', 'ocr'); mkdirSync(directory, { recursive: true });
    const archive = join(root, '.tools', 'video', 'RapidOCR-json_v0.2.0.7z'); await downloadVerified(RELEASE, archive, DIGEST, { signal });
    const entries = (await tar(['-tf', archive], { signal })).split(/\r?\n/).filter(Boolean);
    for (const name of entries) {
      const local = relative(directory, resolve(directory, name));
      if (isAbsolute(name) || name.includes(':') || !local || local.startsWith('..') || isAbsolute(local)) throw new Error('OCR 압축 파일의 경로가 올바르지 않습니다.');
    }
    await tar(['-xf', archive, '-C', directory], { signal });
    const executable = findFile(directory, 'RapidOCR-json.exe') || findFile(directory, 'RapidOCR_json.exe');
    if (!executable || !existsSync(join(dirname(executable), 'models'))) throw new Error('OCR 실행 파일과 언어 모델을 찾지 못했습니다.');
    const manifest = readJson(toolsPath, {});
    saveJson(toolsPath, { ...manifest, ocr: relative(root, executable), sources: { ...manifest.sources, ocr: RELEASE, ocrSha256: DIGEST } });
    return executable;
  })();
  preparations.set(root, preparation);
  try { return await preparation; } finally { preparations.delete(root); }
}
