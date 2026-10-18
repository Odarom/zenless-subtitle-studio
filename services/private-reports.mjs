import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeVideoReport } from '../video/report-import.mjs';

const retention = 90 * 86400000;
export const PRIVATE_REPORT_ID = /^A-\d{8}-[a-f0-9]{12}$/;
const statuses = ['pending', 'reviewing', 'needs-info', 'resolved', 'rejected'];
export class PrivateReportStore {
  constructor(path, { now = Date.now } = {}) {
    mkdirSync(dirname(path), { recursive: true }); this.now = now; this.db = new DatabaseSync(path); this.db.exec('PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL;');
    this.db.exec(`CREATE TABLE IF NOT EXISTS video_reports (id TEXT PRIMARY KEY, submission_id TEXT NOT NULL, installation_hash TEXT NOT NULL, peer_hash TEXT NOT NULL, body_hash TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', UNIQUE(installation_hash,submission_id)); CREATE INDEX IF NOT EXISTS reports_created ON video_reports(created_at);`);
    const secretPath = `${path}.hash-key`; if (!existsSync(secretPath)) writeFileSync(secretPath, randomBytes(32), { flag: 'wx', mode: 0o600 });
    this.secret = readFileSync(secretPath);
    this.prune();
  }
  prune() { this.db.prepare('DELETE FROM video_reports WHERE created_at < ?').run(this.now() - retention); }
  hash(value) { return createHmac('sha256', this.secret).update(value).digest('hex'); }
  decode(row) { return row ? { ...JSON.parse(row.payload), id: row.id, origin: 'private-video', submissionId: row.submission_id, createdAt: row.created_at, updatedAt: row.updated_at, status: row.status, review: { note: row.note, actor: 'maintainer' } } : null; }
  create(input, peer) {
    if (!/^[a-f0-9-]{36}$/.test(input?.installationId || '')) throw new Error('Invalid installation ID');
    const report = normalizeVideoReport(input.report), installation = this.hash(input.installationId), peerHash = this.hash(peer), now = this.now();
    const payload = JSON.stringify(report), bodyHash = createHash('sha256').update(payload).digest('hex');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('DELETE FROM video_reports WHERE created_at < ?').run(now - retention);
      const previous = this.db.prepare('SELECT * FROM video_reports WHERE installation_hash=? AND submission_id=?').get(installation, report.id);
      if (previous) {
        if (previous.body_hash !== bodyHash) throw new Error('Report contents changed');
        this.db.exec('COMMIT'); return { id: previous.id, duplicate: true };
      }
      const count = since => this.db.prepare('SELECT COUNT(*) AS n FROM video_reports WHERE created_at>=? AND (installation_hash=? OR peer_hash=?)').get(since, installation, peerHash).n;
      if (count(now - 3600000) >= 5 || count(now - 86400000) >= 20) throw Object.assign(new Error('Report rate limit reached'), { statusCode: 429 });
      if (this.db.prepare('SELECT COUNT(*) AS n FROM video_reports').get().n >= 5000) throw Object.assign(new Error('Report queue is full'), { statusCode: 503 });
      const id = `A-${new Date(now).toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(6).toString('hex')}`;
      this.db.prepare('INSERT INTO video_reports(id,submission_id,installation_hash,peer_hash,body_hash,created_at,updated_at,status,payload) VALUES(?,?,?,?,?,?,?,?,?)').run(id, report.id, installation, peerHash, bodyHash, now, now, 'pending', payload);
      this.db.exec('COMMIT'); return { id, duplicate: false };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  list({ status = 'all', offset = 0 } = {}) {
    if (!['all', ...statuses].includes(status) || !Number.isInteger(offset) || offset < 0) throw new Error('Invalid report range');
    return this.db.prepare(`SELECT * FROM video_reports WHERE created_at>=?${status === 'all' ? '' : ' AND status=?'} ORDER BY created_at DESC,id LIMIT 100 OFFSET ?`).all(this.now() - retention, ...(status === 'all' ? [] : [status]), offset).map(r => this.decode(r));
  }
  apply(decisions) {
    if (!Array.isArray(decisions) || !decisions.length || decisions.length > 100) throw new Error('Invalid report decisions');
    this.db.exec('BEGIN IMMEDIATE'); const updated = [];
    try {
      for (const d of decisions) {
        const old = this.db.prepare('SELECT * FROM video_reports WHERE id=? AND created_at>=?').get(d.id, this.now() - retention);
        if (!PRIVATE_REPORT_ID.test(d.id) || !old || d.expectedUpdatedAt !== old.updated_at || !statuses.includes(d.status) || typeof d.note !== 'string' || !d.note.trim() || d.note.length > 2000) throw new Error('신고가 이미 변경되었거나 검토 결과가 올바르지 않습니다.');
        this.db.prepare('UPDATE video_reports SET status=?,note=?,updated_at=? WHERE id=?').run(d.status, d.note, Math.max(this.now(), old.updated_at + 1), d.id); updated.push({ id: d.id });
      }
      this.db.exec('COMMIT'); return { updated };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}
export function privateReportServer(store) {
  const server = http.createServer(async (req, res) => {
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
    if (req.method === 'GET' && req.url === '/health') return send(200, { service: 'zenless-private-reports', ready: true });
    if (req.method !== 'POST' || req.url !== '/api/reports') return send(404, { error: 'Not found' });
    try {
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '') || Number(req.headers['content-length']) > 65536) return send(413, { error: 'Invalid request size or type' });
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 65536) return send(413, { error: 'Report too large' }); chunks.push(chunk); }
      const input = JSON.parse(Buffer.concat(chunks));
      const peer = req.socket.remoteAddress === '127.0.0.1' || req.socket.remoteAddress === '::1' || req.socket.remoteAddress === '::ffff:127.0.0.1' ? String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',').at(-1).trim() : req.socket.remoteAddress;
      const result = store.create(input, peer); send(201, { receiptId: result.id, duplicate: result.duplicate });
    } catch (error) { send(error.statusCode || 400, { error: error.statusCode === 429 ? 'Please try again later' : 'Report was not accepted' }); }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000; return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const store = new PrivateReportStore(resolve('data/private-video-reports.sqlite'));
  const server = privateReportServer(store); server.listen(4321, '127.0.0.1', () => console.log('Private video report service ready'));
  const cleanup = setInterval(() => store.prune(), 60000); cleanup.unref();
  process.on('SIGTERM', () => server.close(() => { clearInterval(cleanup); store.close(); process.exit(0); }));
}
