// Translation languages are independent of the four interface languages.
export const TEXT_LANGUAGES = Object.freeze({
  ko: '한국어', en: 'English', ja: '日本語', 'zh-CN': '简体中文',
  'zh-Hant': '繁體中文', de: 'Deutsch', fr: 'Français', es: 'Español',
  pt: 'Português', ru: 'Русский', th: 'ไทย', vi: 'Tiếng Việt', id: 'Bahasa Indonesia',
});
export const BASE_LANGUAGES = Object.freeze(['ko', 'en', 'ja', 'zh-CN']);
export const EXTRA_LANGUAGES = Object.freeze(Object.keys(TEXT_LANGUAGES).filter(code => !BASE_LANGUAGES.includes(code)));
export const OCR_LANGUAGES = Object.freeze(['en', 'ja', 'zh-CN', 'ko', 'zh-Hant', 'ru']);
export function localizedNames(entry) { return { ...entry.preferred, ...entry.localizedNames }; }
export function selectNames(names, languages) { return Object.fromEntries(Object.entries(names || {}).filter(([language]) => languages.includes(language))); }
export const whisperLanguage = code => code.startsWith('zh-') ? 'zh' : code;
export function subtitleLanguages(code) {
  if (code === 'zh-CN') return ['zh-CN', 'zh-Hans', 'zh', 'zh-orig'];
  if (code === 'zh-Hant') return ['zh-Hant', 'zh-TW', 'zh-HK', 'zh-Hant-orig'];
  return [`${code}-orig`, code];
}
