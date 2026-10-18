import { Translator } from './translator.js';
import { UserError } from './config.js';

export class GuildTranslator {
  constructor(config, store, vault, glossaryPath, fetcher = fetch) {
    Object.assign(this, { config, store, vault, glossaryPath, fetcher });
  }
  resolve(guildId) {
    if (!guildId) throw new UserError('서버 안에서만 번역할 수 있습니다.');
    if (this.vault.has(guildId)) {
      const saved = this.vault.get(guildId);
      if (saved) return { ...this.config, ...saved, guildId };
    } else if (guildId === this.config.guildId && (this.config.provider === 'ollama' || this.config.apiKey)) {
      // Legacy .env configuration is private to the explicitly named owner server.
      return { ...this.config };
    }
    throw new UserError('이 서버의 번역 API가 설정되지 않았습니다. 서버 관리자가 /zzz api-set으로 등록하세요.');
  }
  status(guildId) {
    if (this.vault.has(guildId) && !this.vault.get(guildId)) return { configured: false, disabled: true };
    try {
      const { provider, model, dailyLimit } = this.resolve(guildId);
      return { configured: true, provider, model, dailyLimit, source: this.vault.has(guildId) ? 'Discord' : '.env' };
    } catch (error) {
      if (this.vault.has(guildId)) throw error;
      return { configured: false };
    }
  }
  translate({ guildId, ...input }) {
    const config = this.resolve(guildId);
    return new Translator(config, this.store.scoped(guildId), this.glossaryPath, this.fetcher).translate(input);
  }
}
