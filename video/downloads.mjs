import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';

export async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'zzz-video-subtitles/0.2', Accept: 'application/json' }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`다운로드 정보 확인 실패: HTTP ${response.status}`);
  return response.json();
}
export async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const part of createReadStream(path)) hash.update(part);
  return hash.digest('hex');
}
export async function downloadVerified(url, path, digest, { signal } = {}) {
  if (!/^[a-f0-9]{64}$/.test(digest || '')) throw new Error('공식 SHA-256 체크섬을 확인할 수 없어 다운로드를 중단했습니다.');
  if (existsSync(path) && await sha256File(path) === digest) { console.log(`확인 완료: ${path}`); return; }
  mkdirSync(dirname(path), { recursive: true });
  console.log(`다운로드: ${path}`);
  signal?.throwIfAborted();
  const response = await fetch(url, { signal: AbortSignal.any([AbortSignal.timeout(30 * 60000), ...(signal ? [signal] : [])]) });
  if (!response.ok) throw new Error(`다운로드 실패: HTTP ${response.status}`);
  let bytes = 0, last = 0;
  await pipeline(Readable.fromWeb(response.body), new Transform({ transform(chunk, encoding, done) {
    bytes += chunk.length;
    if (Date.now() - last > 10000) { console.log(`${Math.round(bytes / 1048576)} MiB 수신`); last = Date.now(); }
    done(null, chunk);
  } }), createWriteStream(`${path}.part`), { signal });
  if (await sha256File(`${path}.part`) !== digest) throw new Error('다운로드 체크섬이 다릅니다. 파일을 실행하지 않았습니다. 다시 준비해 주세요.');
  renameSync(`${path}.part`, path);
}
export function findFile(dir, name) {
  if (!existsSync(dir)) return null;
  for (const file of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, file.name);
    if (file.isDirectory()) { const hit = findFile(path, name); if (hit) return hit; }
    else if (file.name.toLowerCase() === name.toLowerCase()) return path;
  }
  return null;
}
export function runProcess(exe, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, { windowsHide: true, stdio: 'inherit', shell: false, env: { ...process.env, ...env } });
    child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(Object.assign(new Error(`도구 실행 실패 (${code})`), { exitCode: code })));
  });
}
// Expand-Archive in Windows PowerShell 5.1 treats brackets in its destination
// as wildcards. Use .NET with literal paths, including when setup is retried.
const extractZip = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$root = [System.IO.Path]::GetFullPath($env:ZZZ_ARCHIVE_DEST)
$prefix = $root.TrimEnd([char[]]'\/') + [System.IO.Path]::DirectorySeparatorChar
$archive = [System.IO.Compression.ZipFile]::OpenRead($env:ZZZ_ARCHIVE_SOURCE)
try {
  $items = @(foreach ($entry in $archive.Entries) {
    $name = $entry.FullName.Replace('/', '\')
    if ([System.IO.Path]::IsPathRooted($name) -or $name.Contains(':')) {
      throw 'Unsafe ZIP entry path.'
    }
    $target = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $name))
    if (-not $target.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw 'ZIP entry escapes destination.'
    }
    # Refuse existing junctions/symlinks that could redirect a literal path.
    $check = $target
    while ($check) {
      if ([System.IO.File]::Exists($check) -or [System.IO.Directory]::Exists($check)) {
        if (([System.IO.File]::GetAttributes($check) -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
          throw 'ZIP destination contains a reparse point.'
        }
      }
      $check = [System.IO.Path]::GetDirectoryName($check)
    }
    [pscustomobject]@{ Entry = $entry; Target = $target; Directory = $name.EndsWith('\') }
  })
  if ($env:ZZZ_ARCHIVE_MAX_BYTES -and [long]$env:ZZZ_ARCHIVE_MAX_BYTES -gt 0) {
    [long]$total = 0
    foreach ($item in $items) {
      $total += $item.Entry.Length
      if ($total -gt [long]$env:ZZZ_ARCHIVE_MAX_BYTES) { throw 'ZIP expanded size exceeds the update limit.' }
    }
    if ($items.Count -gt 4000) { throw 'ZIP contains too many update entries.' }
  }
  [void][System.IO.Directory]::CreateDirectory($root)
  foreach ($item in $items) {
    if ($item.Directory) {
      [void][System.IO.Directory]::CreateDirectory($item.Target)
    } else {
      [void][System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($item.Target))
      [System.IO.Compression.ZipFileExtensions]::ExtractToFile($item.Entry, $item.Target, $true)
    }
  }
} finally {
  $archive.Dispose()
}
`;
export async function zipOperation(source, destination, { extract = true, maxExpandedBytes = 0 } = {}) {
  const pwsh = join(process.env.ProgramFiles || 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe');
  const windowsPowerShell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const modern = !extract && existsSync(pwsh);
  const command = extract ? extractZip : "$ErrorActionPreference = 'Stop'; Compress-Archive -LiteralPath $env:ZZZ_ARCHIVE_SOURCE -DestinationPath $env:ZZZ_ARCHIVE_DEST -Force";
  await runProcess(modern ? pwsh : windowsPowerShell, ['-NoProfile', '-NonInteractive', '-Command', command], { ZZZ_ARCHIVE_SOURCE: source, ZZZ_ARCHIVE_DEST: destination, ZZZ_ARCHIVE_MAX_BYTES: String(maxExpandedBytes), PSModulePath: modern ? process.env.PSModulePath : join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'Modules') });
}
