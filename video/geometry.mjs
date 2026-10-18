export function validRegion(region) {
  return !!region && ['x', 'y', 'w', 'h'].every(key => Number.isFinite(region[key])) && region.x >= 0 && region.y >= 0 && region.w > 0 && region.h > 0 && region.x + region.w <= 1.000001 && region.y + region.h <= 1.000001;
}
export function videoContentRect(rect, width, height, fit = 'contain') {
  if (!(width > 0 && height > 0 && rect.width > 0 && rect.height > 0)) return rect;
  const scale = fit === 'cover' ? Math.max(rect.width / width, rect.height / height) : Math.min(rect.width / width, rect.height / height);
  return { left: rect.left + (rect.width - width * scale) / 2, top: rect.top + (rect.height - height * scale) / 2, width: width * scale, height: height * scale };
}
export function cueRegionAt(cue, timeMs) {
  const positions = cue.positions || []; let lo = 0, hi = positions.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (positions[mid].timeMs <= timeMs) lo = mid + 1; else hi = mid; }
  return positions[Math.max(0, lo - 1)] || cue.region;
}
export function buildCueIndex(cues) {
  const sorted = [...cues].sort((a, b) => a.startMs - b.startMs);
  function build(start, end) {
    if (start >= end) return null;
    const mid = (start + end) >>> 1, left = build(start, mid), right = build(mid + 1, end), cue = sorted[mid];
    return { cue, left, right, maxEnd: Math.max(cue.endMs, left?.maxEnd || 0, right?.maxEnd || 0) };
  }
  return build(0, sorted.length);
}
export function activeCuesAt(index, timeMs, limit = 200) {
  const found = [];
  function visit(node) {
    if (!node || node.maxEnd <= timeMs || found.length >= limit) return;
    visit(node.left);
    if (node.cue.startMs <= timeMs && node.cue.endMs > timeMs && found.length < limit) found.push(node.cue);
    if (node.cue.startMs <= timeMs) visit(node.right);
  }
  visit(index); return found;
}
