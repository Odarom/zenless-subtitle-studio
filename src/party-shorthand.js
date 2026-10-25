// Retrieve candidates for Chinese three-agent initials. This is evidence for
// the existing translation request, never a local expansion or new DB alias.
const han = /^\p{Script=Han}+$/u;
export function chinesePartyHints(entries, text) {
  if (typeof text !== 'string' || !/\p{Script=Han}/u.test(text)) return new Map();
  const initials = new Map(), names = new Set();
  for (const entry of entries) {
    if (entry.category !== 'agent' || entry.autoUse === false || entry.releaseStatus !== 'live') continue;
    for (const name of [entry.preferred?.['zh-CN'], entry.preferred?.['zh-Hant'], entry.localizedNames?.['zh-Hant']]) {
      if (typeof name !== 'string' || !han.test(name)) continue;
      if ([...name].length > 1) names.add(name);
      const initial = [...name][0], ids = initials.get(initial) || new Set();
      ids.add(entry.id); initials.set(initial, ids);
    }
  }
  const hints = new Map(), seen = new Set(); let count = 0;
  // Limit work and payload without truncating the original translation text.
  for (const match of text.slice(0, 50000).matchAll(/\p{Script=Han}+/gu)) {
    const run = match[0], chars = [...run];
    if (chars.length < 3) continue;
    const covered = new Uint8Array(run.length), offsets=[]; let offset=0;
    for(const char of chars){offsets.push(offset);offset+=char.length;}
    for(const name of names)for(let at=run.indexOf(name);at>=0;at=run.indexOf(name,at+1))covered.fill(1,at,at+name.length);
    for (let start = 0; start <= chars.length - 3; start++) {
      const observed = chars.slice(start, start + 3).join('');
      if (seen.has(observed) || names.has(observed)) continue;
      // Do not split a full registered name into hypothetical team members.
      if (covered.subarray(offsets[start],offsets[start+3]??run.length).some(Boolean)) continue;
      const slots = [...observed].map(initial => ({ initial, ids: [...(initials.get(initial) || [])] }));
      if (slots.some(slot => !slot.ids.length || slot.ids.length > 4)) continue;
      // All slots must admit distinct agents; never assert which alternative.
      if (!slots[0].ids.some(a => slots[1].ids.some(b => a !== b && slots[2].ids.some(c => c !== a && c !== b)))) continue;
      seen.add(observed);
      for (const id of new Set(slots.flatMap(slot => slot.ids))) {
        const list = hints.get(id) || []; list.push({ observed, slots }); hints.set(id, list);
      }
      if (++count >= 8) return hints;
    }
  }
  return hints;
}

export function koreanPartyInitial(entry) {
  const name=entry.preferred?.ko?.replace(/^[\s「」『』“”"'·]+/u,'');
  return /^[가-힣]/u.test(name || '') ? [...name][0] : null;
}

export const PARTY_SHORTHAND_INSTRUCTION = 'CHINESE TEAM INITIALS: partyHints are UNVERIFIED candidates for a Chinese three-agent party code. Each slots position lists competing agent IDs, not confirmed members. Use the message and context to decide whether the observed text is actually a team abbreviation and resolve every slot; spelling or glossary order alone is insufficient. For community style with Korean target, concatenate the resolved agents partyInitialKo values in the original slot order, with no separators (for example 仪琉卢: 仪玄 / 琉音 / 卢西娅 -> 의현 / 다이아린 / 루시아 -> 의다루). This derives the Korean rendering from each existing Korean name; it does not require registering team combinations. For official style or other targets, use the resolved agents existing outputPreferred/preferred names in order. If any Korean initial is unavailable, use full localized names instead of inventing an initial. If any member remains ambiguous, preserve the entire original code without listing candidates or adding explanations. Do not add team roles or gameplay facts. Preserve literal codes when discussing their spelling. Do not infer team members from Korean initial-based input abbreviations. These hints do not modify source text or require an extra AI call.';
