import { checkLocalModel } from '../src/ollama.js';
import { cleanText } from './subtitles.mjs';

const escapeXml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function protectDeepLTerms(text, glossary, sourceLanguage, targetLanguage) {
  const choices = new Map();
  for (const term of glossary) {
    if (term.autoUse === false) continue;
    const target = term.outputPreferred?.[targetLanguage] ?? term.preferred?.[targetLanguage], source = term.preferred?.[sourceLanguage];
    if (!target || !source || source === target || source.length < 2) continue;
    const key = source.toLowerCase();
    if (!choices.has(key)) choices.set(key, { source, target });
    else if (choices.get(key)?.target !== target) choices.set(key, null);
  }
  const candidates = [];
  for (const value of choices.values()) {
    if (!value) continue;
    const escaped = value.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ascii = /^[\x20-\x7e]+$/.test(value.source);
    for (const match of text.matchAll(new RegExp(ascii ? `(?<![a-z0-9])${escaped}(?![a-z0-9])` : escaped, 'giu'))) candidates.push({ start: match.index, end: match.index + match[0].length, target: value.target });
  }
  const selected = [];
  for (const candidate of candidates.sort((a, b) => (b.end - b.start) - (a.end - a.start))) if (!selected.some(hit => candidate.start < hit.end && candidate.end > hit.start)) selected.push(candidate);
  let output = '', offset = 0;
  for (const hit of selected.sort((a, b) => a.start - b.start)) { output += escapeXml(text.slice(offset, hit.start)) + `<keep>${escapeXml(hit.target)}</keep>`; offset = hit.end; }
  return `<text>${output}${escapeXml(text.slice(offset))}</text>`;
}
export function deepLRequestBody(payload) {
  const targets = { ko: 'KO', en: 'EN', ja: 'JA', 'zh-CN': 'ZH-HANS', 'zh-Hant': 'ZH-HANT', de: 'DE', fr: 'FR', es: 'ES', pt: 'PT-BR', ru: 'RU', th: 'TH', vi: 'VI', id: 'ID' };
  const target = targets[payload.targetLanguage];
  const source = payload.sourceLanguage === 'auto' ? null : payload.sourceLanguage?.startsWith('zh-') ? 'ZH' : payload.sourceLanguage === 'pt' ? 'PT' : targets[payload.sourceLanguage];
  if (!target || payload.sourceLanguage !== 'auto' && !source) throw new Error('DeepL 번역 언어를 확인하세요.');
  const protectedText = cue => protectDeepLTerms(cue.text, payload.glossary, payload.sourceLanguage, payload.targetLanguage);
  const text = payload.wholeDocument ? [`<doc>${payload.cues.map(cue => `<c id="${encodeURIComponent(cue.id)}">${protectedText(cue)}</c>`).join('')}</doc>`] : payload.cues.map(protectedText);
  return { text, target_lang: target, ...(source ? { source_lang: source } : {}), tag_handling: 'xml', ignore_tags: ['keep'], ...(payload.wholeDocument ? { outline_detection: false, splitting_tags: ['c'] } : {}), preserve_formatting: true, split_sentences: 'nonewlines', show_billed_characters: true, context: [...payload.before, ...payload.after].join('\n').slice(0, 20000) };
}
export async function deepLTranslation(config, payload, fetcher) {
  const body = deepLRequestBody(payload);
  if (Buffer.byteLength(JSON.stringify(body), 'utf8') >= 128 * 1024) throw new Error('DeepL 한 요청의 텍스트 크기를 넘어서 전송하지 않았습니다.');
  const response = await fetcher(`https://${config.model === 'deepl-free' ? 'api-free' : 'api'}.deepl.com/v2/translate`, { method: 'POST', redirect: 'error', headers: { Authorization: `DeepL-Auth-Key ${config.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(config.timeoutMs) });
  if (!response.ok) throw new Error(`DeepL 요청 실패 (HTTP ${response.status}). API 키와 요금제·이용 한도를 확인하세요.`);
  const value = await response.json();
  if (!Array.isArray(value.translations) || value.translations.length !== (payload.wholeDocument ? 1 : payload.cues.length) || value.translations.some(item => typeof item.text !== 'string')) throw new Error('번역 결과의 구간 ID 또는 내용이 올바르지 않습니다.');
  const cues = payload.wholeDocument ? [...value.translations[0].text.matchAll(/<c\b[^>]*\bid=["']([^"']+)["'][^>]*>([\s\S]*?)<\/c>/g)].map(match => ({ id: decodeURIComponent(match[1]), text: cleanText(match[2]) })) : value.translations.map((item, index) => ({ id: payload.cues[index].id, text: cleanText(item.text) }));
  return { output: JSON.stringify({ cues }), usage: { characters: value.translations.reduce((sum, item) => sum + (Number(item.billed_characters) || 0), 0) } };
}
export async function ollamaTranslation(config, instructions, payload, schema, fetcher) {
  try { await checkLocalModel({ ...config, ollamaUrl: 'http://127.0.0.1:11434' }, fetcher); }
  catch (error) { throw new Error(error.message.replace('local-ai.cmd를 실행해 두세요.', 'Ollama를 실행하세요.').replace('local-ai.cmd에서 모델을 준비하세요.', 'Ollama에서 모델을 준비하세요.')); }
  const response = await fetcher('http://127.0.0.1:11434/api/chat', { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(config.timeoutMs), body: JSON.stringify({ model: config.model, stream: false, think: false, format: schema, keep_alive: '5m', messages: [{ role: 'system', content: instructions }, { role: 'user', content: JSON.stringify(payload) }], options: { temperature: 0, num_ctx: 32768, num_predict: config.maxOutputTokens } }) });
  if (!response.ok) throw new Error(`로컬 번역 실패(HTTP ${response.status}). 모델 설치와 메모리 여유를 확인하세요.`);
  const value = await response.json();
  if (value.done !== true || value.done_reason !== 'stop' || typeof value.message?.content !== 'string') throw new Error('로컬 번역이 끝까지 생성되지 않았습니다. 문장을 줄이거나 출력 한도를 확인하세요.');
  return { output: value.message.content, usage: { input_tokens: value.prompt_eval_count, output_tokens: value.eval_count } };
}
