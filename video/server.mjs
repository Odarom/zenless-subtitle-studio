import http from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, createWriteStream, unlinkSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import { cpus, totalmem } from 'node:os';
import { VideoSettings, readJson, saveJson } from './state.mjs';
import { Jobs } from './jobs.mjs';
import { tools } from './media.mjs';
import { serializeSubtitles, subtitleTrack } from './subtitles.mjs';
import { VIDEO_VERSION } from './version.mjs';
import { GlossaryUpdates } from './glossary-updates.mjs';
import { VideoReports } from './reports.mjs';
import { MAX_MEDIA_BYTES, MAX_SUBTITLE_BYTES } from './limits.mjs';
import { ProgramUpdates, UPDATE_EXIT_CODE } from './program-updates.mjs';
import { ReportDelivery } from './report-delivery.mjs';
import { UPLOAD_EXTENSIONS } from './upload-storage.mjs';
import { VideoDownloads } from './video-download.mjs';
import { ArchiveClient } from './archive-client.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicFiles = new Map([['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']], ['/favicon.svg', ['favicon.svg', 'image/svg+xml']]]);
for (const file of ['i18n.mjs', 'locales.mjs']) publicFiles.set(`/${file}`, [file, 'text/javascript']);
publicFiles.set('/geometry.mjs', ['../geometry.mjs', 'text/javascript']);
publicFiles.set('/speech-position.mjs', ['../speech-position.mjs', 'text/javascript']);
publicFiles.set('/speech-cues.mjs', ['../speech-cues.mjs', 'text/javascript']);
publicFiles.set('/review.mjs', ['../review.mjs', 'text/javascript']);
async function bodyJson(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw new Error('JSON 요청 형식이 필요합니다.');
  let bytes = 0; const chunks = [];
  for await (const chunk of req) { bytes += chunk.length; if (bytes > 16 * 1048576) throw new Error('요청 내용이 너무 큽니다.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('요청 내용을 읽지 못했습니다.'); }
}
export function createVideoServer({ root = ROOT, dataDir = join(root, 'data', 'video'), token: suppliedToken, jobsOptions = {}, onProgramRestart, programOptions = {}, videoOptions = {}, archiveOptions = {} } = {}) {
  mkdirSync(dataDir, { recursive: true }); mkdirSync(join(dataDir, 'uploads'), { recursive: true });
  const tokenPath = join(root, '.secrets', 'video-connection.key'); mkdirSync(dirname(tokenPath), { recursive: true });
  if (!suppliedToken && !existsSync(tokenPath)) writeFileSync(tokenPath, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
  const token = suppliedToken || readFileSync(tokenPath, 'utf8').trim();
  const settings = new VideoSettings(root, dataDir);
  let jobs;
  const glossary = new GlossaryUpdates({ root, dataDir, busy: () => !!jobs?.active || jobs?.list().some(job => ['queued', 'running'].includes(job.status)) });
  jobs = new Jobs({ root, dataDir, settings, glossaryPath: () => glossary.currentPath(), ...jobsOptions });
  const videos = new VideoDownloads({ root, jobs, ...videoOptions });
  const archive = new ArchiveClient({root,...archiveOptions});
  const reports = new VideoReports({ dataDir, jobs, repository: () => glossary.state.repository });
  const delivery = new ReportDelivery({ dataDir, reports });
  const program = new ProgramUpdates({ root, dataDir, busy: () => !!jobs.active || jobs.videoSaves.size > 0 || jobs.list().some(j => ['queued', 'running'].includes(j.status)), ...programOptions });
  let restarting = false, storageCleanup = null;
  const send = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
  const server = http.createServer(async (req, res) => {
    try {
      const port = req.socket.localPort;
      const origin = `http://127.0.0.1:${port}`;
      res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
      if (req.headers.host !== `127.0.0.1:${port}`) return send(res, 403, { error: '이 PC의 127.0.0.1 주소로 접속하세요.' });
      const requestOrigin = req.headers.origin;
      if (requestOrigin && requestOrigin !== origin && !/^chrome-extension:\/\/[a-p]{32}$/.test(requestOrigin)) return send(res, 403, { error: '허용되지 않은 웹페이지 요청입니다.' });
      if (requestOrigin) { res.setHeader('Access-Control-Allow-Origin', requestOrigin); res.setHeader('Vary', 'Origin'); }
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-ZZZ-Local', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' }); return res.end();
      }
      const url = new URL(req.url, origin);
      if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { app: 'zenless-subtitle-studio', version: VIDEO_VERSION });
      if (req.method === 'GET' && publicFiles.has(url.pathname)) {
        const [file, type] = publicFiles.get(url.pathname), content = readFileSync(join(root, 'video', 'public', file));
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); return res.end(content);
      }
      if (req.method === 'GET' && url.pathname === '/api/session') {
        if (req.headers['x-zzz-local'] !== '1' || (requestOrigin && requestOrigin !== origin) || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin' && req.headers['sec-fetch-site'] !== 'none')) return send(res, 403, { error: '로컬 설정 화면에서 연결하세요.' });
        return send(res, 200, { token });
      }
      const videoTicket = /^\/api\/video-downloads\/([a-f0-9]{64})$/.exec(url.pathname);
      if (req.method === 'GET' && videoTicket) { await videos.stream(videoTicket[1], res); return; }
      const bearer = (req.headers.authorization || '').replace(/^Bearer /, '');
      if (bearer.length !== token.length || !timingSafeEqual(Buffer.from(bearer), Buffer.from(token))) return send(res, 401, { error: 'PC 연결 코드를 확인하세요.' });
      if (restarting) return send(res, 503, { error: '프로그램을 업데이트하고 다시 시작하는 중입니다.' });
      if (req.method === 'GET' && url.pathname === '/api/program') return send(res, 200, program.public());
      if (req.method === 'POST' && url.pathname === '/api/program/check') return send(res, 200, await program.check());
      if (req.method === 'POST' && url.pathname === '/api/program/update') {
        if (!onProgramRestart) throw new Error('시작 파일로 실행한 외부 배포본에서 업데이트하세요.');
        const result = await program.prepare(); restarting = true; send(res, 202, result);
        setTimeout(onProgramRestart, 300); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/settings') return send(res, 200, settings.public());
      if (req.method === 'POST' && url.pathname === '/api/settings') return send(res, 200, settings.save(await bodyJson(req)));
      if (req.method === 'POST' && url.pathname === '/api/settings/speech') return send(res, 200, settings.saveSpeech(await bodyJson(req)));
      if (req.method === 'DELETE' && url.pathname === '/api/settings/key') { settings.clear(); return send(res, 200, settings.public()); }
      if (req.method === 'GET' && url.pathname === '/api/tools') { const t = tools(root); return send(res, 200, { ready: t.ready, modelName: t.model ? t.model.split(/[\\/]/).at(-1) : null, cpuLabel: cpus()[0]?.model || 'x64 CPU', memoryGiB: Math.round(totalmem() / 1073741824) }); }
      if (req.method === 'GET' && url.pathname === '/api/jobs') return send(res, 200, jobs.list());
      if (req.method === 'GET' && url.pathname === '/api/storage') return send(res, 200, { cleanup: storageCleanup });
      if (req.method === 'GET' && url.pathname === '/api/glossary') return send(res, 200, glossary.public());
      if (req.method === 'POST' && url.pathname === '/api/glossary/config') return send(res, 200, glossary.configure(await bodyJson(req)));
      if (req.method === 'POST' && url.pathname === '/api/glossary/check') return send(res, 200, await glossary.check());
      if (req.method === 'POST' && url.pathname === '/api/glossary/update') return send(res, 200, await glossary.apply());
      if (req.method === 'POST' && url.pathname === '/api/reports') return send(res, 201, reports.create(await bodyJson(req)));
      if (req.method === 'GET' && url.pathname === '/api/reports') return send(res, 200, reports.list());
      const sendReport = /^\/api\/reports\/(V-\d{8}-[a-f0-9]{12})\/send$/.exec(url.pathname);
      if (req.method === 'POST' && sendReport) return send(res, 200, await delivery.send(sendReport[1]));
      const reportMatch = /^\/api\/reports\/(V-\d{8}-[a-f0-9]{12})\/export$/.exec(url.pathname);
      if (req.method === 'GET' && reportMatch) {
        const report = reports.get(reportMatch[1]);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${report.id}.json"` }); return res.end(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), reports: [report] }, null, 2));
      }
      if (req.method === 'POST' && url.pathname === '/api/jobs') {
        if (program.working) throw new Error('프로그램 업데이트가 끝난 뒤 새 작업을 시작하세요.');
        const input = await bodyJson(req);
        if (input.input?.fileId && !/^[a-f0-9-]{36}$/.test(input.input.fileId)) throw new Error('선택한 파일 식별값을 확인하세요.');
        if (input.input?.fileId && !existsSync(join(dataDir, 'uploads', `${input.input.fileId}.json`))) throw new Error('선택한 파일을 먼저 불러오세요.');
        return send(res, 202, jobs.create(input));
      }
      if (req.method === 'POST' && url.pathname === '/api/uploads') {
        const name = (url.searchParams.get('name') || '').split(/[\\/]/).at(-1).slice(0, 250);
        const extension = extname(name).toLowerCase();
        if (!UPLOAD_EXTENSIONS.has(extension)) throw new Error('지원하는 영상·음성·SRT/VTT 파일을 선택하세요.');
        const id = randomUUID(), path = join(dataDir, 'uploads', `${id}${extension}`);
        const limit = ['.srt', '.vtt'].includes(extension) ? MAX_SUBTITLE_BYTES : MAX_MEDIA_BYTES;
        let size = 0;
        if (Number(req.headers['content-length']) > limit) { req.resume(); return send(res, 413, { error: '파일 크기 제한을 초과했습니다. 자막은 8MB, 영상·음성은 64GB까지 지원합니다.' }); }
        try {
          await pipeline(req, new Transform({ transform(chunk, encoding, done) { size += chunk.length; done(size > limit ? new Error('파일 크기 제한을 초과했습니다.') : null, chunk); } }), createWriteStream(path, { flags: 'wx' }));
          if (!size) throw new Error('빈 파일은 사용할 수 없습니다.');
        } catch (error) { if (existsSync(path)) unlinkSync(path); throw error; }
        saveJson(join(dataDir, 'uploads', `${id}.json`), { id, name, path, size }); return send(res, 201, { id, name, size });
      }
      const match = /^\/api\/jobs\/([a-f0-9-]{36})(?:\/(cancel|resume|export|video|share|unshare|temporary-video))?$/.exec(url.pathname);
      if (match) {
        const [, id, action] = match;
        if (!action && req.method === 'GET') return send(res, 200, { ...jobs.get(id), ...jobs.summary(jobs.get(id)) });
        if (action === 'temporary-video' && req.method === 'DELETE') return send(res,200,jobs.removeVideo(id));
        if (!action && req.method === 'DELETE') return send(res, 200, jobs.remove(id));
        if (!action && req.method === 'PATCH') { const body = await bodyJson(req),job=jobs.edit(id, body.speechHeight === undefined ? body.changes : body.changes ?? [], body.speechHeight); return send(res, 200, {...job,...jobs.summary(job)}); }
        if (action === 'cancel' && req.method === 'POST') return send(res, 200, jobs.cancel(id));
        if (action === 'resume' && req.method === 'POST') return send(res, 202, jobs.resume(id));
        if (action === 'share' && req.method === 'POST') {const job=jobs.get(id),result=await archive.publish(job,await bodyJson(req));jobs.save(job,{archiveShareId:result.id});return send(res,201,result);}
        if (action === 'unshare' && req.method === 'POST') {const job=jobs.get(id),result=await archive.remove(job.archiveShareId);jobs.save(job,{archiveShareId:null});return send(res,200,result);}
        if (action === 'video' && req.method === 'POST') {
          const controller = new AbortController(), abort = () => controller.abort(); res.once('close', abort);
          try { send(res, 200, await videos.prepare(id, { signal: controller.signal })); }
          finally { res.removeListener('close', abort); }
          return;
        }
        if (action === 'export' && req.method === 'GET') {
          const job = jobs.get(id); if (job.status !== 'completed') throw new Error('전체 자막 처리가 완료된 후 저장할 수 있습니다.');
          const format = url.searchParams.get('format') || 'srt', mode = url.searchParams.get('mode') || 'translated', track = url.searchParams.get('track') || 'all';
          const cues = subtitleTrack(job.cues, track);
          if (format === 'json') {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${id}.zzzsub.json"` });
            return res.end(JSON.stringify({ app: 'zenless-subtitle-studio', version: 1, videoId: job.videoId || null, ...(Number.isFinite(job.speechHeight) ? {display:{speechHeight:job.speechHeight}} : {}), cues: cues.map(({ id, startMs, endMs, sourceText, translatedText, kind, region, positions }) => ({ id, startMs, endMs, sourceText, translatedText, ...(kind === 'screen' ? { kind, region, positions } : {}) })) }));
          }
          const output = serializeSubtitles(cues, { format, mode, positioned: url.searchParams.get('positioned') === '1', speechHeight:job.speechHeight });
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${id}.${format}"` }); return res.end(output);
        }
      }
      return send(res, 404, { error: '요청한 기능을 찾지 못했습니다.' });
    } catch (error) { if (!res.headersSent && !res.destroyed) send(res, error.statusCode || 400, { error: error.message || '처리하지 못했습니다.' }); else if (!res.destroyed) res.end(); }
  });
  server.requestTimeout = 2 * 60 * 60000;
  const updateTimer = setInterval(() => glossary.automaticCheck(), 60 * 60000); updateTimer.unref();
  server.once('listening', () => { storageCleanup = jobs.cleanupOrphanUploads(); void glossary.automaticCheck(); });
  server.once('close', () => { clearInterval(updateTimer); videos.close(); });
  return { server, jobs, settings, token, glossary, reports, program, videos };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.ZZZ_VIDEO_PORT || 4318);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('영상 프로그램 포트를 확인하세요.');
  const { server, jobs, videos } = createVideoServer({ onProgramRestart: () => { server.close(() => process.exit(UPDATE_EXIT_CODE)); server.closeIdleConnections(); } });
  server.on('error', async error => {
    if (error.code === 'EADDRINUSE' && process.argv.includes('--open')) {
      try {
        const current = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2000) });
        if ((await current.json()).app === 'zenless-subtitle-studio') {
          console.log(`이미 실행 중인 작업실을 엽니다: http://127.0.0.1:${port}`);
          spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Start-Process $env:ZZZ_VIDEO_URL'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, ZZZ_VIDEO_URL: `http://127.0.0.1:${port}` } }).on('error', () => {});
          return;
        }
      } catch {}
    }
    console.error(error.code === 'EADDRINUSE' ? '다른 프로그램이 작업실 주소를 사용 중입니다. 먼저 실행한 작업실 창을 확인하세요.' : error.message); process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}`;
    console.log(`젠레스 영상 번역 준비 완료: ${url}`);
    console.log('이 창을 켜 두고 브라우저에서 사용하세요. 종료: Ctrl+C');
    if (process.argv.includes('--open') && process.platform === 'win32') spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Start-Process $env:ZZZ_VIDEO_URL'], { windowsHide: true, stdio: 'ignore', env: { ...process.env, ZZZ_VIDEO_URL: url } }).on('error', () => {});
  });
  const stop = () => { for (const job of jobs.jobs.values()) if (['queued', 'running'].includes(job.status)) jobs.cancel(job.id); videos.close(); server.close(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
