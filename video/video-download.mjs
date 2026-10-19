import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync, lstatSync, realpathSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { tools, runTool } from './media.mjs';
import { readJson, saveJson } from './state.mjs';
import { youtubeVideoId } from './subtitles.mjs';
import { MAX_MEDIA_BYTES } from './limits.mjs';

export class VideoDownloads {
  constructor({ root, jobs, run = runTool, getTools = tools }) {
    this.root = root; this.jobs = jobs; this.run = run; this.getTools = getTools;
    this.active = new Map(); this.tickets = new Map();
  }
  directory(id) {
    const directory = resolve(this.jobs.path, id);
    if (!/^[a-f0-9-]{36}$/.test(id) || relative(realpathSync(this.jobs.path), realpathSync(directory)) !== id) throw new Error('작업 경로가 올바르지 않습니다.');
    return directory;
  }
  file(directory, name) {
    if (!/^saved-video\.(?:mp4|mkv|webm)$/.test(name || '')) throw new Error('저장할 영상 파일을 찾지 못했습니다.');
    const path = join(directory, name), stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || relative(realpathSync(directory), realpathSync(path)) !== name || stat.size <= 0 || stat.size > MAX_MEDIA_BYTES) throw new Error('저장할 영상 파일을 확인하지 못했습니다.');
    return { path, bytes: stat.size };
  }
  async prepare(id, { signal } = {}) {
    const job = this.jobs.get(id);
    if (job.status !== 'completed' || !job.videoId) throw new Error('완료된 유튜브 작업에서 영상을 저장하세요.');
    if (this.jobs.videoSaves.has(id)) throw Object.assign(new Error('이 영상의 저장이 이미 진행 중입니다.'), { statusCode: 409 });
    const videoId = youtubeVideoId(`https://www.youtube.com/watch?v=${job.videoId}`), directory = this.directory(id);
    const controller = new AbortController(), combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    this.active.set(id, controller); this.jobs.videoSaves.add(id);
    let transferred = false;
    try {
      combined.throwIfAborted();
      const marker = join(directory, 'saved-video.json'), previous = readJson(marker, null);
      let name = previous?.videoId === videoId ? previous.name : null;
      if (name && !existsSync(join(directory, basename(String(name))))) name = null;
      if (!name) {
        const t = this.getTools(this.root);
        if (!t.ready.ytdlp || !t.ready.ffmpeg) throw new Error('영상 저장에 필요한 도구가 없습니다. 프로그램을 다시 실행해 도구를 준비하세요.');
        let result;
        try {
          result = await this.run(t.ytdlp, ['--ignore-config', '--no-playlist', '--no-warnings', '--no-progress', '--no-simulate', '--print', 'after_move:filepath', '--socket-timeout', '30', '--retries', '1', '--extractor-retries', '1', '--js-runtimes', `node:${process.execPath}`, '--ffmpeg-location', t.ffmpeg, '--match-filters', '!is_live', '-f', 'bv*[height<=1080]+ba/b[height<=1080]', '--merge-output-format', 'mkv', '--max-filesize', String(MAX_MEDIA_BYTES), '-o', join(directory, 'saved-video.%(ext)s'), `https://www.youtube.com/watch?v=${videoId}`], { signal: combined });
        } catch { combined.throwIfAborted(); throw new Error('유튜브 영상을 저장하지 못했습니다. 공개된 일반 영상인지 확인하고 다시 시도하세요.'); }
        combined.throwIfAborted();
        // Use yt-dlp's completed output, not an incomplete track/merge left by
        // a cancelled attempt that happens to have a video file extension.
        const output = String(result?.stdout || '').trim().split(/\r?\n/).at(-1);
        name = output ? relative(directory, resolve(output)) : null;
        this.file(directory, name);
        saveJson(marker, { videoId, name });
      }
      const file = this.file(directory, name);
      combined.throwIfAborted();
      const ticket = randomBytes(32).toString('hex');
      const title = String(job.title || videoId).replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, '_').trim().slice(0, 150).toWellFormed() || videoId;
      const filename = title + extname(name);
      const timer = setTimeout(() => { this.tickets.delete(ticket); this.release(id); }, 60000); timer.unref();
      this.tickets.set(ticket, { id, directory, name, filename, timer }); transferred = true;
      return { url: `/api/video-downloads/${ticket}`, filename, bytes: file.bytes };
    } finally { if (!transferred) this.release(id); }
  }
  release(id) { this.active.delete(id); this.jobs.videoSaves.delete(id); }
  async stream(ticket, res) {
    const entry = this.tickets.get(ticket);
    if (!entry) throw Object.assign(new Error('영상 저장 링크가 만료되었습니다. 영상 저장을 다시 누르세요.'), { statusCode: 404 });
    this.tickets.delete(ticket); clearTimeout(entry.timer);
    try {
      const file = this.file(this.directory(entry.id), entry.name);
      const encoded = encodeURIComponent(entry.filename).replace(/['()*]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase());
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': file.bytes, 'Content-Disposition': `attachment; filename="video${extname(entry.name)}"; filename*=UTF-8''${encoded}`, 'Referrer-Policy': 'no-referrer' });
      // Let the browser stream to its download folder. Large videos must never
      // be read into a browser Blob or into one server-side Buffer.
      await pipeline(createReadStream(file.path), res, { signal: this.active.get(entry.id)?.signal });
    } finally { this.release(entry.id); }
  }
  close() {
    for (const controller of this.active.values()) controller.abort();
    for (const entry of this.tickets.values()) { clearTimeout(entry.timer); this.release(entry.id); }
    this.tickets.clear();
  }
}
