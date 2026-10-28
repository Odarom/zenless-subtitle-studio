import { readFileSync, statSync, openSync, fstatSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { UserError, LANGUAGES } from './config.js';
import { EXTRA_LANGUAGES } from './languages.js';

export function parseGlossary(bytes) {
  const data = JSON.parse(bytes);
  if (data.version !== 1 || !Array.isArray(data.entries)) throw new UserError('용어집 형식이 잘못되었습니다.');
  const ids = new Set();
  for (const e of data.entries) {
    if (!e.id || ids.has(e.id) || !Array.isArray(e.aliases) || !e.aliases.every(a => typeof a === 'string' && a.length) || !e.meaning || !e.rule) throw new UserError('용어집 항목의 id/aliases/meaning/rule을 확인하세요.');
    ids.add(e.id);
    if (e.localizedNames !== undefined && (!e.localizedNames || Array.isArray(e.localizedNames) || typeof e.localizedNames !== 'object'
      || Object.entries(e.localizedNames).some(([lang, value]) => !EXTRA_LANGUAGES.includes(lang) || typeof value !== 'string' || !value.trim()))) throw new UserError('용어집의 추가 언어 명칭을 확인하세요.');
    if (e.communityPreferred !== undefined && (!e.communityPreferred || Array.isArray(e.communityPreferred)
      || typeof e.communityPreferred !== 'object' || Object.entries(e.communityPreferred).some(([lang, value]) => !Object.hasOwn(LANGUAGES, lang) || typeof value !== 'string' || !value.trim()))) {
      throw new UserError('용어집의 언어별 커뮤니티 출력 표현을 확인하세요.');
    }
  }
  return data.entries;
}


export function loadGlossary(path) { return parseGlossary(readFileSync(path, 'utf8')); }

const fields = ['id', 'preferred', 'localizedNames', 'communityPreferred', 'aliases', 'category', 'meaning', 'rule', 'communityRule', 'relatedSkills', 'characterId', 'characterName', 'releaseStatus', 'releaseVersion', 'sourceVersion', 'autoUse'];
const signature = s => [s.dev, s.ino, s.size, s.mtimeNs, s.ctimeNs].join(':');
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

// Retain one immutable translation view per process, without provenance/catalog
// metadata. The source file and full loadGlossary API retain every field.
export class RuntimeGlossaryCache {
  #snapshots = new Map();
  constructor(capacity = 1) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('Invalid cache capacity');
    this.capacity = capacity;
  }
  get(path) {
    const key = resolve(path instanceof URL ? fileURLToPath(path) : path), current = signature(statSync(key, { bigint: true }));
    const saved = this.#snapshots.get(key);
    if (saved?.signature === current) {
      this.#snapshots.delete(key); this.#snapshots.set(key, saved);
      return saved;
    }
    // Reading one open descriptor keeps an atomic replacement consistent: the
    // digest and parsed entries always refer to exactly the same file bytes.
    for (let attempt = 0; attempt < 3; attempt++) {
      const fd = openSync(key, 'r'); let bytes, before, after;
      try {
        before = signature(fstatSync(fd, { bigint: true }));
        bytes = readFileSync(fd);
        after = signature(fstatSync(fd, { bigint: true }));
      } finally { closeSync(fd); }
      if (before !== after) continue;
      const entries = parseGlossary(bytes.toString('utf8')).map(entry =>
        Object.fromEntries(fields.filter(field => Object.hasOwn(entry, field)).map(field => [field, entry[field]])));
      const snapshot = Object.freeze({ entries: freeze(entries), hash: createHash('sha256').update(bytes).digest('hex'), signature: after });
      this.#snapshots.delete(key); this.#snapshots.set(key, snapshot);
      while (this.#snapshots.size > this.capacity) this.#snapshots.delete(this.#snapshots.keys().next().value);
      return snapshot;
    }
    throw new UserError('용어집 파일이 갱신 중입니다. 잠시 후 다시 시도하세요.');
  }
}
export const runtimeGlossary = new RuntimeGlossaryCache();
