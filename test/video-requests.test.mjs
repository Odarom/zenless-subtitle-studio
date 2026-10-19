import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sentenceCues, translationPlan } from '../video/translation-plan.mjs';
import { RequestGate } from '../video/request-gate.mjs';
import { translateBatch, videoGlossary } from '../video/translation.mjs';
import { deepLTranslation, protectDeepLTerms } from '../video/providers.mjs';
import { compactVideoGlossary } from '../video/glossary-payload.mjs';
import { geminiLimitError } from '../video/gemini-limits.mjs';

function expandGlossary(value) {
  if (Array.isArray(value)) return value;
  assert.equal(value.format, 'shared-fields-v1');
  return value.entries.map(entry => Object.fromEntries(Object.entries(entry).map(([key, item]) => key.endsWith('Ref') && Object.hasOwn(value.shared, key.slice(0, -3)) ? [key.slice(0, -3), value.shared[key.slice(0, -3)][item]] : [key, item])));
}

test('local sentence grouping joins incomplete speech across screen cues and retains screen positions', () => {
  const cues = [{ id: '1', startMs: 0, endMs: 2000, sourceText: 'Use Quick Assist after' }, { id: '2', startMs: 500, endMs: 3000, sourceText: 'EX Special Attack', kind: 'screen', region: { x: .1, y: .2, w: .3, h: .1 } }, { id: '3', startMs: 2100, endMs: 4000, sourceText: 'the EX Special Attack.' }, { id: '4', startMs: 4500, endMs: 6000, sourceText: 'Save the next attack.' }];
  const result = sentenceCues(cues);
  assert.equal(result.length, 3); assert.equal(result[0].sourceText, 'Use Quick Assist after the EX Special Attack.');
  assert.equal(result[0].startMs, 0); assert.equal(result[0].endMs, 4000); assert.deepEqual(result[1].region, cues[1].region);
});
test('normal video sends all speech, screen text and glossary in one API request', async () => {
  const cues = Array.from({ length: 100 }, (_, i) => ({ id: String(i + 1), startMs: i * 4000, endMs: i * 4000 + 3500, sourceText: `Use Quick Assist ${i + 1}.`, ...(i % 2 ? { kind: 'screen' } : {}) }));
  const config = { provider: 'gemini', model: 'gemini-3.1-flash-lite', apiKey: 'DUMMY', maxOutputTokens: 65536, timeoutMs: 1000, dailyLimit: 100 };
  const plan = translationPlan(cues, config); assert.equal(plan.requests, 1);
  let calls = 0;
  const result = await translateBatch({ allCues: cues, batch: plan.batches[0], options: { sourceLanguage: 'en', targetLanguage: 'ko' }, config, glossaryPath: 'glossary/zzz.json', usage: { reserve: () => 'day', record: () => {} }, fetcher: async (url, init) => {
    calls++; const body = JSON.parse(init.body), data = JSON.parse(body.contents[0].parts[0].text);
    data.glossary = expandGlossary(data.glossary);
    assert.equal(data.cues.length, 100); assert(data.glossary.some(term => term.preferred.en === 'Quick Assist')); assert(data.cues.some(c => c.kind === 'screen'));
    assert.equal(data.glossary.length, JSON.parse(readFileSync('glossary/zzz.json')).entries.length);
    assert(data.glossary.every(term => Array.isArray(term.aliases))); assert(!Object.hasOwn(data.glossary[0], 'sources'));
    assert(body.systemInstruction.parts[0].text.includes('generates SRT/VTT/project files in code'));
    return { ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ cues: data.cues.map(c => ({ id: c.id, text: '빠른 지원' })) }) }] } }] }) };
  } });
  assert.equal(calls, 1); assert.equal(result.length, 100); assert.equal(result[99].endMs, cues[99].endMs);
});

test('full glossary transport preserves every entry and rule while deduplicating only repeated values', () => {
  const glossary = videoGlossary([{ sourceText: 'Quick Assist.' }], { sourceLanguage: 'ja', targetLanguage: 'ko', style: 'community' }, 'glossary/zzz.json');
  const original = JSON.parse(JSON.stringify(glossary)), compact = compactVideoGlossary(glossary);
  assert.deepEqual(expandGlossary(compact), original);
  assert(Buffer.byteLength(JSON.stringify(compact)) < Buffer.byteLength(JSON.stringify(original)) * .6);
  const checkNames = names => { for (const lang of Object.keys(names || {})) assert(['ja', 'ko'].includes(lang)); };
  for (const entry of glossary) { checkNames(entry.preferred); checkNames(entry.characterName); checkNames(entry.relatedSkills); }
  assert.equal(compact.entries.length, 2314);
  assert(original.some(entry => entry.autoUse === false));
  assert(original.some(entry => entry.releaseStatus === 'prerelease'));
});

test('Gemini quota details distinguish token, request, daily and zero limits without retaining untrusted messages', async () => {
  for (const [id, type, limit] of [['GenerateContentInputTokensPerModelPerMinute-FreeTier', 'input-tokens-minute', '250000'], ['GenerateRequestsPerMinutePerProjectPerModel-FreeTier', 'requests-minute', '15'], ['GenerateRequestsPerDayPerProjectPerModel-FreeTier', 'requests-day', '20'], ['GenerateRequestsPerDayPerProjectPerModel-FreeTier', 'requests-day', '0']]) {
    const error = await geminiLimitError(new Response(JSON.stringify({ error: { message: 'PRIVATE-CREDENTIAL-DO-NOT-STORE', details: [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: id, quotaValue: limit, quotaDimensions: { project: 'PRIVATE-PROJECT' } }] }, { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '38.5s' }] } })), 'gemini-3.1-flash-lite');
    assert.equal(error.apiLimit.limits[0].type, type); assert.equal(error.apiLimit.limits[0].limit, Number(limit));
    assert.equal(error.apiLimit.retryAfterSeconds, 38.5);
    assert(!JSON.stringify(error).includes('PRIVATE'));
    assert.match(error.message, limit === '0' ? /할당량을 0/ : type === 'input-tokens-minute' ? /분당 입력/ : type === 'requests-day' ? /하루 요청/ : /분당 요청/);
  }
  const fallback = await geminiLimitError(new Response('not json'), 'gemini-3.1-flash-lite');
  assert.equal(fallback.apiLimit.limits.length, 0); assert.match(fallback.message, /어떤 한도인지/);
});

test('videos default to all glossary entries; smaller model selection is explicit and included in preflight', () => {
  const cues = [{ id: '1', sourceText: 'Quick Assist.', startMs: 0, endMs: 2000 }];
  const all = videoGlossary(cues, { targetLanguage: 'ko' }, 'glossary/zzz.json');
  const related = videoGlossary(cues, { glossaryMode: 'relevant', targetLanguage: 'ko' }, 'glossary/zzz.json');
  assert(all.length > related.length); assert(all.some(term => term.rule && term.meaning));
  assert.match(protectDeepLTerms('Quick Assist', all, 'en', 'ko'), /<keep>빠른 지원<\/keep>/);
  assert.throws(() => translationPlan(cues, { provider: 'ollama' }, {}, all), /API를 호출하지 않았습니다/);
  assert.equal(translationPlan(cues, { provider: 'gemini', model: 'gemini-3.1-flash-lite' }, {}, all).requests, 1);
});
test('oversized single requests stop before any API call, splitting is explicit', () => {
  const cues = Array.from({ length: 100 }, (_, i) => ({ id: String(i + 1), sourceText: '긴 영상 번역 '.repeat(100), startMs: i * 1000, endMs: i * 1000 + 900 }));
  const config = { provider: 'openai', model: 'gpt-4.1-mini', maxOutputTokens: 32768 };
  assert.throws(() => translationPlan(cues, config), /API를 호출하지 않았습니다/);
  assert(translationPlan(cues, config, { translationMode: 'large-batches' }).requests > 1);
});
test('Gemini rate limits and explicit server failures do not trigger video retries', async () => {
  const cues = [{ id: '1', sourceText: 'Quick Assist.', startMs: 0, endMs: 2000 }];
  for (const status of [429, 503]) {
    let calls = 0;
    await assert.rejects(translateBatch({ allCues: cues, batch: cues, options: { sourceLanguage: 'en', targetLanguage: 'ko' }, config: { provider: 'gemini', model: 'gemini-3.1-flash-lite', apiKey: 'DUMMY', timeoutMs: 1000, maxOutputTokens: 1000, dailyLimit: 10 }, glossaryPath: 'glossary/zzz.json', usage: { reserve: () => 'day', record: () => {} }, fetcher: async () => { calls++; return { ok: false, status }; } }));
    assert.equal(calls, 1);
  }
});
test('request spacing survives restart without storing the API key and cancellation aborts waiting', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'zzz-rpm-')); t.after(() => rmSync(directory, { force: true, recursive: true }));
  let now = 100000, waited = 0; const options = { now: () => now, wait: async ms => { now += ms; waited += ms; } };
  const config = { provider: 'gemini', apiKey: 'SECRET-NEVER-STORE', requestsPerMinute: 1 };
  await new RequestGate(directory, options).enter(config);
  await new RequestGate(directory, options).enter(config); assert.equal(waited, 60000);
  assert(!readFileSync(join(directory, 'request-gate.json'), 'utf8').includes(config.apiKey));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(new RequestGate(directory, options).enter(config, { signal: controller.signal }), { name: 'AbortError' });
});
test('DeepL can translate more than 50 sentences in one XML document and recover all IDs', async () => {
  const payload = { wholeDocument: true, sourceLanguage: 'en', targetLanguage: 'ko', glossary: [], before: [], after: [], cues: Array.from({ length: 100 }, (_, i) => ({ id: String(i + 1), text: 'Sentence.' })) };
  let calls = 0;
  const result = await deepLTranslation({ model: 'deepl-free', apiKey: 'DUMMY', timeoutMs: 1000 }, payload, async (url, init) => {
    calls++; const body = JSON.parse(init.body); assert.equal(body.text.length, 1); assert.equal((body.text[0].match(/<c /g) || []).length, 100);
    return { ok: true, json: async () => ({ translations: [{ text: body.text[0].replaceAll('Sentence.', '문장입니다.') }] }) };
  });
  assert.equal(calls, 1); assert.equal(JSON.parse(result.output).cues.length, 100);
});
