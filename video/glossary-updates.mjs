import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadGlossary } from '../src/translator.js';
import { readJson, saveJson } from './state.mjs';
import { DEFAULT_GLOSSARY_REPOSITORY } from './distribution.mjs';
import { EXTRA_LANGUAGES, TEXT_LANGUAGES, localizedNames } from '../src/languages.js';

export const glossaryHash = bytes => createHash('sha256').update(bytes).digest('hex');
export function githubRepository(value, { optional = false } = {}) {
  const repo = String(value || '').trim().replace(/^https:\/\/github\.com\//i, '').replace(/\/$/, '');
  if ((!repo && optional) || /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9_.-]{1,100}$/.test(repo) && !repo.split('/').some(part => part === '.' || part === '..')) return repo;
  throw new Error('GitHub 저장소를 owner/repository 형식으로 입력하세요.');
}
export function validateCatalog(data) {
  if (data?.version !== 1 || !Array.isArray(data.entries) || !data.entries.length || data.entries.length > 100000) throw new Error('용어집 형식이 잘못되었습니다.');
  const ids = new Set();
  for (const e of data.entries) {
    if (!e || typeof e.id !== 'string' || !e.id || e.id.length > 250 || ids.has(e.id) || !Array.isArray(e.aliases) || e.aliases.length > 500 || !e.aliases.every(a => typeof a === 'string' && a.length && a.length <= 1000) || typeof e.meaning !== 'string' || !e.meaning || typeof e.rule !== 'string' || !e.rule || !e.preferred || typeof e.preferred !== 'object' || Array.isArray(e.preferred) || Object.entries(e.preferred).some(([lang, value]) => !['ko', 'en', 'ja', 'zh-CN'].includes(lang) || typeof value !== 'string' || !value.trim())) throw new Error('용어집 항목의 id/aliases/meaning/rule을 확인하세요.');
    ids.add(e.id);
    if (e.localizedNames !== undefined && (!e.localizedNames || typeof e.localizedNames !== 'object' || Array.isArray(e.localizedNames)
      || Object.entries(e.localizedNames).some(([lang, value]) => !EXTRA_LANGUAGES.includes(lang) || typeof value !== 'string' || !value.trim() || value.length > 1000))) throw new Error('용어집의 추가 언어 명칭을 확인하세요.');
  }
  return data;
}
async function fetchBytes(fetcher, url, maxBytes) {
  const response = await fetcher(url, { redirect: 'error', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`용어집 다운로드 실패 (HTTP ${response.status}).`);
  if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('용어집 다운로드 크기 제한을 초과했습니다.');
  const chunks = []; let bytes = 0;
  for await (const chunk of response.body) { bytes += chunk.length; if (bytes > maxBytes) throw new Error('용어집 다운로드 크기 제한을 초과했습니다.'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
export class GlossaryUpdates {
  constructor({ root, dataDir, busy = () => false, fetcher = fetch, now = Date.now, defaultRepository = DEFAULT_GLOSSARY_REPOSITORY }) {
    this.root = root; this.directory = join(dataDir, 'glossary'); this.path = join(this.directory, 'state.json');
    this.busy = busy; this.fetcher = fetcher; this.now = now; this.pending = null; this.applying = false;
    this.state = { repository: defaultRepository, autoCheck: false, installed: null, lastCheckedAt: null, ...readJson(this.path, {}) };
  }
  currentPath() {
    const sha = this.state.installed?.sha256;
    if (/^[a-f0-9]{64}$/.test(sha || '') && existsSync(join(this.directory, `${sha}.json`))) return join(this.directory, `${sha}.json`);
    return join(this.root, 'glossary', 'zzz.json');
  }
  public() {
    const bytes = readFileSync(this.currentPath()), catalog = JSON.parse(bytes);
    const coverage = Object.fromEntries(Object.keys(TEXT_LANGUAGES).map(language => [language, 0]));
    for (const entry of catalog.entries) {
      for (const [language, name] of Object.entries(localizedNames(entry))) {
        if (Object.hasOwn(coverage, language) && typeof name === 'string' && name.trim()) coverage[language]++;
      }
    }
    const languages = Object.keys(coverage).filter(language => coverage[language] > 0);
    return { repository: this.state.repository, autoCheck: this.state.autoCheck, lastCheckedAt: this.state.lastCheckedAt, error: this.state.error || null,
      current: { version: this.state.installed?.version || `${catalog.retrievedAt || 'bundled'}-${glossaryHash(bytes).slice(0, 12)}`, sha256: glossaryHash(bytes), count: catalog.entries.length, languages, coverage: Object.fromEntries(languages.map(language => [language, coverage[language]])), sourceVersion: catalog.sourceVersion || null },
      available: this.pending ? { version: this.pending.version, count: this.pending.count, sha256: this.pending.sha256 } : null };
  }
  configure(input) {
    const repository = githubRepository(input.repository, { optional: true });
    if (typeof input.autoCheck !== 'boolean') throw new Error('자동 확인 설정을 확인하세요.');
    if (repository !== this.state.repository) { this.pending = null; this.state.lastCheckedAt = null; }
    this.state.repository = repository; this.state.autoCheck = input.autoCheck; this.state.error = null;
    saveJson(this.path, this.state); return this.public();
  }
  async check() {
    const repository = githubRepository(this.state.repository);
    const base = `https://raw.githubusercontent.com/${repository}/main/`;
    try {
      const manifest = JSON.parse((await fetchBytes(this.fetcher, `${base}latest.json`, 32768)).toString('utf8'));
      if (manifest.schema !== 1 || typeof manifest.version !== 'string' || !/^[a-zA-Z0-9._-]{1,100}$/.test(manifest.version) || !/^[a-f0-9]{64}$/.test(manifest.sha256 || '') || manifest.file !== `releases/${manifest.sha256}.json` || !Number.isSafeInteger(manifest.bytes) || manifest.bytes <= 0 || manifest.bytes > 16 * 1048576 || !Number.isSafeInteger(manifest.count) || manifest.count < 1 || manifest.count > 100000) throw new Error('용어집 업데이트 정보가 올바르지 않습니다.');
      if (repository !== this.state.repository) throw new Error('업데이트 확인 중 저장소 설정이 변경되었습니다. 다시 확인하세요.');
      this.pending = { ...manifest, repository, url: `${base}${manifest.file}` };
      this.state.lastCheckedAt = this.now(); this.state.error = null; saveJson(this.path, this.state);
      return this.public();
    } catch (error) { this.state.error = error.message; saveJson(this.path, this.state); throw error; }
  }
  async apply() {
    if (this.applying || this.busy()) throw new Error('진행 중인 작업이 끝난 뒤 용어집을 업데이트하세요.');
    this.applying = true;
    try {
      await this.check(); const candidate = this.pending;
      const bytes = await fetchBytes(this.fetcher, candidate.url, 16 * 1048576);
      if (bytes.length !== candidate.bytes || glossaryHash(bytes) !== candidate.sha256) throw new Error('용어집 체크섬이 다릅니다. 기존 용어집을 유지했습니다.');
      const data = validateCatalog(JSON.parse(bytes));
      if (data.entries.length !== candidate.count) throw new Error('용어집 항목 수가 업데이트 정보와 다릅니다.');
      mkdirSync(this.directory, { recursive: true });
      const path = join(this.directory, `${candidate.sha256}.json`);
      writeFileSync(`${path}.part`, bytes); loadGlossary(`${path}.part`);
      if (this.busy() || candidate.repository !== this.state.repository) throw new Error('진행 중인 작업이 끝난 뒤 용어집을 업데이트하세요.');
      renameSync(`${path}.part`, path);
      this.state.installed = { version: candidate.version, sha256: candidate.sha256 };
      this.state.error = null; saveJson(this.path, this.state); return this.public();
    } finally { this.applying = false; }
  }
  async automaticCheck() {
    if (this.state.repository && this.state.autoCheck && (!this.state.lastCheckedAt || this.now() - this.state.lastCheckedAt >= 86400000)) {
      try { await this.check(); } catch {}
    }
  }
}
