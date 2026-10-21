export const DEFAULT_SPEECH_HEIGHT = 0.11;
export function speechHeight(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(0.9, value)) : DEFAULT_SPEECH_HEIGHT;
}

// The bottom edge is relative to the visible video, including letterboxing/cropping.
export function speechPlacement(content, outer, height, blockHeight = 0, controlsHeight = 64) {
  const left = Math.max(content.left, outer.left), top = Math.max(content.top, outer.top);
  const width = Math.max(1, Math.min(content.left + content.width, outer.left + outer.width) - left);
  // Leave the player's transport controls clickable, even at the lowest setting.
  const controls = Math.min(Math.max(64, controlsHeight), outer.height * 0.45);
  const size = Math.max(1, Math.min(content.top + content.height, outer.top + outer.height - controls) - top);
  const padding = Math.min(8, size * 0.02);
  const fullHeight = Math.max(1, Math.min(content.top + content.height, outer.top + outer.height) - top);
  return { left: left - outer.left + width * 0.05, width: width * 0.9,
    top: Math.max(top + padding, Math.min(top + size - padding - blockHeight, top + fullHeight * (1 - speechHeight(height)) - blockHeight)) - outer.top,
    height: Math.max(1, size - padding * 2), travel: fullHeight };
}

// Separate handle: never bind dragging to the caption's report/delete click target.
export function bindSpeechDrag(handle, { getHeight, getRect, setHeight, commit = () => {} }) {
  let drag = null;
  const block = event => { event.preventDefault(); event.stopPropagation(); };
  const save = () => { void Promise.resolve(commit(getHeight())).catch(() => {}); };
  handle.onpointerdown = event => {
    block(event);
    if (drag || event.button !== 0 || event.isPrimary === false) return;
    const rect = getRect(); if (!(rect.height > 0)) return;
    try { handle.setPointerCapture(event.pointerId); } catch { return; }
    drag = { id: event.pointerId, y: event.clientY, height: getHeight(), pixels: rect.height, moved: false };
    handle.dataset.dragging = 'true';
  };
  handle.onpointermove = event => {
    if (!drag || drag.id !== event.pointerId) return;
    block(event); const delta = event.clientY - drag.y;
    if (Math.abs(delta) < 3 && !drag.moved) return;
    drag.moved = true; setHeight(speechHeight(drag.height - delta / drag.pixels));
  };
  const finish = (event, cancelled) => {
    if (!drag || drag.id !== event.pointerId) return;
    block(event); const old = drag; drag = null; delete handle.dataset.dragging;
    if (cancelled) setHeight(old.height); else if (old.moved) save();
    if (handle.hasPointerCapture?.(old.id)) handle.releasePointerCapture(old.id);
  };
  handle.onpointerup = event => finish(event, false);
  handle.onpointercancel = event => finish(event, true);
  handle.onlostpointercapture = event => finish(event, true);
  for (const name of ['onclick','ondblclick','onmousedown','onmouseup']) handle[name] = block;
  handle.onkeydown = event => {
    event.stopPropagation();
    if (!['ArrowUp','ArrowDown','Home','Enter',' '].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Enter' || event.key === ' ') return;
    setHeight(event.key === 'Home' ? DEFAULT_SPEECH_HEIGHT : speechHeight(getHeight() + (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 0.1 : 0.02)));
    save();
  };
  return () => { if (drag) finish({ pointerId: drag.id, preventDefault() {}, stopPropagation() {} }, true); };
}
