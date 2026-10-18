import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { createHash, randomUUID } from 'node:crypto';
import { ProgramUpdates, validateRelease, updatePathAllowed } from '../video/program-updates.mjs';
import { applyPreparedUpdate } from '../video/update-installer.mjs';
import { DEFAULT_PROGRAM_REPOSITORY } from '../video/distribution.mjs';
import { PrivateReportStore, privateReportServer } from '../services/private-reports.mjs';
import { ReportDelivery } from '../video/report-delivery.mjs';
import { VideoReports } from '../video/reports.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const temp = t => { const folder = mkdtempSync(join(tmpdir(), 'zzz-update-')); t.after(() => rmSync(folder, { recursive: true, force: true })); return folder; };
function fixture(t, { corrupt = false } = {}) {
  const directory = temp(t), parent = join(directory, 'Installed'), root = join(parent, 'app');
  mkdirSync(join(parent, 'runtime'), { recursive: true }); writeFileSync(join(parent, 'runtime/node.exe'), 'KEEP-RUNTIME'); writeFileSync(join(parent, 'Start.cmd'), 'start');
  mkdirSync(join(root, 'data/video'), { recursive: true }); mkdirSync(join(root, '.secrets')); mkdirSync(join(root, '.models'));
  writeFileSync(join(root, 'data/video/history.json'), 'KEEP-HISTORY'); writeFileSync(join(root, '.secrets/user.key'), 'KEEP-KEY'); writeFileSync(join(root, '.models/model.bin'), 'KEEP-MODEL');
  const bytes = Buffer.from('fake zip for injected extractor'), release = { schema: 1, app: 'zenless-subtitle-studio', version: '0.4.0', platform: 'win32-x64', minimumNode: '24.17.0', bytes: bytes.length, sha256: hash(bytes), url: `https://github.com/${DEFAULT_PROGRAM_REPOSITORY}/releases/download/v0.4.0/zenless-subtitle-studio-0.4.0-win-x64.zip` };
  const extract = async (zip, target) => {
    const folder = join(target, 'Zenless-Subtitle-Studio-0.4.0-win-x64'), paths = ['app/video/server.mjs', 'app/scripts/video-launch.mjs', 'video-extension/manifest.json', 'README.md', 'runtime/node.exe'];
    const files = paths.map(path => {
      const body = path === 'runtime/node.exe' ? 'NEW-RUNTIME-SKIPPED' : 'new ' + path; mkdirSync(dirname(join(folder, path)), { recursive: true }); writeFileSync(join(folder, path), body);
      return { path, sha256: corrupt && path.endsWith('server.mjs') ? '0'.repeat(64) : hash(body) };
    });
    writeFileSync(join(folder, 'release-manifest.json'), JSON.stringify({ version: '0.4.0', platform: 'win32-x64', files }));
  };
  const options = { root, dataDir: join(root, 'data/video'), version: '0.3.0', extract, fetcher: async url => new Response(url.endsWith('program-latest.json') ? JSON.stringify(release) : bytes) };
  return { root, parent, options, release };
}
test('verified program update preserves keys, jobs, models and the running runtime', async t => {
  const f = fixture(t), updater = new ProgramUpdates(f.options);
  assert.equal((await updater.check()).available.version, '0.4.0'); await updater.prepare();
  assert.equal(await applyPreparedUpdate(f.root), '0.4.0');
  for (const [path, expected] of [['data/video/history.json', 'KEEP-HISTORY'], ['.secrets/user.key', 'KEEP-KEY'], ['.models/model.bin', 'KEEP-MODEL']]) assert.equal(readFileSync(join(f.root, path), 'utf8'), expected);
  assert.equal(readFileSync(join(f.parent, 'runtime/node.exe'), 'utf8'), 'KEEP-RUNTIME');
  assert(!existsSync(join(f.root, 'data/video/program-update-pending.json')));
});
test('checksum failures and busy jobs prevent installing; interrupted file copies roll back', async t => {
  const corrupt = fixture(t, { corrupt: true }); await assert.rejects(new ProgramUpdates(corrupt.options).prepare(), /검증/);
  const f = fixture(t); await assert.rejects(new ProgramUpdates({ ...f.options, busy: () => true }).prepare(), /진행 중/);
  mkdirSync(join(f.root, 'video'), { recursive: true }); writeFileSync(join(f.root, 'video/server.mjs'), 'OLD-SERVER');
  await new ProgramUpdates(f.options).prepare(); let copied = 0;
  await assert.rejects(applyPreparedUpdate(f.root, { copy: (a, b) => { if (++copied === 2) throw new Error('simulated disk failure'); copyFileSync(a, b); } }), /simulated/);
  assert.equal(readFileSync(join(f.root, 'video/server.mjs'), 'utf8'), 'OLD-SERVER');
  assert.equal(readFileSync(join(f.root, '.secrets/user.key'), 'utf8'), 'KEEP-KEY');
});
test('program update paths exclude private data, traversal and arbitrary root executables', () => {
  for (const path of ['app/data/x', 'app/.secrets/key', '../app.js', 'app/video/../../x', 'run.exe', 'app/video/.hidden', 'C:/x']) assert.equal(updatePathAllowed(path), false, path);
});
const videoReport = () => ({ id: 'V-20261019-abcdef123456', createdAt: Date.now(), updatedAt: Date.now(), source: { text: 'Quick Assist', language: 'en' }, target: { text: '오역 예시', language: 'ko' }, issue: { type: 'term', explanation: '테스트 신고', suggestion: '', fragment: '' }, metadata: {} });
test('private report service deduplicates retries, limits abuse and exposes no report listing', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'zzz-update-'));
  const store = new PrivateReportStore(join(directory, 'reports.sqlite'));
  const server = privateReportServer(store); t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); store.close(); rmSync(directory, { recursive: true, force: true }); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); const base = `http://127.0.0.1:${server.address().port}`;
  const input = { installationId: randomUUID(), report: videoReport() }, post = data => fetch(base + '/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const first = await (await post(input)).json(), again = await (await post(input)).json(); assert.equal(first.receiptId, again.receiptId); assert.equal(again.duplicate, true);
  assert.equal((await fetch(base + '/api/reports')).status, 404); assert.equal(store.list().length, 1);
  assert(!JSON.stringify(store.list()).includes(input.installationId));
  for (let i = 1; i < 5; i++) assert.equal((await post({ ...input, report: { ...input.report, id: `V-20261019-${String(i).padStart(12, '0')}` } })).status, 201);
  assert.equal((await post({ ...input, report: { ...input.report, id: 'V-20261019-000000000005' } })).status, 429);
  const report = store.list()[0]; store.apply([{ id: report.id, expectedUpdatedAt: report.updatedAt, status: 'resolved', note: '검증 완료' }]);
  assert.throws(() => store.apply([{ id: report.id, expectedUpdatedAt: report.updatedAt, status: 'rejected', note: 'stale' }]), /이미 변경/);
});
test('in-app delivery sends no API key/local path and reuses a received receipt', async t => {
  const dataDir = temp(t), reports = new VideoReports({ dataDir, repository: () => '', jobs: { get: () => ({ status: 'completed', title: 'PRIVATE-PATH', apiKey: 'NEVER-SEND', options: { sourceLanguage: 'en', targetLanguage: 'ko' }, cues: [{ id: '1', sourceText: 'Quick Assist', translatedText: '빠른 지원', startMs: 0, endMs: 2000 }] }) } });
  const report = reports.create({ jobId: 'x', cueId: '1', type: 'term', explanation: '테스트입니다.' }); let posts = 0;
  const delivery = new ReportDelivery({ dataDir, reports, fetcher: async (url, init) => {
    if (url.endsWith('/services.json')) return new Response(JSON.stringify({ schema: 1, reports: 'https://reports.example.test/api/reports' }));
    posts++; assert(!init.body.includes('NEVER-SEND')); assert(!init.body.includes('PRIVATE-PATH')); assert(!init.headers.Authorization);
    return new Response(JSON.stringify({ receiptId: 'A-20261019-abcdef123456' }));
  } });
  const result = await delivery.send(report.report.id); assert.equal(result.receiptId, 'A-20261019-abcdef123456'); await delivery.send(report.report.id); assert.equal(posts, 1);
});
