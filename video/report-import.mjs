import { createHash } from 'node:crypto';
import { githubRepository } from './glossary-updates.mjs';
import { TEXT_LANGUAGES } from '../src/languages.js';
import { parseGlossaryIssueBody } from '../src/glossary-report-form.js';
const languages = [null, ...Object.keys(TEXT_LANGUAGES)];
const statuses = ['pending', 'reviewing', 'needs-info', 'resolved', 'rejected'];
const string = (value, max, required = false) => {
  if (typeof value !== 'string' || value.length > max || required && !value.trim()) throw new Error('Invalid report text');
  return value;
};
export function normalizeVideoReport(input) {
  if (!/^V-\d{8}-[a-f0-9]{12}$/.test(input?.id || '') || !languages.includes(input.source?.language) || !languages.includes(input.target?.language)
    || !['term', 'missing', 'meaning', 'wording', 'other'].includes(input.issue?.type)) throw new Error('Invalid video report');
  const source = string(input.source.text, 6000, true), target = string(input.target.text, 12000, true);
  const metadata = {};
  for (const key of ['provider', 'model', 'style', 'glossaryVersion']) if (input.metadata?.[key] != null) metadata[key] = string(input.metadata[key], 160);
  for (const key of ['glossaryHash', 'sourceHash']) if (/^[a-f0-9]{64}$/.test(input.metadata?.[key] || '')) metadata[key] = input.metadata[key];
  const video = {};
  if (/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(input.video?.url || '')) video.url = input.video.url;
  if (Number.isSafeInteger(input.video?.startMs) && Number.isSafeInteger(input.video?.endMs) && input.video.startMs >= 0 && input.video.endMs > input.video.startMs) {
    video.startMs = input.video.startMs; video.endMs = input.video.endMs;
  }
  if (['screen', 'speech'].includes(input.video?.kind)) video.kind = input.video.kind;
  return { id: input.id, origin: 'video-file', status: 'pending',
    source: { text: source, language: input.source.language, provenance: 'user-submitted-video-report', matchesTranslationSource: null },
    target: { text: target, language: input.target.language },
    issue: { type: input.issue.type, explanation: string(input.issue.explanation, 1000, true), fragment: string(input.issue.fragment || '', 200), suggestion: string(input.issue.suggestion || '', 2000) },
    metadata, video, review: { note: '', actor: '' },
    createdAt: Number.isSafeInteger(input.createdAt) ? input.createdAt : 0, updatedAt: Number.isSafeInteger(input.updatedAt) ? input.updatedAt : 0 };
}
export function parseGithubReport(issue, repository) {
  githubRepository(repository);
  if (issue.pull_request || !Number.isSafeInteger(issue.number) || issue.number < 1 || typeof issue.body !== 'string' || issue.body.length > 65536) return null;
  const match = /<!-- zzz-video-report:v1 -->\s*```json[ \t]*\r?\n([\s\S]*?)\r?\n```(?:\s|$)/.exec(issue.body);
  let report;
  if (match) { try { report = normalizeVideoReport(JSON.parse(match[1])); } catch { return null; } }
  else report = parseGlossaryIssueBody(issue.body);
  if (!report) return null;
  const updatedAt = Date.parse(issue.updated_at), createdAt = Date.parse(issue.created_at);
  if (!Number.isFinite(updatedAt) || !Number.isFinite(createdAt)) return null;
  const labelStatus = (issue.labels || []).map(label => typeof label === 'string' ? label : label.name).find(label => label?.startsWith('review:'))?.slice(7);
  return { ...report, ...(report.id ? { submissionId: report.id } : {}), id: `G-${issue.number}`, origin: match ? 'github-video' : 'github-glossary', createdAt, updatedAt,
    status: issue.state === 'closed' ? issue.state_reason === 'not_planned' ? 'rejected' : 'resolved' : statuses.includes(labelStatus) ? labelStatus : 'pending',
    github: { repository, number: issue.number, url: `https://github.com/${repository}/issues/${issue.number}`, bodyHash: createHash('sha256').update(issue.body).digest('hex') } };
}
export async function collectGithubReports(repository, request) {
  githubRepository(repository);
  const reports = []; let ignored = 0;
  for (let page = 1; page <= 100; page++) {
    const issues = await request(`repos/${repository}/issues?state=all&per_page=100&page=${page}`);
    if (!Array.isArray(issues)) throw new Error('Invalid GitHub issues response');
    for (const issue of issues) {
      const report = parseGithubReport(issue, repository);
      if (report) reports.push(report);
      else if (issue.body?.includes('<!-- zzz-video-report:v1 -->') || issue.title?.startsWith('[DB report]') || /^### (?:신고 종류|Report category|報告の種類|举报类型)\r?$/m.test(issue.body || '')) ignored++;
    }
    if (issues.length < 100) return { reports, ignored };
  }
  throw new Error('GitHub report pagination exceeded; split the review range.');
}
export function validateDecisions(data) {
  if (data?.version !== 1 || !Array.isArray(data.decisions) || !data.decisions.length || data.decisions.length > 200) throw new Error('검토 결과 형식을 확인하세요.');
  const ids = new Set();
  for (const d of data.decisions) {
    if (!/^(?:[RA]-\d{8}-[a-f0-9]{12}|G-[1-9]\d{0,9})$/.test(d.id || '') || ids.has(d.id) || !Number.isSafeInteger(d.expectedUpdatedAt) || !statuses.includes(d.status)) throw new Error('검토 결과의 번호·상태·시각을 확인하세요.');
    string(d.note, 2000, true); ids.add(d.id);
  }
  return data.decisions;
}
export async function preflightGithubDecisions(repository, decisions, request) {
  const prepared = [];
  for (const decision of decisions.filter(d => d.id.startsWith('G-'))) {
    const issue = await request(`repos/${repository}/issues/${decision.id.slice(2)}`), report = parseGithubReport(issue, repository);
    if (!report || report.updatedAt !== decision.expectedUpdatedAt) throw new Error(`${decision.id}: 신고가 이미 변경되었습니다. 다시 가져와 검토하세요.`);
    prepared.push({ decision, labels: (issue.labels || []).map(l => typeof l === 'string' ? l : l.name).filter(l => !l.startsWith('review:')) });
  }
  return prepared;
}
export async function applyGithubDecision(repository, prepared, request) {
  const { decision, labels } = prepared, endpoint = `repos/${repository}/issues/${decision.id.slice(2)}`;
  // GitHub has no cross-service transaction; recheck immediately before each write.
  const current = await request(endpoint);
  if (Date.parse(current.updated_at) !== decision.expectedUpdatedAt) throw new Error(`${decision.id}: 신고가 이미 변경되었습니다.`);
  await request(`${endpoint}/comments`, { method: 'POST', body: { body: `<!-- zzz-report-review:v1 -->\n검토 상태: ${decision.status}\n\n${decision.note}` } });
  const closed = ['resolved', 'rejected'].includes(decision.status);
  await request(endpoint, { method: 'PATCH', body: { state: closed ? 'closed' : 'open', ...(closed ? { state_reason: decision.status === 'rejected' ? 'not_planned' : 'completed' } : {}), labels: [...labels, `review:${decision.status}`] } });
  return decision.id;
}
