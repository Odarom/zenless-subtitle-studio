export function regionOf(box, width, height) {
  if (!Array.isArray(box) || box.length !== 4 || !box.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) return null;
  const xs = box.map(point => point[0] / width), ys = box.map(point => point[1] / height);
  const x = Math.max(0, Math.min(1, Math.min(...xs))), y = Math.max(0, Math.min(1, Math.min(...ys)));
  const w = Math.max(0, Math.min(1 - x, Math.max(...xs) - x)), h = Math.max(0, Math.min(1 - y, Math.max(...ys) - y));
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}
export class ScreenTracker {
  constructor(intervalMs, { minConfidence = 0.75 } = {}) { this.intervalMs = intervalMs; this.minConfidence = minConfidence; this.active = []; this.finished = []; }
  update(timeMs, detections, width, height) {
    const next = [], used = new Set();
    for (const item of detections) {
      if (typeof item.text !== 'string' || item.text.length > 6000 || !/\p{L}/u.test(item.text) || !Number.isFinite(item.score) || item.score < this.minConfidence) continue;
      const region = regionOf(item.box, width, height); if (!region) continue;
      const key = item.text.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
      let match, distance = Infinity;
      for (const track of this.active) {
        if (used.has(track) || track.key !== key) continue;
        const last = track.positions.at(-1), delta = Math.hypot(last.x - region.x, last.y - region.y);
        if (delta < 0.08 && delta < distance) { match = track; distance = delta; }
      }
      if (match) {
        used.add(match); match.endMs = timeMs + this.intervalMs;
        const last = match.positions.at(-1);
        if (Math.max(...['x', 'y', 'w', 'h'].map(k => Math.abs(last[k] - region[k]))) > 0.003) match.positions.push({ timeMs, ...region });
        if (item.score > match.confidence) { match.confidence = item.score; match.sourceText = item.text.trim(); }
        next.push(match);
      } else {
        next.push({ key, kind: 'screen', sourceText: item.text.trim(), startMs: timeMs, endMs: timeMs + this.intervalMs, region, positions: [{ timeMs, ...region }], confidence: item.score });
      }
    }
    for (const track of this.active) if (!used.has(track)) { track.endMs = timeMs; this.finished.push(track); }
    this.active = next;
    if (this.finished.length + this.active.length > 50000) throw new Error('화면 글자가 너무 많습니다. 분석 구간을 줄이세요.');
  }
  finish(durationMs) {
    return [...this.finished, ...this.active].map(({ key, ...cue }) => ({ ...cue, endMs: Math.min(cue.endMs, durationMs) })).filter(cue => cue.endMs > cue.startMs).sort((a, b) => a.startMs - b.startMs || a.region.y - b.region.y || a.region.x - b.region.x);
  }
}
