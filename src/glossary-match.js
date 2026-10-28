// Shared literal matcher for the translation apps and public database SDK.
// Keep selection behavior here identical for both consumers.
const searchIndexes = new WeakMap();
function candidateAliases(entries, text) {
  // Mutable callers retain matching behavior after edits between calls.
  if (!Object.isFrozen(entries) || !entries.every(entry => Object.isFrozen(entry) && Object.isFrozen(entry.aliases))) return null;
  let groups = searchIndexes.get(entries);
  if (!groups) {
    const aliases = [...new Set(entries.filter(entry => entry.autoUse !== false).flatMap(entry => entry.aliases))].sort((a, b) => a.length - b.length);
    groups = [];
    for (let offset = 0; offset < aliases.length; offset += 128) {
      const names = aliases.slice(offset, offset + 128);
      groups.push({ names, pattern: new RegExp(names.map(alias => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'iu') });
    }
    searchIndexes.set(entries, groups);
  }
  const candidates = new Set();
  // This coarse filter cannot reject a literal match. Original patterns below
  // still decide word boundaries, numeric prefixes, spans and ordering.
  for (const group of groups) if (group.pattern.test(text)) for (const alias of group.names) candidates.add(alias);
  return candidates;
}

function aliasPattern(entry, alias) {
    // Percent signs and hyphens are part of aliases too: ATK% must not
    // accidentally match CATK%, and flat ATK must not match flat ATKfoo.
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const bounded = /^[\x20-\x7e]+$/.test(alias) && /[a-z0-9]/i.test(alias);
    // Build notation commonly attaches a roll count to these flat-stat names
    // (3fpen, 4fatk). Keep ordinary aliases' word boundaries intact.
    const compactStat = ['stat-flat-atk', 'stat-flat-pen'].includes(entry.id) && /^(?:fatk|fpen)$/i.test(alias);
    const prefix = compactStat ? '(?:\\d+(?:\\.\\d+)?\\s*)?' : '';
    return new RegExp(bounded ? `(?<![a-z0-9])${prefix}${escaped}(?![a-z0-9])` : escaped, 'giu');
}

// Preserve the link from an observed input expression to all its candidate
// concepts without sending aliases that did not occur in the supplied text.
export function matchedAliases(entry, text) {
  if (text === '') return [];
  return [...new Set(entry.aliases.filter(alias => aliasPattern(entry, alias).test(text)))];
}

export function relevantTerms(entries, text, limit = 30) {
  if (text === '') return [];
  const candidates = candidateAliases(entries, text);
  const matches = entries.filter(e => e.autoUse !== false).map(entry => ({ entry, spans: entry.aliases.flatMap(alias => {
    if (candidates && !candidates.has(alias)) return [];
    return [...text.matchAll(aliasPattern(entry, alias))].map(match => ({ start: match.index, end: match.index + match[0].length, length: match[0].length }));
  }) })).filter(match => match.spans.length);
  const spans = matches.filter(match => match.entry.category !== 'community').flatMap(match => match.spans);
  // A name inside a longer name is not another occurrence of that concept:
  // Deadly Assault must not also retrieve the physical anomaly Assault.
  // Equal spans retain ambiguous meanings; a separate short occurrence survives.
  // Community combo/hold expressions also need their individual combat actions.
  return matches.map(match => ({ entry: match.entry, specificity: Math.max(0, ...match.spans
    .filter(span => !spans.some(other => other.length > span.length && other.start <= span.start && other.end >= span.end))
    .map(span => span.length)) }))
    .filter(match => match.specificity > 0).sort((a, b) => b.specificity - a.specificity).slice(0, limit).map(match => match.entry);
}

