import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { UserError } from './config.js';
import { API_MODELS } from './model-presets.js';

export { API_MODELS };
export function validateApiSettings({ provider, apiKey, model, dailyLimit }) {
  if (!Object.hasOwn(API_MODELS, provider)) throw new UserError('Gemini 또는 OpenAI를 선택하세요.');
  if (typeof apiKey !== 'string' || !/^[\x21-\x7e]{16,512}$/.test(apiKey)) throw new UserError('API 키는 공백 없이 16~512자로 입력하세요.');
  if (typeof model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,79}$/.test(model)) throw new UserError('모델 이름을 확인하세요. URL이나 API 키를 넣지 마세요.');
  if (!(provider === 'gemini' ? /^gemini-/ : /^(?:gpt-|chatgpt-|o[1-9](?:-|$))/).test(model)) throw new UserError('선택한 서비스의 모델 이름을 입력하세요.');
  if (!Number.isInteger(dailyLimit) || dailyLimit < 0 || dailyLimit > 100000) throw new UserError('하루 요청 한도는 0~100000 사이 정수여야 합니다.');
  return { provider, apiKey, model, dailyLimit };
}

// The bot host necessarily has access to the decryption key. Encryption protects
// a copied vault file, not a compromised host. No plaintext key is persisted here.
export class GuildVault {
  constructor(path, keyPath, { validate = validateApiSettings } = {}) {
    this.path = path;
    this.validate = validate;
    const existing = existsSync(path);
    try { this.data = existing ? JSON.parse(readFileSync(path, 'utf8')) : { version: 1, guilds: {} }; }
    catch { throw new UserError('서버 API 설정 파일을 읽지 못했습니다. 기존 파일은 유지했습니다.'); }
    if (this.data.version !== 1 || !this.data.guilds || typeof this.data.guilds !== 'object') throw new UserError('서버 API 설정 파일 형식이 잘못되었습니다.');
    try {
      if (!existsSync(keyPath)) {
        if (existing) throw new Error('missing key');
        mkdirSync(dirname(keyPath), { recursive: true });
        writeFileSync(keyPath, randomBytes(32), { flag: 'wx', mode: 0o600 });
      }
      this.key = readFileSync(keyPath);
      if (this.key.length !== 32) throw new Error('bad key');
    } catch { throw new UserError('API 암호화 키를 읽지 못했습니다. .secrets/api-vault.key를 복원하세요. 새 키로 덮어쓰지 않았습니다.'); }
  }
  has(guildId) { return Object.hasOwn(this.data.guilds, guildId); }
  get(guildId) {
    if (!this.has(guildId)) return undefined;
    const entry = this.data.guilds[guildId];
    if (entry.disabled === true) return null;
    try {
      const cipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(entry.iv, 'base64'));
      cipher.setAAD(Buffer.from(guildId));
      cipher.setAuthTag(Buffer.from(entry.tag, 'base64'));
      return this.validate(JSON.parse(Buffer.concat([cipher.update(Buffer.from(entry.data, 'base64')), cipher.final()]).toString('utf8')));
    } catch { throw new UserError('이 서버의 API 설정을 복호화하지 못했습니다. 관리자가 /zzz api-set으로 다시 등록하세요.'); }
  }
  commit(guildId, entry) {
    const next = { ...this.data, guilds: { ...this.data.guilds, [guildId]: entry } };
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(`${this.path}.tmp`, JSON.stringify(next), { mode: 0o600 });
    renameSync(`${this.path}.tmp`, this.path);
    this.data = next;
  }
  set(guildId, input) {
    const value = this.validate(input);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(guildId));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    this.commit(guildId, { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') });
  }
  delete(guildId) {
    // Keep a disabled marker so deletion never silently reactivates an .env key.
    this.commit(guildId, { disabled: true });
  }
  forget(guildId) {
    if (!this.has(guildId)) return;
    const next = { ...this.data, guilds: { ...this.data.guilds } };
    delete next.guilds[guildId];
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(`${this.path}.tmp`, JSON.stringify(next), { mode: 0o600 });
    renameSync(`${this.path}.tmp`, this.path);
    this.data = next;
  }
}
