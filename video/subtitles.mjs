import { validRegion } from './geometry.mjs';
import { speechDisplayCues } from './speech-cues.mjs';
const MAX_CUES = 50000;

export function timestamp(value) {
  const match = /^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{3})$/.exec(value.trim());
  if (!match || Number(match[2]) > 59 || Number(match[3]) > 59) throw new Error('자막 시간 형식을 확인하세요.');
  return ((Number(match[1] || 0) * 60 + Number(match[2])) * 60 + Number(match[3])) * 1000 + Number(match[4]);
}

export function cleanText(value) {
  return value.replace(/<[^>]*>/g, '').replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(\d+);|&#x([\da-f]+);/gi, (entity, decimal, hex) => {
    if (decimal || hex) {
      const n = parseInt(decimal || hex, hex ? 16 : 10);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    }
    return ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' })[entity.toLowerCase()] || entity;
  }).replace(/\u0000/g, '').trim();
}

export function validateCues(cues) {
  if (!Array.isArray(cues) || !cues.length || cues.length > MAX_CUES) throw new Error('자막은 1~50,000개 구간이어야 합니다.');
  return cues.map((cue, index) => {
    if (!Number.isSafeInteger(cue.startMs) || !Number.isSafeInteger(cue.endMs) || cue.startMs < 0 || cue.endMs <= cue.startMs || cue.endMs > 7 * 86400000 || typeof cue.sourceText !== 'string' || !cue.sourceText.trim() || cue.sourceText.length > 6000) throw new Error(`${index + 1}번째 자막의 시간 또는 내용을 확인하세요.`);
    if (index && cue.startMs < cues[index - 1].startMs) throw new Error('자막 시작 시간이 순서대로 정렬되어 있지 않습니다.');
    if (cue.translatedText !== undefined && (typeof cue.translatedText !== 'string' || cue.translatedText.length > 12000)) throw new Error('번역 자막의 길이와 내용을 확인하세요.');
    const regionOnly = region => ({ x: region.x, y: region.y, w: region.w, h: region.h });
    let screen = {};
    if (cue.kind === 'screen') {
      if (!validRegion(cue.region) || cue.positions && (!Array.isArray(cue.positions) || cue.positions.length > 30000 || cue.positions.some((position, i) => !validRegion(position) || !Number.isSafeInteger(position.timeMs) || position.timeMs < cue.startMs || position.timeMs >= cue.endMs || i > 0 && position.timeMs <= cue.positions[i - 1].timeMs))) throw new Error('화면 글자의 위치와 시간 정보를 확인하세요.');
      screen = { kind: 'screen', region: regionOnly(cue.region), ...(cue.positions ? { positions: cue.positions.map(position => ({ timeMs: position.timeMs, ...regionOnly(position) })) } : {}), ...(Number.isFinite(cue.confidence) ? { confidence: Math.max(0, Math.min(1, cue.confidence)) } : {}) };
    }
    return { id: String(index + 1), startMs: cue.startMs, endMs: cue.endMs, sourceText: cue.sourceText.trim(), ...(typeof cue.translatedText === 'string' ? { translatedText: cue.translatedText } : {}), ...(cue.excluded === true ? { excluded: true } : {}), ...screen };
  });
}

export function parseSubtitles(input) {
  const raw = String(input).replace(/^\uFEFF/, '').replace(/\r/g, '');
  const rolling = /^WEBVTT/.test(raw) && /<\d{1,2}:\d{2}(?::\d{2})?\.\d{3}>/.test(raw);
  const lines = raw.split('\n');
  const cues = [];
  for (let i = 0; i < lines.length; i++) {
    const match = /^(\S+)\s+-->\s+(\S+)/.exec(lines[i].trim());
    if (!match) continue;
    const timingLine = lines[i];
    const text = [];
    while (i + 1 < lines.length && lines[i + 1].trim()) text.push(lines[++i]);
    let sourceText = cleanText(text.join('\n'));
    if (!sourceText) continue;
    const startMs = timestamp(match[1]), endMs = timestamp(match[2]);
    if (endMs <= startMs) continue;
    // Automatic YouTube captions often repeat the previous visible line.
    const previous = cues.at(-1);
    if (rolling && previous && startMs <= previous.endMs + 80 && sourceText.includes('\n')) {
      const parts = sourceText.split('\n');
      if (parts[0].trim() === previous.sourceText.split('\n').at(-1).trim()) sourceText = parts.slice(1).join('\n').trim();
    }
    if (previous && previous.kind !== 'screen' && !/\bposition:/.test(timingLine) && previous.sourceText === sourceText && startMs <= previous.endMs + 80) previous.endMs = Math.max(previous.endMs, endMs);
    else {
      const line = /\bline:([\d.]+)%/.exec(timingLine), position = /\bposition:([\d.]+)%/.exec(timingLine), size = /\bsize:([\d.]+)%/.exec(timingLine);
      const speech = /\bline:[\d.]+%,end\b/.test(timingLine) && /\bposition:50(?:\.00)?%,center\b/.test(timingLine) && /\balign:center\b/.test(timingLine);
      const region = !speech && line && position ? { x: Number(position[1]) / 100, y: Number(line[1]) / 100, w: Math.min(Number(size?.[1] || 40) / 100, 1 - Number(position[1]) / 100), h: Math.min(0.05, 1 - Number(line[1]) / 100) } : null;
      cues.push({ startMs, endMs, sourceText, ...(validRegion(region) ? { kind: 'screen', region } : {}) });
    }
  }
  return validateCues(cues);
}

export function formatTime(ms, separator = ',') {
  const n = Math.max(0, Math.round(ms));
  return `${String(Math.floor(n / 3600000)).padStart(2, '0')}:${String(Math.floor(n / 60000) % 60).padStart(2, '0')}:${String(Math.floor(n / 1000) % 60).padStart(2, '0')}${separator}${String(n % 1000).padStart(3, '0')}`;
}

export function subtitleSpeechHeight(input) {
  const values = [...String(input).matchAll(/\bline:([\d.]+)%,end\b[^\n]*\bposition:50(?:\.00)?%,center\b[^\n]*\balign:center\b/g)].map(match => 1 - Number(match[1]) / 100);
  return values.length && values.every(value => Number.isFinite(value) && value >= 0 && value <= 0.900001 && Math.abs(value-values[0])<.000001) ? Math.min(.9,values[0]) : undefined;
}

export function subtitleTrack(cues, track = 'all') {
  if (!['all', 'speech', 'screen'].includes(track)) throw new Error('저장할 자막 종류를 확인하세요.');
  return cues.filter(cue => !cue.excluded && (track === 'all' || (cue.kind === 'screen' ? 'screen' : 'speech') === track));
}
export function serializeSubtitles(cues, { format = 'srt', mode = 'translated', offsetMs = 0, positioned = false, track = 'all', speechHeight } = {}) {
  if (!['srt', 'vtt'].includes(format) || !['source', 'translated', 'bilingual'].includes(mode)) throw new Error('지원하지 않는 자막 형식입니다.');
  const selected = subtitleTrack(cues, track);
  const expanded = [...speechDisplayCues(selected, {mode}), ...selected.filter(cue => cue.kind === 'screen').flatMap(cue => positioned && format === 'vtt' && cue.positions?.length ? cue.positions.map((position, index) => ({ ...cue, startMs: Math.max(cue.startMs, position.timeMs), endMs: Math.min(cue.endMs, cue.positions[index + 1]?.timeMs ?? cue.endMs), region: position })).filter(cue => cue.endMs > cue.startMs) : [cue])];
  expanded.sort((a, b) => a.startMs - b.startMs);
  return (format === 'vtt' ? 'WEBVTT\n\n' : '') + expanded.map((cue, index) => {
    const raw = mode === 'source' ? cue.sourceText : mode === 'bilingual' ? `${cue.sourceText}\n${cue.translatedText || cue.sourceText}` : cue.translatedText || cue.sourceText;
    // Neutralize cue boundaries and markup when exporting user/AI supplied text.
    const text = raw.replace(/\r/g, '').replace(/\n\s*\n/g, '\n').replace(/-->/g, '→').replace(/</g, '‹').replace(/>/g, '›');
    const region = cue.kind === 'screen' && validRegion(cue.region) ? cue.region : null;
    const placement = !positioned || format !== 'vtt' ? '' : region ? ` line:${(region.y * 100).toFixed(2)}%,start position:${(region.x * 100).toFixed(2)}%,line-left size:${Math.min(100 - region.x * 100, Math.max(5, region.w * 100)).toFixed(2)}% align:start` : cue.kind !== 'screen' && Number.isFinite(speechHeight) && speechHeight >= 0 && speechHeight <= 0.9 ? ` line:${((1-speechHeight) * 100).toFixed(2)}%,end position:50.00%,center size:90.00% align:center` : '';
    return `${index + 1}\n${formatTime(cue.startMs + offsetMs, format === 'vtt' ? '.' : ',')} --> ${formatTime(cue.endMs + offsetMs, format === 'vtt' ? '.' : ',')}${placement}\n${text}\n`;
  }).join('\n');
}

export function youtubeVideoId(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('유튜브 영상 주소를 입력하세요.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('https 유튜브 영상 주소를 입력하세요.');
  const host = url.hostname.toLowerCase();
  let id;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:shorts|embed)\/([^/]+)/.exec(url.pathname)?.[1];
  if (!/^[\w-]{11}$/.test(id || '')) throw new Error('재생목록이 아닌 유튜브 영상 하나의 주소를 입력하세요.');
  return id;
}
