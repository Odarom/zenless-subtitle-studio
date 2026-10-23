import { localizedNames, TEXT_LANGUAGES } from '../src/languages.js';
import { Buffer } from 'node:buffer';

// Retrieval hints only. Never rewrite transcripts, register aliases, or choose
// a community output here. The translator must still check context and rules.
const words = new Intl.Segmenter(undefined, { granularity: 'word' });
const fold = value => value.normalize('NFKC').toLowerCase()
  .replace(/\p{Script=Latin}/gu, char => char.normalize('NFD').replace(/\p{M}/gu, ''))
  .replace(/[^\p{L}\p{M}]/gu, '');
const script = value => /\p{Script=Hangul}/u.test(value) ? 'ko'
  : /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(value) ? 'cjk'
  : /\p{Script=Cyrillic}/u.test(value) ? 'cyrl' : /\p{Script=Thai}/u.test(value) ? 'thai' : 'latin';
const grams = value => { const chars = [...value]; return new Set(chars.slice(1).map((char, i) => chars[i] + char)); };
const protectedWord = /^(?:no|not|never|without|unless|non|neither|nor|kein|keine|nicht|sans|sin|não|nao|sem|не|нет|不|没|沒有|没有|아니|않는|없는|못|안)$/iu;
const minimum = bucket => ['ko','cjk'].includes(bucket) ? 4 : 6;

function dictionary(entries, options) {
  const source = Object.hasOwn(TEXT_LANGUAGES, options.sourceLanguage || '') ? options.sourceLanguage : null;
  const forms = new Map(), exact = new Set();
  for (const entry of entries) {
    const names = localizedNames(entry);
    for (const name of [...Object.values(names), ...(entry.aliases || [])]) exact.add(fold(name));
    if (entry.autoUse === false || entry.releaseStatus !== 'live' || entry.category === 'community' || !names[options.targetLanguage]) continue;
    const selectedNames = source ? [names[source]].filter(Boolean) : Object.values(names);
    const sourceScripts = new Set(selectedNames.map(name => script(fold(name))));
    const otherNames = new Set(source ? Object.entries(names).filter(([language]) => language !== source).map(([,name]) => fold(name)) : []);
    const candidates = [...selectedNames, ...(entry.aliases || []).filter(alias => sourceScripts.has(script(fold(alias))) && !otherNames.has(fold(alias)))];
    for (const name of candidates) {
      const normalized = fold(name), bucket = script(normalized), length = [...normalized].length;
      if (/\p{N}/u.test(name) || length < minimum(bucket) || length > 48 || [...words.segment(name)].some(word => protectedWord.test(word.segment))) continue;
      let form = forms.get(normalized);
      if (!form) { form = { normalized, name, bucket, length, grams:grams(normalized), entries:new Map() }; forms.set(normalized, form); }
      form.entries.set(entry.id, entry);
    }
  }
  const postings = new Map();
  for (const form of forms.values()) for (const gram of form.grams) {
    const key = form.bucket + ':' + gram, values = postings.get(key) || [];
    values.push(form); postings.set(key, values);
  }
  return {postings, exact};
}

// Restricted Damerau distance: spelling insertions/deletions/substitutions and
// adjacent transpositions. Phonetic evidence comes only from registered aliases.
function distance(a, b, limit) {
  a = [...a]; b = [...b]; if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let older, previous = Array.from({length:b.length+1}, (_,i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j-1]+1, previous[j]+1, previous[j-1]+Number(a[i-1] !== b[j-1]));
      if (i > 1 && j > 1 && a[i-1] === b[j-2] && a[i-2] === b[j-1]) row[j] = Math.min(row[j], older[j-2]+1);
    }
    older = previous; previous = row;
  }
  return previous[b.length];
}

export function speechTermHints(cues, entries, options = {}) {
  const {postings, exact} = dictionary(entries, options), memo = new Map(), result = new Map();
  let attempts = 0, count = 0, bytes = 0;
  const matches = observed => {
    const normalized = fold(observed), bucket = script(normalized), length = [...normalized].length;
    if (length < minimum(bucket) || length > 48 || exact.has(normalized)) return [];
    if (memo.has(normalized)) return memo.get(normalized);
    const limit = length >= 12 && !['ko','cjk'].includes(bucket) ? 2 : 1, shared = new Map(), observedGrams = grams(normalized);
    for (const gram of observedGrams) for (const form of postings.get(bucket + ':' + gram) || []) {
      if (Math.abs(form.length - length) <= limit) shared.set(form, (shared.get(form) || 0) + 1);
    }
    const found = [];
    for (const [form, common] of [...shared].filter(([form, common]) => common >= Math.max(1, Math.min(form.grams.size, observedGrams.size) - 3*limit)).sort((a,b) => b[1]-a[1]).slice(0,128)) {
      const edits = distance(normalized, form.normalized, limit);
      if (edits > limit || edits / Math.max(length,form.length) > (['ko','cjk'].includes(bucket) ? .25 : .18)) continue;
      for (const entry of form.entries.values()) found.push({entry, name:form.name, edits, common});
    }
    found.sort((a,b) => a.edits-b.edits || b.common-a.common || a.entry.id.localeCompare(b.entry.id));
    const distinct = new Map(); for (const item of found) if (!distinct.has(item.entry.id)) distinct.set(item.entry.id,item);
    const candidates = [...distinct.values()].slice(0,3);
    memo.set(normalized,candidates); return candidates;
  };
  for (let cueIndex = 0; cueIndex < cues.length; cueIndex++) {
    const cue = cues[cueIndex]; if (cue.kind === 'screen' || cue.excluded) continue;
    const cueId = cue.id ?? String(cueIndex+1); if (!/^\d{1,8}$/.test(cueId)) continue;
    const text = cue.sourceText, tokens = [...words.segment(text)].filter(token => token.isWordLike)
      .flatMap(token => [...token.segment.matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map(match => ({segment:match[0],index:token.index+match.index}))), found = [];
    for (let start = 0; start < tokens.length; start++) for (let end = start; end < Math.min(start+5,tokens.length); end++) {
      const token = tokens[end];
      if (/\p{N}/u.test(token.segment) || protectedWord.test(token.segment) || end > start && !/^[\s'’·・-]*$/u.test(text.slice(tokens[end-1].index+tokens[end-1].segment.length,token.index))) break;
      if (++attempts > 50000) return result;
      const stop = token.index+token.segment.length, observed = text.slice(tokens[start].index,stop);
      if ([...fold(observed)].length > 48) break;
      const candidates = matches(observed); if (candidates.length) found.push({start:tokens[start].index,stop,observed,candidates});
    }
    const occupied = [];
    for (const match of found.sort((a,b) => (b.stop-b.start)-(a.stop-a.start) || a.start-b.start)) {
      if (occupied.some(other => match.start < other.stop && match.stop > other.start)) continue;
      occupied.push(match);
      for (const {entry,name} of match.candidates) {
        const hints = result.get(entry.id) || [], hint = {cueId, observed:match.observed, matchedName:name};
        if (hints.length >= 6 || hints.some(item => item.cueId === cueId && item.observed === hint.observed)) continue;
        const size = Buffer.byteLength(JSON.stringify(hint),'utf8');
        if (count >= 64 || bytes + size > 12000) return result;
        hints.push(hint); result.set(entry.id,hints); count++; bytes+=size;
      }
    }
  }
  return result;
}
