import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { availableParallelism } from 'node:os';
import { readJson } from './state.mjs';
import { parseSubtitles, youtubeVideoId } from './subtitles.mjs';
import { whisperLanguage, subtitleLanguages } from '../src/languages.js';

function locate(name) {
  const result = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [name], { encoding: 'utf8', windowsHide: true, shell: false });
  return result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : null;
}
export function tools(root) {
  const installed = readJson(join(root, '.tools', 'video', 'tools.json'), {});
  const path = value => typeof value === 'string' && value ? resolve(root, value) : null;
  const whisperVulkan = path(process.env.ZZZ_WHISPER_BIN || installed.whisperVulkan || installed.whisper);
  const whisperCpu = path(process.env.ZZZ_WHISPER_CPU_BIN || installed.whisperCpu);
  const model = path(process.env.ZZZ_WHISPER_MODEL || installed.model);
  const ytdlp = path(process.env.ZZZ_YTDLP_BIN || installed.ytdlp || locate('yt-dlp'));
  const ffmpeg = path(process.env.ZZZ_FFMPEG_BIN || installed.ffmpeg || locate('ffmpeg'));
  const ffprobe = ffmpeg && existsSync(join(dirname(ffmpeg), 'ffprobe.exe')) ? join(dirname(ffmpeg), 'ffprobe.exe') : path(locate('ffprobe'));
  const ocr = path(installed.ocr);
  const gpuReady = !!whisperVulkan && existsSync(whisperVulkan), cpuReady = !!whisperCpu && existsSync(whisperCpu);
  const whisper = gpuReady ? whisperVulkan : cpuReady ? whisperCpu : null;
  const vadModel = path(installed.vadModel) || (whisperVulkan ? join(dirname(whisperVulkan), 'ggml-silero-v6.2.0.bin') : null);
  return { whisper, whisperVulkan: gpuReady ? whisperVulkan : null, whisperCpu: cpuReady ? whisperCpu : null, model, ytdlp, ffmpeg, ffprobe, ocr, vadModel: vadModel && existsSync(vadModel) ? vadModel : null, ready: { whisper: !!whisper, model: !!model && existsSync(model), ytdlp: !!ytdlp && existsSync(ytdlp), ffmpeg: !!ffmpeg && existsSync(ffmpeg), cpu: cpuReady, vulkan: gpuReady, ocr: !!ocr && existsSync(ocr) } };
}
export function runTool(executable, args, { signal, onText = () => {}, maxOutput = 16 * 1048576 } = {}) {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', error;
    const kill = () => {
      if (process.platform === 'win32' && child.pid) spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', shell: false });
      else child.kill('SIGTERM');
    };
    const abort = () => { error = new Error('작업을 중단했습니다.'); kill(); };
    signal?.addEventListener('abort', abort, { once: true });
    const take = (isError, chunk) => {
      const value = chunk.toString('utf8');
      if (isError) stderr = (stderr + value).slice(-10000); else stdout += value;
      if (stdout.length > maxOutput) { error = new Error('처리 도구의 출력이 허용 크기를 넘었습니다.'); kill(); }
      onText(value);
    };
    child.stdout.on('data', chunk => take(false, chunk)); child.stderr.on('data', chunk => take(true, chunk));
    child.on('error', err => { error = err; });
    child.on('close', code => {
      signal?.removeEventListener('abort', abort);
      if (error) reject(error);
      else if (code !== 0) reject(new Error(`영상 처리 도구가 종료되었습니다 (${code}). ${stderr.replace(/https?:\/\/\S+/g, '[주소]').slice(-1500)}`));
      else resolve({ stdout, stderr });
    });
  });
}

export async function transcribeWithRuntime({ t, options, wav, output, signal, update = () => {}, run = runTool }) {
  const device = options.speechDevice || 'auto';
  if (!['auto', 'cpu', 'vulkan'].includes(device)) throw new Error('음성 인식 장치를 확인하세요.');
  const cpu = t.whisperCpu || t.whisperVulkan;
  if (device === 'vulkan' && !t.whisperVulkan) throw new Error('GPU 음성 인식 도구가 없습니다. 도구를 다시 준비하거나 CPU를 선택하세요.');
  const initial = device === 'cpu' || !t.whisperVulkan ? 'cpu' : 'vulkan';
  if (initial === 'cpu' && !cpu) throw new Error('CPU 음성 인식 도구를 먼저 준비하세요.');
  const threads = options.speechThreads ? Math.max(1, Math.min(availableParallelism(), options.speechThreads)) : Math.min(8, availableParallelism());
  const args = ['-m', t.model, '-f', wav, '-l', whisperLanguage(options.sourceLanguage), '-osrt', '-of', output, '-pp', '-t', String(threads), '-ml', '84', '-sow', ...(t.vadModel ? ['--vad', '--vad-model', t.vadModel, '--vad-min-silence-duration-ms', '500', '--vad-speech-pad-ms', '200'] : [])];
  const attempt = async (backend, fallback = false) => {
    let runtime = backend === 'cpu' ? fallback ? 'CPU 음성 인식 (GPU에서 자동 전환)' : 'CPU 음성 인식' : 'Vulkan 음성 인식';
    let usedGpu = false;
    update({ stage: 'transcribing', stageProgress: null, runtime, message: fallback ? 'GPU 처리에 실패해 CPU로 음성을 다시 인식하고 있습니다.' : `${backend === 'cpu' ? 'CPU로' : 'GPU로'} 영상 전체의 음성을 인식하고 있습니다.` });
    await run(backend === 'cpu' ? cpu : t.whisperVulkan, [...args, ...(backend === 'cpu' ? ['-ng'] : [])], { signal, maxOutput: 32 * 1048576, onText: text => {
      if (backend === 'vulkan' && /(?:using Vulkan\d* backend|Vulkan\d+ (?:compute|buffer)|whisper_backend_init_gpu.*using.*Vulkan)/i.test(text)) { usedGpu = true; runtime = 'Vulkan 그래픽 가속'; }
      // VAD initializes its own CPU context after the main speech model uses the GPU.
      if (backend === 'vulkan' && !usedGpu && /no GPU found|no devices found/i.test(text)) runtime = 'CPU 음성 인식 (GPU 없음)';
      const progress = /progress\s*=\s*(\d+)%/.exec(text); if (progress) update({ stageProgress: Number(progress[1]), runtime });
    } });
    return { runtime, speechBackend: runtime.startsWith('CPU') ? 'cpu' : backend };
  };
  try { return await attempt(initial); }
  catch (error) {
    signal?.throwIfAborted();
    if (device !== 'auto' || initial !== 'vulkan' || !cpu) throw error;
    return attempt('cpu', true);
  }
}

export async function prepareSource(job, { root, directory, upload, signal, update }) {
  const t = tools(root);
  let mediaPath;
  if (job.input.fileId) {
    if (!upload || !existsSync(upload.path)) throw new Error('불러온 파일을 찾지 못했습니다. 파일을 다시 선택하세요.');
    if (['.srt', '.vtt'].includes(extname(upload.path).toLowerCase())) {
      update({ stage: 'reading', message: '원어 자막을 읽고 있습니다.' });
      return { cues: parseSubtitles(readFileSync(upload.path, 'utf8')), origin: 'subtitle-file', title: job.title || upload.name };
    }
    mediaPath = upload.path;
  } else {
    if (!t.ready.ytdlp) throw new Error('유튜브 처리 도구가 없습니다. video-setup.cmd를 먼저 실행하세요.');
    const id = youtubeVideoId(job.input.youtubeUrl);
    const url = `https://www.youtube.com/watch?v=${id}`;
    const args = ['--ignore-config', '--no-playlist', '--no-warnings', '--socket-timeout', '30', '--retries', '1', '--extractor-retries', '1', '--js-runtimes', `node:${process.execPath}`];
    update({ stage: 'preparing', message: '유튜브 영상과 원어 자막을 확인하고 있습니다.' });
    let metadata;
    try { metadata = JSON.parse((await runTool(t.ytdlp, [...args, '--dump-single-json', '--skip-download', url], { signal })).stdout); }
    catch (error) { signal.throwIfAborted(); throw new Error(`영상을 확인하지 못했습니다. 공개된 일반 영상 주소인지 확인하세요. 영상·음성·자막 파일을 직접 불러올 수도 있습니다. ${error.message}`); }
    if (metadata.is_live || metadata.live_status === 'is_live' || metadata.live_status === 'is_upcoming') throw new Error('완료된 업로드 영상을 선택하세요. 진행 중이거나 예정된 생방송은 처리하지 않습니다.');
    update({ title: metadata.title || job.title, videoId: id, durationMs: metadata.duration ? Math.round(metadata.duration * 1000) : null });
    const lang = job.options.sourceLanguage === 'auto' ? metadata.language : job.options.sourceLanguage;
    if (!job.options.forceAsr && lang) {
      const codes = subtitleLanguages(lang);
      const manual = codes.find(code => metadata.subtitles?.[code]?.length);
      const automatic = (!metadata.language || metadata.language === lang || metadata.language.startsWith(`${lang}-`)) && codes.find(code => metadata.automatic_captions?.[code]?.length);
      const selected = manual || automatic;
      if (selected) {
        update({ stage: 'captions', message: '기존 원어 자막을 가져오고 있습니다.' });
        try {
          await runTool(t.ytdlp, [...args, '--skip-download', manual ? '--write-subs' : '--write-auto-subs', '--sub-langs', selected, '--sub-format', 'vtt', '-o', join(directory, 'source.%(ext)s'), url], { signal });
          const file = readdirSync(directory).find(name => /^source\..*\.vtt$/.test(name));
          if (file) return { cues: parseSubtitles(readFileSync(join(directory, file), 'utf8')), origin: manual ? 'youtube-captions' : 'youtube-auto-captions', title: metadata.title, videoId: id };
        } catch { signal.throwIfAborted(); update({ message: '기존 자막을 가져오지 못해 음성 인식으로 전환합니다.' }); }
      }
    }
    if (!t.ready.whisper || !t.ready.model || !t.ready.ffmpeg) throw new Error('이 영상은 음성 인식이 필요합니다. video-setup.cmd로 음성 도구를 준비하고 FFmpeg 설치 상태를 확인하세요.');
    update({ stage: 'downloading', message: '영상의 음성을 다운로드하고 있습니다.' });
    await runTool(t.ytdlp, [...args, '--newline', '-f', 'bestaudio/best', '-o', join(directory, 'audio.%(ext)s'), url], { signal, onText: text => {
      const progress = /\[download\]\s+([\d.]+)%/.exec(text); if (progress) update({ stageProgress: Number(progress[1]) });
    } });
    const audio = readdirSync(directory).find(name => /^audio\./.test(name) && !/\.(?:part|ytdl)$/.test(name));
    if (!audio) throw new Error('다운로드된 음성을 찾을 수 없습니다.');
    mediaPath = join(directory, audio);
  }
  if (!t.ready.ffmpeg || !t.ready.whisper || !t.ready.model) throw new Error('음성 인식 준비가 필요합니다. video-setup.cmd를 실행하고 FFmpeg 설치 상태를 확인하세요.');
  update({ stage: 'converting', stageProgress: null, message: '음성 인식용 오디오를 준비하고 있습니다.' });
  const wav = join(directory, 'speech.wav');
  await runTool(t.ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', mediaPath, '-vn', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav], { signal });
  const output = join(directory, 'transcript');
  const runtime = await transcribeWithRuntime({ t, options: job.options, wav, output, signal, update });
  return { cues: parseSubtitles(readFileSync(`${output}.srt`, 'utf8')), origin: 'whisper', title: job.title || upload?.name || '유튜브 영상', ...runtime };
}
