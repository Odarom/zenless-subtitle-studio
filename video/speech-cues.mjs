// Reading-sized speech captions are derived locally from completed translations.
// Keep the original cue for editing/reporting; never split the translation request.
const normalize = text => String(text || '').replace(/\s+/gu, ' ').trim();
const wide = /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Extended_Pictographic}]/u;
const weight = text => [...text].reduce((sum, char) => sum + (wide.test(char) ? 2 : 1), 0);
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const words = new Intl.Segmenter(undefined, { granularity: 'word' });
const sentences = new Intl.Segmenter(undefined, { granularity: 'sentence' });

function boundaries(text) {
  const ranks = new Map();
  for (const item of words.segment(text)) ranks.set(item.index + item.segment.length, /\s$/u.test(item.segment) ? 2 : 3);
  for (const item of sentences.segment(text)) ranks.set(item.index + item.segment.length, 0);
  let units = 0;
  return [...graphemes.segment(text)].map(item => {
    units += weight(item.segment);
    const end = item.index + item.segment.length;
    const clause = /[,;:，、；：]$/u.test(item.segment) && !/\d/u.test(text[end - 2] || '') ? 1 : undefined;
    return { end, units, rank: Math.min(ranks.get(end) ?? 4, clause ?? 4) };
  });
}

// Prefer sentence/clause/word boundaries near each reading-length target. All
// characters are retained, including scripts without spaces and emoji clusters.
function partition(text, count, fractions) {
  if (count === 1) return [text];
  const points = boundaries(text), total = points.at(-1)?.units || 0;
  if (points.length < count) return null;
  const parts = []; let previous = -1;
  for (let index = 1; index < count; index++) {
    const ideal = total * (fractions?.[index - 1] ?? index / count);
    const span = total / count;
    const maximum = points.length - (count - index) - 1;
    let best = previous + 1, score = Infinity;
    for (let i = previous + 1; i <= maximum; i++) {
      const point = points[i], distance = Math.abs(point.units - ideal);
      const candidate = distance + point.rank * span * .065;
      if (candidate < score) { score = candidate; best = i; }
      if (point.units > ideal + span * .3 && i > previous + 1) break;
    }
    parts.push(text.slice(previous < 0 ? 0 : points[previous].end, points[best].end).trim()); previous = best;
  }
  parts.push(text.slice(points[previous].end).trim());
  return parts.every(Boolean) ? parts : null;
}

function readingParts(text, maximum) {
  const points = boundaries(text), parts = []; let previous = -1, base = 0;
  while (previous < points.length - 1) {
    if (points.at(-1).units - base <= 84) { parts.push(text.slice(previous < 0 ? 0 : points[previous].end)); break; }
    let last = previous + 1;
    while (last + 1 < points.length && points[last + 1].units - base <= 84) last++;
    // Use the last sentence ending that fits; otherwise prefer a clause or word.
    let best = -1;
    for (const [rank, minimum] of [[0,18],[1,35],[2,42],[3,42],[4,0]]) {
      for (let i = last; i > previous; i--) if (points[i].rank <= rank && points[i].units - base >= minimum) { best = i; break; }
      if (best >= 0) break;
    }
    parts.push(text.slice(previous < 0 ? 0 : points[previous].end, points[best].end));
    previous = best; base = points[best].units;
  }
  // A very short source interval cannot fit arbitrarily many readable pieces.
  // Merge the smallest neighbours, retaining every character and the interval.
  while (parts.length > maximum) {
    let best = 0, smallest = Infinity;
    for (let i = 0; i < parts.length - 1; i++) { const size = weight(parts[i]) + weight(parts[i+1]); if (size < smallest) {smallest = size; best = i;} }
    parts.splice(best, 2, parts[best] + parts[best+1]);
  }
  return parts.length ? parts.map(part => part.trim()) : [text];
}

export function speechDisplayCues(cues, { mode = 'translated' } = {}) {
  return cues.filter(cue => !cue.excluded && cue.kind !== 'screen').flatMap(cue => {
    const source = normalize(cue.sourceText), translated = normalize(cue.translatedText || cue.sourceText);
    const primary = mode === 'source' ? source : translated;
    const duration = cue.endMs - cue.startMs;
    // About 42 CJK characters / 84 Latin characters, at natural boundaries.
    // Avoid flashing through dense text faster than 0.9s per piece.
    let maximum = Math.max(1, Math.floor(duration / 900)), parts, secondary;
    do { parts = readingParts(primary, maximum--); }
    while (mode === 'bilingual' && !(secondary = partition(source, parts.length)));
    const count = parts.length;
    const total = parts.reduce((sum, part) => sum + weight(part), 0) || 1;
    let cumulative = 0;
    const fractions = parts.slice(0, -1).map(part => (cumulative += weight(part)) / total);
    if (mode === 'bilingual') secondary = partition(source, count, fractions) || secondary;
    let startMs = cue.startMs;
    return parts.map((text, index) => {
      const endMs = index === count - 1 ? cue.endMs : Math.max(startMs + 1, cue.startMs + Math.round(duration * fractions[index]));
      const result = { ...cue, startMs, endMs, sourceText: mode === 'source' ? text : secondary?.[index] ?? source,
        translatedText: mode === 'source' ? undefined : text, parentCue: cue };
      startMs = endMs; return result;
    });
  });
}
