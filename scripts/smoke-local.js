// Synthetic examples only. Never connects to Discord or a paid AI provider.
import { settings } from '../src/config.js';
import { Translator } from '../src/translator.js';
import { writeFileSync, mkdirSync } from 'node:fs';
const config = settings({ TRANSLATION_PROVIDER: 'ollama', OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'qwen3:8b' }, { requireSecrets: false });
const store = { reserve() { return 'test'; }, recordUsage() {} };
const translator = new Translator(config, store, new URL('../glossary/zzz.json', import.meta.url));
const examples = [
  { text: 'Use QA after the EX Special Attack.', sourceLanguage: 'en', targets: ['ko', 'ja', 'zh-CN'] },
  { text: 'EBA does not always mean holding the Basic Attack button.', sourceLanguage: 'en', targets: ['ko'] },
  { text: '빠른 지원을 쓰고 앤비로 교대해.', sourceLanguage: 'ko', targets: ['en', 'ja', 'zh-CN'] },
  { text: '極限回避の後に回避反撃を使って。', sourceLanguage: 'ja', targets: ['ko'] },
  { text: '先用强化特殊技，再触发快速支援。', sourceLanguage: 'zh-CN', targets: ['ko'] },
];
const results = [];
for (const example of examples) {
  const start = performance.now();
  const translations = await translator.translate(example);
  const seconds = Math.round((performance.now() - start) / 100) / 10;
  results.push({ ...example, translations, seconds });
  console.log(JSON.stringify(results.at(-1)));
}
mkdirSync('.tools', { recursive: true });
writeFileSync('.tools/local-smoke.json', JSON.stringify({ model: config.model, results }, null, 2));
