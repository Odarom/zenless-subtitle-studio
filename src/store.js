import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { LANGUAGES, UserError } from './config.js';

export function seoulDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// One process owns this file; writes are atomic. No message bodies or webhook tokens are stored.
export class Store {
  constructor(path) {
    this.path = path;
    try { this.data = JSON.parse(readFileSync(path, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw new UserError('data/state.json을 읽을 수 없습니다. 파일을 확인하세요. 기존 자료는 덮어쓰지 않았습니다.');
      this.data = { version: 1, groups: {}, usage: {}, records: {} };
    }
    if (this.data.version !== 1 || !this.data.groups || !this.data.usage || !this.data.records) throw new UserError('지원하지 않는 상태 파일입니다.');
  }
  save() {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(`${this.path}.tmp`, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    renameSync(`${this.path}.tmp`, this.path);
  }
  groups(guildId) { return Object.values(this.data.groups).filter(g => g.guildId === guildId); }
  group(guildId, name) { return this.data.groups[`${guildId}:${name}`]; }
  route(channelId) {
    for (const group of Object.values(this.data.groups)) {
      const source = group.channels.find(c => c.id === channelId);
      if (source) return { group, source };
    }
  }
  validateLink(guildId, name, channelId, language) {
    if (!/^[\p{L}\p{N}_-]{1,24}$/u.test(name)) throw new UserError('대화 이름은 공백 없이 문자·숫자·밑줄·하이픈 1~24자로 입력하세요.');
    if (!Object.hasOwn(LANGUAGES, language)) throw new UserError('지원하지 않는 언어입니다.');
    if (this.route(channelId)) throw new UserError('이미 연결된 채널입니다. 변경하려면 먼저 unlink로 연결을 해제하세요.');
    if (this.group(guildId, name)?.channels.some(c => c.language === language)) throw new UserError('이 대화에 같은 언어 채널이 이미 있습니다.');
  }
  link(guildId, name, channelId, language, webhookId) {
    this.validateLink(guildId, name, channelId, language);
    const key = `${guildId}:${name}`;
    const group = this.data.groups[key] ?? { key, name, guildId, paused: false, channels: [] };
    group.channels.push({ id: channelId, language, webhookId });
    this.data.groups[key] = group;
    this.save();
    return group;
  }
  unlink(channelId) {
    const route = this.route(channelId);
    if (!route) throw new UserError('연결되지 않은 채널입니다.');
    route.group.channels = route.group.channels.filter(c => c.id !== channelId);
    if (!route.group.channels.length) delete this.data.groups[route.group.key];
    this.save();
    return route.group;
  }
  pause(guildId, name, paused) {
    const group = this.group(guildId, name);
    if (!group) throw new UserError('해당 대화 그룹이 없습니다.');
    group.paused = paused;
    this.save();
  }
  usage(day = seoulDay()) { return this.data.usage[day] ?? { requests: 0, inputTokens: 0, outputTokens: 0 }; }
  scoped(guildId) {
    if (!guildId) throw new UserError('사용량을 기록할 서버가 없습니다.');
    return {
      usage: (day = seoulDay()) => this.usage(`${guildId}:${day}`),
      reserve: (limit, day = seoulDay()) => { this.reserve(limit, `${guildId}:${day}`); return day; },
      recordUsage: (day, usage) => this.recordUsage(`${guildId}:${day}`, usage),
    };
  }
  migrateLegacyUsage(guildId) {
    if (!guildId) return;
    let changed = false;
    for (const day of Object.keys(this.data.usage).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k))) {
      const current = this.usage(`${guildId}:${day}`), old = this.data.usage[day];
      this.data.usage[`${guildId}:${day}`] = { requests: current.requests + old.requests, inputTokens: current.inputTokens + old.inputTokens, outputTokens: current.outputTokens + old.outputTokens };
      delete this.data.usage[day]; changed = true;
    }
    if (changed) this.save();
  }
  reserve(limit, day = seoulDay()) {
    const usage = this.usage(day);
    if (usage.requests >= limit) throw new UserError('오늘의 AI 요청 한도에 도달했습니다. /zzz usage로 확인하세요.');
    this.data.usage[day] = { ...usage, requests: usage.requests + 1 };
    this.save(); // Reserve before the network call, including failed requests/restarts.
    return day;
  }
  recordUsage(day, usage = {}) {
    const current = this.usage(day);
    current.inputTokens += Number(usage.input_tokens) || 0;
    current.outputTokens += Number(usage.output_tokens) || 0;
    this.data.usage[day] = current;
    this.save();
  }
  record(id) { return this.data.records[id]; }
  resolve(id) {
    return this.record(id) ?? Object.values(this.data.records).find(r => Object.values(r.copies).some(c => c.ids.includes(id)));
  }
  put(record) {
    this.data.records[record.id] = record;
    const records = Object.values(this.data.records).filter(r => r.guildId === record.guildId).sort((a, b) => a.createdAt - b.createdAt);
    for (const item of records.slice(0, Math.max(0, records.length - 1000))) delete this.data.records[item.id];
    this.save();
  }
  remove(id) { delete this.data.records[id]; this.save(); }
}
