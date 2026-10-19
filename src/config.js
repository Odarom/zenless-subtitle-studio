export class UserError extends Error {}

export { TEXT_LANGUAGES as LANGUAGES } from './languages.js';

export function settings(env = process.env, { requireSecrets = true, requireTranslation = true } = {}) {
  const apiMode = env.API_MODE || 'server';
  if (!['server', 'runner'].includes(apiMode)) throw new UserError('API_MODE는 server 또는 runner여야 합니다.');
  const provider = env.TRANSLATION_PROVIDER || 'ollama';
  if (!['ollama', 'gemini', 'openai'].includes(provider)) throw new UserError('TRANSLATION_PROVIDER는 ollama, gemini, openai 중 하나여야 합니다.');
  const required = ['DISCORD_TOKEN', 'DISCORD_APPLICATION_ID'];
  if (requireTranslation && provider === 'openai') required.push('OPENAI_API_KEY');
  if (requireTranslation && provider === 'gemini') required.push('GEMINI_API_KEY');
  const missing = required.filter(key => !env[key]?.trim());
  if (requireSecrets && missing.length) throw new UserError(`.env에 다음 항목을 입력하세요: ${missing.join(', ')}`);
  for (const key of ['DISCORD_APPLICATION_ID', 'DISCORD_GUILD_ID']) {
    if (env[key] && !/^\d{17,20}$/.test(env[key])) throw new UserError(`${key}는 Discord에서 복사한 숫자 ID여야 합니다.`);
  }
  const integer = (key, fallback, min, max) => {
    const n = Number(env[key] ?? fallback);
    if (!Number.isInteger(n) || n < min || n > max) throw new UserError(`${key}: ${min}~${max} 범위의 정수를 입력하세요.`);
    return n;
  };
  const style = env.TRANSLATION_STYLE || 'community';
  if (!['official', 'community'].includes(style)) throw new UserError('TRANSLATION_STYLE은 official 또는 community여야 합니다.');
  let localUrl;
  try {
    localUrl = new URL(env.OLLAMA_URL || 'http://127.0.0.1:11434');
    if (localUrl.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(localUrl.hostname) || localUrl.username || localUrl.password || localUrl.pathname !== '/' || localUrl.search || localUrl.hash) throw new Error();
  } catch { throw new UserError('OLLAMA_URL은 이 PC의 주소여야 합니다. 기본값: http://127.0.0.1:11434'); }
  const localModel = env.OLLAMA_MODEL || 'qwen3:8b';
  if (!/^[a-zA-Z0-9._:/-]+$/.test(localModel) || /cloud/i.test(localModel)) throw new UserError('OLLAMA_MODEL에는 다운로드한 로컬 모델 이름을 입력하세요. 클라우드 모델은 사용할 수 없습니다.');
  return {
    token: env.DISCORD_TOKEN, applicationId: env.DISCORD_APPLICATION_ID, apiMode,
    guildId: env.DISCORD_GUILD_ID, apiKey: provider === 'gemini' ? env.GEMINI_API_KEY : provider === 'openai' ? env.OPENAI_API_KEY : undefined,
    provider, ollamaUrl: localUrl.origin,
    model: provider === 'ollama' ? localModel : provider === 'gemini' ? env.GEMINI_MODEL || 'gemini-3-flash-preview' : env.OPENAI_MODEL || 'gpt-4.1-mini', style,
    localContext: integer('OLLAMA_CONTEXT_LENGTH', 16384, 4096, 32768),
    dailyLimit: integer('DAILY_REQUEST_LIMIT', 200, 0, 100000),
    maxChars: integer('MAX_MESSAGE_CHARS', 2000, 1, 2000),
    contextMessages: integer('CONTEXT_MESSAGES', 4, 0, 10),
    maxOutputTokens: integer('MAX_OUTPUT_TOKENS', 3000, 256, 12000),
    timeoutMs: integer('API_TIMEOUT_MS', provider === 'ollama' ? 120000 : provider === 'gemini' ? 60000 : 30000, 1000, 300000),
  };
}
