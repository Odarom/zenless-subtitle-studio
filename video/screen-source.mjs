import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tools, runTool, prepareSource } from './media.mjs';
import { ensureOcr } from './ocr-setup.mjs';
import { RapidOcr } from './ocr-engine.mjs';
import { ScreenTracker } from './screen-tracking.mjs';
import { youtubeVideoId } from './subtitles.mjs';
import { readJson, saveJson } from './state.mjs';
import { MAX_MEDIA_BYTES, MAX_SCREEN_FRAMES } from './limits.mjs';

export async function* videoFrames(ffmpeg, mediaPath, { startMs, durationMs, intervalMs, signal }) {
  signal?.throwIfAborted();
  const child = spawn(ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-ss', String(startMs / 1000), '-i', mediaPath, '-t', String(durationMs / 1000), '-an', '-sn', '-vf', `fps=fps=${1000 / intervalMs}:start_time=0,scale=1280:1280:force_original_aspect_ratio=decrease`, '-c:v', 'bmp', '-pix_fmt', 'bgr24', '-f', 'image2pipe', 'pipe:1'], { windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '', processError;
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-2000); });
  const exit = new Promise(resolveExit => { child.once('error', error => { processError = error; resolveExit(null); }); child.once('close', resolveExit); });
  const abort = () => child.kill(); signal?.addEventListener('abort', abort, { once: true });
  let buffer = Buffer.alloc(0), index = 0;
  try {
    for await (const chunk of child.stdout) {
      signal?.throwIfAborted(); buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 6) {
        if (buffer.toString('ascii', 0, 2) !== 'BM') throw new Error('영상 프레임 형식을 읽지 못했습니다.');
        const size = buffer.readUInt32LE(2);
        if (size < 54 || size > 16 * 1048576) throw new Error('영상 프레임 크기를 확인하세요.');
        if (buffer.length < size) break;
        const image = buffer.subarray(0, size); buffer = buffer.subarray(size);
        yield { image, timeMs: startMs + index++ * intervalMs, width: image.readInt32LE(18), height: Math.abs(image.readInt32LE(22)) };
      }
    }
    const code = await exit; signal?.throwIfAborted();
    if (processError) throw processError;
    if (code !== 0 || buffer.length) throw new Error(`영상 프레임 추출 실패 (${code}). ${stderr}`);
  } finally { signal?.removeEventListener('abort', abort); child.kill(); await exit; }
}
export async function prepareVideoSource(job, context) {
  const { root, directory, upload, signal, update } = context;
  const speechPath = join(directory, 'speech-source.json');
  let audio = { cues: [], title: job.title || upload?.name };
  if (job.options.speech !== false) {
    audio = readJson(speechPath, null);
    if (!audio) { audio = await prepareSource(job, context); saveJson(speechPath, audio); }
  }
  if (!job.options.screenText) return audio;
  const t = tools(root);
  if (!t.ready.ffmpeg || !t.ffprobe) throw new Error('화면 글자 분석에 FFmpeg와 FFprobe가 필요합니다. 도구를 다시 준비하세요.');
  update({ stage: 'ocr-setup', stageProgress: null, message: '화면 글자 인식 도구를 준비하고 있습니다. 첫 사용에는 다운로드가 필요합니다.' });
  const executable = await ensureOcr(root, { signal }); signal.throwIfAborted();
  let mediaPath;
  if (upload) {
    if (!['.mp4', '.mkv', '.webm', '.mov', '.m4v', '.avi'].includes(extname(upload.path).toLowerCase())) throw new Error('화면 글자 인식에는 영상 파일 또는 유튜브 영상을 선택하세요.');
    mediaPath = upload.path;
  } else {
    if (!t.ready.ytdlp) throw new Error('유튜브 처리 도구가 없습니다. video-setup.cmd를 먼저 실행하세요.');
    const id = youtubeVideoId(job.input.youtubeUrl), url = `https://www.youtube.com/watch?v=${id}`;
    const args = ['--ignore-config', '--no-playlist', '--no-warnings', '--socket-timeout', '30', '--retries', '1', '--js-runtimes', `node:${process.execPath}`];
    if (!job.durationMs) {
      const metadata = JSON.parse((await runTool(t.ytdlp, [...args, '--dump-single-json', '--skip-download', url], { signal })).stdout);
      if (metadata.is_live || ['is_live', 'is_upcoming'].includes(metadata.live_status)) throw new Error('완료된 업로드 영상을 선택하세요. 진행 중이거나 예정된 생방송은 처리하지 않습니다.');
      audio.title = metadata.title; update({ title: metadata.title, videoId: id, durationMs: Math.round(metadata.duration * 1000) });
    }
    update({ stage: 'downloading', stageProgress: null, message: '화면 글자 분석용 영상을 다운로드하고 있습니다.' });
    let file = readdirSync(directory).find(name => /^screen-video\./.test(name) && !/\.(?:part|ytdl)$/.test(name));
    if (!file) {
      await runTool(t.ytdlp, [...args, '--newline', '-f', 'bestvideo[height<=1080]/best[height<=1080]', '--max-filesize', String(MAX_MEDIA_BYTES), '-o', join(directory, 'screen-video.%(ext)s'), url], { signal });
      file = readdirSync(directory).find(name => /^screen-video\./.test(name) && !/\.(?:part|ytdl)$/.test(name));
    }
    if (!file) throw new Error('다운로드된 영상을 찾을 수 없습니다.');
    mediaPath = join(directory, file); audio.videoId = id;
  }
  if (!existsSync(mediaPath)) throw new Error('불러온 파일을 찾지 못했습니다. 파일을 다시 선택하세요.');
  const metadata = JSON.parse((await runTool(t.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,duration:format=duration', '-of', 'json', mediaPath], { signal })).stdout);
  const stream = metadata.streams?.[0], fullDurationMs = Math.round(Number(metadata.format?.duration || stream?.duration) * 1000);
  if (!stream || !Number.isSafeInteger(fullDurationMs) || fullDurationMs <= 0) throw new Error('영상의 크기와 재생 시간을 확인하지 못했습니다.');
  const startMs = job.options.screenStartMs || 0, endMs = Math.min(job.options.screenEndMs || fullDurationMs, fullDurationMs), intervalMs = job.options.screenIntervalMs || 1000;
  if (startMs >= endMs || Math.ceil((endMs - startMs) / intervalMs) > MAX_SCREEN_FRAMES) throw new Error('화면 글자 분석 구간을 확인하세요. 최대 30,000프레임까지 처리합니다.');
  const tracker = new ScreenTracker(intervalMs), ocr = new RapidOcr(executable, job.options.screenLanguage, { signal });
  const progressPath = join(directory, 'screen-progress.json'), fileInfo = statSync(mediaPath);
  const fingerprint = JSON.stringify([fileInfo.size, fileInfo.mtimeMs, startMs, endMs, intervalMs, job.options.screenLanguage]);
  const checkpoint = readJson(progressPath, null);
  let done = checkpoint?.fingerprint === fingerprint ? checkpoint.done : 0;
  if (done) { tracker.active = checkpoint.active; tracker.finished = checkpoint.finished; }
  const total = Math.ceil((endMs - startMs) / intervalMs);
  const saveProgress = () => saveJson(progressPath, { fingerprint, done, active: tracker.active, finished: tracker.finished });
  try {
    await ocr.ready;
    const nextMs = startMs + done * intervalMs;
    if (nextMs < endMs) for await (const frame of videoFrames(t.ffmpeg, mediaPath, { startMs: nextMs, durationMs: endMs - nextMs, intervalMs, signal })) {
      if (frame.timeMs >= endMs) break;
      signal.throwIfAborted();
      const detections = await ocr.recognize(frame.image); tracker.update(frame.timeMs, detections, frame.width, frame.height);
      done++; update({ stage: 'ocr', stageProgress: Math.min(100, Math.round(done / total * 100)), message: `화면 글자의 시간과 위치를 분석하고 있습니다. ${done}/${total}프레임` });
      if (done % 10 === 0) saveProgress();
    }
  } finally { ocr.close(); saveProgress(); }
  const screen = tracker.finish(endMs);
  update({ screenCueCount: screen.length, screenIntervalMs: intervalMs });
  const cues = [...audio.cues, ...screen].sort((a, b) => a.startMs - b.startMs || Number(a.kind === 'screen') - Number(b.kind === 'screen'));
  if (!cues.length) throw new Error('화면에서 글자를 찾지 못했습니다. 언어와 분석 구간을 확인하세요.');
  return { ...audio, cues, screenCueCount: screen.length, frameSize: { width: stream.width, height: stream.height }, origin: audio.cues.length ? audio.origin : 'screen-ocr' };
}
