import { BASE_LANGUAGES, EXTRA_LANGUAGES, TEXT_LANGUAGES } from './languages.js';
import { nameAliases } from './glossary-names.js';

export const normalizedName = value => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
export function applyCommunityDrafts(catalog, community) {
  const drafts = new Map();
  for (const entry of community.entries) {
    if (!entry.communityPreferredDrafts) continue;
    if (Object.entries(entry.communityPreferredDrafts).some(([lang, value]) => !EXTRA_LANGUAGES.includes(lang) || value !== null && (typeof value !== 'string' || value.length > 1000))) throw new Error('Invalid community language drafts');
    drafts.set(entry.targetId ?? entry.id, entry.communityPreferredDrafts);
  }
  return { ...catalog, entries: catalog.entries.map(entry => drafts.has(entry.id) ? { ...entry, communityPreferredDrafts: { ...drafts.get(entry.id) } } : entry) };
}
export function validLocalizedName(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 1000
    && !/<[^>]*>|\{[^}]*\}|\(Test\d*\)|_JP\d*F|[\u0000-\u001f]/i.test(value)
    && !/^(?:Item_|Avatar_|OfficialName_|BriefName_|test\b)/i.test(value);
}
export function applyLocalizations(catalog, input) {
  if (input?.version !== 1 || !Array.isArray(input.entries)) throw new Error('Invalid localization input');
  const seen = new Set();
  for (const row of input.entries) {
    if (!row.id || seen.has(row.id) || !BASE_LANGUAGES.every(lang => validLocalizedName(row.base?.[lang]))
      || !row.names || !Object.keys(row.names).length || Object.entries(row.names).some(([lang, name]) => !EXTRA_LANGUAGES.includes(lang) || !validLocalizedName(name))) throw new Error(`Invalid localization row: ${row.id}`);
    seen.add(row.id);
  }
  const byId = new Map(input.entries.map(row => [row.id, row]));
  const applied = [], held = [];
  const entries = catalog.entries.map(original => {
    const entry = { ...original }, row = byId.get(entry.id);
    if (!row) return entry;
    if (entry.releaseStatus !== 'live' || !BASE_LANGUAGES.every(lang => normalizedName(row.base[lang]) === normalizedName(entry.preferred?.[lang]))) {
      held.push({ id: entry.id, reason: entry.releaseStatus !== 'live' ? 'live-unconfirmed' : 'base-names-changed' });
      delete entry.localizedNames;
      return entry;
    }
    entry.localizedNames = { ...row.names };
    entry.aliases = [...new Set([...entry.aliases, ...nameAliases(row.names, entry.category)])];
    applied.push({ id: entry.id, languages: Object.keys(row.names) });
    return entry;
  });
  const coverage = Object.fromEntries(Object.keys(TEXT_LANGUAGES).map(lang => [lang, entries.filter(entry => (entry.localizedNames?.[lang] || entry.preferred?.[lang])).length]));
  return { catalog: { ...catalog, textLanguages: Object.keys(TEXT_LANGUAGES), localizationCoverage: coverage, entries }, report: { applied, held } };
}
