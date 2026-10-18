import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { GuildVault, validateApiSettings } from '../src/vault.js';
import { API_MODELS, API_MODEL_PRESETS } from '../src/model-presets.js';
import { providerLimits } from './translation-plan.mjs';

export function validateVideoApi(input) {
  if (['gemini', 'openai'].includes(input.provider)) return validateApiSettings(input);
  if (!['deepl', 'ollama'].includes(input.provider)) throw new Error('지원하는 번역 서비스를 선택하세요.');
  if (!Number.isInteger(input.dailyLimit) || input.dailyLimit < 0 || input.dailyLimit > 100000) throw new Error('하루 요청 한도는 0~100000 사이 정수여야 합니다.');
  if (input.provider === 'deepl') {
    if (!['deepl-free', 'deepl-pro'].includes(input.model)) throw new Error('DeepL API Free 또는 Pro를 선택하세요.');
    if (typeof input.apiKey !== 'string' || !/^[\x21-\x7e]{16,512}$/.test(input.apiKey)) throw new Error('API 키는 공백 없이 16~512자로 입력하세요.');
  } else if (typeof input.model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,150}$/.test(input.model) || input.model.includes('://')) throw new Error('설치된 Ollama 로컬 모델 이름을 입력하세요.');
  return { provider: input.provider, model: input.model, dailyLimit: input.dailyLimit, apiKey: input.provider === 'ollama' ? '' : input.apiKey };
}

export function readJson(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
}
export function saveJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.tmp`, JSON.stringify(value, null, 2), { mode: 0o600 });
  renameSync(`${path}.tmp`, path);
}
export class VideoSettings {
  constructor(root, dataDir) {
    this.dataDir = dataDir;
    this.path = join(dataDir, 'settings.json');
    this.options = { speechDevice: 'auto', speechThreads: 0, requestsPerMinute: 1, ...readJson(this.path, { provider: 'gemini', model: API_MODELS.gemini, dailyLimit: 200 }) };
    this.vault = new GuildVault(join(dataDir, 'api-vault.json'), join(root, '.secrets', 'video-api.key'), { validate: validateVideoApi });
  }
  public() {
    const config = this.vault.get('video');
    return { ...this.options, configured: !!config, hasKey: !!config?.apiKey, presets: { ...API_MODEL_PRESETS, deepl: [{ label: 'DeepL API Free', value: 'deepl-free' }, { label: 'DeepL API Pro', value: 'deepl-pro' }], ollama: [] }, usage: readJson(join(this.dataDir, 'usage.json'), {}) };
  }
  save(input) {
    const requestsPerMinute = input.requestsPerMinute ?? this.options.requestsPerMinute;
    if (!Number.isInteger(requestsPerMinute) || requestsPerMinute < 1 || requestsPerMinute > 60) throw new Error('분당 요청 상한은 1~60 사이 정수여야 합니다.');
    const previous = this.vault.get('video');
    const apiKey = typeof input.apiKey === 'string' && input.apiKey.trim() ? input.apiKey.trim() : previous?.provider === input.provider ? previous.apiKey : '';
    const options = { ...this.options, requestsPerMinute, provider: input.provider, model: String(input.model || '').trim(), dailyLimit: Number(input.dailyLimit) };
    this.vault.set('video', { ...options, apiKey });
    this.options = options; saveJson(this.path, options);
    return this.public();
  }
  clear() { this.vault.delete('video'); }
  saveSpeech(input) {
    if (!['auto', 'cpu', 'vulkan'].includes(input.speechDevice) || !Number.isInteger(input.speechThreads) || input.speechThreads < 0 || input.speechThreads > 256) throw new Error('음성 인식 장치와 CPU 작업 수를 확인하세요.');
    this.options = { ...this.options, speechDevice: input.speechDevice, speechThreads: input.speechThreads };
    saveJson(this.path, this.options); return this.public();
  }
  private() {
    const config = this.vault.get('video');
    if (!config) throw new Error('설정에서 번역 API 키와 모델을 먼저 등록하세요.');
    return { ...config, requestsPerMinute: this.options.requestsPerMinute, timeoutMs: 15 * 60000, maxOutputTokens: providerLimits(config).output };
  }
}
export class VideoUsage {
  constructor(dataDir) { this.path = join(dataDir, 'usage.json'); }
  reserve(limit) {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const all = readJson(this.path, {});
    const current = all[day] || { requests: 0, inputTokens: 0, outputTokens: 0 };
    if (current.requests >= limit) throw new Error('오늘의 번역 요청 한도에 도달했습니다. 설정의 한도를 확인하세요.');
    current.requests++; all[day] = current; saveJson(this.path, all); return day;
  }
  record(day, usage = {}) {
    const all = readJson(this.path, {});
    if (!all[day]) return;
    all[day].inputTokens += Number(usage.input_tokens || 0);
    all[day].outputTokens += Number(usage.output_tokens || 0);
    all[day].characters = (all[day].characters || 0) + Number(usage.characters || 0);
    saveJson(this.path, all);
  }
}
