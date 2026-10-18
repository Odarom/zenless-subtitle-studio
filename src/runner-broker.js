import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { LANGUAGES, UserError } from './config.js';

const hash = s => createHash('sha256').update(s).digest('hex');
const token = () => randomBytes(32).toString('hex');
export function runnerMetadata(input) {
  if (!['gemini', 'openai', 'ollama'].includes(input?.provider) || !/^[\w./:-]{1,80}$/.test(input.model || '')
    || !Number.isInteger(input.dailyLimit) || input.dailyLimit < 0 || input.dailyLimit > 100000) throw new Error('Invalid runner settings');
  const result = { provider: input.provider, model: input.model, dailyLimit: input.dailyLimit };
  for (const key of ['glossaryHash', 'promptHash']) if (/^[a-f0-9]{64}$/.test(input[key] || '')) result[key] = input[key];
  if (['community', 'official'].includes(input.style)) result.style = input.style;
  return result;
}
export function runnerInput(input) {
  const text = (v, max) => { if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error('Invalid runner text'); return v; };
  const lang = v => { if (!Object.hasOwn(LANGUAGES, v)) throw new Error('Invalid runner language'); return v; };
  if (!Array.isArray(input?.targets) || !input.targets.length || input.targets.length > 4 || new Set(input.targets).size !== input.targets.length) throw new Error('Invalid runner targets');
  const context = input.context ?? [];
  if (!Array.isArray(context) || context.length > 10) throw new Error('Invalid runner context');
  const speakers = new Map();
  return { text: text(input.text, 2000), sourceLanguage: lang(input.sourceLanguage), targets: input.targets.map(lang),
    context: context.map(row => {
      if (!speakers.has(row.speaker)) speakers.set(row.speaker, `speaker${speakers.size + 1}`);
      return { speaker: speakers.get(row.speaker), language: lang(row.language), text: text(row.text, 800) };
    }), reply: input.reply ? { text: text(input.reply.text, 2000), language: lang(input.reply.language) } : null };
}
export class RunnerBroker {
  constructor(path, { now = Date.now, timeoutMs = 150000 } = {}) {
    mkdirSync(dirname(path), { recursive: true }); Object.assign(this, { now, timeoutMs });
    this.db = new DatabaseSync(path); this.db.exec('PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS runners(guild_id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, metadata TEXT NOT NULL)'); chmodSync(path, 0o600);
    this.codes = new Map(); this.jobs = new Map(); this.seen = new Map();
  }
  code(guildId) {
    this.prune(); if (this.codes.size >= 1000) throw new UserError('연결 요청이 많습니다. 잠시 후 다시 시도하세요.');
    for (const [key, value] of this.codes) if (value.guildId === guildId) this.codes.delete(key);
    const code = token(); this.codes.set(hash(code), { guildId, expires: this.now() + 600000 }); return code;
  }
  prune() { for (const [key, value] of this.codes) if (value.expires <= this.now()) this.codes.delete(key); }
  pair(code, metadata) {
    this.prune(); const key = hash(String(code)), item = this.codes.get(key), clean = runnerMetadata(metadata);
    if (!item) throw new Error('Pairing expired');
    const credential = token();
    this.db.prepare('INSERT OR REPLACE INTO runners(guild_id,token_hash,metadata) VALUES(?,?,?)').run(item.guildId, hash(credential), JSON.stringify(clean));
    this.codes.delete(key); this.cancel(item.guildId); this.seen.delete(item.guildId); return credential;
  }
  authenticate(credential) {
    if (!/^[a-f0-9]{64}$/.test(credential || '')) throw new Error('Invalid connection');
    const row = this.db.prepare('SELECT guild_id FROM runners WHERE token_hash=?').get(hash(credential));
    if (!row) throw new Error('Invalid connection'); return row.guild_id;
  }
  status(guildId) {
    const row = this.db.prepare('SELECT metadata FROM runners WHERE guild_id=?').get(guildId);
    return row ? { ...JSON.parse(row.metadata), configured: true, online: this.now() - (this.seen.get(guildId) ?? 0) < 45000, source: '개인 PC·서버 연결' } : { configured: false };
  }
  cancel(guildId) { for (const [id, job] of this.jobs) if (job.guildId === guildId) { clearTimeout(job.timer); job.reject(new UserError('개인 번역 연결이 변경되어 요청을 취소했습니다.')); this.jobs.delete(id); } }
  disconnect(guildId) { this.db.prepare('DELETE FROM runners WHERE guild_id=?').run(guildId); this.seen.delete(guildId); this.cancel(guildId); for (const [key, value] of this.codes) if (value.guildId === guildId) this.codes.delete(key); }
  translate(guildId, input) {
    if (!this.status(guildId).online) return Promise.reject(new UserError('개인 번역 프로그램이 꺼져 있습니다. 연결된 PC·서버에서 실행하세요.'));
    if (this.jobs.size >= 100 || [...this.jobs.values()].some(j => j.guildId === guildId)) return Promise.reject(new UserError('개인 번역 요청이 처리 중입니다. 잠시 후 다시 보내세요.'));
    const payload = runnerInput(input), id = token();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.jobs.delete(id); reject(new UserError('개인 번역 응답이 지연되어 중지했습니다. API 비용 중복 방지를 위해 자동 재요청하지 않습니다.')); }, this.timeoutMs);
      this.jobs.set(id, { id, guildId, payload, resolve, reject, timer, claimed: false });
    });
  }
  poll(guildId, metadata) {
    const clean = runnerMetadata(metadata); this.db.prepare('UPDATE runners SET metadata=? WHERE guild_id=?').run(JSON.stringify(clean), guildId); this.seen.set(guildId, this.now());
    const job = [...this.jobs.values()].find(j => j.guildId === guildId && !j.claimed);
    if (!job) return null; job.claimed = true; return { id: job.id, input: job.payload };
  }
  complete(guildId, data) {
    const job = this.jobs.get(data?.id); if (!job || job.guildId !== guildId || !job.claimed) return { accepted: false };
    if (data.error === true) { clearTimeout(job.timer); this.jobs.delete(job.id); job.reject(new UserError('개인 번역 프로그램에서 요청을 처리하지 못했습니다. 해당 프로그램의 API 한도·연결·설정을 확인하세요.')); return { accepted: true }; }
    const output = {};
    for (const language of job.payload.targets) {
      const value = data.output?.[language];
      if (typeof value !== 'string' || !value.trim() || value.length > 12000) throw new Error('Invalid runner result');
      output[language] = value;
    }
    clearTimeout(job.timer); this.jobs.delete(job.id); job.resolve(output); return { accepted: true };
  }
  close() { for (const job of this.jobs.values()) { clearTimeout(job.timer); job.reject(new UserError('봇이 종료되어 번역을 중지했습니다.')); } this.jobs.clear(); this.db.close(); }
}
export function runnerServer(broker) {
  const attempts = new Map();
  const server = http.createServer(async (req, res) => {
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
    if (req.method === 'GET' && req.url === '/api/runner/health') return send(200, { ready: true });
    if (req.method !== 'POST' || !['/api/runner/pair', '/api/runner/poll', '/api/runner/complete'].includes(req.url)) return send(404, { error: 'Not found' });
    try {
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '') || Number(req.headers['content-length']) > 65536) return send(413, {});
      // Authenticate before reading chat data. Pairing codes have 256 bits of entropy.
      const pairing = req.url.endsWith('/pair'); let guildId;
      if (!pairing) guildId = broker.authenticate(/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1]);
      else {
        const address = req.socket.remoteAddress;
        const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').at(-1).trim();
        const peer = ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address) && /^[0-9a-f:.]{1,64}$/i.test(forwarded) ? forwarded : address; const at = Date.now();
        for (const [key, item] of attempts) if (item.until < at) attempts.delete(key);
        const item = attempts.get(peer) ?? { n: 0, until: at + 60000 }; if (++item.n > 30 || attempts.size > 1000) return send(429, {}); attempts.set(peer, item);
      }
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 65536) return send(413, {}); chunks.push(chunk); }
      const data = JSON.parse(Buffer.concat(chunks));
      if (Object.keys(data).some(k => /key|secret|password/i.test(k)) || Object.keys(data.settings || {}).some(k => /key|secret|password/i.test(k))) return send(400, {});
      if (pairing) return send(200, { token: broker.pair(data.code, data.settings) });
      if (req.url.endsWith('/poll')) return send(200, { job: broker.poll(guildId, data.settings) });
      return send(200, broker.complete(guildId, data));
    } catch { send(400, { error: 'Runner request rejected' }); }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000; return server;
}
