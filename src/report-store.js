import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { LANGUAGES, UserError } from './config.js';
import { seoulDay } from './store.js';

export const REPORT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
export const REPORT_STATUSES = Object.freeze({ pending: '접수', reviewing: '검토 중', 'needs-info': '추가 확인 필요', resolved: '처리 완료', rejected: '반영하지 않음' });
export const REPORT_TYPES = Object.freeze({ term: '게임 용어 오류', missing: '내용 누락', meaning: '의미가 달라짐', wording: '어색한 표현', other: '기타' });
export const REPORT_ID = /^R-\d{8}-[a-f0-9]{12}$/;
const snowflake = value => typeof value === 'string' && /^\d{17,20}$/.test(value);
const hashPattern = /^[a-f0-9]{64}$/;
export const textHash = text => createHash('sha256').update(text).digest('hex');
function string(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new UserError('신고 입력의 길이와 내용을 확인하세요.');
  return value.trim();
}
function safeMetadata(value = {}) {
  const out = {};
  for (const key of ['provider', 'model', 'style']) if (typeof value[key] === 'string') out[key] = value[key].slice(0, 80);
  for (const key of ['glossaryHash', 'promptHash']) if (hashPattern.test(value[key] ?? '')) out[key] = value[key];
  if (Number.isSafeInteger(value.translatedAt)) out.translatedAt = value.translatedAt;
  return out;
}
function snapshot(input) {
  const source = input.source ?? {}, target = input.target ?? {}, issue = input.issue ?? {};
  if (!snowflake(target.channelId) || !snowflake(target.messageId)
    || (source.channelId != null && !snowflake(source.channelId)) || (source.messageId != null && !snowflake(source.messageId))) throw new UserError('신고 메시지 연결 정보를 확인하세요.');
  if (!Object.hasOwn(LANGUAGES, target.language) || (source.language != null && !Object.hasOwn(LANGUAGES, source.language))) throw new UserError('신고 언어 정보를 확인하세요.');
  if (!Object.hasOwn(REPORT_TYPES, issue.type)) throw new UserError('문제 유형을 선택하세요.');
  const sourceText = string(source.text, 2000, true);
  const targetText = string(target.text, 2000, true);
  const fragment = string(issue.fragment ?? '', 200);
  if (fragment && !targetText.includes(fragment)) throw new UserError('문제 부분에는 번역문에 실제로 있는 글자를 입력하세요.');
  return {
    source: { text: sourceText, channelId: source.channelId ?? null, messageId: source.messageId ?? null, language: source.language ?? null,
      provenance: ['discord-verified', 'discord-unverified', 'user-provided'].includes(source.provenance) ? source.provenance : 'user-provided',
      matchesTranslationSource: [true, false].includes(source.matchesTranslationSource) ? source.matchesTranslationSource : null },
    target: { text: targetText, channelId: target.channelId, messageId: target.messageId, language: target.language },
    metadata: safeMetadata(input.metadata),
    issue: { type: issue.type, fragment, explanation: string(issue.explanation, 1000, true), suggestion: string(issue.suggestion ?? '', 2000) },
  };
}

export class ReportStore {
  constructor(path, { now = Date.now, readOnly = false } = {}) {
    this.now = now; this.path = path; this.readOnly = readOnly;
    if (!readOnly) mkdirSync(dirname(path), { recursive: true });
    try {
      this.db = new DatabaseSync(path, { readOnly });
      this.db.exec('PRAGMA busy_timeout = 3000;');
      const version = this.db.prepare('PRAGMA user_version').get().user_version;
      if (![0, 1].includes(version) || (readOnly && version !== 1)) throw new Error('Unsupported report schema');
      if (!readOnly) {
        this.db.exec(`PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, reporter_id TEXT NOT NULL,
            target_id TEXT NOT NULL, target_hash TEXT NOT NULL, created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', payload TEXT NOT NULL,
            review_note TEXT NOT NULL DEFAULT '', reviewed_by TEXT NOT NULL DEFAULT '',
            UNIQUE(guild_id, reporter_id, target_id, target_hash)
          );
          CREATE INDEX IF NOT EXISTS reports_recent ON reports(guild_id, reporter_id, created_at);
          CREATE INDEX IF NOT EXISTS reports_status ON reports(status, created_at);
          PRAGMA user_version = 1;`);
        chmodSync(path, 0o600);
      }
      this.db.prepare('SELECT id, payload FROM reports LIMIT 1').get();
    } catch {
      try { this.db?.close(); } catch {}
      throw new UserError('오역 신고 저장소를 열지 못했습니다. 기존 파일은 삭제하지 않았습니다.');
    }
  }
  close() { this.db.close(); }
  prune() {
    if (!this.readOnly) this.db.prepare('DELETE FROM reports WHERE created_at < ?').run(this.now() - REPORT_RETENTION_MS);
  }
  decode(row) {
    if (!row) return null;
    return { id: row.id, guildId: row.guild_id, reporterId: row.reporter_id, createdAt: row.created_at, updatedAt: row.updated_at,
      status: row.status, ...JSON.parse(row.payload), review: { note: row.review_note, actor: row.reviewed_by } };
  }
  get(id) {
    if (!REPORT_ID.test(id ?? '')) throw new UserError('신고 번호를 확인하세요. 예: R-20261008-xxxxxxxxxxxx');
    return this.decode(this.db.prepare('SELECT * FROM reports WHERE id = ? AND created_at >= ?').get(id, this.now() - REPORT_RETENTION_MS));
  }
  forViewer(id, guildId, userId, manager = false) {
    const report = this.get(id);
    if (!report || report.guildId !== guildId || (!manager && report.reporterId !== userId)) throw new UserError('이 서버에서 본인이 접수한 신고만 확인할 수 있습니다.');
    return report;
  }
  checkCapacity(guildId, reporterId) {
    if (!snowflake(guildId) || !snowflake(reporterId)) throw new UserError('서버와 신고자 정보를 확인하세요.');
    const count = this.db.prepare('SELECT COUNT(*) AS n FROM reports WHERE guild_id = ? AND reporter_id = ? AND created_at >= ?');
    if (count.get(guildId, reporterId, this.now() - 60 * 60 * 1000).n >= 5
      || count.get(guildId, reporterId, this.now() - 24 * 60 * 60 * 1000).n >= 20) throw new UserError('신고는 한 사람당 시간당 5건, 하루 20건까지 접수합니다. 잠시 후 다시 시도하세요.');
    if (this.db.prepare('SELECT COUNT(*) AS n FROM reports').get().n >= 2000
      || this.db.prepare('SELECT COUNT(*) AS n FROM reports WHERE guild_id = ?').get(guildId).n >= 500) throw new UserError('신고 저장 한도에 도달했습니다. 운영자에게 확인하세요.');
  }
  create(guildId, reporterId, input) {
    if (this.readOnly) throw new UserError('읽기 전용 신고 저장소입니다.');
    const payload = snapshot(input), hash = textHash(payload.target.text);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.prune();
      const existing = this.db.prepare('SELECT * FROM reports WHERE guild_id = ? AND reporter_id = ? AND target_id = ? AND target_hash = ?')
        .get(guildId, reporterId, payload.target.messageId, hash);
      if (existing) { this.db.exec('COMMIT'); return { report: this.decode(existing), duplicate: true }; }
      this.checkCapacity(guildId, reporterId);
      const id = `R-${seoulDay(new Date(this.now())).replaceAll('-', '')}-${randomBytes(6).toString('hex')}`;
      const time = this.now();
      this.db.prepare('INSERT INTO reports (id, guild_id, reporter_id, target_id, target_hash, created_at, updated_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, guildId, reporterId, payload.target.messageId, hash, time, time, JSON.stringify(payload));
      this.db.exec('COMMIT');
      return { report: this.get(id), duplicate: false };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  list({ status = 'pending', guildId, reporterId, limit = 50, offset = 0 } = {}) {
    if (status !== 'all' && !Object.hasOwn(REPORT_STATUSES, status)) throw new UserError('신고 상태를 확인하세요.');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || offset > 100000) throw new UserError('목록 범위를 확인하세요.');
    const where = ['created_at >= ?'], params = [this.now() - REPORT_RETENTION_MS];
    if (status !== 'all') { where.push('status = ?'); params.push(status); }
    if (guildId !== undefined) { where.push('guild_id = ?'); params.push(guildId); }
    if (reporterId !== undefined) { where.push('reporter_id = ?'); params.push(reporterId); }
    return this.db.prepare(`SELECT * FROM reports WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id LIMIT ? OFFSET ?`)
      .all(...params, limit, offset).map(row => this.decode(row));
  }
  counts(guildId) {
    const where = guildId === undefined ? '' : ' AND guild_id = ?';
    const rows = this.db.prepare(`SELECT status, COUNT(*) AS n FROM reports WHERE created_at >= ?${where} GROUP BY status`)
      .all(this.now() - REPORT_RETENTION_MS, ...(guildId === undefined ? [] : [guildId]));
    return Object.fromEntries(Object.keys(REPORT_STATUSES).map(status => [status, rows.find(r => r.status === status)?.n ?? 0]));
  }
  applyDecisions(decisions) {
    if (this.readOnly || !Array.isArray(decisions) || !decisions.length || decisions.length > 100) throw new UserError('처리 결과는 한 번에 1~100건 입력하세요.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const changed = [];
      for (const item of decisions) {
        const previous = this.get(item.id);
        if (!previous || !Object.hasOwn(REPORT_STATUSES, item.status) || !Number.isSafeInteger(item.expectedUpdatedAt)) throw new UserError('처리할 신고 번호·상태·기존 수정 시각을 확인하세요.');
        const note = string(item.note ?? '', 1000);
        if (item.expectedUpdatedAt !== previous.updatedAt) throw new UserError(`신고 ${item.id}가 이미 변경되었습니다. 목록을 다시 가져오세요.`);
        const time = Math.max(this.now(), previous.updatedAt + 1);
        this.db.prepare('UPDATE reports SET status = ?, review_note = ?, reviewed_by = ?, updated_at = ? WHERE id = ?')
          .run(item.status, note, 'project-review', time, item.id);
        changed.push({ id: item.id, status: item.status, updatedAt: time });
      }
      this.db.exec('COMMIT');
      return changed;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  forgetGuild(guildId) { this.db.prepare('DELETE FROM reports WHERE guild_id = ?').run(guildId); }
}
