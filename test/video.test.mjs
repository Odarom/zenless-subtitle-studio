import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import vm from 'node:vm';
import { parseSubtitles, serializeSubtitles, youtubeVideoId } from '../video/subtitles.mjs';
import { checkBatch } from '../video/translation.mjs';
import { createVideoServer } from '../video/server.mjs';
import { transcribeWithRuntime, tools } from '../video/media.mjs';
import { moduleFiles } from '../scripts/video-package.mjs';
import { translationPlan } from '../video/translation-plan.mjs';

const fixture = 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.500 align:start\n<c>Quick Assist</c> &amp; EX Special Attack\n\n2\n00:00:03.500 --> 00:00:05.000\n<00:00:03.600>Quick Assist &amp; EX Special Attack\n\n3\n00:00:05.000 --> 00:00:08.000\nDo not use 20 stacks.\n';
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
async function waitJob(jobs, id) { for (let i = 0; i < 500; i++) { const job = jobs.get(id); if (!['queued', 'running'].includes(job.status)) return job; await tick(); } throw new Error('test job timed out'); }
function setup(t, options = {}) {
  const testBase = fileURLToPath(new URL('../.tools/video-tests/', import.meta.url));
  mkdirSync(testBase, { recursive: true });
  const root = mkdtempSync(join(testBase, 'case-'));
  mkdirSync(join(root, 'glossary'), { recursive: true });
  writeFileSync(join(root, 'glossary', 'zzz.json'), JSON.stringify({ version: 1, entries: [{ id: 'quick', aliases: ['Quick Assist'], preferred: { en: 'Quick Assist', ko: '빠른 지원' }, communityPreferred: { ko: '빠지' }, category: 'combat-action', meaning: 'Quick Assist in ZZZ.', rule: 'Only for the combat action.' }] }));
  const app = createVideoServer({ root, token: 'a'.repeat(64), ...options, jobsOptions: { gate: { enter: async () => {} }, ...options.jobsOptions } });
  t.after(async () => {
    for (const job of app.jobs.jobs.values()) app.jobs.cancel(job.id);
    while (app.jobs.active) await tick();
    if (app.server.listening) await new Promise(resolve => app.server.close(resolve));
    const target = resolve(root), scoped = relative(resolve(testBase), target);
    if (!scoped || scoped.startsWith('..') || scoped.includes(':')) throw new Error('test cleanup target is outside its dedicated directory');
    rmSync(target, { recursive: true, force: true });
  });
  return { ...app, root };
}
const config = { provider: 'gemini', model: 'gemini-3-flash-preview', apiKey: 'test-key-not-real-12345678', dailyLimit: 100 };
const jobInput = { title: 'test', input: { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }, options: { sourceLanguage: 'en', targetLanguage: 'ko', style: 'official' } };

test('SRT/VTT round trips preserve timing, entities and repeated automatic captions', () => {
  const cues = parseSubtitles(fixture);
  assert.equal(cues.length, 2); assert.equal(cues[0].sourceText, 'Quick Assist & EX Special Attack');
  assert.equal(cues[0].startMs, 1000); assert.equal(cues[0].endMs, 5000);
  for (const format of ['srt', 'vtt']) assert.deepEqual(parseSubtitles(serializeSubtitles(cues, { format, mode: 'source' })), cues);
  assert.throws(() => parseSubtitles('1\n00:61:00,000 --> 00:62:00,000\nwrong'), /시간/);
  assert.throws(() => parseSubtitles('not subtitles'), /자막/);
  const rendered = serializeSubtitles([{ ...cues[0], translatedText: '<script>alert(1)</script>\n\ninjected --> cue' }]);
  assert(!rendered.includes('<script>')); assert(!rendered.includes('injected -->'));
  const rolling = parseSubtitles('WEBVTT\n\n00:00:00.000 --> 00:00:02.000\n<00:00:00.100>First line\n\n00:00:02.000 --> 00:00:04.000\nFirst line\n<00:00:02.100>Second line\n');
  assert.deepEqual(rolling.map(cue => cue.sourceText), ['First line', 'Second line']);
});
test('YouTube inputs reject arbitrary hosts and playlist-only links', () => {
  for (const value of ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ']) assert.equal(youtubeVideoId(value), 'dQw4w9WgXcQ');
  for (const value of ['http://127.0.0.1/private', 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ', 'https://youtube.com/playlist?list=secret', 'https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ']) assert.throws(() => youtubeVideoId(value));
});
test('translation rejects duplicate, missing and unknown cue IDs', () => {
  const batch = parseSubtitles(fixture);
  assert.throws(() => checkBatch({ cues: [{ id: '1', text: '번역' }] }, batch));
  assert.throws(() => checkBatch({ cues: [{ id: '1', text: '번역' }, { id: '1', text: '중복' }] }, batch));
  assert.throws(() => checkBatch({ cues: [{ id: '1', text: '번역' }, { id: 'unknown', text: '다른 구간' }] }, batch));
  const output = checkBatch({ cues: [{ id: '2', text: '20중첩을 사용하지 마세요.' }, { id: '1', text: '빠른 지원' }] }, batch);
  assert.equal(output[0].translatedText, '빠른 지원'); assert.equal(output[1].startMs, batch[1].startMs);
});
test('failed translation resumes from saved chunks, preserves timing and stores no plaintext key', async t => {
  const cues = Array.from({ length: 24 }, (_, index) => ({ id: String(index + 1), startMs: index * 4000, endMs: index * 4000 + 3500, sourceText: `Quick Assist ${index + 1}.` }));
  let requests = 0; const payloads = [];
  const app = setup(t, { jobsOptions: {
    plan: (cues, config, options, glossary) => translationPlan(cues, { ...config, maxOutputTokens: 1280 }, { ...options, translationMode: 'large-batches' }, glossary),
    prepare: async () => ({ cues, title: '전투 설명', origin: 'test' }),
    fetcher: async (url, init) => {
      requests++; const body = JSON.parse(init.body), payload = JSON.parse(body.contents[0].parts[0].text); payloads.push(payload);
      if (requests === 2) return { ok: false, status: 429 };
      return { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ cues: payload.cues.map(cue => ({ id: cue.id, text: `빠른 지원 ${cue.id}` })) }) }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 80 } }) };
    }
  } });
  app.settings.save(config);
  const created = app.jobs.create(jobInput); const failed = await waitJob(app.jobs, created.id);
  assert.equal(failed.status, 'failed'); assert.equal(failed.completedCues, 18); assert.equal(requests, 2);
  assert(payloads[0].glossary.some(term => (term.outputPreferred?.ko ?? term.preferred?.ko) === '빠른 지원'));
  assert(payloads[0].after.length); assert(payloads[1].before.length);
  app.jobs.resume(created.id); const completed = await waitJob(app.jobs, created.id);
  assert.equal(completed.status, 'completed'); assert.equal(requests, 3);
  assert.deepEqual(completed.cues.map(cue => [cue.startMs, cue.endMs]), cues.map(cue => [cue.startMs, cue.endMs]));
  assert(existsSync(join(app.jobs.directory(created.id), 'translated.srt')));
  assert(!readFileSync(join(app.jobs.dataDir, 'api-vault.json'), 'utf8').includes(config.apiKey));
  assert(!JSON.stringify(app.settings.public()).includes(config.apiKey));
  app.jobs.edit(created.id, [{ id: '1', translatedText: '직접 수정한 빠른 지원' }]);
  assert(readFileSync(join(app.jobs.directory(created.id), 'translated.srt'), 'utf8').includes('직접 수정한 빠른 지원'));
});
test('OpenAI uses structured output and the stored key without changing subtitle timestamps', async t => {
  const app = setup(t, { jobsOptions: { prepare: async () => ({ cues: parseSubtitles(fixture), origin: 'test' }), fetcher: async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses'); const request = JSON.parse(init.body);
    assert.equal(request.store, false); assert.equal(request.text.format.strict, true);
    const input = JSON.parse(request.input);
    return { ok: true, json: async () => ({ status: 'completed', usage: { input_tokens: 5, output_tokens: 5 }, output: [{ content: [{ type: 'output_text', text: JSON.stringify({ cues: input.cues.map(cue => ({ id: cue.id, text: cue.id === '1' ? '빠른 지원과 강화 특수 스킬' : '20중첩을 사용하지 마세요.' })) }) }] }] }) };
  } } });
  app.settings.save({ ...config, provider: 'openai', model: 'gpt-4.1' });
  const job = app.jobs.create(jobInput); assert.equal((await waitJob(app.jobs, job.id)).status, 'completed');
});
test('HTTP API protects keys and jobs, accepts file input, and exports only finished subtitles', async t => {
  const app = setup(t); app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const headers = { Authorization: `Bearer ${app.token}` };
  assert.equal((await fetch(`${base}/api/jobs`)).status, 401);
  assert.equal((await fetch(`${base}/api/session`, { headers: { 'X-ZZZ-Local': '1', Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await fetch(`${base}/api/session`, { headers: { 'X-ZZZ-Local': '1', Origin: 'chrome-extension://' + 'a'.repeat(32) } })).status, 403);
  const session = await fetch(`${base}/api/session`, { headers: { 'X-ZZZ-Local': '1' } }); assert.equal((await session.json()).token, app.token);
  const upload = await fetch(`${base}/api/uploads?name=example.vtt`, { method: 'POST', headers, body: fixture }); const file = await upload.json(); assert.equal(upload.status, 201);
  const response = await fetch(`${base}/api/jobs`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ input: { fileId: file.id }, options: { transcribeOnly: true } }) });
  const job = await response.json(); assert.equal(response.status, 202);
  assert.equal((await waitJob(app.jobs, job.id)).status, 'completed');
  const exported = await fetch(`${base}/api/jobs/${job.id}/export?format=srt&mode=source`, { headers }); assert.equal(exported.status, 200); assert.equal(parseSubtitles(await exported.text()).length, 1);
  const evil = await fetch(`${base}/api/jobs`, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(evil.status, 403);
  assert.equal((await fetch(`${base}/api/uploads?name=run.exe`, { method: 'POST', headers, body: 'x' })).status, 400);
});
test('YouTube overlay follows seeking, offset, ads and video navigation with text-only rendering', () => {
  let listener, frame;
  class Element {
    constructor() { this.children = []; this.style = {}; this.classes = new Set(); this.classList = { contains: value => this.classes.has(value) }; }
    append(...children) { for (const child of children) { child.parentNode = this; this.children.push(child); } }
    remove() { this.parentNode?.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; }
    setAttribute() {} attachShadow() { this.shadow = new Element(); return this.shadow; }
    querySelector() { return video; }
  }
  const video = { currentTime: 1.5 }, player = new Element(), location = { href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };
  const runtime = { id: 'test-extension', onMessage: { addListener(fn) { listener = fn; } } };
  const context = { URL, location, chrome: { runtime }, document: { querySelector: () => player, createElement: () => new Element() }, requestAnimationFrame: callback => { frame = callback; } };
  vm.runInNewContext(readFileSync(new URL('../video/extension/content.js', import.meta.url), 'utf8'), context);
  const send = message => { let result; listener(message, { id: runtime.id }, response => { result = response; }); return result; };
  assert(send({ type: 'ZZZ_SUBTITLES_LOAD', videoId: 'different', cues: [] }).error);
  send({ type: 'ZZZ_SUBTITLES_LOAD', videoId: 'dQw4w9WgXcQ', cues: [{ startMs: 1000, endMs: 3000, sourceText: 'Quick Assist', translatedText: '<img src=x onerror=alert(1)>' }], settings: { offsetMs: 0 } });
  frame(1000); const host = player.children[0], label = host.shadow.children[1].children[0]; assert.equal(label.textContent, '<img src=x onerror=alert(1)>'); assert.equal(host.hidden, false);
  video.currentTime = 4; frame(1500); assert.equal(host.hidden, true);
  video.currentTime = 1.5; frame(2000); assert.equal(host.hidden, false);
  player.classes.add('ad-showing'); frame(2500); assert.equal(host.hidden, true); player.classes.clear();
  frame(2600); assert.equal(host.hidden, false);
  send({ type: 'ZZZ_SUBTITLES_SETTINGS', settings: { offsetMs: 2000 } }); frame(3000); assert.equal(host.hidden, true);
  location.href = 'https://www.youtube.com/watch?v=abcdefghijk'; frame(3500); assert.equal(player.children.length, 0);
});

test('automatic speech mode retries on CPU after GPU failure, explicit modes and cancellation do not', async () => {
  const t = { whisperVulkan: 'gpu.exe', whisperCpu: 'cpu.exe', model: 'model.bin', vadModel: null };
  const calls = [];
  const base = { t, wav: 'audio.wav', output: 'out', signal: new AbortController().signal };
  const run = async (exe, args) => { calls.push({ exe, args }); if (exe === 'gpu.exe') throw new Error('Vulkan unavailable'); return {}; };
  const result = await transcribeWithRuntime({ ...base, options: { sourceLanguage: 'en', speechDevice: 'auto' }, run });
  assert.equal(result.speechBackend, 'cpu'); assert.deepEqual(calls.map(call => call.exe), ['gpu.exe', 'cpu.exe']); assert(calls[1].args.includes('-ng'));
  calls.length = 0;
  await transcribeWithRuntime({ ...base, options: { sourceLanguage: 'en', speechDevice: 'cpu' }, run });
  assert.deepEqual(calls.map(call => call.exe), ['cpu.exe']);
  calls.length = 0;
  await assert.rejects(transcribeWithRuntime({ ...base, options: { sourceLanguage: 'en', speechDevice: 'vulkan' }, run }), /Vulkan/); assert.equal(calls.length, 1);
  const controller = new AbortController(); calls.length = 0;
  await assert.rejects(transcribeWithRuntime({ ...base, signal: controller.signal, options: { sourceLanguage: 'en', speechDevice: 'auto' }, run: async exe => { calls.push(exe); controller.abort(); throw new Error('cancel'); } }), { name: 'AbortError' });
  assert.deepEqual(calls, ['gpu.exe']);
});
test('hardware settings work without an API key and survive later key registration', t => {
  const app = setup(t);
  app.settings.saveSpeech({ speechDevice: 'cpu', speechThreads: 2 });
  assert.equal(app.settings.public().hasKey, false);
  app.settings.save(config); assert.equal(app.settings.public().speechDevice, 'cpu'); assert.equal(app.settings.public().speechThreads, 2);
  assert.throws(() => app.settings.saveSpeech({ speechDevice: 'shell', speechThreads: 2 }));
});
test('CPU-only VAD initialization does not overwrite confirmed GPU speech execution', async () => {
  const result = await transcribeWithRuntime({ t: { whisperVulkan: 'gpu.exe', whisperCpu: 'cpu.exe', model: 'model.bin' }, options: { sourceLanguage: 'en', speechDevice: 'auto' }, wav: 'audio.wav', output: 'out', run: async (exe, args, options) => {
    options.onText('whisper_backend_init_gpu: using Vulkan0 backend\n');
    options.onText('whisper_backend_init_gpu: no GPU found\nprogress = 95%');
    return {};
  } });
  assert.equal(result.speechBackend, 'vulkan'); assert.equal(result.runtime, 'Vulkan 그래픽 가속');
});
test('external package module graph includes runtime dependencies without Discord entry points', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const files = moduleFiles(root, ['video/server.mjs', 'scripts/video-launch.mjs', 'scripts/video-setup.mjs']).map(file => file.replace(/\\/g, '/'));
  assert(files.includes('src/translator.js')); assert(files.includes('video/downloads.mjs')); assert(files.includes('video/jobs.mjs'));
  assert(!files.includes('src/index.js')); assert(!files.some(file => /node_modules|\.secrets|\.env|reports\//.test(file)));
});
