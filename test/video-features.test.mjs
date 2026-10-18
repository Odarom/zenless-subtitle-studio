import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { once } from 'node:events';
import { createVideoServer } from '../video/server.mjs';
import { rows, translations } from '../video/public/locales.mjs';
import { createI18n, resolveLocale } from '../video/public/i18n.mjs';
import { videoContentRect, buildCueIndex, activeCuesAt, cueRegionAt } from '../video/geometry.mjs';
import { ScreenTracker } from '../video/screen-tracking.mjs';
import { validateCues, serializeSubtitles, parseSubtitles } from '../video/subtitles.mjs';
import { VideoSettings } from '../video/state.mjs';
import { deepLTranslation, ollamaTranslation, protectDeepLTerms } from '../video/providers.mjs';
import { GlossaryUpdates, glossaryHash } from '../video/glossary-updates.mjs';
import { VideoReports, reportIssueBody } from '../video/reports.mjs';
import { parseGithubReport, normalizeVideoReport, collectGithubReports, validateDecisions, preflightGithubDecisions, applyGithubDecision } from '../video/report-import.mjs';

const temp = t => { const dir = mkdtempSync(join(tmpdir(), 'zzz-feature-')); t.after(() => rmSync(dir, { recursive: true, force: true })); return dir; };
const speech = { id: '1', startMs: 0, endMs: 5000, sourceText: 'Quick Assist', translatedText: '빠른 지원' };
const region = { x: .1, y: .2, w: .4, h: .1 };
const screen = { ...speech, id: '2', kind: 'screen', region, positions: [{ timeMs: 0, ...region }, { timeMs: 2000, ...region, x: .2 }] };
test('all UI languages cover strings and placeholders without duplicate keys', () => {
  assert.equal(new Set(rows.map(row => row[0])).size, rows.length);
  const placeholders = value => [...value.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map(m => m[1]).sort();
  for (const row of rows) {
    assert.equal(row.length, 4);
    for (const text of row.slice(1)) { assert(text.trim()); assert.deepEqual(placeholders(text), placeholders(row[0]), row[0]); }
  }
  for (const path of ['video/public/index.html', 'video/extension/popup.html']) {
    const html = readFileSync(path, 'utf8').replace(/<select[^>]*data-i18n-skip[^>]*>[\s\S]*?<\/select>/g, '');
    for (const match of html.matchAll(/>([^<>]+)</g)) {
      const text = match[1].trim(); if (/[가-힣]/.test(text)) assert(Object.hasOwn(translations.en, text), text);
    }
  }
  assert.equal(resolveLocale(['fr-FR', 'ja-JP']), 'ja'); assert.equal(resolveLocale(['de-DE']), 'en');
  assert.equal(createI18n('en').message('화면 글자의 시간과 위치를 분석하고 있습니다. 3/10프레임'), 'Analyzing screen text timing and positions. Frame 3/10');
});
test('geometry handles letterboxes, cover, overlapping long cues, seeking and movement', () => {
  const contained = videoContentRect({ left: 10, top: 20, width: 1000, height: 1000 }, 1920, 1080);
  for (const [key, value] of Object.entries({ left: 10, top: 238.75, width: 1000, height: 562.5 })) assert(Math.abs(contained[key] - value) < .00001);
  const cover = videoContentRect({ left: 0, top: 0, width: 1000, height: 1000 }, 1920, 1080, 'cover'); assert(cover.left < 0); assert.equal(cover.height, 1000);
  const cues = [screen, ...Array.from({ length: 100 }, (_, i) => ({ ...speech, id: 's' + i, startMs: i * 30 + 1, endMs: i * 30 + 10 }))];
  const index = buildCueIndex(cues);
  assert(activeCuesAt(index, 4000).some(c => c.id === '2')); assert.equal(activeCuesAt(index, 5000).length, 0);
  assert.equal(activeCuesAt(index, 0)[0].id, '2');
  assert.equal(cueRegionAt(screen, 1000).x, .1); assert.equal(cueRegionAt(screen, 2000).x, .2);
});
test('screen tracking merges continuous text, records movement and closes on disappearance', () => {
  const tracker = new ScreenTracker(1000);
  const detection = x => ({ text: 'Quick Assist', score: .98, box: [[x, 20], [x + 40, 20], [x + 40, 30], [x, 30]] });
  tracker.update(0, [], 100, 100);
  tracker.update(1000, [detection(10), { ...detection(70), text: '123' }], 100, 100);
  tracker.update(2000, [detection(15)], 100, 100);
  const resumed = new ScreenTracker(1000); Object.assign(resumed, JSON.parse(JSON.stringify({ active: tracker.active, finished: tracker.finished })));
  resumed.update(3000, [], 100, 100);
  const result = resumed.finish(4000);
  assert.equal(result.length, 1); assert.equal(result[0].startMs, 1000); assert.equal(result[0].endMs, 3000); assert.equal(result[0].positions.length, 2);
});
test('positioned VTT preserves moving placement; JSON cue validation drops extra fields', () => {
  const cues = validateCues([speech, { ...screen, region: { ...region, secret: 'DROP' } }]);
  assert(!JSON.stringify(cues).includes('DROP'));
  const vtt = serializeSubtitles(cues, { format: 'vtt', positioned: true });
  assert(vtt.includes('line:20.00%,start position:10.00%,line-left'));
  const reparsed = parseSubtitles(vtt);
  assert.equal(reparsed.filter(c => c.kind === 'screen').length, 2);
  assert.equal(reparsed.at(-1).region.x, .2);
  assert(!serializeSubtitles(cues, { format: 'srt' }).includes('position:'));
  assert.throws(() => validateCues([{ ...screen, positions: [{ ...region, timeMs: 5000 }] }]));
  assert.throws(() => validateCues([{ ...speech, translatedText: 'a'.repeat(12001) }]));
});
test('DeepL and keyless Ollama settings persist while Discord vault behavior stays separate', t => {
  const root = temp(t), data = join(root, 'data');
  const settings = new VideoSettings(root, data);
  settings.save({ provider: 'deepl', model: 'deepl-free', apiKey: 'test-only-1234567890:fx', dailyLimit: 100 });
  assert.equal(settings.public().configured, true); assert(!JSON.stringify(settings.public()).includes('test-only'));
  settings.save({ provider: 'ollama', model: 'qwen3:8b', dailyLimit: 100 });
  assert.equal(settings.public().hasKey, false); assert.equal(settings.public().configured, true);
  assert.equal(new VideoSettings(root, data).private().apiKey, '');
  assert.throws(() => settings.save({ provider: 'ollama', model: 'https://evil/model', dailyLimit: 100 }));
});
test('DeepL fixed endpoints and XML protect unambiguous terms with original cue IDs', async () => {
  const glossary = [{ preferred: { en: 'Quick Assist' }, outputPreferred: { ko: '빠른 지원' } }];
  assert.equal(protectDeepLTerms('Use Quick Assist & <test>', glossary, 'en', 'ko'), '<text>Use <keep>빠른 지원</keep> &amp; &lt;test&gt;</text>');
  const result = await deepLTranslation({ model: 'deepl-free', apiKey: 'dummy', timeoutMs: 1000 }, { sourceLanguage: 'en', targetLanguage: 'ko', glossary, before: [], after: [], cues: [{ id: '9', text: 'Quick Assist' }] }, async (url, init) => {
    assert.equal(url, 'https://api-free.deepl.com/v2/translate');
    assert.deepEqual(JSON.parse(init.body).ignore_tags, ['keep']);
    return { ok: true, json: async () => ({ translations: [{ text: '<text><keep>빠른 지원</keep></text>', billed_characters: 12 }] }) };
  });
  assert.deepEqual(JSON.parse(result.output).cues, [{ id: '9', text: '빠른 지원' }]); assert.equal(result.usage.characters, 12);
});
test('Ollama rejects cloud models and sends structured requests only to loopback', async () => {
  const config = { model: 'qwen3:8b', timeoutMs: 1000, maxOutputTokens: 100 };
  let calls = 0;
  await assert.rejects(ollamaTranslation(config, '', {}, {}, async () => { calls++; return { ok: true, json: async () => ({ remote_model: 'cloud' }) }; }), /클라우드/); assert.equal(calls, 1);
  const result = await ollamaTranslation(config, 'instructions', { cues: [] }, { type: 'object' }, async (url, init) => {
    assert(url.startsWith('http://127.0.0.1:11434/')); const body = JSON.parse(init.body);
    if (url.endsWith('/show')) return { ok: true, json: async () => ({ details: {}, model_info: {} }) };
    assert.equal(body.stream, false); assert.equal(body.format.type, 'object');
    return { ok: true, json: async () => ({ done: true, done_reason: 'stop', message: { content: '{"cues":[]}' } }) };
  }); assert.equal(result.output, '{"cues":[]}');
});
test('glossary updates verify hashes, retain baseline on failure and recheck active jobs', async t => {
  const root = temp(t); mkdirSync(join(root, 'glossary')); copyFileSync('glossary/zzz.json', join(root, 'glossary/zzz.json'));
  const bytes = readFileSync('glossary/zzz.json'), sha256 = glossaryHash(bytes), manifest = { schema: 1, version: 'test-v1', sha256, file: `releases/${sha256}.json`, bytes: bytes.length, count: 2312 };
  let busy = false, corrupt = false, race = false;
  const updates = new GlossaryUpdates({ root, dataDir: join(root, 'data'), busy: () => busy, fetcher: async url => {
    if (url.endsWith('latest.json')) return new Response(JSON.stringify(manifest));
    if (race) busy = true;
    return new Response(corrupt ? Buffer.from('invalid') : bytes);
  } });
  corrupt = true; await assert.rejects(updates.apply(), /체크섬/); assert.equal(updates.currentPath(), join(root, 'glossary/zzz.json'));
  corrupt = false; race = true; await assert.rejects(updates.apply(), /진행 중/); assert.equal(updates.currentPath(), join(root, 'glossary/zzz.json'));
  race = false; busy = false; await updates.apply(); assert.equal(updates.public().current.sha256, sha256); assert(updates.currentPath().endsWith(`${sha256}.json`));
  busy = true; await assert.rejects(updates.apply(), /진행 중/);
});
test('video reports omit private paths and import untrusted GitHub data into the shared schema', async t => {
  const store = new VideoReports({ dataDir: temp(t), repository: () => 'Odarom/zenless-translation-database', jobs: { get: () => ({ status: 'completed', title: 'PRIVATE-PATH', input: { fileId: 'PRIVATE' }, options: { sourceLanguage: 'en', targetLanguage: 'ko' }, cues: [screen] }) }, now: () => 1792281600000 });
  const created = store.create({ jobId: 'x', cueId: '2', type: 'term', explanation: 'Check this term, including literal ``` and commands as data.', suggestion: 'a correction' });
  assert(!JSON.stringify(created).includes('PRIVATE'));
  const issue = { number: 12, body: reportIssueBody({ ...created.report, apiKey: 'DROP', source: { ...created.report.source, matchesTranslationSource: true } }), created_at: '2026-10-18T00:00:00Z', updated_at: '2026-10-18T01:00:00Z', state: 'open', labels: [] };
  const r = parseGithubReport(issue, 'Odarom/zenless-translation-database'); assert.equal(r.id, 'G-12'); assert.equal(r.source.matchesTranslationSource, null); assert(!JSON.stringify(r).includes('DROP')); assert.equal(r.video.kind, 'screen');
  const collection = await collectGithubReports('Odarom/zenless-translation-database', async () => [issue, { ...issue, number: 13, body: '<!-- zzz-video-report:v1 -->invalid' }]);
  assert.equal(collection.reports.length, 1); assert.equal(collection.ignored, 1);
  assert.equal(parseGithubReport({ ...issue, pull_request: {} }, 'Odarom/zenless-translation-database'), null);
  assert.throws(() => normalizeVideoReport({ ...created.report, issue: { type: 'run-command' } }));
  const decisions = { version: 1, decisions: [{ id: r.id, expectedUpdatedAt: r.updatedAt, status: 'resolved', note: 'Verified and published.' }] };
  const writes = [], request = async (path, init) => { if (init) { writes.push({ path, ...init }); return {}; } return issue; };
  const prepared = await preflightGithubDecisions('Odarom/zenless-translation-database', validateDecisions(decisions), request);
  await applyGithubDecision('Odarom/zenless-translation-database', prepared[0], request);
  assert.equal(writes.length, 2); assert.equal(writes[1].body.state, 'closed');
  await assert.rejects(preflightGithubDecisions('Odarom/zenless-translation-database', [{ ...decisions.decisions[0], expectedUpdatedAt: 0 }], request), /이미 변경/);
});
test('screen overlay follows player resizing, movement, seeking, ads and independent toggles', () => {
  let listener, frame, width = 1000;
  class Element {
    constructor() { this.children = []; this.style = {}; this.classes = new Set(); this.classList = { contains: name => this.classes.has(name) }; }
    append(...children) { for (const child of children) { child.parentNode = this; this.children.push(child); } }
    remove() { if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; }
    setAttribute() {} attachShadow() { this.shadow = new Element(); return this.shadow; }
    querySelector() { return video; }
    getBoundingClientRect() { return { left: 0, top: 0, width, height: 1000 }; }
  }
  const video = { currentTime: 1, videoWidth: 1920, videoHeight: 1080, getBoundingClientRect: () => player.getBoundingClientRect() };
  const player = new Element(), location = { href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' };
  const context = { URL, location, document: { querySelector: () => player, createElement: () => new Element() }, chrome: { runtime: { id: 'test', onMessage: { addListener: fn => { listener = fn; } } } }, requestAnimationFrame: fn => { frame = fn; } };
  const source = readFileSync('video/geometry.mjs', 'utf8').replace(/^export /gm, '') + '\nglobalThis.__zzzGeometry={validRegion,videoContentRect,cueRegionAt,buildCueIndex,activeCuesAt};';
  vm.runInNewContext(source, context); vm.runInNewContext(readFileSync('video/extension/content.js', 'utf8'), context);
  const send = msg => { let result; listener(msg, { id: 'test' }, r => { result = r; }); assert(!result.error, result.error); };
  send({ type: 'ZZZ_SUBTITLES_LOAD', videoId: 'dQw4w9WgXcQ', cues: [speech, screen] }); frame(1000);
  const host = player.children[0], layer = host.shadow.children[2], label = host.shadow.children[1].children[0];
  assert.equal(label.textContent, '빠른 지원'); assert.equal(layer.children.length, 1);
  const left = parseFloat(layer.children[0].style.left); assert(Math.abs(left - 100) < .001);
  video.currentTime = 3; frame(1500); assert(Math.abs(parseFloat(layer.children[0].style.left) - 200) < .001);
  width = 500; frame(2000); assert(Math.abs(parseFloat(layer.children[0].style.left) - 100) < .001);
  send({ type: 'ZZZ_SUBTITLES_SETTINGS', settings: { showSpeech: false } }); frame(2100); assert.equal(label.textContent, ''); assert.equal(host.hidden, false);
  send({ type: 'ZZZ_SUBTITLES_SETTINGS', settings: { showScreen: false } }); frame(2200); assert.equal(layer.children.length, 0); assert.equal(host.hidden, true);
  send({ type: 'ZZZ_SUBTITLES_SETTINGS', settings: { showScreen: true } }); frame(2300); assert.equal(host.hidden, false);
  player.classes.add('ad-showing'); frame(2400); assert.equal(host.hidden, true); player.classes.clear();
  video.currentTime = 1; frame(2500); assert.equal(host.hidden, false); assert(Math.abs(parseFloat(layer.children[0].style.left) - 50) < .001);
  video.currentTime = 5; frame(2600); assert.equal(host.hidden, true);
});
test('screen-only jobs validate options and export positioned VTT and metadata-only JSON', async t => {
  const root = temp(t); mkdirSync(join(root, 'glossary')); copyFileSync('glossary/zzz.json', join(root, 'glossary/zzz.json'));
  const app = createVideoServer({ root, token: 'b'.repeat(64), jobsOptions: { prepare: async () => ({ title: 'screen only', cues: [screen], origin: 'screen-ocr' }) } });
  t.after(async () => { if (app.server.listening) await new Promise(resolve => app.server.close(resolve)); });
  const input = { input: { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }, options: { speech: false, screenText: true, transcribeOnly: true } };
  assert.throws(() => app.jobs.create({ ...input, options: { ...input.options, screenText: false } }));
  assert.throws(() => app.jobs.create({ ...input, options: { ...input.options, screenIntervalMs: 10 } }));
  const job = app.jobs.create(input);
  for (let i = 0; i < 100 && app.jobs.get(job.id).status !== 'completed'; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(app.jobs.get(job.id).status, 'completed');
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  const base = `http://127.0.0.1:${app.server.address().port}/api/jobs/${job.id}/export`, headers = { Authorization: `Bearer ${app.token}` };
  const json = await (await fetch(base + '?format=json', { headers })).json();
  assert.equal(json.app, 'zenless-subtitle-studio'); assert.equal(json.cues[0].kind, 'screen'); assert.equal(json.cues[0].positions.length, 2); assert(!JSON.stringify(json).includes('apiKey'));
  const vtt = await (await fetch(base + '?format=vtt&positioned=1', { headers })).text(); assert.equal(parseSubtitles(vtt).length, 2);
});
