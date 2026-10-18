import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadVerified, fetchJson, findFile, sha256File, zipOperation } from '../video/downloads.mjs';
import { VIDEO_VERSION } from '../video/version.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const slash = value => value.replace(/\\/g, '/');
export function moduleFiles(root, entries) {
  const found = new Set();
  const visit = entry => {
    const file = resolve(root, entry), local = relative(root, file);
    if (local.startsWith('..') || local.includes(':') || !/\.(?:m?js)$/.test(local)) throw new Error('배포 소스가 프로젝트 범위를 벗어났습니다.');
    if (found.has(local)) return;
    found.add(local);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:import|export)\s+(?:[^;'"`]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
      const spec = match[1]; if (spec.startsWith('node:')) continue;
      if (!spec.startsWith('.')) throw new Error(`별도 설치가 필요한 의존성을 배포 목록에 넣을 수 없습니다: ${spec}`);
      visit(relative(root, resolve(dirname(file), spec)));
    }
  };
  for (const entry of entries) visit(entry);
  return [...found].sort();
}
function filesIn(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink()) throw new Error('배포 폴더의 심볼릭 링크는 허용하지 않습니다.');
    return entry.isDirectory() ? filesIn(join(dir, entry.name)) : [join(dir, entry.name)];
  });
}
function copy(source, destination) { mkdirSync(dirname(destination), { recursive: true }); copyFileSync(source, destination); }
async function portableNode(root) {
  const cache = join(root, '.tools', 'video-package', 'node'); mkdirSync(cache, { recursive: true });
  const releases = await fetchJson('https://nodejs.org/dist/index.json');
  const version = releases.find(release => /^v24\./.test(release.version) && release.lts && Number(release.version.split('.')[1]) >= 17)?.version;
  if (!version) throw new Error('Node.js 24 LTS 공식 배포를 확인하지 못했습니다.');
  const name = `node-${version}-win-x64.zip`, base = `https://nodejs.org/dist/${version}`;
  const sums = await fetch(`${base}/SHASUMS256.txt`, { signal: AbortSignal.timeout(60000) });
  if (!sums.ok) throw new Error('Node.js 공식 체크섬을 확인하지 못했습니다.');
  const line = (await sums.text()).split('\n').find(item => item.trim().endsWith(`  ${name}`) || item.trim().endsWith(` *${name}`));
  const digest = line?.trim().split(/\s+/)[0];
  const archive = join(cache, name); await downloadVerified(`${base}/${name}`, archive, digest);
  const destination = join(cache, version); mkdirSync(destination, { recursive: true }); await zipOperation(archive, destination);
  const executable = findFile(destination, 'node.exe');
  if (!executable || !existsSync(join(dirname(executable), 'LICENSE'))) throw new Error('Node 실행 파일 또는 라이선스를 찾지 못했습니다.');
  return { executable, license: join(dirname(executable), 'LICENSE'), version, url: `${base}/${name}`, sha256: digest };
}
export async function buildExternalPackage(root = ROOT) {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('이 패키지 빌드는 Windows x64용입니다.');
  const runtime = await portableNode(root);
  const stageBase = join(root, '.tools', 'video-package'); mkdirSync(stageBase, { recursive: true });
  const staging = mkdtempSync(join(stageBase, 'release-'));
  const name = `Zenless-Subtitle-Studio-${VIDEO_VERSION}-win-x64`;
  const folder = join(staging, name), app = join(folder, 'app'); mkdirSync(app, { recursive: true });
  const code = moduleFiles(root, ['video/server.mjs', 'scripts/video-launch.mjs', 'scripts/video-setup.mjs', 'scripts/video-update-apply.mjs']);
  for (const file of code) copy(join(root, file), join(app, file));
  for (const file of filesIn(join(root, 'video', 'public'))) copy(file, join(app, 'video', 'public', relative(join(root, 'video', 'public'), file)));
  for (const file of ['zzz.json', 'sources.json', 'README.md']) copy(join(root, 'glossary', file), join(app, 'glossary', file));
  for (const file of filesIn(join(root, 'dist', 'video-extension'))) copy(file, join(folder, 'video-extension', relative(join(root, 'dist', 'video-extension'), file)));
  copy(runtime.executable, join(folder, 'runtime', 'node.exe')); copy(runtime.license, join(folder, 'runtime', 'LICENSE-Node.txt'));
  writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'zenless-subtitle-studio', version: VIDEO_VERSION, private: true, type: 'module', engines: { node: '>=24.17.0' } }, null, 2));
  const launcher = script => `@echo off\r\nsetlocal\r\nchcp 65001 >nul\r\ncd /d "%~dp0"\r\n"%~dp0runtime\\node.exe" "%~dp0app\\scripts\\${script}"${script === 'video-setup.mjs' ? ' --portable' : ''}\r\nif errorlevel 1 echo 준비 또는 실행에 실패했습니다. 위 안내를 확인하세요.\r\npause\r\n`;
  writeFileSync(join(folder, 'Start.cmd'), launcher('video-launch.mjs')); writeFileSync(join(folder, 'Setup.cmd'), launcher('video-setup.mjs'));
  for (const locale of ['ko', 'en', 'ja', 'zh-CN']) copy(join(root, 'video/docs', 'README-' + locale + '.md'), join(folder, 'README-' + locale + '.md'));
  writeFileSync(join(folder, 'README.md'), '# Zenless Subtitle Studio ' + VIDEO_VERSION + '\n\n[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)\n\nExtract the entire ZIP and run Start.cmd. / ZIP 전체를 풀고 Start.cmd를 실행하세요.\n');
  writeFileSync(join(folder, 'THIRD-PARTY-NOTICES.md'), `# 구성 요소와 출처\n\n- Node.js ${runtime.version}: ${runtime.url}. 포함된 runtime/LICENSE-Node.txt에 Node 및 포함 구성 요소의 라이선스 원문이 있습니다.\n- yt-dlp: https://github.com/yt-dlp/yt-dlp . 첫 실행 시 공식 릴리스에서 다운로드하고 SHA-256을 검증합니다.\n- whisper.cpp: https://github.com/ggml-org/whisper.cpp . Windows 실행 파일 출처: https://github.com/SubtitleEdit/support-files . 첫 실행 시 CPU·Vulkan 배포본을 다운로드합니다.\n- FFmpeg: https://github.com/yt-dlp/FFmpeg-Builds . 첫 실행 시 다운로드합니다. 배포본의 LICENSE·소스 정보와 https://ffmpeg.org/legal.html 을 참고하세요.\n- 음성 모델: https://huggingface.co/ggerganov/whisper.cpp . 모델 파일은 첫 실행 시 다운로드합니다. 원본 모델: https://github.com/openai/whisper .\n- RapidOCR-json: https://github.com/hiroi-sora/RapidOCR-json . 선택 시 검증된 공식 배포본과 언어 모델을 다운로드합니다. 각 배포본의 라이선스를 참고하세요.\n- 젠레스 용어 자료: app/glossary/README.md, app/glossary/sources.json 및 각 JSON 항목의 출처·검수·정식/미출시 상태를 참고하세요. 팬 자료를 포함하며 게임 제작사의 공식 프로그램으로 표시하지 않습니다.\n`);
  const included = filesIn(folder);
  for (const path of included) {
    const local = slash(relative(folder, path));
    if (/(?:^|\/)(?:\.secrets|\.env[^/]*|data|reports|node_modules|\.tools|\.models)(?:\/|$)/i.test(local)) throw new Error(`개인 자료 또는 실행 중 자료가 배포에 포함되었습니다: ${local}`);
  }
  const files = [];
  for (const file of included) files.push({ path: slash(relative(folder, file)), sha256: await sha256File(file) });
  writeFileSync(join(folder, 'release-manifest.json'), JSON.stringify({ version: VIDEO_VERSION, platform: 'win32-x64', node: { version: runtime.version, source: runtime.url, archiveSha256: runtime.sha256 }, files }, null, 2));
  const output = join(root, 'dist', `zenless-subtitle-studio-${VIDEO_VERSION}-win-x64.zip`);
  await zipOperation(folder, output, { extract: false });
  const digest = await sha256File(output); writeFileSync(`${output}.sha256`, `${digest}  ${output.split(/[\\/]/).at(-1)}\n`);
  const report = { version: VIDEO_VERSION, output, stagingFolder: folder, nodeVersion: runtime.version, files: files.length + 1, sha256: digest };
  writeFileSync(join(root, 'dist', 'video-release.json'), JSON.stringify(report, null, 2));
  return report;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await buildExternalPackage(), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
