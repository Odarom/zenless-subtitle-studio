import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { normalizeSharedDiscordReport } from '../src/shared-report.js';
import { ReportSharing, PROJECT_REPORT_ENDPOINT } from '../src/report-sharing.js';
import { updateSharedGlossary, SHARED_GLOSSARY_BASE } from '../src/shared-glossary.js';
import { RunnerBroker, runnerServer } from '../src/runner-broker.js';
import { RunnerClient, processRunnerJob, runnerOrigin } from '../src/runner-client.js';
import { once } from 'node:events';
import { RunnerUi, RunnerProfiles, runnerUiServer } from '../src/runner-ui-server.js';
import { EventEmitter } from 'node:events';
import { mkdirSync } from 'node:fs';
import { runnerText } from '../src/runner-i18n.js';

const input = () => ({ id: 'R-20261019-123456abcdef', platform: 'discord', guildId: 'PRIVATE-GUILD', reporterId: 'PRIVATE-USER',
  source: { text: 'Perfect Dodge', language: 'en', channelId: 'PRIVATE-CHANNEL', provenance: 'discord-verified', matchesTranslationSource: true },
  target: { text: '완벽 회피', language: 'ko', messageId: 'PRIVATE-MESSAGE' },
  metadata: { model: 'gemini-3.1-flash-lite', glossaryHash: 'a'.repeat(64), apiKey: 'PRIVATE-KEY' },
  issue: { type: 'term', fragment: '완벽', explanation: '극한 회피로 수정', suggestion: '극한 회피' }, secret: 'PRIVATE-TOKEN' });
test('project sharing uses only the consented snapshot, not credentials or Discord identity', async () => {
  let sent;
  const dir = mkdtempSync(join(tmpdir(), 'zzz-share-'));
  const fetcher = async (url, options) => { assert.equal(url, PROJECT_REPORT_ENDPOINT); assert.equal(options.redirect, 'error'); sent = JSON.parse(options.body); return Response.json({ receiptId: 'A-20261019-abcdef123456' }); };
  const sharing = new ReportSharing(join(dir, 'install.json'), { fetcher });
  assert.equal(await sharing.send(input()), 'A-20261019-abcdef123456');
  assert(!JSON.stringify(sent).includes('PRIVATE-'));
  assert.equal(sent.report.source.matchesTranslationSource, null);
  assert.equal(sent.report.source.provenance, 'user-provided');
  const restored = new ReportSharing(join(dir, 'install.json'), { fetcher });
  assert.equal(restored.installationId, sharing.installationId);
  for (const change of [r => r.target.language = 'bad', r => r.issue.fragment = 'missing', r => r.issue.explanation = 'AIza' + 'x'.repeat(35)]) {
    const report = input(); change(report); assert.throws(() => normalizeSharedDiscordReport(report));
  }
});
test('shared glossary verifies location, size, hash and schema before replacing the last usable file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'zzz-shared-db-')), path = join(dir, 'glossary.json');
  const old = JSON.stringify({ version: 1, entries: [] }); writeFileSync(path, old);
  const bytes = Buffer.from(JSON.stringify({ version: 1, entries: [{ id: 'example', aliases: ['test'], meaning: 'test', rule: 'test' }] }));
  const sha = createHash('sha256').update(bytes).digest('hex');
  const manifest = { schema: 1, version: 'example', count: 1, bytes: bytes.length, sha256: sha, file: `releases/${sha}.json` };
  const calls = [];
  const fetcher = async url => { calls.push(url); return url.endsWith('latest.json') ? Response.json(manifest) : new Response(bytes); };
  assert.equal((await updateSharedGlossary(path, { fetcher })).updated, true);
  assert.deepEqual(readFileSync(path), bytes);
  assert.deepEqual(calls, [SHARED_GLOSSARY_BASE + 'latest.json', SHARED_GLOSSARY_BASE + manifest.file]);
  assert.equal((await updateSharedGlossary(path, { fetcher })).updated, false);
  manifest.file = '../../private';
  await assert.rejects(updateSharedGlossary(path, { fetcher })); assert.deepEqual(readFileSync(path), bytes);
  manifest.file = `releases/${sha}.json`; writeFileSync(path, old);
  await assert.rejects(updateSharedGlossary(path, { fetcher: async url => url.endsWith('latest.json') ? Response.json(manifest) : new Response('bad') }));
  assert.equal(readFileSync(path, 'utf8'), old);
});
test('personal runner pairs once, isolates guilds, sends no API key, and reuses results after a transport failure', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zzz-broker-')), broker = new RunnerBroker(join(dir, 'broker.sqlite'), { timeoutMs: 1000 });
  const server = runnerServer(broker); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(done => server.close(done)); broker.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`, config = { provider: 'gemini', model: 'gemini-3.1-flash-lite', dailyLimit: 2, apiKey: 'DO-NOT-SEND-API-KEY' };
  const code = broker.code('guild-one'), client = new RunnerClient(join(dir, 'connection.json'), { fetcher: async (url, init) => {
    assert(!init.body.includes(config.apiKey)); assert(!(init.headers.Authorization || '').includes(config.apiKey)); return fetch(url, init);
  } });
  await client.pair(origin, code, config); await assert.rejects(client.pair(origin, code, config));
  assert.equal(broker.status('guild-one').online, false); await client.poll(config);
  assert.equal(broker.status('guild-one').online, true); assert.equal(broker.status('guild-two').configured, false);
  const result = broker.translate('guild-one', { text: 'Perfect Dodge', sourceLanguage: 'en', targets: ['ko'], context: [{ speaker: 'PRIVATE-DISCORD-ID', text: 'Dodge', language: 'en' }] });
  const job = await client.poll(config); assert(!JSON.stringify(job).includes('PRIVATE-DISCORD-ID'));
  assert.equal(await client.poll(config), null);
  assert.deepEqual(broker.complete('guild-two', { id: job.id, output: { ko: 'wrong' } }), { accepted: false });
  let translations = 0, completions = 0;
  await processRunnerJob({ complete: async (...args) => { if (++completions === 1) throw new Error('network'); return client.complete(...args); } }, job, { translate: async () => { translations++; return { ko: '극한 회피' }; } });
  assert.deepEqual(await result, { ko: '극한 회피' }); assert.equal(translations, 1); assert.equal(completions, 2);
  assert(!readFileSync(join(dir, 'broker.sqlite')).includes(Buffer.from(config.apiKey)));
  broker.disconnect('guild-one'); await assert.rejects(client.poll(config));
  for (const url of ['http://remote.example', 'https://a:b@example.test', 'https://example.test/path']) assert.throws(() => runnerOrigin(url));
});
test('runner disconnect, expiry and failed translation do not requeue a charged API request', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'zzz-broker-expire-')); let at = 1;
  const broker = new RunnerBroker(join(dir, 'broker.sqlite'), { now: () => at, timeoutMs: 10 });
  const config = { provider: 'gemini', model: 'gemini-3.1-flash-lite', dailyLimit: 2 }, code = broker.code('one'); at += 600001;
  assert.throws(() => broker.pair(code, config));
  const credential = broker.pair(broker.code('one'), config); assert.equal(broker.authenticate(credential), 'one'); broker.poll('one', config);
  const promise = broker.translate('one', { text: 'Dodge', sourceLanguage: 'en', targets: ['ko'] });
  const rejection = assert.rejects(promise, /자동 재요청/); broker.poll('one', config); await rejection;
  assert.equal(broker.poll('one', config), null);
  const next = broker.translate('one', { text: 'Dodge', sourceLanguage: 'en', targets: ['ko'] }); const rejected = assert.rejects(next, /개인 번역 프로그램/);
  broker.complete('one', { id: broker.poll('one', config).id, error: true }); await rejected; broker.close();
});

test('one manager persists several server profiles without key clobbering; changing one keeps other runners running', async () => {
  const root = mkdtempSync(join(tmpdir(), 'zzz-multi-runner-')), children = [];
  const spawnChild = (...args) => { const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); child.kill = () => { queueMicrotask(() => child.emit('exit', 0)); return true; }; child.args = args; children.push(child); return child; };
  const manager = new RunnerProfiles(root, { spawnChild }), first = manager.state().profileId;
  const second = manager.editProfile({ action: 'create', name: 'Friends' }).profileId;
  const third = manager.editProfile({ action: 'create', name: 'Another server' }).profileId;
  const keyA = 'AIza-own-first-key-for-test-12345', keyB = 'AIza-own-second-key-for-test-67890';
  for (const [id, apiKey] of [[first,keyA],[second,keyA],[third,keyB]]) {
    manager.save({ provider:'gemini', model:'gemini-3.1-flash-lite', apiKey, dailyLimit:10, locale:'en' }, id);
    const profile=manager.profile(id); mkdirSync(profile.folder,{recursive:true}); writeFileSync(join(profile.folder,'connection.json'), JSON.stringify({origin:'https://example.test',token:'a'.repeat(64)}));
  }
  const restored = new RunnerProfiles(root);
  assert.equal(restored.vault.get(first).apiKey,keyA); assert.equal(restored.vault.get(second).apiKey,keyA); assert.equal(restored.vault.get(third).apiKey,keyB);
  for(const id of [first,second,third])manager.start(id);
  manager.stop(second); await Promise.resolve();
  manager.save({ provider:'gemini',model:'gemini-3.1-flash-lite',apiKey:keyB,dailyLimit:7 },second);
  assert.equal(manager.profile(first).state().running,true); assert.equal(manager.profile(third).state().running,true);
  assert.equal(manager.vault.get(first).apiKey,keyA); assert.equal(manager.vault.get(second).apiKey,keyB); assert.equal(manager.vault.get(second).dailyLimit,7);
  assert(!JSON.stringify(manager.state()).includes(keyA)); assert(!JSON.stringify(manager.state()).includes(keyB));
  assert(!children[0].args[1].join(' ').includes(keyA));
  manager.stopAll(); await Promise.resolve();
});
test('PC settings stay encrypted locally; UI state never returns an API key and changes require stopping', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'zzz-runner-ui-')), ui = new RunnerUi(dir);
  const secret = 'AIza-local-only-example-key-12345';
  const saved = ui.save({ provider: 'gemini', model: 'gemini-3.1-flash-lite', apiKey: secret, dailyLimit: 20, locale: 'ko' });
  assert.equal(saved.settings.keySaved, true); assert(!JSON.stringify(saved).includes(secret));
  assert(!readFileSync(join(dir, 'data/runner-ui/settings.json'), 'utf8').includes(secret));
  assert.equal(ui.save({ ...saved.settings, apiKey: '' }).settings.keySaved, true);
  const restored = new RunnerUi(dir); assert.equal(restored.state().settings.keySaved, true);
  ui.child = { kill() {} }; assert.throws(() => ui.save({ ...saved.settings, apiKey: '' })); ui.stop();
  const { server } = runnerUiServer(ui, { secret: 'test-ui-token' }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(done => server.close(done)); });
  const url = `http://127.0.0.1:${server.address().port}/api/state`;
  assert.equal((await fetch(url)).status, 403);
  assert.equal((await fetch(url, { headers: { 'X-Runner-Session': 'test-ui-token', Origin: 'https://attacker.example' } })).status, 403);
  const response = await fetch(url, { headers: { 'X-Runner-Session': 'test-ui-token' } }); assert.equal(response.status, 200); assert(!(await response.text()).includes(secret));
  for (const locale of ['ko', 'en', 'ja', 'zh-CN']) {
    assert(runnerText(locale, 'api').length); assert(runnerText(locale, 'connect', { code: 'test', url: 'https://example.test', guide: 'guide' }).includes('test'));
  }
});
