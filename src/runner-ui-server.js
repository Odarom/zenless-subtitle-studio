import http from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync, renameSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { GuildVault, validateApiSettings } from './vault.js';
import { RunnerClient, runnerOrigin } from './runner-client.js';
import { updateSharedGlossary } from './shared-glossary.js';
import { Store } from './store.js';

const SLOT = '111111111111111111';
export function validateRunnerSettings(input) {
  let config;
  if (input.provider === 'ollama') {
    if (!/^[\w./:-]{1,80}$/.test(input.model || '') || /cloud/i.test(input.model) || !Number.isInteger(input.dailyLimit) || input.dailyLimit < 0 || input.dailyLimit > 100000) throw new Error('Invalid local runner settings');
    config = { provider: 'ollama', apiKey: '', model: input.model, dailyLimit: input.dailyLimit };
  } else config = validateApiSettings(input);
  return { ...config, style: input.style === 'official' ? 'official' : 'community', locale: ['ko', 'en', 'ja', 'zh-CN'].includes(input.locale) ? input.locale : 'ko', origin: runnerOrigin(input.origin || 'https://reports.140-238-54-74.sslip.io') };
}
export class RunnerUi {
  constructor(root, { spawnChild = spawn, fetcher = fetch, profileId = SLOT, vault } = {}) {
    Object.assign(this, { root, spawnChild, fetcher }); this.log = []; this.child = null;
    this.profileId = profileId;
    this.folder = profileId === SLOT ? resolve(root, 'data/runner') : resolve(root, 'data/runner/profiles', profileId);
    const settings = resolve(root, 'data/runner-ui/settings.json'); mkdirSync(dirname(settings), { recursive: true });
    this.vault = vault || new GuildVault(settings, resolve(root, 'data/runner-ui/local.key'), { validate: validateRunnerSettings });
    this.client = new RunnerClient(resolve(this.folder, 'connection.json'), { fetcher });
  }
  state() {
    const saved = this.vault.get(this.profileId), path = resolve(this.folder, 'glossary.json');
    let connected = false;
    try { const status = JSON.parse(readFileSync(resolve(this.folder, 'status.json'))); connected = !!this.child && status.connected && Date.now() - status.lastPollAt < 30000; } catch {}
    return { configured: !!saved, settings: saved ? { ...saved, apiKey: undefined, keySaved: !!saved.apiKey } : null,
      paired: existsSync(resolve(this.folder, 'connection.json')), running: !!this.child, connected,
      glossaryUpdatedAt: existsSync(path) ? statSync(path).mtimeMs : null,
      glossaryUpdate: this.glossaryUpdate || null,
      usage: new Store(resolve(this.folder, 'usage.json')).scoped('personal-runner').usage(), log: this.log.slice(-6) };
  }
  save(input) {
    if (this.child || this.pairing) throw new Error('Stop the runner before changing settings');
    const previous = this.vault.get(this.profileId);
    const config = validateRunnerSettings({ ...input, apiKey: input.apiKey?.trim() || (input.provider === previous?.provider ? previous.apiKey : '') });
    this.vault.set(this.profileId, config);
    if (previous && previous.origin !== config.origin && existsSync(resolve(this.folder, 'connection.json'))) unlinkSync(resolve(this.folder, 'connection.json'));
    return this.state();
  }
  async pair(code) {
    if (this.child || this.pairing) throw new Error('Stop the runner before pairing');
    const saved = this.vault.get(this.profileId); if (!saved) throw new Error('Save settings first');
    this.pairing = true;
    try { await this.client.pair(saved.origin, code, saved); return this.state(); } finally { this.pairing = false; }
  }
  start() {
    if (this.child) return this.state();
    const saved = this.vault.get(this.profileId); if (!saved) throw new Error('Save settings first'); this.client.connection();
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(?:DISCORD_|GEMINI_API_KEY$|OPENAI_API_KEY$|RUNNER_OWN_VAULT_GUILD$)/.test(key)));
    Object.assign(env, { TRANSLATION_PROVIDER: saved.provider, GEMINI_MODEL: saved.model, OPENAI_MODEL: saved.model, OLLAMA_MODEL: saved.model,
      DAILY_REQUEST_LIMIT: String(saved.dailyLimit), TRANSLATION_STYLE: saved.style, UI_LANGUAGE: saved.locale,
      RUNNER_DATA_DIR: this.folder, GEMINI_API_KEY: saved.provider === 'gemini' ? saved.apiKey : '', OPENAI_API_KEY: saved.provider === 'openai' ? saved.apiKey : '' });
    this.child = this.spawnChild(process.execPath, [resolve(this.root, 'scripts/discord-runner.mjs'), 'start'], { cwd: this.root, env, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const child = this.child;
    // Runner output consists only of fixed localized notices. Still redact common key patterns.
    const log = chunk => { this.log.push(String(chunk).replace(/(?:AIza[\w-]{20,}|sk-[\w-]{12,})/g, '[redacted]').slice(0, 500).trim()); if (this.log.length > 6) this.log.shift(); };
    child.stdout.on('data', log); child.stderr.on('data', log);
    child.on('error', () => { if (this.child === child) this.child = null; log('Runner process could not start'); });
    child.on('exit', () => { if (this.child === child) this.child = null; }); return this.state();
  }
  stop() { this.child?.kill('SIGTERM'); return this.state(); }
  async update() {
    if (!this.updating) this.updating = updateSharedGlossary(resolve(this.folder, 'glossary.json'), { fetcher: this.fetcher })
      .then(result => { this.glossaryUpdate = { status: result.updated ? 'updated' : 'current', hash: result.hash, checkedAt: Date.now() }; })
      .finally(() => { this.updating = null; });
    await this.updating;
    return this.state();
  }
}

export class RunnerProfiles {
  constructor(root, options = {}) {
    Object.assign(this, { root, options }); this.instances = new Map();
    this.indexPath = resolve(root, 'data/runner-ui/profiles.json');
    mkdirSync(dirname(this.indexPath), { recursive: true });
    this.vault = new GuildVault(resolve(root, 'data/runner-ui/settings.json'), resolve(root, 'data/runner-ui/local.key'), { validate: validateRunnerSettings });
    if (!existsSync(this.indexPath)) this.writeIndex({ version: 1, profiles: [{ id: SLOT, name: 'My server', autostart: false }] });
    this.index = JSON.parse(readFileSync(this.indexPath));
    if (this.index.version !== 1 || !Array.isArray(this.index.profiles) || !this.index.profiles.length || this.index.profiles.length > 20
      || new Set(this.index.profiles.map(p => p.id)).size !== this.index.profiles.length
      || this.index.profiles.some(p => !/^[a-zA-Z0-9_-]{1,64}$/.test(p.id) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 60)) throw new Error('Invalid personal profiles');
  }
  writeIndex(value = this.index) { writeFileSync(this.indexPath + '.tmp', JSON.stringify(value), { mode: 0o600 }); renameSync(this.indexPath + '.tmp', this.indexPath); }
  profile(id = this.index.profiles[0].id) {
    if (!this.index.profiles.some(p => p.id === id)) throw new Error('Unknown profile');
    if (!this.instances.has(id)) this.instances.set(id, new RunnerUi(this.root, { ...this.options, profileId: id, vault: this.vault }));
    return this.instances.get(id);
  }
  state(id) {
    const selected = this.profile(id), profiles = this.index.profiles.map(p => { const s = this.profile(p.id).state(); return { ...p, running: s.running, connected: s.connected, paired: s.paired, configured: s.configured }; });
    return { ...selected.state(), profileId: selected.profileId, profiles };
  }
  editProfile(input, id) {
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 60) throw new Error('Invalid profile name');
    if (input.action === 'create') {
      if (this.index.profiles.length >= 20) throw new Error('Too many profiles');
      const item = { id: randomUUID(), name: input.name.trim(), autostart: false }; this.index.profiles.push(item); this.writeIndex(); return this.state(item.id);
    }
    if (input.action !== 'rename') throw new Error('Invalid profile operation');
    this.profile(id); const item = this.index.profiles.find(p => p.id === id); item.name = input.name.trim(); this.writeIndex(); return this.state(id);
  }
  save(input, id) { this.profile(id).save(input); return this.state(id); }
  async pair(code, id) { await this.profile(id).pair(code); return this.state(id); }
  start(id) { const profile = this.profile(id); profile.start(); this.index.profiles.find(p => p.id === profile.profileId).autostart = true; this.writeIndex(); return this.state(id); }
  stop(id) { const profile = this.profile(id); this.index.profiles.find(p => p.id === profile.profileId).autostart = false; this.writeIndex(); profile.stop(); return this.state(id); }
  async update(id) { await this.profile(id).update(); return this.state(id); }
  resume() { for (const item of this.index.profiles) if (item.autostart && !this.profile(item.id).child) { try { this.profile(item.id).start(); } catch {} } }
  stopAll() { for (const profile of this.instances.values()) profile.stop(); }
}
export function runnerUiServer(controller, { secret = randomBytes(32).toString('hex') } = {}) {
  const assets = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'] };
  const server = http.createServer(async (req, res) => {
    const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(value)); };
    // Also permit a local SSH-forwarded port; arbitrary hostnames remain blocked.
    const host = req.headers.host, origin = `http://${host}`;
    if (!/^127\.0\.0\.1:\d{1,5}$/.test(host || '') || (req.headers.origin && req.headers.origin !== origin)) return send(403, {});
    if (req.method === 'GET' && assets[req.url]) {
      const [file, type] = assets[req.url]; res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
      return res.end(readFileSync(resolve(controller.root, 'runner/public', file)));
    }
    if (req.headers['x-runner-session'] !== secret) return send(403, {});
    try {
      const profileId = req.headers['x-runner-profile'] || undefined;
      if (req.method === 'GET' && req.url === '/api/state') return send(200, controller.state(profileId));
      if (req.method !== 'POST' || !['/api/settings', '/api/pair', '/api/start', '/api/stop', '/api/update', '/api/profiles'].includes(req.url)) return send(404, {});
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return send(400, {});
      let bytes = 0; const chunks = [];
      for await (const chunk of req) { bytes += chunk.length; if (bytes > 16384) return send(413, {}); chunks.push(chunk); }
      const input = JSON.parse(Buffer.concat(chunks));
      const result = req.url === '/api/profiles' ? controller.editProfile(input, profileId) : req.url === '/api/settings' ? controller.save(input, profileId) : req.url === '/api/pair' ? await controller.pair(input.code, profileId) : req.url === '/api/start' ? controller.start(profileId) : req.url === '/api/stop' ? controller.stop(profileId) : await controller.update(profileId);
      return send(200, result);
    } catch { send(400, { error: 'Check settings, pairing code and connection. Stop the runner before changing settings.' }); }
  });
  server.requestTimeout = 15000; return { server, secret };
}
