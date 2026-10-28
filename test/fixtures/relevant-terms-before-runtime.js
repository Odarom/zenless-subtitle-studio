// Reference matcher preserved from runner 0.3.2 before runtime optimization.
export function relevantTerms(entries, text, limit = 30) {
  const matches = entries.filter(e => e.autoUse !== false).map(entry => ({ entry, spans: entry.aliases.flatMap(alias => {
    // Percent signs and hyphens are part of aliases too: ATK% must not
    // accidentally match CATK%, and flat ATK must not match flat ATKfoo.
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const bounded = /^[\x20-\x7e]+$/.test(alias) && /[a-z0-9]/i.test(alias);
    // Build notation commonly attaches a roll count to these flat-stat names
    // (3fpen, 4fatk). Keep ordinary aliases' word boundaries intact.
    const compactStat = ['stat-flat-atk', 'stat-flat-pen'].includes(entry.id) && /^(?:fatk|fpen)$/i.test(alias);
    const prefix = compactStat ? '(?:\\d+(?:\\.\\d+)?\\s*)?' : '';
    const pattern = new RegExp(bounded ? `(?<![a-z0-9])${prefix}${escaped}(?![a-z0-9])` : escaped, 'giu');
    return [...text.matchAll(pattern)].map(match => ({ start: match.index, end: match.index + match[0].length, length: match[0].length }));
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
