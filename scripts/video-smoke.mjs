// Public upstream audio fixture, processed locally with no translation API calls.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = 'http://127.0.0.1:4318';
const session = await fetch(`${base}/api/session`, { headers: { 'X-ZZZ-Local': '1' } });
const { token } = await session.json(); const headers = { Authorization: `Bearer ${token}` };
const directory = join(root, 'data', 'video', 'smoke'); mkdirSync(directory, { recursive: true });
const youtube = process.argv.includes('--youtube');
let input;
if (youtube) input = { youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' };
else {
  const fixture = await fetch('https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/samples/jfk.wav');
  if (!fixture.ok) throw new Error(`upstream audio fixture: ${fixture.status}`);
  const audio = Buffer.from(await fixture.arrayBuffer()); writeFileSync(join(directory, 'jfk.wav'), audio);
  const upload = await (await fetch(`${base}/api/uploads?name=public-jfk-sample.wav`, { method: 'POST', headers, body: audio })).json();
  input = { fileId: upload.id };
}
const started = Date.now();
const createdResponse = await fetch(`${base}/api/jobs`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: youtube ? '공개 유튜브 예제' : '공개 음성 예제 · 로컬 인식 확인', input, options: { sourceLanguage: 'en', targetLanguage: 'ko', transcribeOnly: true } }) });
const created = await createdResponse.json(); if (!createdResponse.ok) throw new Error(created.error);
console.log(`로컬 음성 인식 작업: ${created.id}`);
let lastStage;
while (true) {
  const job = await (await fetch(`${base}/api/jobs/${created.id}`, { headers })).json();
  if (job.stage !== lastStage) { console.log(job.message); lastStage = job.stage; }
  if (job.status === 'completed') {
    const text = job.cues.map(cue => cue.sourceText).join(' ');
    if (youtube ? !/elephant/i.test(text) : !/ask not/i.test(text) || !/country/i.test(text)) throw new Error('표본 자막의 핵심 문장을 확인하지 못했습니다.');
    const report = { jobId: job.id, elapsedMs: Date.now() - started, runtime: job.runtime, origin: job.origin, cueCount: job.cues.length, status: job.status, translationApiCalls: 0 };
    writeFileSync(join(directory, youtube ? 'result-youtube.json' : 'result.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)); break;
  }
  if (['failed', 'cancelled', 'interrupted'].includes(job.status)) throw new Error(job.error || job.message);
  await new Promise(resolve => setTimeout(resolve, 1500));
}
