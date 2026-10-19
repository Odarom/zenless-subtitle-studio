import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, saveJson, VideoUsage } from './state.mjs';
import { prepareVideoSource as prepareSource } from './screen-source.mjs';
import { translateBatch, translationKey, videoGlossary } from './translation.mjs';
import { sentenceCues, translationPlan } from './translation-plan.mjs';
import { RequestGate } from './request-gate.mjs';
import { serializeSubtitles, validateCues, youtubeVideoId } from './subtitles.mjs';
import { TEXT_LANGUAGES, OCR_LANGUAGES } from '../src/languages.js';

export const LANGS = ['auto', ...Object.keys(TEXT_LANGUAGES)];
export class Jobs {
  constructor({ root, dataDir, settings, prepare = prepareSource, translate = translateBatch, fetcher = fetch, glossaryPath = () => join(root, 'glossary', 'zzz.json'), gate = new RequestGate(dataDir), plan = translationPlan }) {
    this.root = root; this.dataDir = dataDir; this.settings = settings; this.prepare = prepare; this.translate = translate; this.fetcher = fetcher;
    this.glossaryPath = glossaryPath;
    this.gate = gate; this.plan = plan;
    this.path = join(dataDir, 'jobs'); mkdirSync(this.path, { recursive: true });
    this.jobs = new Map(); this.active = null; this.usage = new VideoUsage(dataDir);
    for (const entry of readdirSync(this.path)) {
      if (!/^[a-f0-9-]{36}$/.test(entry)) continue;
      const path = join(this.path, entry, 'job.json');
      if (!existsSync(path)) continue;
      const job = readJson(path);
      if (['queued', 'running'].includes(job.status)) { job.status = 'interrupted'; job.message = '프로그램이 종료되어 작업이 멈췄습니다. 이어하기를 누르세요.'; saveJson(path, job); }
      this.jobs.set(job.id, job);
    }
  }
  directory(id) { return join(this.path, id); }
  save(job, patch = {}) { Object.assign(job, patch, { updatedAt: new Date().toISOString() }); saveJson(join(this.directory(job.id), 'job.json'), job); }
  summary(job) { const { cues, ...value } = job; return { ...value, cueCount: cues?.length || 0, warningCount: cues?.filter(cue => cue.warnings?.length).length || 0 }; }
  list() { return [...this.jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(job => this.summary(job)); }
  get(id) { const job = this.jobs.get(id); if (!job) throw Object.assign(new Error('작업을 찾지 못했습니다.'), { statusCode: 404 }); return job; }
  create(input) {
    if (!input || typeof input !== 'object' || !input.input || !input.options) throw new Error('영상과 번역 설정을 확인하세요.');
    const { sourceLanguage = 'en', targetLanguage = 'ko', style = 'official', forceAsr = true, transcribeOnly = false, speech = true, screenText = false, screenLanguage = OCR_LANGUAGES.includes(sourceLanguage) ? sourceLanguage : 'en', screenIntervalMs = 1000, screenStartMs = 0, screenEndMs = null } = input.options;
    const translationMode = input.options.translationMode || 'single';
    const glossaryMode = input.options.glossaryMode || 'full';
    if (!['full', 'relevant'].includes(glossaryMode)) throw new Error('용어집 전송 범위를 확인하세요.');
    if (!['single', 'large-batches'].includes(translationMode)) throw new Error('번역 요청 방식을 확인하세요.');
    if (typeof speech !== 'boolean' || typeof screenText !== 'boolean' || !speech && !screenText || !OCR_LANGUAGES.includes(screenLanguage) || ![500, 1000, 2000].includes(screenIntervalMs) || !Number.isSafeInteger(screenStartMs) || screenStartMs < 0 || screenStartMs > 7 * 86400000 || screenEndMs !== null && (!Number.isSafeInteger(screenEndMs) || screenEndMs <= screenStartMs || screenEndMs > 7 * 86400000)) throw new Error('음성·화면 글자 선택과 분석 구간을 확인하세요.');
    if (!LANGS.includes(sourceLanguage) || !LANGS.slice(1).includes(targetLanguage) || !['official', 'community'].includes(style) || typeof forceAsr !== 'boolean' || typeof transcribeOnly !== 'boolean') throw new Error('번역 언어 또는 스타일을 확인하세요.');
    if (input.input.fileId && !/^[a-f0-9-]{36}$/.test(input.input.fileId)) throw new Error('선택한 파일이 올바르지 않습니다.');
    let videoId;
    if (input.input.youtubeUrl) videoId = youtubeVideoId(input.input.youtubeUrl);
    if (!input.input.fileId && !videoId) throw new Error('유튜브 영상이나 파일을 선택하세요.');
    const api = transcribeOnly ? null : this.settings.private();
    const speechDevice = this.settings.options.speechDevice, speechThreads = this.settings.options.speechThreads;
    const job = { id: randomUUID(), title: String(input.title || '').slice(0, 250), videoId, input: { fileId: input.input.fileId || null, youtubeUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null }, options: { sourceLanguage, targetLanguage, style, forceAsr, transcribeOnly, speechDevice, speechThreads, speech, screenText, screenLanguage, screenIntervalMs, screenStartMs, screenEndMs, translationMode, glossaryMode }, translationConfig: api ? { provider: api.provider, model: api.model } : null, status: 'queued', stage: 'queued', message: '처리를 기다리고 있습니다.', completedCues: 0, createdAt: new Date().toISOString(), cues: [] };
    mkdirSync(this.directory(job.id), { recursive: true }); this.jobs.set(job.id, job); this.save(job); this.pump(); return this.summary(job);
  }
  cancel(id) {
    const job = this.get(id);
    if (!['queued', 'running'].includes(job.status)) return this.summary(job);
    if (this.active?.id === id) { this.active.controller.abort(); this.save(job, { message: '현재 처리를 중단하고 있습니다.' }); }
    else this.save(job, { status: 'cancelled', message: '작업을 중단했습니다. 이어하기로 재개할 수 있습니다.' });
    return this.summary(job);
  }
  resume(id) {
    const job = this.get(id);
    if (!['failed', 'cancelled', 'interrupted'].includes(job.status)) throw new Error('중단되거나 실패한 작업만 이어할 수 있습니다.');
    if (!job.options.transcribeOnly) {
      const api = this.settings.private();
      if (api.provider !== job.translationConfig.provider || api.model !== job.translationConfig.model) throw new Error('이 작업의 API 제공자 또는 모델이 현재 설정과 다릅니다. 원래 설정으로 되돌린 후 이어하거나 새 작업을 시작하세요.');
    }
    this.save(job, { status: 'queued', message: '완료된 구간부터 이어할 준비를 하고 있습니다.', error: null, apiLimit: null }); this.pump(); return this.summary(job);
  }
  pump() {
    if (this.active) return;
    const job = [...this.jobs.values()].find(candidate => candidate.status === 'queued');
    if (!job) return;
    const controller = new AbortController(); this.active = { id: job.id, controller };
    this.run(job, controller.signal).catch(error => {
      this.save(job, { status: controller.signal.aborted ? 'cancelled' : 'failed', error: controller.signal.aborted ? null : error.message, apiLimit: controller.signal.aborted ? null : error.apiLimit || null, message: controller.signal.aborted ? '작업을 중단했습니다. 완료된 결과는 보관했습니다.' : error.message });
    }).finally(() => { this.active = null; this.pump(); });
  }
  async run(job, signal) {
    this.save(job, { status: 'running', error: null, apiLimit: null, stageProgress: null });
    const directory = this.directory(job.id);
    const transcript = join(directory, 'transcript.json');
    if (!existsSync(transcript)) {
      const upload = job.input.fileId ? readJson(join(this.dataDir, 'uploads', `${job.input.fileId}.json`), null) : null;
      const source = await this.prepare(job, { root: this.root, directory, upload, signal, update: patch => this.save(job, patch) });
      signal.throwIfAborted();
      source.cues = validateCues(source.cues); saveJson(transcript, source);
    }
    const source = readJson(transcript);
    source.cues = sentenceCues(source.cues);
    this.save(job, { title: source.title || job.title || '선택한 영상', videoId: source.videoId || job.videoId, origin: source.origin, runtime: source.runtime || null, cues: source.cues, stageProgress: null });
    if (job.options.transcribeOnly) {
      this.save(job, { cues: source.cues.map(cue => ({ ...cue, translatedText: cue.sourceText, warnings: [] })), completedCues: source.cues.length });
    } else {
      const config = this.settings.private();
      if (config.provider !== job.translationConfig.provider || config.model !== job.translationConfig.model) throw new Error('번역 설정이 변경되었습니다. 작업의 원래 모델 설정으로 되돌린 후 이어하세요.');
      const glossaryPath = this.glossaryPath();
      const glossaryBytes = readFileSync(glossaryPath);
      this.save(job, { glossaryHash: createHash('sha256').update(glossaryBytes).digest('hex'), glossaryVersion: JSON.parse(glossaryBytes).retrievedAt || 'bundled' });
      const options = { ...job.options, ...job.translationConfig, title: job.title };
      const key = translationKey(source.cues, options, glossaryPath);
      const checkpointPath = join(directory, 'translation.json');
      const checkpoint = readJson(checkpointPath, { key, cues: {} });
      // A rejected 0.6.1 single request has no translated results to mix. Keep
      // its expensive local ASR/OCR output when only prompt transport changed.
      if (checkpoint.key !== key && Object.keys(checkpoint.cues).length === 0 && checkpoint.key === translationKey(source.cues, options, glossaryPath, 4)) checkpoint.key = key;
      if (checkpoint.key !== key) throw new Error('원문·용어집·번역 설정이 변경되어 기존 결과를 이어할 수 없습니다. 새 작업으로 번역하세요.');
      const glossary = videoGlossary(source.cues, options, glossaryPath);
      const plan = this.plan(source.cues, config, options, glossary), { batches, ...planInfo } = plan;
      saveJson(join(directory, 'translation-plan.json'), { ...planInfo, glossary, cues: source.cues });
      this.save(job, { translationPlan: planInfo });
      for (let index = 0; index < batches.length; index++) {
        signal.throwIfAborted();
        const batch = batches[index];
        this.save(job, { stage: 'translating', message: `문맥과 젠레스 용어를 적용해 번역하고 있습니다. ${index + 1}/${batches.length} 묶음`, stageProgress: Math.round(index / batches.length * 100) });
        if (!batch.every(cue => checkpoint.cues[cue.id])) {
          const result = await this.translate({ allCues: source.cues, batch, options, config: { ...config, maxOutputTokens: plan.maxOutputTokens }, glossaryPath, glossary, usage: this.usage, gate: this.gate, update: patch => this.save(job, patch), signal, fetcher: this.fetcher });
          // Persist any completed response before honoring cancellation to avoid paying for it again.
          for (const cue of result) checkpoint.cues[cue.id] = cue;
          saveJson(checkpointPath, checkpoint);
        }
        const cues = source.cues.map(cue => checkpoint.cues[cue.id] || cue);
        this.save(job, { cues, completedCues: Object.keys(checkpoint.cues).length });
      }
      signal.throwIfAborted();
    }
    this.save(job, { stage: 'saving', message: '자막 파일을 저장하고 있습니다.', stageProgress: null });
    this.exportFiles(job);
    this.save(job, { status: 'completed', stage: 'completed', stageProgress: 100, message: job.options.transcribeOnly ? '원문 자막이 준비되었습니다.' : '번역 자막이 준비되었습니다.', completedAt: new Date().toISOString() });
  }
  exportFiles(job) {
    for (const format of ['srt', 'vtt']) for (const mode of ['source', 'translated', 'bilingual']) writeFileSync(join(this.directory(job.id), `${mode}.${format}`), serializeSubtitles(job.cues, { format, mode }), 'utf8');
  }
  edit(id, changes) {
    const job = this.get(id); if (job.status !== 'completed') throw new Error('완료된 자막만 수정할 수 있습니다.');
    if (!Array.isArray(changes) || changes.length > 50000) throw new Error('수정 내용을 확인하세요.');
    const patches = new Map(changes.map(change => [change.id, change]));
    for (const [id, change] of patches) if (!job.cues.some(cue => cue.id === id) || typeof change.translatedText !== 'string' || !change.translatedText.trim() || change.translatedText.length > 12000) throw new Error('수정할 자막 내용이 올바르지 않습니다.');
    const cues = job.cues.map(cue => patches.has(cue.id) ? { ...cue, translatedText: patches.get(cue.id).translatedText.trim(), manuallyEdited: true, warnings: [] } : cue);
    this.save(job, { cues }); this.exportFiles(job); return job;
  }
}
