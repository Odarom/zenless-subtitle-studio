import { Buffer } from 'node:buffer';
import { validateCues } from './subtitles.mjs';
import { deepLRequestBody } from './providers.mjs';
import { compactVideoGlossary } from './glossary-payload.mjs';

export const PLAN_VERSION = 3;
const terminal = /[.!?。！？]["'”’」』）)]*$/u;
const abbreviation = /\b(?:Mr|Mrs|Ms|Dr|Prof|vs|etc|e\.g|i\.e)\.$/iu;
const joinText = (a, b) => a.trimEnd() + (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]$/u.test(a) && /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(b) ? '' : ' ') + b.trimStart();
export function sentenceCues(input) {
  const speech = [];
  for (const cue of input.filter(c => c.kind !== 'screen')) {
    const previous = speech.at(-1), text = previous?.sourceText.trim() || '';
    const complete = terminal.test(text) && !abbreviation.test(text);
    if (previous && !complete && cue.startMs - previous.endMs <= 1200 && cue.startMs >= previous.endMs - 300 && cue.endMs - previous.startMs <= 20000 && text.length + cue.sourceText.length < 650) {
      previous.sourceText = joinText(text, cue.sourceText); previous.endMs = Math.max(previous.endMs, cue.endMs);
    } else speech.push({ ...cue });
  }
  return validateCues([...speech, ...input.filter(c => c.kind === 'screen')].sort((a, b) => a.startMs - b.startMs || Number(a.kind === 'screen') - Number(b.kind === 'screen')));
}
export function providerLimits(config) {
  if (config.provider === 'gemini') return { context: 1048576, output: /^gemini-(?:2\.5|3)/.test(config.model) ? 65536 : /^gemini-4/.test(config.model) ? 32768 : 16384 };
  if (config.provider === 'openai') return /^gpt-4\.1/.test(config.model) ? { context: 1047576, output: 32768 } : /^(?:gpt-[56]|o[134])/.test(config.model) ? { context: 200000, output: 65536 } : { context: 128000, output: 16384 };
  if (config.provider === 'ollama') return { context: 32768, output: 12000 };
  return { context: 128000, output: 65536 };
}
// Conservative estimates include target-language expansion and JSON IDs. No API
// calls are made to split sentences, count tokens or build this plan.
export function estimatedOutputTokens(cues, targetLanguage) {
  const characters = cues.reduce((n, cue) => n + [...cue.sourceText].length, 0);
  const inputIsMostlyAscii = cues.reduce((n, c) => n + (c.sourceText.match(/[\x20-\x7e]/g) || []).length, 0) > characters * .7;
  return Math.ceil(characters * (targetLanguage === 'en' ? .75 : inputIsMostlyAscii ? .85 : 1.4) + cues.length * 16 + 512);
}
export function translationPlan(cues, config, { targetLanguage = 'ko', translationMode = 'single' } = {}, glossary = []) {
  const limits = providerLimits(config), maxOutputTokens = Math.min(config.maxOutputTokens || limits.output, limits.output);
  const glossaryInputBytes = Buffer.byteLength(JSON.stringify(config.provider === 'deepl' ? glossary : compactVideoGlossary(glossary)), 'utf8');
  const glossaryTokens = Math.ceil(glossaryInputBytes / 2);
  if (config.provider !== 'deepl' && glossaryTokens + maxOutputTokens + 6000 > limits.context) throw new Error('용어집이 선택한 모델의 입력 범위를 넘을 수 있어 API를 호출하지 않았습니다. 입력 범위가 큰 모델을 선택하거나 용어집 전송 범위를 관련 용어만으로 바꾸세요.');
  const fits = batch => {
    const output = estimatedOutputTokens(batch, targetLanguage);
    const input = Math.ceil(Buffer.byteLength(JSON.stringify(batch.map(c => ({ id: c.id, text: c.sourceText }))), 'utf8') / 2) + glossaryTokens + 6000;
    if (config.provider === 'deepl') return Buffer.byteLength(JSON.stringify(deepLRequestBody({ cues: batch.map(c => ({ id: c.id, text: c.sourceText })), wholeDocument: true, sourceLanguage: config.sourceLanguage || 'auto', targetLanguage, glossary, before: [], after: [] })), 'utf8') + 24000 < 128 * 1024;
    return output <= maxOutputTokens * .82 && input + maxOutputTokens <= limits.context;
  };
  if (!['single', 'large-batches'].includes(translationMode)) throw new Error('번역 요청 방식을 확인하세요.');
  const batches = [];
  if (translationMode === 'single') {
    if (!fits(cues)) throw new Error('이 영상의 전체 번역은 선택한 모델의 한 응답에 담기 어려울 수 있어 API를 호출하지 않았습니다. 출력 한도가 큰 모델을 선택하거나 긴 영상 분할 번역을 직접 선택하세요.');
    if (cues.length) batches.push(cues);
  } else for (let start = 0; start < cues.length;) {
    if (!fits(cues.slice(start, start + 1))) throw new Error('이 문장 또는 용어집이 모델의 처리 범위를 넘습니다. API를 호출하지 않았습니다.');
    let low = start + 1, high = cues.length;
    while (low < high) { const end = Math.ceil((low + high) / 2); if (fits(cues.slice(start, end))) low = end; else high = end - 1; }
    batches.push(cues.slice(start, low)); start = low;
  }
  return { version: PLAN_VERSION, mode: translationMode, requests: batches.length, sentenceCount: cues.filter(c => c.kind !== 'screen').length, screenCount: cues.filter(c => c.kind === 'screen').length, glossaryCount: glossary.length, glossaryInputBytes, estimatedOutputTokens: estimatedOutputTokens(cues, targetLanguage), maxOutputTokens, batches };
}
