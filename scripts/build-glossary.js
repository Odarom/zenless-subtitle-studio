import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { sourceText } from './source-fetch.mjs';
import { createHash } from 'node:crypto';
import { nameAliases } from '../src/glossary-names.js';

const option = name => {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing ${name} value`);
  return value;
};
const version = option('--version') ?? (existsSync('glossary/zzz.json') ? JSON.parse(readFileSync('glossary/zzz.json', 'utf8')).sourceVersion : '3.2');
if (!/^\d+\.\d+(?:\.\d+)?(?:\+\d+)?$/.test(version)) throw new Error('Invalid source version');
const prerelease = process.argv.includes('--prerelease');
const retrievedAt = option('--as-of') ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const outputPath = option('--output') ?? 'glossary/zzz.json';
const sourcesPath = option('--sources-output') ?? 'glossary/sources.json';
if (!option('--output') && existsSync('glossary/zzz.json') && JSON.parse(readFileSync('glossary/zzz.json', 'utf8')).betaVersion) {
  throw new Error('정식·미출시 통합 용어집은 glossary:sync로 후보를 만들고 glossary:apply로 반영하세요. 단일 버전으로 덮어쓰지 않았습니다.');
}
const base = `https://static.nanoka.cc/zzz/${version}`;
const locales = { ko: 'ko', en: 'en', ja: 'ja', 'zh-CN': 'zh' };
const sourceUrls = [
  ...['character', 'weapon', 'equipment', 'bangboo', 'monster'].map(k => `${base}/${k}.json`),
  ...Object.values(locales).flatMap(l => [`${base}/${l}/noun.json`, `${base}/${l}/item.json`, `${base}/${l}/character/1011.json`]),
  ...Object.values(locales).map(l => `${base}/${l}/character/1431.json`),
];
const cachePath = url => `.tools/sources/${createHash('sha256').update(url).digest('hex').slice(0, 16)}.txt`;
async function download(urls) {
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: Math.min(6, urls.length) }, async () => {
    while (next < urls.length) {
      const url = urls[next++];
      const content = await sourceText(url);
      writeFileSync(cachePath(url), content);
      done++;
      if (done % 40 === 0 || done === urls.length) console.log(`공개 명칭 자료 수집 ${done}/${urls.length} (${version})`);
    }
  }));
}
if (process.argv.includes('--download')) {
  mkdirSync('.tools/sources', { recursive: true });
  await download(sourceUrls);
}
const roster = JSON.parse(readFileSync(cachePath(`${base}/character.json`), 'utf8'));
const agentIds = Object.entries(roster).filter(([id, item]) => /^\d+$/.test(id) && typeof item.en === 'string' && item.en.trim() && !/^(?:test|Avatar_|OfficialName_)/i.test(item.en)).map(([id]) => id);
const agentUrls = agentIds.flatMap(id => Object.values(locales).map(l => `${base}/${l}/character/${id}.json`)).filter(url => !sourceUrls.includes(url));
if (process.argv.includes('--download')) await download(agentUrls);
sourceUrls.push(...agentUrls);
const snapshots = new Map(sourceUrls.map(url => [url, readFileSync(cachePath(url), 'utf8')]));
const read = url => JSON.parse(snapshots.get(url));
const clean = value => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').replaceAll('{SPACE}', ' ').trim() : '';
const valid = name => name && !/^(?:Item_|Avatar_|PartnerCamp_|Skin_|test[-_( ]|\(test|ZKItem_|BKItem_|OfficialName_|BriefName_)/i.test(name) && !/\{\d+\}/.test(name) && !/^\d+$/.test(name);
const entries = [];
const excluded = [];
function add(id, category, preferred, sources, sourceKey, extra = {}) {
  preferred = Object.fromEntries(Object.entries(locales).map(([l]) => [l, clean(preferred[l])]));
  if (prerelease) preferred = Object.fromEntries(Object.entries(preferred).filter(([, name]) => valid(name)));
  if (!Object.values(preferred).length || (!prerelease && !Object.values(preferred).every(valid))) { excluded.push({ id, reason: 'missing-or-placeholder-localization' }); return; }
  entries.push({ id, category, aliases: nameAliases(preferred, category), preferred,
    meaning: `젠레스 존 제로 ${category} 명칭. 동일 원본 항목의 언어별 표기를 연결함.`,
    rule: '게임 문맥에서 해당 항목을 뜻할 때만 적용. 일반 단어와 동명이의 항목은 문맥으로 구분한다.',
    status: prerelease ? 'prerelease-source-matched' : 'source-matched', releaseStatus: prerelease ? 'prerelease' : 'live',
    releaseVersion: version.split('.').slice(0, 2).join('.'), sourceVersion: version, retrievedAt, sourceKey, sources, ...extra });
}
for (const [kind, category] of Object.entries({ character: 'agent', weapon: 'w-engine', equipment: 'drive-disc', bangboo: 'bangboo', monster: 'enemy' })) {
  const url = `${base}/${kind}.json`;
  for (const [id, item] of Object.entries(read(url))) {
    add(`${kind}:${id}`, category, Object.fromEntries(Object.entries(locales).map(([l, source]) => [l, kind === 'equipment' ? item[source]?.name : item[source]])), [url], `/${id}`, { page: `https://zzz.nanoka.cc/${kind}/${id}?v=${version}` });
  }
}
const nouns = Object.fromEntries(Object.entries(locales).map(([l, source]) => [l, read(`${base}/${source}/noun.json`)]));
const reviewedMechanics = JSON.parse(readFileSync('glossary/reviewed-mechanics.json', 'utf8'));
if (reviewedMechanics.version !== 1 || !Array.isArray(reviewedMechanics.entries)) throw new Error('Invalid mechanic review file');
const reviewed = new Map(reviewedMechanics.entries.map(e => [e.id, e]));
for (const id of Object.keys(nouns.en)) {
  const contextual = Number(id) >= 3000000;
  const mechanic = reviewed.get(`noun:${id}`);
  const approved = contextual && mechanic?.expectedEnglish === clean(nouns.en[id].name);
  const category = contextual ? 'contextual-term' : nouns.en[id].skill ? 'character-mechanic' : 'combat-mechanic';
  add(`noun:${id}`, category, Object.fromEntries(Object.keys(locales).map(l => [l, nouns[l][id]?.name])), Object.values(locales).map(l => `${base}/${l}/noun.json`), `/${id}/name`, {
    autoUse: !contextual || approved,
    ...(approved ? { mechanicReviewedAt: mechanic.reviewedAt } : {}),
    relatedSkills: Object.fromEntries(Object.keys(locales).map(l => [l, clean(nouns[l][id]?.skill)])),
    rule: approved ? mechanic.rule : contextual ? '참고 용어·특정 효과·모드의 명칭. 일반 전투 동작과 동명이의어 및 사이트 표기와의 혼동이 있으므로 검수 전 자동 조회에서 제외한다. 예: 효과 이름 Chain Attack=콤보는 전투 동작 Chain Attack=콤보 스킬과 별개다.' : '전투 기믹 문맥에서만 적용. relatedSkills가 있으면 해당 스킬·캐릭터를 참고하며 다른 캐릭터의 효과와 동일시하지 않는다.',
  });
}
const items = Object.fromEntries(Object.entries(locales).map(([l, source]) => [l, read(`${base}/${source}/item.json`)]));
const materialClasses = new Set([10, 12, 13, 14, 17, 23, 36, 71, 92]);
const basicCurrencyIds = new Set(['1', '10', '100', '101', '110', '111', '112', '115', '116', '117', '118', '119', '201', '202', '203', '204', '205', '206', '207']);
for (const [id, item] of Object.entries(items.en)) {
  if (!materialClasses.has(item.class) && !basicCurrencyIds.has(id)) continue;
  add(`item:${id}`, materialClasses.has(item.class) ? 'material' : 'currency', Object.fromEntries(Object.keys(locales).map(l => [l, items[l][id]?.name])), Object.values(locales).map(l => `${base}/${l}/item.json`), `/${id}/name`, { page: `https://zzz.nanoka.cc/item/${id}?v=${version}` });
}
const agents = Object.fromEntries(Object.entries(locales).map(([l, source]) => [l, read(`${base}/${source}/character/1011.json`)]));
// Re-read this named character effect on every version sync, like other names.
// Keeping it in the source builder lets release comparisons detect name changes.
const shunguang = Object.fromEntries(Object.entries(locales).map(([l, source]) => [l, read(`${base}/${source}/character/1431.json`)]));
for (const index of [3, 4]) {
  add(`skill:1431:special:${index}`, 'skill',
    Object.fromEntries(Object.keys(locales).map(l => [l, shunguang[l].skill?.special?.description?.[index]?.name])),
    Object.values(locales).map(l => `${base}/${l}/character/1431.json`), `/skill/special/description/${index}/name`, {
      characterId: '1431',
      meaning: index === 3 ? '엽빛나의 명심경·섬광(Soaring Light) 강화 특수 스킬.' : '엽빛나의 명심경·귀결(Return to Dust) 강화 특수 스킬.',
      rule: '엽빛나 스킬 문맥에서만 해당 명칭을 사용한다. 섬광(Soaring Light)과 귀결(Return to Dust)은 서로 다른 기술이다. 스킬명을 명심경(Enlightened Mind)이라는 상태 이름만으로 줄이지 않는다. 원문에 없는 조작·효과·시간 수치를 추가하지 않는다.',
    });
}
add('effect:1431:culmination', 'character-mechanic',
  Object.fromEntries(Object.keys(locales).map(l => [l, shunguang[l].skill?.basic?.description?.[7]?.name])),
  Object.values(locales).map(l => `${base}/${l}/character/1431.json`), '/skill/basic/description/7/name', {
    meaning: '엽빛나(Ye Shunguang)의 이름 붙은 극치 효과/스택. 일반적인 극치나 우수함이라는 보통명사가 아니다.',
    rule: '엽빛나의 스킬·변신·스택 획득/소모 문맥에서만 이 이름을 사용한다. 영어 명칭은 Culmination이며 Excellence로 직역하지 않는다. 청명검세(Qingming Sword Force)와는 다른 효과이다. 형상 시네마 단계에 따라 중첩 조건이 다르므로 중첩 불가/최대 스택 수를 원문에 없는 경우 추가하지 않는다. 일반 문장의 극치·culmination·圧巻·观止는 캐릭터 효과로 바꾸지 않는다.',
    relatedSkills: Object.fromEntries(Object.keys(locales).map(l => [l, clean(shunguang[l].skill?.special?.description?.[3]?.name)])),
  });
const agentSources = Object.values(locales).map(l => `${base}/${l}/character/1011.json`);
const combatPrefixes = new Set();
for (const agentId of agentIds) {
const profiles = Object.fromEntries(Object.entries(locales).map(([l, source]) => [l, read(`${base}/${source}/character/${agentId}.json`)]));
const profileSources = Object.values(locales).map(l => `${base}/${l}/character/${agentId}.json`);
for (const [category, skill] of Object.entries(profiles.en.skill ?? {})) {
  for (const [index, desc] of (skill.description ?? []).entries()) {
    if (!desc.desc || !desc.name) continue;
    if (agentId === '1431' && (category === 'special' && [3,4].includes(index) || category === 'basic' && index === 7)) continue;
    const names = Object.fromEntries(Object.keys(locales).map(l => [l, profiles[l].skill?.[category]?.description?.[index]?.name]));
    const id = `skill:${agentId}:${category}:${index}`;
    add(id, 'skill', names, profileSources, `/skill/${category}/description/${index}/name`, {
      characterId: agentId, characterName: Object.fromEntries(Object.keys(locales).map(l => [l, clean(profiles[l].name)])),
      rule: '해당 캐릭터의 전투·스킬 문맥에서 사용한다. 다른 캐릭터의 비슷한 이름이나 일반 문장과 혼동하지 않는다. 스킬 종류·구별되는 이름을 생략하거나 원문에 없는 입력·효과·수치를 추가하지 않는다.',
    });
    const prefixes = Object.fromEntries(Object.entries(names).map(([l, value]) => [l, clean(value).split(/[:：]/)[0].trim()]));
    if (!/[:：]/.test(desc.name)) continue;
    if (combatPrefixes.has(prefixes.en)) continue;
    combatPrefixes.add(prefixes.en);
    const prefixId = `combat:${prefixes.en.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    if (!entries.some(e => e.id === prefixId)) add(prefixId, 'combat-action', prefixes, profileSources, `/skill/${category}/description/${index}/name (prefix)`);
  }
}
const passiveKey = Object.keys(profiles.en.passive?.level ?? {})[0];
if (agentId !== '1011' && passiveKey) for (const [index, name] of (profiles.en.passive.level[passiveKey].name ?? []).entries()) {
  add(`passive:${agentId}:${index}`, 'skill', Object.fromEntries(Object.keys(locales).map(l => [l, profiles[l].passive?.level?.[passiveKey]?.name?.[index]])), profileSources, `/passive/level/${passiveKey}/name/${index}`, {characterId:agentId,characterName:Object.fromEntries(Object.keys(locales).map(l=>[l,clean(profiles[l].name)]))});
}
for (const [index, talent] of Object.entries(profiles.en.talent ?? {})) {
  if (!talent?.name || !/^\d+$/.test(index)) continue;
  add(`talent:${agentId}:${index}`, 'mindscape-name', Object.fromEntries(Object.keys(locales).map(l=>[l,profiles[l].talent?.[index]?.name])), profileSources, `/talent/${index}/name`, {characterId:agentId,characterName:Object.fromEntries(Object.keys(locales).map(l=>[l,clean(profiles[l].name)]))});
}
}
const passiveId = Object.keys(agents.en.passive.level)[0];
for (let i = 0; i < 2; i++) {
  const names = Object.fromEntries(Object.keys(locales).map(l => [l, agents[l].passive.level[passiveId].name[i]]));
  add(`passive:1011:${i}`, 'skill', names, agentSources, `/passive/level/${passiveId}/name/${i}`, { characterId: '1011' });
  const prefixes = Object.fromEntries(Object.entries(names).map(([l, name]) => [l, name.split(/[:：]/)[0].trim()]));
  add(`combat:passive-${i}`, 'combat-action', prefixes, agentSources, `/passive/level/${passiveId}/name/${i} (prefix)`);
}
const equipmentUrl = `${base}/equipment.json`;
const seenStats = new Set();
for (const [id, item] of Object.entries(read(equipmentUrl))) {
  const en = clean(item.en.desc2);
  if (!/^[^+]+\s*\+\s*\d/.test(en)) continue;
  const names = Object.fromEntries(Object.entries(locales).map(([l, source]) => [l, clean(item[source]?.desc2).split('+')[0].trim()]));
  if (seenStats.has(names.en)) continue;
  seenStats.add(names.en);
  add(`stat:${id}`, 'stat', names, [equipmentUrl], `/${id}/*/desc2 (before +)`);
}
// Supplement the snapshot with independently sourced names before merging aliases.
const curated = JSON.parse(readFileSync('glossary/curated.json', 'utf8'));
if (curated.version !== 1 || !Array.isArray(curated.entries)) throw new Error('Invalid curated glossary format.');
for (const entry of curated.entries) {
  if (!entry.id || entries.some(e => e.id === entry.id) || !entry.category || !entry.sources?.length
    || !Object.keys(locales).every(l => valid(entry.preferred?.[l]))) {
    throw new Error(`Invalid or duplicate curated glossary entry: ${entry.id}`);
  }
  entries.push(entry);
}
// Add known community expressions without pretending they are official names.
for (const entry of JSON.parse(readFileSync('glossary/community.json', 'utf8')).entries) {
  const targetId = entry.targetId ?? (entry.id === 'quick-assist' ? 'combat:quick-assist' : null);
  if (targetId) {
    const matched = entries.find(e => e.id === targetId);
    if (!matched) throw new Error(`Community alias target not found: ${targetId}`);
    matched.aliases = [...new Set([...matched.aliases, ...entry.aliases])];
    matched.communityRule = entry.rule;
    matched.communitySources = entry.sources;
    if (entry.communityPreferred) matched.communityPreferred = entry.communityPreferred;
    if (entry.verifiedAt) matched.communityVerifiedAt = entry.verifiedAt;
    if (entry.reviewedAt) matched.communityReviewedAt = entry.reviewedAt;
    if (entry.sourceNotes) matched.communitySourceNotes = entry.sourceNotes;
  } else entries.push({ ...entry, category: entry.category === 'stat' ? 'stat' : 'community', rule: entry.rule, retrievedAt });
}
const counts = Object.fromEntries([...new Set(entries.map(e => e.category))].map(c => [c, entries.filter(e => e.category === c).length]));
mkdirSync('glossary', { recursive: true });
mkdirSync(dirname(outputPath), { recursive: true }); mkdirSync(dirname(sourcesPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify({ version: 1, sourceVersion: version, retrievedAt,
  description: `Nanoka ${version}의 동일 ID를 대조한 명칭. ${prerelease ? '미출시 자료로서 이름·효과는 변경될 수 있음.' : '출처의 정식 버전 표시를 따름.'} 팬 데이터베이스 출처이며 제작사 공식 검수를 의미하지 않음.`, counts, entries }, null, 2) + '\n');
writeFileSync(sourcesPath, JSON.stringify({ version, retrievedAt, prerelease,
  manifest: { url: 'https://static.nanoka.cc/manifest.json', selectedVersion: version, selection: prerelease ? 'prerelease' : 'live' },
  sources: [...snapshots].map(([url, content]) => ({ url, sha256: createHash('sha256').update(content).digest('hex'), bytes: Buffer.byteLength(content) })),
  crossChecks: [{ url: 'https://zzz.honeyhunterworld.com/1011-char/?lang=JP', checked: ['アンビー', '通常攻撃', '通常攻撃：ボルトターボ', '通常攻撃：落雷'], scope: '일본어 엔비 표본만 대조. 다른 Honey Hunter 언어 페이지는 접근 제한으로 전수 대조하지 못함.' }],
  excluded,
}, null, 2) + '\n');
console.log(JSON.stringify({ total: entries.length, counts, excluded: excluded.length }, null, 2));
