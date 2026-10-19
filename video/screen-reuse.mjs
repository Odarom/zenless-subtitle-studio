import { validRegion } from './geometry.mjs';

// Half a percent of the video allows small OCR-box jitter. Moving text and
// different words, case, numbers or punctuation keep independent translations.
const tolerance = .005;
const fields = ['x', 'y', 'w', 'h'];
const nearby = (a, b) => fields.every(key => Math.abs(a[key] - b[key]) <= tolerance + 1e-9);
function fixedPlacement(cue) {
  return cue.kind === 'screen' && validRegion(cue.region)
    && (!cue.positions || cue.positions.every(position => nearby(position, cue.region)));
}
export function groupScreenTranslations(input) {
  const cues = [], groups = new Map(), allGroups = [], buckets = new Map();
  const bucketKey = (text, x, y) => JSON.stringify([text, x, y]);
  for (const cue of input) {
    let group;
    if (fixedPlacement(cue)) {
      const text = cue.sourceText.trim().replace(/\s+/g, ' ');
      const x = Math.floor(cue.region.x / tolerance), y = Math.floor(cue.region.y / tolerance);
      for (let dx = -1; dx <= 1 && !group; dx++) for (let dy = -1; dy <= 1 && !group; dy++) {
        group = buckets.get(bucketKey(text, x + dx, y + dy))?.find(candidate => nearby(candidate[0].region, cue.region));
      }
      if (!group) {
        group = []; const key = bucketKey(text, x, y), list = buckets.get(key) || [];
        list.push(group); buckets.set(key, list);
      }
    } else group = [];
    if (!group.length) { cues.push(cue); groups.set(cue.id, group); allGroups.push(group); }
    group.push(cue);
  }
  return { cues, groups, allGroups };
}
export function screenTranslationItems({ cues, groups }) {
  return cues.map(cue => ({ id: cue.id, text: cue.sourceText, kind: cue.kind || 'speech', startMs: cue.startMs, endMs: cue.endMs,
    ...(groups.get(cue.id).length > 1 ? { occurrences: groups.get(cue.id).map(item => ({ startMs: item.startMs, endMs: item.endMs })) } : {}) }));
}
export function expandScreenTranslations(translated, input, groups) {
  const byId = new Map();
  for (const cue of translated) for (const original of groups.get(cue.id) || []) byId.set(original.id, cue.translatedText);
  // Original IDs, intervals, geometry and movement always come from local data.
  return input.filter(cue => byId.has(cue.id)).map(cue => ({ ...cue, translatedText: byId.get(cue.id) }));
}
export function mergeContinuousScreenCues(input) {
  const { allGroups } = groupScreenTranslations(input);
  const result = [];
  for (const members of allGroups) {
    let current;
    for (const cue of [...members].sort((a, b) => a.startMs - b.startMs)) {
      if (!current || cue.startMs > current.endMs) { current = { ...cue, ...(cue.positions ? { positions: cue.positions.map(p => ({ ...p })) } : {}) }; result.push(current); continue; }
      current.endMs = Math.max(current.endMs, cue.endMs);
      const positions = [...(current.positions || [{ timeMs: current.startMs, ...current.region }]), ...(cue.positions || [{ timeMs: cue.startMs, ...cue.region }])];
      current.positions = [...new Map(positions.sort((a, b) => a.timeMs - b.timeMs).map(p => [p.timeMs, p])).values()].filter(p => p.timeMs < current.endMs);
      if (Number.isFinite(cue.confidence)) current.confidence = Math.max(current.confidence || 0, cue.confidence);
    }
  }
  return result.sort((a, b) => a.startMs - b.startMs || (a.region?.y || 0) - (b.region?.y || 0));
}

// Correct only a low-confidence, one-frame spelling flicker between two
// longer identical observations. Never bridge missing frames or changed values.
export function stabilizeOcrCues(input, intervalMs) {
  const result = input.map(cue => ({ ...cue }));
  const groups = groupScreenTranslations(result.map(cue => ({ ...cue, sourceText: '', original: cue }))).allGroups;
  const text = cue => cue.sourceText.trim().replace(/\s+/g, ' ');
  const digits = value => (value.match(/\d+(?:[.,]\d+)?/g) || []).join('|');
  const qualifiers = value => (value.toLowerCase().match(/\b(?:no|not|never|without|unless|except|only|before|after|increase|decrease|more|less|cannot|can't)\b/g) || []).join('|');
  const oneEdit = (a,b) => {
    if (Math.abs(a.length-b.length)>1) return false;
    let i=0,j=0,edits=0;
    while(i<a.length&&j<b.length) {
      if(a[i]===b[j]){i++;j++;continue;}
      if(++edits>1)return false;
      if(a.length>=b.length)i++;if(b.length>=a.length)j++;
    }
    return edits+(i<a.length||j<b.length?1:0)===1;
  };
  for(const group of groups) {
    const cues=group.map(item=>item.original).sort((a,b)=>a.startMs-b.startMs);
    for(let i=1;i<cues.length-1;i++) {
      const a=cues[i-1],b=cues[i],c=cues[i+1],canonical=text(a),suspect=text(b);
      if(canonical!==text(c)||canonical===suspect||canonical.length<24||(canonical.match(/[A-Za-z]+/g)||[]).length<4
        ||a.endMs!==b.startMs||b.endMs!==c.startMs||b.endMs-b.startMs>intervalMs
        ||a.endMs-a.startMs<intervalMs*2||c.endMs-c.startMs<intervalMs*2
        ||!Number.isFinite(b.confidence)||b.confidence>Math.min(a.confidence||0,c.confidence||0)-.03
        ||digits(canonical)!==digits(suspect)||qualifiers(canonical)!==qualifiers(suspect)||!oneEdit(canonical,suspect))continue;
      b.sourceText=a.sourceText;
    }
  }
  return result;
}
