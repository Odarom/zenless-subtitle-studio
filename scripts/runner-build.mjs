import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import { resolve, join, dirname, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { RUNNER_VERSION } from '../src/runner-version.js';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function runnerModules(root, entries = ['scripts/runner-ui.mjs', 'scripts/discord-runner.mjs']) {
  const found = new Set();
  const visit = path => {
    const absolute = resolve(root, path), local = relative(root, absolute);
    if (isAbsolute(local) || local.startsWith('..') || !/\.(?:m?js)$/.test(local) || lstatSync(absolute).isSymbolicLink()) throw new Error('Invalid runner source path');
    if (found.has(local)) return; found.add(local);
    for (const match of readFileSync(absolute, 'utf8').matchAll(/(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
      if (match[1].startsWith('node:')) continue;
      if (!match[1].startsWith('.')) throw new Error('Runner package must not require an external library');
      visit(relative(root, resolve(dirname(absolute), match[1])));
    }
  };
  entries.forEach(visit); return [...found].sort();
}
export async function buildRunner(root = resolve(import.meta.dirname, '..')) {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Windows x64 builder required');
  const cache = join(root, '.tools/runner-package'); mkdirSync(cache, { recursive: true });
  const stage = mkdtempSync(join(cache, 'build-')), name = `Zenless-Discord-Runner-${RUNNER_VERSION}-win-x64`, folder = join(stage, name), app = join(folder, 'app');
  const copy = (source, target) => { mkdirSync(dirname(target), { recursive: true }); copyFileSync(source, target); };
  for (const file of runnerModules(root)) copy(join(root, file), join(app, file));
  for (const file of ['index.html', 'app.js', 'style.css']) copy(join(root, 'runner/public', file), join(app, 'runner/public', file));
  for (const file of ['zzz.json', 'sources.json', 'README.md']) copy(join(root, 'glossary', file), join(app, 'glossary', file));
  writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'zenless-discord-runner', version: RUNNER_VERSION, private: true, type: 'module', engines: { node: '>=24.17.0' } }, null, 2));
  const version = 'v24.22.0', archiveName = `node-${version}-win-x64.zip`, base = `https://nodejs.org/dist/${version}`;
  const sums = await fetch(`${base}/SHASUMS256.txt`, { signal: AbortSignal.timeout(30000) }); if (!sums.ok) throw new Error('Node checksum unavailable');
  const expected = (await sums.text()).split('\n').find(line => line.trim().endsWith(`  ${archiveName}`))?.trim().split(/\s+/)[0];
  if (!/^[a-f0-9]{64}$/.test(expected || '')) throw new Error('Node checksum invalid');
  const archive = join(root, '.tools/video-package/node', archiveName);
  if (!existsSync(archive)) {
    const response = await fetch(`${base}/${archiveName}`, { signal: AbortSignal.timeout(120000) }); if (!response.ok) throw new Error('Node download failed');
    const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>64*1048576)throw new Error('Node archive too large');chunks.push(chunk);}
    const bytes=Buffer.concat(chunks);if(sha(bytes)!==expected)throw new Error('Node archive checksum differs');mkdirSync(dirname(archive),{recursive:true});writeFileSync(archive,bytes,{flag:'wx'});
  }
  if (sha(readFileSync(archive)) !== expected) throw new Error('Cached official Node archive checksum differs');
  const extract = join(stage, 'node'); mkdirSync(extract);
  const powershell = resolve(process.env.SystemRoot || 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe');
  const run = (script, env) => { const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], { shell: false, windowsHide: true, encoding: 'utf8', env: { ...process.env, ...env } }); if (result.status || result.error) throw new Error('Package archive operation failed'); };
  run("Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory($env:ZZZ_NODE_ARCHIVE,$env:ZZZ_NODE_EXTRACT)", { ZZZ_NODE_ARCHIVE: archive, ZZZ_NODE_EXTRACT: extract });
  const runtime = join(extract, `node-${version}-win-x64`);
  copy(join(runtime, 'node.exe'), join(folder, 'runtime/node.exe')); copy(join(runtime, 'LICENSE'), join(folder, 'runtime/LICENSE-Node.txt'));
  writeFileSync(join(folder, 'Start.cmd'), '@echo off\r\nsetlocal\r\nchcp 65001 >nul\r\ncd /d "%~dp0app"\r\n"%~dp0runtime\\node.exe" "%~dp0app\\scripts\\runner-ui.mjs"\r\nif errorlevel 1 pause\r\n');
  for (const locale of ['ko','en','ja','zh-CN']) copy(join(root, 'docs/discord', `README-${locale}.md`), join(folder, `README-${locale}.md`));
  for (const file of ['TERMS.md','PRIVACY.md','HOSTING.md','ARCHITECTURE.md']) copy(join(root,'docs/discord',file),join(folder,file));
  writeFileSync(join(folder,'README.md'),'# Zenless Discord Runner\n\n[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)\n\nExtract the entire ZIP and run Start.cmd. / ZIP 전체를 풀고 Start.cmd를 실행하세요.\n');
  const files = [];
  const walk = directory => { for (const entry of readdirSync(directory, { withFileTypes:true })) { const file=join(directory,entry.name); if(entry.isSymbolicLink())throw new Error('Symlink in package'); if(entry.isDirectory())walk(file);else{const path=relative(folder,file).replaceAll('\\','/');if(/(?:^|\/)(?:\.env[^/]*|\.secrets|data|reports|\.tools|node_modules)(?:\/|$)/i.test(path))throw new Error('Private file in runner package');files.push({path,sha256:sha(readFileSync(file))});} } };
  walk(folder); writeFileSync(join(folder,'release-manifest.json'),JSON.stringify({app:'zenless-discord-runner',version:RUNNER_VERSION,platform:'win32-x64',node:{version,archiveSha256:expected},files},null,2));
  const zip = join(stage, 'runner.zip');
  run('Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory($env:ZZZ_RUNNER_SOURCE,$env:ZZZ_RUNNER_ZIP)',{ZZZ_RUNNER_SOURCE:folder,ZZZ_RUNNER_ZIP:zip});
  mkdirSync(join(root,'dist'),{recursive:true}); const destination=join(root,'dist',`zenless-discord-runner-${RUNNER_VERSION}-win-x64.zip`);copy(zip,destination);
  const bytes=readFileSync(destination),result={version:RUNNER_VERSION,folder,zip:destination,files:files.length+1,bytes:bytes.length,sha256:sha(bytes)};
  writeFileSync(join(root,'dist/runner-package.json'),JSON.stringify(result,null,2));return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)buildRunner().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
