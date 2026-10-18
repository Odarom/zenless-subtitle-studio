import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchJson, downloadVerified, findFile, zipOperation } from '../video/downloads.mjs';
import { saveJson, readJson } from '../video/state.mjs';
import { tools } from '../video/media.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const toolDir = join(root, '.tools', 'video'), modelDir = join(root, '.models', 'video');
mkdirSync(toolDir, { recursive: true }); mkdirSync(modelDir, { recursive: true });
const previous = readJson(join(toolDir, 'tools.json'), {});
const manifest = { ...previous, version: 2, sources: { ...previous.sources } };
const portable = path => relative(root, path);
async function installAsset(asset, folder) {
  if (!asset?.digest?.startsWith('sha256:')) throw new Error('공식 배포 파일과 체크섬을 찾을 수 없습니다.');
  const archive = join(toolDir, asset.name), destination = join(toolDir, folder);
  await downloadVerified(asset.browser_download_url, archive, asset.digest.slice(7));
  mkdirSync(destination, { recursive: true }); await zipOperation(archive, destination);
  return destination;
}
try {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('이 배포본은 Windows x64용입니다.');
  const yt = await fetchJson('https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest');
  const ytExe = yt.assets.find(asset => asset.name === 'yt-dlp.exe');
  if (!ytExe?.digest?.startsWith('sha256:')) throw new Error('yt-dlp 공식 체크섬을 찾을 수 없습니다.');
  await downloadVerified(ytExe.browser_download_url, join(toolDir, 'yt-dlp.exe'), ytExe.digest.slice(7));
  manifest.ytdlp = portable(join(toolDir, 'yt-dlp.exe')); manifest.sources.ytdlp = yt.html_url;
  const releases = await fetchJson('https://api.github.com/repos/SubtitleEdit/support-files/releases?per_page=30');
  const vulkan = releases.flatMap(release => release.assets).find(asset => asset.name === 'whisper-vulkan-x64.zip');
  const gpuFolder = await installAsset(vulkan, 'whisper');
  const gpuExecutable = findFile(gpuFolder, 'whisper-cli.exe') || findFile(gpuFolder, 'main.exe');
  if (!gpuExecutable) throw new Error('Vulkan 음성 인식 실행 파일을 찾지 못했습니다.');
  manifest.whisperVulkan = portable(gpuExecutable); manifest.sources.whisperVulkan = vulkan.browser_download_url;
  const cpu = releases.flatMap(release => release.assets).find(asset => asset.name === 'whisper-blas-bin-x64.zip');
  const cpuFolder = await installAsset(cpu, 'whisper-cpu');
  const cpuExecutable = findFile(cpuFolder, 'whisper-cli.exe') || findFile(cpuFolder, 'main.exe');
  if (!cpuExecutable) throw new Error('CPU 음성 인식 실행 파일을 찾지 못했습니다.');
  manifest.whisperCpu = portable(cpuExecutable); manifest.sources.whisperCpu = cpu.browser_download_url;
  const externalFfmpeg = tools(root).ffmpeg;
  if (process.argv.includes('--portable') || !externalFfmpeg || !existsSync(externalFfmpeg)) {
    const ffmpeg = await fetchJson('https://api.github.com/repos/yt-dlp/FFmpeg-Builds/releases/latest');
    const asset = ffmpeg.assets.find(item => item.name === 'ffmpeg-master-latest-win64-gpl-shared.zip') || ffmpeg.assets.find(item => item.name === 'ffmpeg-master-latest-win64-gpl.zip');
    const folder = await installAsset(asset, 'ffmpeg');
    const executable = findFile(folder, 'ffmpeg.exe');
    if (!executable) throw new Error('FFmpeg 실행 파일을 찾지 못했습니다.');
    manifest.ffmpeg = portable(executable); manifest.sources.ffmpeg = asset.browser_download_url;
  }
  const modelInfo = await fetchJson('https://huggingface.co/api/models/ggerganov/whisper.cpp?blobs=true');
  const modelName = 'ggml-large-v3-turbo-q5_0.bin', model = modelInfo.siblings.find(item => item.rfilename === modelName);
  const modelPath = join(modelDir, modelName);
  await downloadVerified(`https://huggingface.co/ggerganov/whisper.cpp/resolve/${modelInfo.sha}/${modelName}`, modelPath, model?.lfs?.sha256);
  manifest.model = portable(modelPath); manifest.sources.modelRevision = modelInfo.sha;
  saveJson(join(toolDir, 'tools.json'), manifest);
  console.log('도구 준비 완료. 시작 파일을 실행하세요. CPU와 Vulkan GPU를 선택할 수 있습니다.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
