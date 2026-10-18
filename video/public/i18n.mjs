import { translations } from './locales.mjs';

export const UI_LANGUAGES = Object.freeze({ ko: '한국어', en: 'English', ja: '日本語', 'zh-CN': '简体中文' });
export const UI_LANGUAGE_STORAGE_KEY = 'zzz-ui-language';
export function resolveLocale(preferences = []) {
  for (const value of Array.isArray(preferences) ? preferences : [preferences]) {
    const base = String(value || '').toLowerCase().split(/[-_]/)[0];
    const locale = base === 'zh' ? 'zh-CN' : base;
    if (Object.hasOwn(UI_LANGUAGES, locale)) return locale;
  }
  return 'en';
}
const placeholders = /\{([A-Za-z][A-Za-z0-9]*)\}/g;
const patterns = Object.keys(translations.en).filter(key => /\{[A-Za-z]/.test(key)).map(key => {
  const names = [];
  const pattern = key.split(placeholders).map((part, index) => {
    if (index % 2) { names.push(part); return '([\\s\\S]*?)'; }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  return { key, names, regex: new RegExp(`^${pattern}$`) };
});
export function createI18n(preferences) {
  let locale = resolveLocale(preferences);
  const t = (key, values = {}) => {
    const template = locale === 'ko' ? key : translations[locale][key] ?? key;
    return template.replace(placeholders, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
  };
  return {
    get locale() { return locale; },
    setLocale(preference) { locale = resolveLocale(preference); return locale; },
    t,
    // Only pass program messages here. User titles, subtitles and drafts stay untouched.
    message(value) {
      const text = String(value || '');
      if (Object.hasOwn(translations.en, text)) return t(text);
      for (const { key, names, regex } of patterns) {
        const match = regex.exec(text);
        if (match) return t(key, Object.fromEntries(names.map((name, index) => [name, match[index + 1]])));
      }
      return text;
    }
  };
}

// Capture only the initial HTML, before any user content or API responses are
// inserted. Text-node bindings preserve icons, links and nested emphasis.
export function bindDocument(document, i18n) {
  const bindings = [];
  const walker = document.createTreeWalker(document.documentElement, 4);
  let current;
  while ((current = walker.nextNode())) {
    if (current.parentElement?.closest('script, style, textarea, code, [data-i18n-skip]')) continue;
    const key = current.textContent.trim();
    if (Object.hasOwn(translations.en, key)) {
      const source = current.textContent, target = current;
      bindings.push(() => { target.textContent = source.replace(key, () => i18n.t(key)); });
    }
  }
  for (const element of document.querySelectorAll('[placeholder], [title], [aria-label]')) {
    for (const attribute of ['placeholder', 'title', 'aria-label']) {
      const key = element.getAttribute(attribute);
      if (key && Object.hasOwn(translations.en, key)) bindings.push(() => element.setAttribute(attribute, i18n.t(key)));
    }
  }
  return () => { document.documentElement.lang = i18n.locale; for (const apply of bindings) apply(); };
}
