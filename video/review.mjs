export function reviewTime(value) {
  const text = String(value).trim(); if (!text) return null;
  if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text) * 1000;
  const parts = text.split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some(p => !/^\d+(?:\.\d+)?$/.test(p)) || parts.slice(1).some(p => Number(p) >= 60)) return NaN;
  return parts.reduce((n, p) => n * 60 + Number(p), 0) * 1000;
}
export function reviewCues(cues, { track = 'speech', search = '', timeMs = null } = {}) {
  const normalize = value => String(value).normalize('NFKC').toLowerCase(), query = normalize(search).trim();
  return cues.filter(cue => (track === 'deleted' ? cue.excluded === true : !cue.excluded)
    && (track === 'all' || track === 'deleted' || (cue.kind === 'screen' ? 'screen' : 'speech') === track)
    && (!query || (/^#\d+$/.test(query) ? query === `#${cue.id}` : normalize(`${cue.sourceText}\n${cue.translatedText || ''}\n#${cue.id}`).includes(query)))
    && (timeMs === null || cue.startMs <= timeMs && cue.endMs > timeMs));
}
