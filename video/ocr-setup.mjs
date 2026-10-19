import { existsSync, mkdirSync, mkdtempSync, lstatSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve, isAbsolute } from 'node:path';
import { spawn } from 'node:child_process';
import { downloadVerified, findFile } from './downloads.mjs';
import { readJson, saveJson } from './state.mjs';

const RELEASE = 'https://github.com/hiroi-sora/RapidOCR-json/releases/download/v0.2.0/RapidOCR-json_v0.2.0.7z';
const DIGEST = '7ad9b283d03436c6cd0296723188699299cb4e5cf9140b410c59543aa5793c40';
// Some Windows tar.exe builds cannot read LZMA2/7z. Use the pinned, portable
// upstream 7z-only extractor; no system installation or PATH lookup is needed.
const EXTRACTOR_RELEASE = 'https://github.com/ip7z/7zip/releases/download/26.04/7zr.exe';
const EXTRACTOR_DIGEST = '256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282';
const preparations = new Map();
function runExtractor(executable, args, { signal } = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(executable, args, { signal, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', error = '';
    child.stdout.on('data', chunk => { output += chunk; if (output.length > 2 * 1024 * 1024) { child.kill(); reject(new Error('OCR 압축 목록이 너무 큽니다.')); } }); child.stderr.on('data', chunk => { error = (error + chunk).slice(-2000); });
    child.once('error', reject); child.once('close', code => code === 0 ? resolveRun(output) : reject(new Error(`OCR 압축 해제 실패 (${code}). ${error}`)));
  });
}
export function validateOcrListing(listing, directory) {
  const blocks = listing.trim().split(/\r?\n\s*\r?\n/);
  if (!listing.trim() || blocks.length > 10000) throw new Error('OCR 압축 목록이 올바르지 않습니다.');
  for (const block of blocks) {
    const fields = Object.fromEntries(block.split(/\r?\n/).map(line => { const at = line.indexOf(' = '); return [line.slice(0, at), line.slice(at + 3)]; }));
    const name = fields.Path || '', normalized = name.replaceAll('\\', '/');
    const parts = normalized.split('/');
    const local = relative(directory, resolve(directory, ...parts));
    if (!name || isAbsolute(name) || normalized.startsWith('/') || name.includes(':') || parts.some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part))
      || !local || local.startsWith('..') || isAbsolute(local) || fields.Encrypted !== '-'
      || Object.keys(fields).some(key => /link|reparse/i.test(key)) || /L/.test(fields.Attributes || '')) throw new Error('OCR 압축 파일의 경로가 올바르지 않습니다.');
  }
  // A fresh destination also must not sit beneath an existing junction.
  for (let path = resolve(directory); ; path = dirname(path)) {
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error('OCR 설치 경로에 링크가 있습니다.');
    if (dirname(path) === path) break;
  }
}
export async function extractOcrArchive(archive, directory, { extractor, signal, run = runExtractor } = {}) {
  signal?.throwIfAborted();
  validateOcrListing(await run(extractor, ['l', '-slt', '-ba', '-sccUTF-8', '--', archive], { signal }), directory);
  await run(extractor, ['x', '-y', '-sccUTF-8', `-o${directory}`, '--', archive], { signal });
  const executable = findFile(directory, 'RapidOCR-json.exe') || findFile(directory, 'RapidOCR_json.exe');
  if (!executable || !existsSync(join(dirname(executable), 'models'))) throw new Error('OCR 실행 파일과 언어 모델을 찾지 못했습니다.');
  return executable;
}
export async function ensureOcr(root, { signal } = {}) {
  signal?.throwIfAborted();
  const toolsPath = join(root, '.tools', 'video', 'tools.json'), installed = readJson(toolsPath, {});
  if (installed.ocr && existsSync(resolve(root, installed.ocr)) && existsSync(join(dirname(resolve(root, installed.ocr)), 'models'))) return resolve(root, installed.ocr);
  if (preparations.has(root)) return preparations.get(root);
  const preparation = (async () => {
    const base = join(root, '.tools', 'video'); mkdirSync(base, { recursive: true });
    const archive = join(root, '.tools', 'video', 'RapidOCR-json_v0.2.0.7z'); await downloadVerified(RELEASE, archive, DIGEST, { signal });
    const extractor = join(base, '7zr-26.04.exe'); await downloadVerified(EXTRACTOR_RELEASE, extractor, EXTRACTOR_DIGEST, { signal });
    // Install into a fresh directory so failed/older partial installs and
    // bracket-containing paths cannot interfere with a retry.
    const directory = mkdtempSync(join(base, 'ocr-'));
    let executable;
    try { executable = await extractOcrArchive(archive, directory, { extractor, signal }); }
    catch (error) { if (dirname(resolve(directory)) === resolve(base)) rmSync(directory, { recursive: true, force: true }); throw error; }
    const manifest = readJson(toolsPath, {});
    saveJson(toolsPath, { ...manifest, ocr: relative(root, executable), sources: { ...manifest.sources, ocr: RELEASE, ocrSha256: DIGEST, ocrExtractor: EXTRACTOR_RELEASE, ocrExtractorSha256: EXTRACTOR_DIGEST } });
    return executable;
  })();
  preparations.set(root, preparation);
  try { return await preparation; } finally { preparations.delete(root); }
}
