import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync, rmdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import vm from 'node:vm';
import { parseSubtitles, serializeSubtitles, youtubeVideoId } from '../video/subtitles.mjs';
import { checkBatch, translationKey, IncompleteTranslationError } from '../video/translation.mjs';
import { Jobs } from '../video/jobs.mjs';
import { createVideoServer } from '../video/server.mjs';
import { transcribeWithRuntime, tools, runTool } from '../video/media.mjs';
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
    app.videos.close();
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

test('quota failure records safe details and an empty legacy checkpoint resumes without transcribing again', async t => {
  let prepared = 0, requests = 0;
  const cues = [{ id: '1', startMs: 0, endMs: 2000, sourceText: 'Quick Assist.' }];
  const app = setup(t, { jobsOptions: {
    prepare: async () => { prepared++; return { cues, title: 'quota check', origin: 'test' }; },
    fetcher: async () => {
      requests++;
      if (requests === 1) return new Response(JSON.stringify({ error: { details: [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateContentInputTokensPerModelPerMinute-FreeTier', quotaValue: '250000' }] }] } }), { status: 429 });
      return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ cues: [{ id: '1', text: '빠른 지원.' }] }) }] } }] }));
    }
  } });
  app.settings.save(config);
  const created = app.jobs.create(jobInput), failed = await waitJob(app.jobs, created.id);
  assert.equal(requests, 1); assert.equal(failed.status, 'failed');
  assert.equal(failed.apiLimit.limits[0].type, 'input-tokens-minute');
  assert.equal(failed.apiLimit.limits[0].limit, 250000);
  const key = translationKey(failed.cues, { ...failed.options, ...failed.translationConfig, title: failed.title }, join(app.root, 'glossary/zzz.json'), 4);
  writeFileSync(join(app.jobs.directory(created.id), 'translation.json'), JSON.stringify({ key, cues: {} }));
  app.jobs.resume(created.id); const completed = await waitJob(app.jobs, created.id);
  assert.equal(completed.status, 'completed'); assert.equal(prepared, 1); assert.equal(requests, 2);
  assert.equal(completed.apiLimit, null); assert.equal(completed.cues[0].translatedText, '빠른 지원.');
});

for(const legacyVersion of [6,7]) test(`version ${legacyVersion} partial translations resume without repeating paid completed cues`, async t => {
  let requests=0, prepared=0; const payloads=[];
  const cues=[{id:'1',startMs:0,endMs:2000,sourceText:'Quick Assist.'},{id:'2',startMs:2500,endMs:4500,sourceText:'Save the next attack.'}];
  const fetcher=async(_url,init)=>{requests++;const payload=JSON.parse(JSON.parse(init.body).contents[0].parts[0].text);payloads.push(payload);
    return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({cues:(requests===1?payload.cues.slice(0,1):payload.cues).map(cue=>({id:cue.id,text:requests===1?'이미 비용을 지불한 번역':'남은 구간 번역'}))})}]}}]});};
  const app=setup(t,{jobsOptions:{prepare:async()=>{prepared++;return{cues,title:'Resume fixture',origin:'test'};},fetcher}});app.settings.save(config);
  const created=app.jobs.create(jobInput),failed=await waitJob(app.jobs,created.id);while(app.jobs.active)await tick();assert.equal(failed.status,'failed');assert.equal(failed.completedCues,1);
  const checkpointPath=join(app.jobs.directory(created.id),'translation.json'),checkpoint=JSON.parse(readFileSync(checkpointPath));
  checkpoint.key=translationKey(failed.cues,{...failed.options,...failed.translationConfig,title:failed.title},join(app.root,'glossary/zzz.json'),legacyVersion);writeFileSync(checkpointPath,JSON.stringify(checkpoint));
  const restarted=new Jobs({root:app.root,dataDir:app.jobs.dataDir,settings:app.settings,gate:{enter:async()=>{}},prepare:()=>assert.fail('must reuse source'),fetcher});restarted.resume(created.id);
  const completed=await waitJob(restarted,created.id);while(restarted.active)await tick();assert.equal(completed.status,'completed');assert.equal(requests,2);assert.equal(prepared,1);
  assert.deepEqual(payloads[1].cues.map(cue=>cue.id),['2']);assert.equal(completed.cues[0].translatedText,'이미 비용을 지불한 번역');assert.equal(completed.cues[0].sourceText,cues[0].sourceText);
});

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

test('partial responses preserve only unambiguous IDs and never shift timestamps', () => {
  const batch = Array.from({ length: 5 }, (_, i) => ({ id: String(i + 1), startMs: i * 1000, endMs: i * 1000 + 900, sourceText: `Line ${i}.` }));
  let failure;
  try { checkBatch({ cues: [{ id: '3', text: '세 번째' }, { id: '1', text: '첫 번째' }, { id: '1', text: '충돌' }, { id: '2', text: ' ' }, { id: 'unknown', text: '외부' }, { id: 4, text: '숫자 ID' }] }, batch); }
  catch (error) { failure = error; }
  assert(failure instanceof IncompleteTranslationError);
  assert.deepEqual(failure.partialCues, [{ ...batch[2], translatedText: '세 번째' }]);
  assert.equal(failure.translationIssue.missing, 4);
  assert.equal(failure.translationIssue.duplicates, 1);
  assert.equal(failure.translationIssue.unknown, 2);
  assert.equal(failure.translationIssue.invalid, 1);
});

test('648-cue incomplete response survives restart and resumes only missing screen cues in one manual request', async t => {
  let prepared = 0, requests = 0; const payloads = [];
  const cues = Array.from({ length: 648 }, (_, i) => ({ id: String(i + 1), startMs: i * 1000, endMs: i * 1000 + 900, sourceText: i < 47 ? `Speech ${i}.` : `Repeated HUD ${i % 65}`, ...(i >= 47 ? { kind: 'screen', region: { x: .1, y: .1, w: .4, h: .1 } } : {}) }));
  const fetcher = async (_url, init) => {
    requests++; const body = JSON.parse(init.body), payload = JSON.parse(body.contents[0].parts[0].text); payloads.push(payload);
    const schema = body.generationConfig.responseJsonSchema.properties.cues;
    assert(!/"(?:minItems|maxItems|enum)"/.test(JSON.stringify(schema)));
    assert(Buffer.byteLength(JSON.stringify(schema)) < 1000);
    assert(body.systemInstruction.parts[0].text.includes('never collapse repeated labels'));
    const output = (requests === 1 ? payload.cues.filter(c => c.kind === 'speech') : payload.cues).map(c => ({ id: c.id, text: `${requests === 1 ? '음성' : '화면'} ${c.id}` }));
    return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ cues: output }) }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 } }));
  };
  const app = setup(t, { jobsOptions: { prepare: async () => { prepared++; return { cues, title: 'Repeated screen fixture', origin: 'test' }; }, fetcher } });
  app.settings.save(config); const created = app.jobs.create({ ...jobInput, options: { ...jobInput.options, screenText: true } });
  const failed = await waitJob(app.jobs, created.id); while (app.jobs.active) await tick();
  assert.equal(failed.completedCues, 47); assert.equal(failed.status, 'failed'); assert.equal(requests, 1);
  assert.equal(failed.translationIssue.missing, 601);
  const folder = app.jobs.directory(created.id), checkpointPath = join(folder, 'translation.json');
  assert(!existsSync(join(folder, 'translated.srt')));
  const checkpoint = JSON.parse(readFileSync(checkpointPath)); assert.equal(Object.keys(checkpoint.cues).length, 47);
  checkpoint.key = translationKey(failed.cues, { ...failed.options, ...failed.translationConfig, title: failed.title }, join(app.root, 'glossary/zzz.json'), 5);
  writeFileSync(checkpointPath, JSON.stringify(checkpoint));
  const restarted = new Jobs({ root: app.root, dataDir: app.jobs.dataDir, settings: app.settings, gate: { enter: async () => {} }, prepare: () => assert.fail('source must be reused'), fetcher });
  restarted.resume(created.id); const completed = await waitJob(restarted, created.id); while (restarted.active) await tick();
  assert.equal(completed.status, 'completed'); assert.equal(completed.completedCues, 648); assert.equal(requests, 2); assert.equal(prepared, 1);
  assert.equal(payloads[0].cues.length, 112); assert.equal(payloads[1].cues.length, 65); assert.equal(payloads[1].contextCues.length, 47);
  assert(payloads[1].cues.every(c => c.kind === 'screen')); assert(payloads[1].contextCues.every(c => c.kind === 'speech'));
  assert.equal(payloads[1].glossary.entries.length, payloads[0].glossary.entries.length);
  const representative = payloads[1].cues.find(cue => cue.text === cues[647].sourceText);
  assert.equal(completed.cues[0].translatedText, '음성 1'); assert.equal(completed.cues[647].translatedText, `화면 ${representative.id}`);
  assert.equal(completed.translationPlan.reusedScreenCueCount, 536);
  assert.deepEqual(completed.cues.map(c => [c.id, c.startMs, c.endMs, c.region]), cues.map(c => [c.id, c.startMs, c.endMs, c.region]));
  assert.equal(parseSubtitles(readFileSync(join(folder, 'translated.srt'), 'utf8')).length, 648);
  assert.equal(completed.translationIssue, null);
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

test('HTTP 400 from a saved task resumes with a constant schema and reuses its transcript', async t => {
  let prepared = 0, calls = 0;
  const app = setup(t, { jobsOptions: {
    prepare: async () => { prepared++; return { cues: parseSubtitles(fixture), title: 'Existing failed job', origin: 'test' }; },
    fetcher: async (_url, init) => {
      calls++; const body=JSON.parse(init.body),payload=JSON.parse(body.contents[0].parts[0].text);
      if(calls===1 || /"(?:minItems|maxItems|enum)"/.test(JSON.stringify(body.generationConfig.responseJsonSchema)))return new Response(JSON.stringify({error:{message:'Your input schema produces a constraint that has too many states for serving. PRIVATE-DO-NOT-STORE'}}),{status:400});
      return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({cues:payload.cues.map(c=>({id:c.id,text:'번역 '+c.id}))})}]}}]}));
    }
  }});
  app.settings.save(config);const created=app.jobs.create(jobInput),failed=await waitJob(app.jobs,created.id);while(app.jobs.active)await tick();
  assert.equal(failed.status,'failed');assert.equal(failed.apiRequestError.category,'schema');assert(!JSON.stringify(failed).includes('PRIVATE'));
  app.jobs.resume(created.id);const done=await waitJob(app.jobs,created.id);
  assert.equal(done.status,'completed');assert.equal(calls,2);assert.equal(prepared,1);assert.equal(done.apiRequestError,null);
});

test('cancel interrupts an active request and deleting its record preserves unrelated uploads, keys and other jobs', async t => {
  let started;const ready=new Promise(done=>started=done);
  const app=setup(t,{jobsOptions:{prepare:async()=>({cues:parseSubtitles(fixture),origin:'test'}),fetcher:async(_url,init)=>{started();return new Promise((_done,reject)=>{init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true});if(init.signal.aborted)reject(init.signal.reason);});}}});
  app.settings.save(config);const keyBytes=readFileSync(join(app.jobs.dataDir,'api-vault.json'));
  const first=app.jobs.create(jobInput);await ready;
  const second=app.jobs.create({...jobInput,title:'Queued other job'});
  assert.throws(()=>app.jobs.remove(first.id),/먼저 중단/);
  const stopping=app.jobs.cancel(first.id);assert.equal(stopping.cancelRequested,true);
  const cancelled=await waitJob(app.jobs,first.id);assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.error,null);
  // Do not let the queued fixture reach its deliberately waiting API handler.
  app.jobs.cancel(second.id);while(app.jobs.active)await tick();
  const uploadDir=join(app.jobs.dataDir,'uploads');mkdirSync(uploadDir,{recursive:true});writeFileSync(join(uploadDir,'original.mp4'),'keep original');
  app.jobs.remove(first.id);assert(!existsSync(app.jobs.directory(first.id)));assert(existsSync(app.jobs.directory(second.id)));
  assert.equal(readFileSync(join(uploadDir,'original.mp4'),'utf8'),'keep original');assert.deepEqual(readFileSync(join(app.jobs.dataDir,'api-vault.json')),keyBytes);
  const escaped='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',outside=join(app.root,'outside-jobs');mkdirSync(outside);writeFileSync(join(outside,'keep'),'safe');
  symlinkSync(outside,app.jobs.directory(escaped),process.platform==='win32'?'junction':'dir');app.jobs.jobs.set(escaped,{id:escaped,status:'failed'});
  assert.throws(()=>app.jobs.remove(escaped),/경로/);assert.equal(readFileSync(join(outside,'keep'),'utf8'),'safe');
});

test('media cancellation terminates its own process when PATH is empty', {timeout:15000}, async()=>{
  const controller=new AbortController(),saved=process.env.PATH;process.env.PATH='';
  try{await assert.rejects(runTool(process.execPath,['-e','console.log("ready"); setTimeout(()=>{},60000)'],{signal:controller.signal,onText:()=>controller.abort()}),/중단/);}finally{process.env.PATH=saved;}
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
  const exported = await fetch(`${base}/api/jobs/${job.id}/export?format=srt&mode=source`, { headers }); assert.equal(exported.status, 200);
  const saved = parseSubtitles(await exported.text()); assert.equal(saved.length, 1);
  assert.equal(saved[0].startMs,1000); assert.equal(saved.at(-1).endMs,8000);
  assert.equal(saved.map(cue=>cue.sourceText).join(' '),'Quick Assist & EX Special Attack Do not use 20 stacks.');
  const evil = await fetch(`${base}/api/jobs`, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(evil.status, 403);
  assert.equal((await fetch(`${base}/api/uploads?name=run.exe`, { method: 'POST', headers, body: 'x' })).status, 400);
  assert.equal((await fetch(`${base}/api/jobs/${job.id}`,{method:'DELETE'})).status,401);
  assert.equal((await fetch(`${base}/api/jobs/${job.id}`,{method:'DELETE',headers})).status,200);
  assert.equal((await fetch(`${base}/api/jobs/${job.id}`,{headers})).status,404);
  assert.equal((await fetch(`${base}/api/jobs`,{headers}).then(r=>r.json())).length,0);
  assert(!existsSync(join(app.jobs.dataDir,'uploads',file.id+'.vtt')));
  assert(!existsSync(join(app.jobs.dataDir,'uploads',file.id+'.json')));
});

function uploadFixture(app, { id = randomUUID(), extension = '.mp4', metadataPath } = {}) {
  const directory = join(app.jobs.dataDir, 'uploads'), path = join(directory, id + extension);
  writeFileSync(path, 'APP-OWNED-MEDIA');
  writeFileSync(join(directory, id + '.json'), JSON.stringify({ id, name: 'input' + extension, path: metadataPath || path }));
  return { id, path, metadata: join(directory, id + '.json') };
}

test('record deletion removes its media, upload metadata, subtitles and checkpoints but preserves originals and exports', async t => {
  const app = setup(t, { jobsOptions: { prepare: async () => ({ cues: parseSubtitles(fixture), origin: 'test' }) } });
  const original = join(app.root, 'original.mp4'), downloaded = join(app.root, 'downloaded.srt');
  writeFileSync(original, 'ORIGINAL'); writeFileSync(downloaded, 'SEPARATELY-SAVED');
  const upload = uploadFixture(app, { metadataPath: original });
  const created = app.jobs.create({ input: { fileId: upload.id }, options: { transcribeOnly: true } });
  await waitJob(app.jobs, created.id); while (app.jobs.active) await tick();
  const directory = app.jobs.directory(created.id);
  for (const name of ['screen-video.mp4', 'audio.webm', 'speech.wav', 'translation.json']) writeFileSync(join(directory, name), 'REMOVE');
  app.jobs.remove(created.id);
  assert(!existsSync(directory)); assert(!existsSync(upload.path)); assert(!existsSync(upload.metadata));
  assert.equal(readFileSync(original, 'utf8'), 'ORIGINAL'); assert.equal(readFileSync(downloaded, 'utf8'), 'SEPARATELY-SAVED');
});

test('shared upload survives record deletion and restart until the last referencing job is deleted', async t => {
  const app = setup(t, { jobsOptions: { prepare: async () => ({ cues: parseSubtitles(fixture), origin: 'test' }) } });
  const upload = uploadFixture(app), input = { input: { fileId: upload.id }, options: { transcribeOnly: true } };
  const first = app.jobs.create(input), second = app.jobs.create(input);
  await waitJob(app.jobs, second.id); while (app.jobs.active) await tick();
  app.jobs.remove(first.id); assert(existsSync(upload.path)); assert(existsSync(upload.metadata));
  const reopened = new Jobs({ root: app.root, dataDir: app.jobs.dataDir, settings: app.settings });
  assert.equal(reopened.cleanupOrphanUploads().removedFiles, 0); assert(existsSync(upload.path));
  reopened.remove(second.id); assert(!existsSync(upload.path)); assert(!existsSync(upload.metadata));
});

test('startup after an update removes legacy unreferenced uploads and retains every persisted job input', async t => {
  const app = setup(t), keep = [];
  for (const status of ['completed', 'failed', 'cancelled', 'queued', 'running']) {
    const upload = uploadFixture(app); keep.push(upload);
    const id = randomUUID(); mkdirSync(app.jobs.directory(id));
    writeFileSync(join(app.jobs.directory(id), 'job.json'), JSON.stringify({ id, input: { fileId: upload.id }, status, createdAt: new Date().toISOString(), cues: [] }));
  }
  const orphan = uploadFixture(app), missingMetadata = uploadFixture(app, { extension: '.wav' });
  writeFileSync(orphan.metadata + '.tmp', 'STALE-METADATA');
  rmSync(missingMetadata.metadata);
  const unknown = join(app.jobs.dataDir, 'uploads', 'unmanaged.mp4'); writeFileSync(unknown, 'KEEP-UNKNOWN');
  const migrated = createVideoServer({ root: app.root, token: 'b'.repeat(64) });
  t.after(async () => { if (migrated.server.listening) await new Promise(done => migrated.server.close(done)); });
  assert(existsSync(orphan.path), 'constructing a second server must not clean uploads');
  migrated.server.listen(0, '127.0.0.1'); await once(migrated.server, 'listening');
  assert(!existsSync(orphan.path)); assert(!existsSync(orphan.metadata)); assert(!existsSync(orphan.metadata + '.tmp')); assert(!existsSync(missingMetadata.path));
  for (const upload of keep) { assert(existsSync(upload.path)); assert(existsSync(upload.metadata)); }
  assert.equal(readFileSync(unknown, 'utf8'), 'KEEP-UNKNOWN');
  const base = `http://127.0.0.1:${migrated.server.address().port}`;
  assert.equal((await fetch(base + '/api/storage')).status, 401);
  const { cleanup } = await fetch(base + '/api/storage', { headers: { Authorization: `Bearer ${migrated.token}` } }).then(response => response.json());
  assert.equal(cleanup.removedFiles, 4); assert(cleanup.removedBytes > 0); assert.equal(cleanup.failedFiles, 0);
  assert.equal([...migrated.jobs.jobs.values()].filter(job => job.status === 'interrupted').length, 2);
});

test('a failed duplicate launch does not remove a running app upload awaiting job creation', async t => {
  const app = setup(t); app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  const pending = uploadFixture(app), duplicate = createVideoServer({ root: app.root, token: 'b'.repeat(64) });
  const failure = once(duplicate.server, 'error'); duplicate.server.listen(app.server.address().port, '127.0.0.1');
  assert.equal((await failure)[0].code, 'EADDRINUSE');
  assert(existsSync(pending.path)); assert(existsSync(pending.metadata));
});

test('upload cleanup refuses directory links and never follows metadata paths outside app storage', async t => {
  const app = setup(t, { jobsOptions: { prepare: async () => ({ cues: parseSubtitles(fixture), origin: 'test' }) } });
  const upload = uploadFixture(app), created = app.jobs.create({ input: { fileId: upload.id }, options: { transcribeOnly: true } });
  await waitJob(app.jobs, created.id); while (app.jobs.active) await tick();
  const directory = join(app.jobs.dataDir, 'uploads'), saved = join(app.jobs.dataDir, 'uploads-saved'), outside = join(app.root, 'outside-uploads');
  // Rename stays entirely inside the test fixture; the link points at a separate
  // fixture directory containing a same-ID file that must never be deleted.
  const { renameSync } = await import('node:fs'); renameSync(directory, saved);
  mkdirSync(outside); const protectedFile = join(outside, upload.id + '.mp4'); writeFileSync(protectedFile, 'KEEP-OUTSIDE');
  symlinkSync(outside, directory, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => app.jobs.remove(created.id), /정리 경로/); assert(existsSync(app.jobs.directory(created.id)));
  assert.equal(app.jobs.cleanupOrphanUploads().failedFiles, 1); assert.equal(readFileSync(protectedFile, 'utf8'), 'KEEP-OUTSIDE');
  // A directory named like managed media is not a file and must not be removed.
  rmSync(directory); renameSync(saved, directory); rmSync(upload.path); mkdirSync(upload.path);
  assert.throws(() => app.jobs.remove(created.id), /정리 경로/); assert(existsSync(app.jobs.directory(created.id)));
  rmdirSync(upload.path); writeFileSync(upload.path, 'APP-OWNED-MEDIA');
  app.jobs.remove(created.id); assert(!existsSync(upload.path)); assert.equal(readFileSync(protectedFile, 'utf8'), 'KEEP-OUTSIDE');
});

test('YouTube video save uses an authenticated request, an isolated single-use download and a removable job cache', async t => {
  let calls = 0;
  const media = Buffer.from('FIXTURE-VIDEO-WITH-AUDIO');
  const app = setup(t, { jobsOptions: { prepare: async () => ({ cues: parseSubtitles(fixture), origin: 'test' }) }, videoOptions: {
    getTools: () => ({ ytdlp: 'fixture-ytdlp', ffmpeg: 'fixture-ffmpeg', ready: { ytdlp: true, ffmpeg: true } }),
    run: async (_executable, args) => { calls++; assert(args.includes('!is_live')); assert(args.includes('bv*[height<=1080]+ba/b[height<=1080]')); assert(args.includes('after_move:filepath')); const output = args[args.indexOf('-o') + 1].replace('%(ext)s', 'mp4'); writeFileSync(output, media); return { stdout: output + '\n' }; }
  } });
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  const job = app.jobs.create({ ...jobInput, title: '영상 "테스트"' + '😀'.repeat(80), options: { transcribeOnly: true } });
  await waitJob(app.jobs, job.id); while (app.jobs.active) await tick();
  const base = `http://127.0.0.1:${app.server.address().port}`, headers = { Authorization: `Bearer ${app.token}` }, endpoint = base + `/api/jobs/${job.id}/video`;
  assert.equal((await fetch(endpoint, { method: 'POST' })).status, 401); assert.equal(calls, 0);
  const prepared = await fetch(endpoint, { method: 'POST', headers }).then(response => response.json());
  assert.match(prepared.url, /^\/api\/video-downloads\/[a-f0-9]{64}$/); assert(!prepared.url.includes(app.token)); assert.equal(prepared.bytes, media.length);
  assert.equal(app.jobs.summary(app.jobs.get(job.id)).canDelete, false);
  assert.equal((await fetch(base + `/api/jobs/${job.id}`, { method: 'DELETE', headers })).status, 409);
  assert.equal((await fetch(base + prepared.url, { headers: { Origin: 'https://evil.example' } })).status, 403);
  const saved = await fetch(base + prepared.url); assert.equal(saved.status, 200); assert(saved.headers.get('content-disposition').includes("filename*=UTF-8''"));
  const downloaded = Buffer.from(await saved.arrayBuffer()); assert.deepEqual(downloaded, media);
  assert.equal((await fetch(base + prepared.url)).status, 404);
  const repeated = await fetch(base + `/api/jobs/${job.id}/video`, { method: 'POST', headers }).then(response => response.json()).then(info => fetch(base + info.url));
  assert.equal(repeated.status, 200); assert.deepEqual(Buffer.from(await repeated.arrayBuffer()), media);
  while (app.jobs.videoSaves.size) await tick(); assert.equal(calls, 1, 'repeated saves reuse the completed job cache');
  const externalDownload = join(app.root, 'separately-downloaded.mp4'); writeFileSync(externalDownload, downloaded);
  app.jobs.remove(job.id); assert(!existsSync(app.jobs.directory(job.id))); assert.deepEqual(readFileSync(externalDownload), media);
});

test('video preparation cancellation stops its own work, releases deletion locks and does not alter completed subtitles', async t => {
  let started, stopped = false; const ready = new Promise(done => started = done);
  const app = setup(t, { jobsOptions: { prepare: async () => ({ cues: parseSubtitles(fixture), origin: 'test' }) }, videoOptions: {
    getTools: () => ({ ytdlp: 'fixture-ytdlp', ffmpeg: 'fixture-ffmpeg', ready: { ytdlp: true, ffmpeg: true } }),
    run: async (_executable, _args, { signal }) => { started(); await new Promise((_done, reject) => { signal.addEventListener('abort', () => { stopped = true; reject(signal.reason); }, { once: true }); }); }
  } });
  const job = app.jobs.create({ ...jobInput, options: { transcribeOnly: true } }); await waitJob(app.jobs, job.id); while (app.jobs.active) await tick();
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  const before = readFileSync(join(app.jobs.directory(job.id), 'job.json'));
  const controller = new AbortController(), pending = fetch(`http://127.0.0.1:${app.server.address().port}/api/jobs/${job.id}/video`, { method: 'POST', headers: { Authorization: `Bearer ${app.token}` }, signal: controller.signal }); await ready;
  assert.throws(() => app.jobs.remove(job.id), /영상 저장/); controller.abort(); await assert.rejects(pending, { name: 'AbortError' });
  for (let attempt = 0; attempt < 100 && app.jobs.videoSaves.size; attempt++) await tick();
  assert(stopped); assert.equal(app.jobs.videoSaves.size, 0); assert.deepEqual(readFileSync(join(app.jobs.directory(job.id), 'job.json')), before);
  assert(!existsSync(join(app.jobs.directory(job.id), 'saved-video.json'))); app.jobs.remove(job.id);
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
