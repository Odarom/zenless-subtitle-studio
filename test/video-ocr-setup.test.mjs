import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateOcrListing, extractOcrArchive } from '../video/ocr-setup.mjs';

const listing = name => `Path = ${name}\nSize = 1\nAttributes = A\nEncrypted = -\nMethod = LZMA2:25\n`;
test('OCR rejects unsafe archive members and destination junctions before extraction', () => {
  const root = mkdtempSync(join(tmpdir(), 'zzz-ocr-path-'));
  for (const name of ['../escape', '..\\escape', 'C:\\escape', '\\\\host\\share', '/absolute', 'safe:stream', 'safe/../escape', 'safe. /file']) {
    assert.throws(() => validateOcrListing(listing(name), join(root, 'out')), /경로/);
  }
  assert.throws(() => validateOcrListing(listing('file') + 'Symbolic Link = ../outside\n', root), /경로/);
  assert.throws(() => validateOcrListing('', root), /목록/);
  const actual = join(root, 'actual'), link = join(root, 'link'); mkdirSync(actual);
  symlinkSync(actual, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => validateOcrListing(listing('file'), join(link, 'new')), /링크/);
});
test('OCR uses a named portable extractor with literal bracket paths and checks complete output', async () => {
  const root = mkdtempSync(join(tmpdir(), '[zzz] OCR '));
  const calls = [], extractor = join(root, '7zr.exe'), archive = join(root, 'ocr.7z');
  const run = async (exe, args) => {
    calls.push({ exe, args });
    assert.equal(exe, extractor);
    if (args[0] === 'l') return listing('package\\RapidOCR-json.exe');
    mkdirSync(join(root, 'package', 'models'), { recursive: true });
    writeFileSync(join(root, 'package', 'RapidOCR-json.exe'), 'fixture');
    return '';
  };
  assert.equal(await extractOcrArchive(archive, root, { extractor, run }), join(root, 'package', 'RapidOCR-json.exe'));
  assert.deepEqual(calls[1].args, ['x', '-y', '-sccUTF-8', `-o${root}`, '--', archive]);
  const empty = mkdtempSync(join(tmpdir(), 'zzz-ocr-empty-'));
  await assert.rejects(extractOcrArchive(archive, empty, { extractor, run: async (_exe, args) => args[0] === 'l' ? listing('file') : '' }), /실행 파일과 언어 모델/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(extractOcrArchive(archive, empty, { extractor, signal: controller.signal, run: () => assert.fail('cancelled extraction started') }), { name: 'AbortError' });
});
