import { nameAliases } from './glossary-names.js';

export const TERM_TAGS = Object.freeze(['official', 'unofficial', 'needs-review']);
const officialStatuses = new Set(['source-matched', 'prerelease-source-matched', 'source-supported-curated']);
const normalize = value => String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
const tagMap = (names, fallback, overrides = {}) => Object.fromEntries(Object.keys(names || {}).map(language => [language, overrides[language] || fallback]));
const zeroCounts = () => Object.fromEntries(TERM_TAGS.map(tag => [tag, 0]));

export function applyTermTags(catalog, community, policy) {
  if (catalog?.version !== 1 || !Array.isArray(catalog.entries) || community?.version !== 1 || !Array.isArray(community.entries)
    || policy?.version !== 1 || !Array.isArray(policy.entries)) throw new Error('Invalid terminology classification input');
  const byId = new Map(catalog.entries.map(entry => [entry.id, entry])), overrides = new Map(), communityById = new Map(), standalone = new Set();
  for (const row of policy.entries) {
    const entry = byId.get(row.id);
    if (!entry || overrides.has(row.id) || Object.keys(row).some(key => !['id', 'default', 'names', 'localizedNames', 'aliases', 'communityOutputs', 'reviewedAt', 'note'].includes(key))
      || row.default !== undefined && !TERM_TAGS.includes(row.default)) throw new Error('Invalid terminology classification override: ' + row.id);
    for (const [role, original] of [['names', entry.preferred], ['localizedNames', entry.localizedNames], ['aliases', Object.fromEntries(entry.aliases.map(alias => [alias, true]))], ['communityOutputs', entry.communityPreferred]]) {
      const values = row[role];
      if (values !== undefined && (!values || Array.isArray(values) || typeof values !== 'object' || Object.entries(values).some(([key, tag]) => !Object.hasOwn(original || {}, key) || !TERM_TAGS.includes(tag)))) throw new Error('Invalid terminology classification role: ' + row.id + '/' + role);
    }
    overrides.set(row.id, row);
  }
  for (const row of community.entries) {
    const target = row.targetId ?? (row.id === 'quick-assist' ? 'combat:quick-assist' : row.id);
    if (!row.targetId && row.id !== 'quick-assist') standalone.add(target);
    const aliases = communityById.get(target) || new Set();
    for (const alias of row.aliases || []) aliases.add(normalize(alias));
    communityById.set(target, aliases);
  }
  const counts = { entries: zeroCounts(), names: zeroCounts(), aliases: zeroCounts(), communityOutputs: zeroCounts() };
  const entries = catalog.entries.map(entry => {
    const override = overrides.get(entry.id) || {};
    const fallback = override.default || (!standalone.has(entry.id) && officialStatuses.has(entry.status) ? 'official' : 'needs-review');
    const names = tagMap(entry.preferred, fallback, override.names), extraNames = tagMap(entry.localizedNames, fallback, override.localizedNames);
    const forms = Object.fromEntries(TERM_TAGS.map(tag => [tag, new Set()]));
    for (const [values, tags] of [[entry.preferred, names], [entry.localizedNames, extraNames]]) for (const [language, value] of Object.entries(values || {})) {
      for (const alias of nameAliases({ [language]: value }, entry.category)) forms[tags[language]].add(normalize(alias));
    }
    if (fallback === 'official') for (const item of entry.nameHistory || []) for (const alias of nameAliases(item.preferred || {}, entry.category)) forms.official.add(normalize(alias));
    const classify = value => {
      const text = normalize(value);
      if (forms.official.has(text)) return 'official';
      if (forms['needs-review'].has(text)) return 'needs-review';
      if (forms.unofficial.has(text) || communityById.get(entry.id)?.has(text)) return 'unofficial';
      return 'needs-review';
    };
    const aliases = Object.fromEntries(TERM_TAGS.map(tag => [tag, []]));
    for (const alias of new Set(entry.aliases)) aliases[override.aliases?.[alias] || classify(alias)].push(alias);
    const communityOutputs = Object.fromEntries(Object.entries(entry.communityPreferred || {}).map(([language, value]) => {
      // Community style may use the full official name. A style is not evidence
      // that an unchanged official spelling has become an unofficial expression.
      const tag = override.communityOutputs?.[language] || (forms.official.has(normalize(value)) ? 'official'
        : forms['needs-review'].has(normalize(value)) ? 'needs-review' : 'unofficial');
      return [language, tag];
    }));
    const tags = TERM_TAGS.filter(tag => Object.values(names).includes(tag) || Object.values(extraNames).includes(tag) || aliases[tag].length || Object.values(communityOutputs).includes(tag));
    for (const tag of tags) counts.entries[tag]++;
    for (const tag of [...Object.values(names), ...Object.values(extraNames)]) counts.names[tag]++;
    for (const tag of TERM_TAGS) counts.aliases[tag] += aliases[tag].length;
    for (const tag of Object.values(communityOutputs)) counts.communityOutputs[tag]++;
    return { ...entry, tags, classification: { version: 1, names, ...(Object.keys(extraNames).length ? { localizedNames: extraNames } : {}), aliases,
      ...(Object.keys(communityOutputs).length ? { communityOutputs } : {}) } };
  });
  return { ...catalog, classificationVersion: 1, classificationCounts: counts, entries };
}
