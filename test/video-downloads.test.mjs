import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { zipOperation } from '../video/downloads.mjs';

const windowsOnly = { skip: process.platform !== 'win32' };
const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
function fixture(t, entries) {
  const base = mkdtempSync(join(tmpdir(), 'zzz-archive-'));
  t.after(() => {
    const local = relative(resolve(tmpdir()), resolve(base));
    assert(local && !isAbsolute(local) && !local.startsWith('..'), 'cleanup must stay within the test temp directory');
    rmSync(base, { recursive: true, force: true });
  });
  const directory = join(base, '[zzz] 한글 공백'); mkdirSync(directory);
  const archive = join(directory, '[tools] 설치.zip');
  const made = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', `
    $ErrorActionPreference = 'Stop'
    Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::Open($env:ZZZ_TEST_ZIP, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
      foreach ($item in (ConvertFrom-Json $env:ZZZ_TEST_ENTRIES)) {
        $entry = $zip.CreateEntry($item.name)
        $writer = New-Object System.IO.StreamWriter($entry.Open())
        try { $writer.Write([string]$item.text) } finally { $writer.Dispose() }
      }
    } finally { $zip.Dispose() }
  `], { windowsHide: true, encoding: 'utf8', env: { ...process.env, ZZZ_TEST_ZIP: archive, ZZZ_TEST_ENTRIES: JSON.stringify(entries) } });
  assert.equal(made.status, 0, made.stderr || made.stdout);
  return { archive, destination: join(directory, 'whisper'), directory };
}

test('Windows PowerShell 5.1 extracts literal bracket/Korean paths into existing folders and overwrites on retry', windowsOnly, async t => {
  const { archive, destination } = fixture(t, [
    { name: 'nested/한글 [파일].txt', text: '확인 완료' },
    { name: 'whisper-cli.exe', text: 'fixture only' },
    { name: 'empty/', text: '' }
  ]);
  mkdirSync(destination);
  await zipOperation(archive, destination);
  const textFile = join(destination, 'nested', '한글 [파일].txt');
  assert.equal(readFileSync(textFile, 'utf8'), '확인 완료');
  assert(existsSync(join(destination, 'empty')));
  writeFileSync(textFile, 'old contents');
  await zipOperation(archive, destination);
  assert.equal(readFileSync(textFile, 'utf8'), '확인 완료');
  assert.equal(readFileSync(join(destination, 'whisper-cli.exe'), 'utf8'), 'fixture only');
});

test('ZIP validation rejects traversal before writing any entries', windowsOnly, async t => {
  const { archive, destination, directory } = fixture(t, [
    { name: 'valid.txt', text: 'must not be written' },
    { name: '../outside.txt', text: 'escape' }
  ]);
  await assert.rejects(zipOperation(archive, destination), /도구 실행 실패/);
  assert(!existsSync(destination));
  assert(!existsSync(join(directory, 'outside.txt')));
});

test('ZIP validation refuses existing junctions that redirect extraction', windowsOnly, async t => {
  const { archive, destination, directory } = fixture(t, [{ name: 'linked/outside.txt', text: 'escape' }]);
  const outside = join(directory, 'outside'); mkdirSync(outside); mkdirSync(destination);
  symlinkSync(outside, join(destination, 'linked'), 'junction');
  await assert.rejects(zipOperation(archive, destination), /도구 실행 실패/);
  assert(!existsSync(join(outside, 'outside.txt')));
});

test('invalid ZIP files fail instead of reporting a successful setup', windowsOnly, async t => {
  const { archive, destination } = fixture(t, []);
  writeFileSync(archive, 'not a ZIP file');
  await assert.rejects(zipOperation(archive, destination), /도구 실행 실패/);
  assert(!existsSync(destination));
});

test('update ZIP expanded-size limit is checked before extracting any files', windowsOnly, async t => {
  const { archive, destination } = fixture(t, [{ name: 'small.txt', text: 'one' }, { name: 'large.txt', text: 'x'.repeat(100) }]);
  await assert.rejects(zipOperation(archive, destination, { maxExpandedBytes: 20 }), /도구 실행 실패/);
  assert(!existsSync(destination));
});
