import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ReportStore } from '../src/report-store.js';
import { UserError } from '../src/config.js';

// Owner-only CLI; no Discord history fetch and no AI provider calls.
let reports;
try {
  const args = process.argv.slice(2), action = args.shift() ?? 'export';
  const options = {};
  while (args.length) {
    const name = args.shift();
    if (!['--status', '--limit', '--offset', '--id', '--db'].includes(name) || !args.length) throw new UserError('신고 도구의 입력 옵션을 확인하세요.');
    options[name.slice(2)] = args.shift();
  }
  if (!['export', 'get', 'apply', 'counts'].includes(action)) throw new UserError('export / get / apply / counts 중 하나를 선택하세요.');
  const path = resolve(options.db ?? 'data/reports.sqlite');
  if (!existsSync(path)) {
    if (action === 'apply' || action === 'get') throw new UserError('접수된 신고 저장소가 없습니다.');
    console.log(JSON.stringify(action === 'counts' ? { counts: {} } : { version: 1, exportedAt: new Date().toISOString(), reports: [] }));
  } else {
    reports = new ReportStore(path, { readOnly: action !== 'apply' });
    let output;
    if (action === 'export') output = { version: 1, exportedAt: new Date().toISOString(), status: options.status ?? 'pending',
      counts: reports.counts(), reports: reports.list({ status: options.status ?? 'pending', limit: Number(options.limit ?? 50), offset: Number(options.offset ?? 0) }) };
    else if (action === 'get') {
      const report = reports.get(options.id);
      if (!report) throw new UserError('신고를 찾지 못했습니다.');
      output = { version: 1, exportedAt: new Date().toISOString(), reports: [report] };
    } else if (action === 'counts') output = { counts: reports.counts() };
    else {
      const bytes = readFileSync(0);
      if (bytes.length > 256 * 1024) throw new UserError('처리 결과 입력이 너무 큽니다.');
      let data;
      try { data = JSON.parse(bytes.toString('utf8')); } catch { throw new UserError('처리 결과 JSON 형식을 확인하세요.'); }
      if (data.version !== 1) throw new UserError('처리 결과 형식의 version은 1이어야 합니다.');
      output = { updated: reports.applyDecisions(data.decisions) };
    }
    console.log(JSON.stringify(output, null, 2));
  }
} catch (error) {
  console.error(error instanceof UserError ? error.message : `신고 도구 실행 실패 (${error.name}).`);
  process.exitCode = 1;
} finally { reports?.close(); }
