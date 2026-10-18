import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';
import { REPORT_ID, REPORT_STATUSES } from '../src/report-store.js';
import { UserError } from '../src/config.js';
import { DEFAULT_GLOSSARY_REPOSITORY } from '../video/distribution.mjs';
import { collectGithubReports, normalizeVideoReport, validateDecisions, preflightGithubDecisions, applyGithubDecision } from '../video/report-import.mjs';

const root = resolve(import.meta.dirname, '..');
import { reviewMarkdown } from '../src/report-markdown.js';
export { reviewMarkdown };
function githubRequest(endpoint, { method = 'GET', body } = {}) {
  const bundled = resolve(root, '.tools/github-cli/bin/gh.exe');
  const gh = existsSync(bundled) ? bundled : 'gh';
  const args = ['api', endpoint, '--method', method];
  if (body) args.push('--input', '-');
  const result = spawnSync(gh, args, { shell: false, encoding: 'utf8', input: body ? JSON.stringify(body) : undefined, timeout: 45000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status) throw new UserError('GitHub 신고 도구 실행에 실패했습니다. GitHub 로그인과 저장소 접근 권한을 확인하세요.');
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}
function connectionArgs() {
  const connectionPath = resolve(root, '.secrets/oracle-host.json');
  const privateKey = resolve(root, '.secrets/oracle-zzz'), knownHosts = resolve(root, '.secrets/oracle-known-hosts');
  if (![connectionPath, privateKey, knownHosts].every(existsSync)) throw new UserError('오라클 접속 설정이나 SSH 키를 찾지 못했습니다.');
  const connection = JSON.parse(readFileSync(connectionPath, 'utf8'));
  const octets = String(connection.host).split('.');
  if (connection.user !== 'ubuntu' || octets.length !== 4 || octets.some(x => !/^\d{1,3}$/.test(x) || Number(x) > 255)) throw new UserError('오라클 접속 설정을 확인하세요.');
  const ssh = process.platform === 'win32' ? resolve(process.env.SystemRoot || 'C:/Windows', 'System32/OpenSSH/ssh.exe') : 'ssh';
  return { ssh, args: ['-i', privateKey, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes',
    '-o', `UserKnownHostsFile=${knownHosts}`, '-o', 'ConnectTimeout=15', `${connection.user}@${connection.host}`] };
}
function remote(action, { status = 'pending', id, offset = 0 } = {}, input) {
  if (status !== 'all' && !Object.hasOwn(REPORT_STATUSES, status)) throw new UserError('신고 상태를 확인하세요.');
  if (id !== undefined && !REPORT_ID.test(id)) throw new UserError('신고 번호를 확인하세요.');
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000) throw new UserError('목록 시작 위치를 확인하세요.');
  // Remote command arguments are restricted identifiers/enums, never report text.
  const node = '/opt/zzz-node-v24.21.0/bin/node /home/ubuntu/zzztranslate/scripts/reports-cli.mjs';
  const command = action === 'apply' ? `cd /home/ubuntu/zzztranslate && ${node} apply`
    : id ? `cd /home/ubuntu/zzztranslate && ${node} get --id ${id}`
      : `cd /home/ubuntu/zzztranslate && ${node} export --status ${status} --limit 50 --offset ${offset}`;
  const { ssh, args } = connectionArgs();
  const result = spawnSync(ssh, [...args, command], { shell: false, encoding: 'utf8', input, maxBuffer: 8 * 1024 * 1024, timeout: 45000 });
  if (result.error || result.status) throw new UserError(`오라클 신고 도구 실행에 실패했습니다.${result.stderr?.trim() ? `\n${result.stderr.trim().slice(0, 600)}` : ''}`);
  try { return JSON.parse(result.stdout); } catch { throw new UserError('신고 도구의 응답 형식을 확인하세요.'); }
}
function remoteVideo(action, offset = 0, input) {
  if (!Number.isInteger(offset) || offset < 0) throw new UserError('영상 신고 목록 범위를 확인하세요.');
  const command = `cd /home/ubuntu/zzz-video-reports/app && /opt/zzz-node-v24.21.0/bin/node scripts/private-reports-cli.mjs ${action === 'apply' ? 'apply' : `export ${offset}`}`;
  const { ssh, args } = connectionArgs();
  const result = spawnSync(ssh, [...args, command], { shell: false, windowsHide: true, encoding: 'utf8', input, timeout: 45000, maxBuffer: 8 * 1048576 });
  if (result.error || result.status) throw new UserError('비공개 영상 신고 수집 도구에 연결하지 못했습니다.');
  return JSON.parse(result.stdout);
}

async function main() {
  const args = process.argv.slice(2);
  let action = args.shift();
  if (!action) {
    console.log('Discord·비공개 영상·기존 GitHub 오역 신고를 함께 가져옵니다. AI API를 호출하지 않습니다.');
    console.log('1. 미처리 신고 가져오기\n2. 모든 상태의 최근 신고 가져오기\n0. 종료');
    const input = createInterface({ input: process.stdin, output: process.stdout });
    const choice = (await input.question('번호 선택: ')).trim(); input.close();
    if (choice === '0') return;
    if (!['1', '2'].includes(choice)) throw new UserError('0~2 중 하나를 선택하세요.');
    action = 'pull'; if (choice === '2') args.push('--status', 'all');
  }
  const options = {};
  while (args.length) {
    const key = args.shift();
    if (key === '--github-only' || key === '--discord-only' || key === '--private-only') { options[key.slice(2)] = true; continue; }
    if (!['--status', '--id', '--offset', '--file', '--repository', '--video-file'].includes(key) || !args.length) throw new UserError('신고 검토 도구의 옵션을 확인하세요.');
    options[key.slice(2)] = args.shift();
  }
  if (action === 'pull') {
    if (['github-only', 'discord-only', 'private-only'].filter(key => options[key]).length > 1) throw new UserError('수집 경로는 하나만 제한할 수 있습니다.');
    const data = { version: 1, exportedAt: new Date().toISOString(), reports: [], sources: [], warnings: [] };
    if (!options['github-only'] && !options['private-only']) {
      let offset = Number(options.offset ?? 0);
      for (let page = 0; page < 40; page++) {
        const chunk = remote('export', { status: options.status ?? 'all', id: options.id, offset });
        if (chunk.version !== 1 || !Array.isArray(chunk.reports)) throw new UserError('신고 자료 형식을 확인하세요.');
        data.reports.push(...chunk.reports.map(r => ({ ...r, origin: 'discord' })));
        if (chunk.reports.length < 50 || options.id || options.offset !== undefined) break;
        offset += 50;
        if (page === 39) throw new UserError('Discord 신고 수집 범위를 초과했습니다. --offset으로 나누어 가져오세요.');
      }
      data.sources.push('discord');
    }
    if (!options['discord-only'] && !options['github-only']) {
      for (let page = 0; page < 50; page++) {
        const chunk = remoteVideo('export', page * 100);
        if (chunk.version !== 1 || !Array.isArray(chunk.reports)) throw new UserError('비공개 영상 신고 형식을 확인하세요.');
        data.reports.push(...chunk.reports);
        if (chunk.reports.length < 100) break;
        if (page === 49) throw new UserError('영상 신고 수집 범위를 초과했습니다.');
      }
      data.sources.push('private-video', 'private-discord');
    }
    if (!options['discord-only'] && !options['private-only']) {
      const github = await collectGithubReports(options.repository || DEFAULT_GLOSSARY_REPOSITORY, githubRequest);
      data.reports.push(...github.reports); data.sources.push('github-video');
      if (github.ignored) data.warnings.push(`형식이 맞지 않는 GitHub 신고 ${github.ignored}건은 제외했습니다.`);
    }
    if (options['video-file']) {
      const bytes = readFileSync(resolve(root, options['video-file']));
      if (bytes.length > 16 * 1024 * 1024) throw new UserError('신고 파일이 너무 큽니다.');
      const input = JSON.parse(bytes);
      if (input.version !== 1 || !Array.isArray(input.reports)) throw new UserError('영상 신고 파일 형식을 확인하세요.');
      for (const item of input.reports) {
        const report = normalizeVideoReport(item);
        if (!data.reports.some(r => r.submissionId === report.id || r.id === report.id)) data.reports.push(report);
      }
      data.sources.push('video-file');
    }
    data.reports = data.reports.filter(r => options.status === 'all' || (options.status ? r.status === options.status : !['resolved', 'rejected'].includes(r.status)));
    const folder = resolve(root, 'reports'); mkdirSync(folder, { recursive: true });
    writeFileSync(resolve(folder, 'review.json'), `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
    writeFileSync(resolve(folder, 'review.md'), reviewMarkdown(data), { mode: 0o600 });
    console.log(`신고 ${data.reports.length}건을 가져왔습니다.\n${resolve(folder, 'review.md')}\n${resolve(folder, 'review.json')}\n이 프로젝트에서 "접수된 오역 신고 검토해줘"라고 요청하세요.`);
  } else if (action === 'apply') {
    const path = resolve(root, options.file ?? 'reports/decisions.json');
    const bytes = readFileSync(path);
    if (bytes.length > 256 * 1024) throw new UserError('처리 결과 입력이 너무 큽니다.');
    let decisions;
    try { decisions = JSON.parse(bytes.toString('utf8')); } catch { throw new UserError('처리 결과 JSON 형식을 확인하세요.'); }
    const items = validateDecisions(decisions), repository = options.repository || DEFAULT_GLOSSARY_REPOSITORY;
    const github = await preflightGithubDecisions(repository, items, githubRequest);
    const updated = [], receiptPath = resolve(root, 'reports/apply-receipt.json');
    const receipt = () => { mkdirSync(resolve(root, 'reports'), { recursive: true }); writeFileSync(receiptPath, JSON.stringify({ version: 1, at: new Date().toISOString(), updated }, null, 2)); };
    try {
      if (github.length) {
        const labels = await githubRequest(`repos/${repository}/labels?per_page=100`);
        for (const status of new Set(github.map(item => item.decision.status))) if (!labels.some(l => l.name === `review:${status}`)) await githubRequest(`repos/${repository}/labels`, { method: 'POST', body: { name: `review:${status}`, color: '5269ba', description: 'Translation report review status' } });
      }
      const discord = items.filter(item => item.id.startsWith('R-'));
      if (discord.length) { const result = remote('apply', {}, JSON.stringify({ version: 1, decisions: discord })); updated.push(...result.updated.map(r => r.id)); receipt(); }
      const video = items.filter(item => item.id.startsWith('A-'));
      if (video.length) { const result = remoteVideo('apply', 0, JSON.stringify({ version: 1, decisions: video })); updated.push(...result.updated.map(r => r.id)); receipt(); }
      for (const item of github) { updated.push(await applyGithubDecision(repository, item, githubRequest)); receipt(); }
    } catch (error) { receipt(); throw new UserError(`${error.message}\n완료된 변경은 reports/apply-receipt.json에서 확인하세요. 경로 간 일괄 취소는 지원하지 않습니다.`); }
    console.log(`신고 ${updated.length}건의 상태·검토 메모를 갱신했습니다. 용어집과 Discord 번역문은 이 작업으로 변경되지 않습니다.`);
  } else throw new UserError('pull 또는 apply를 선택하세요.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error instanceof UserError ? error.message : '신고 검토 도구 실행에 실패했습니다.'); process.exitCode = 1; });
}
