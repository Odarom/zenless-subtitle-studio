import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkManifest, composeCatalog } from '../src/glossary-lifecycle.js';
import { loadGlossary, relevantTerms } from '../src/translator.js';
import { nameAliases } from '../src/glossary-names.js';
const entries = loadGlossary('glossary/zzz.json');
const catalogVersion = JSON.parse(readFileSync('glossary/zzz.json', 'utf8')).sourceVersion;
const find = (text, category) => entries.find(e => e.preferred.en === text && (!category || e.category === category));

test('Armorer specialty and existing Sunbringer NPC names use reviewed localized names without merging identities', () => {
  const armorer=relevantTerms(entries,'단조 특성 에이전트 전용 지원').find(e=>e.id==='specialty:armorer');
  assert.deepEqual(armorer.preferred,{ko:'단조',en:'Armorer',ja:'鋭御','zh-CN':'锋御'});
  assert.match(armorer.rule,/일반적인|일반 어휘/);assert.match(armorer.rule,/Crafting/);assert.match(armorer.rule,/제한을 보존/);
  assert(!relevantTerms(entries,'완벽하게 단조된 별').some(e=>e.id==='specialty:armorer'));
  assert(!relevantTerms(entries,'초급 단조 휘장').some(e=>e.id==='specialty:armorer'));
  const names=relevantTerms(entries,'드라케나 린드베른 엘드레다').filter(e=>e.id.startsWith('npc:'));
  assert.equal(names.length,3);assert.deepEqual(names.map(e=>e.preferred.en).sort(),['Dracaene','Eldreda','Lindverne']);
  for(const entry of names){assert.equal(entry.releaseStatus,'live');assert.equal(entry.category,'contextual-term');assert.match(entry.rule,/미출시/);assert(!entry.communityPreferred);assert(Object.values(entry.classification.names).every(tag=>tag==='official'));}
  assert(armorer.classification.aliases.unofficial.includes('아머러'));
});

test('reviewed resource and anomaly terms retain scoped names and qualifiers', () => {
  const corruption = relevantTerms(entries, 'guaranteed corruption proc even from zero Anomaly').find(e => e.id === 'combat:corruption');
  assert.equal(corruption.preferred.ko, '침식');
  assert.equal(corruption.preferred.ja, '侵蝕');
  assert.match(corruption.rule, /이상 축적치/);
  assert.match(corruption.rule, /원문의 발동 조건/);
  const adrenaline = relevantTerms(entries, 'Yixuan adrenaline management').find(e => e.id === 'noun:3000036');
  assert.equal(adrenaline.preferred.ko.replace(/[\[\]]/g, ''), '기운');
  assert.match(adrenaline.rule, /일반 감정·호르몬/);
  assert.match(entries.find(e => e.id === 'noun:3000005').rule, /변칙 수치로 번역/);
  assert.equal(find('Anomaly Mastery').communityPreferred.ko, '장악');
});

test('source-matched glossary has four complete languages and traceable source IDs', () => {
  assert(entries.length >= 400);
  for (const e of entries.filter(e => e.status === 'source-matched')) {
    assert.equal(e.sourceVersion, catalogVersion); assert(e.sourceKey); assert(e.sources.length);
    for (const lang of ['ko', 'en', 'ja', 'zh-CN']) assert(e.preferred[lang], `${e.id} missing ${lang}`);
    assert(Object.values(e.preferred).every(v => !/<[^>]+>|\{\d+\}/.test(v)));
  }
});
test('key game terms preserve localized meanings instead of website UI labels', () => {
  assert.equal(find('Quick Assist').preferred.ko, '빠른 지원');
  assert.equal(find('Quick Assist').preferred.ja, 'クイック支援');
  assert.equal(find('Quick Assist').preferred['zh-CN'], '快速支援');
  assert.equal(find('Chain Attack', 'combat-action').preferred.ko, '콤보 스킬');
  assert(!relevantTerms(entries, 'Chain Attack').some(e => e.id === 'noun:4000030'));
  assert.equal(find('Anomaly Proficiency').preferred.ko, '이상 마스터리');
  assert.equal(find('Anomaly Mastery').preferred.ko, '이상 장악력');
  assert.equal(find('Anby').preferred.ko, '엔비');
  assert.equal(find('Polychrome').preferred.ko, '폴리크롬');
});

test('all roster agents have localized skills, passives and six mindscape names', () => {
  const agents=entries.filter(e=>e.category==='agent'&&e.releaseStatus!=='needs-review');
  assert(agents.length>=60);
  for(const agent of agents){
    const id=agent.id.split(':')[1];
    assert(entries.some(e=>e.category==='skill'&&e.characterId===id),agent.id);
    for(const index of [0,1])assert(entries.some(e=>e.id===`passive:${id}:${index}`),`${agent.id} passive ${index}`);
    assert.equal(entries.filter(e=>e.category==='mindscape-name'&&e.characterId===id).length,6,agent.id);
  }
});

test('UI wrappers and omitted skill prefixes no longer hide a registered game name', () => {
  assert(nameAliases({ko:'[침식 장벽]',en:'Corruptive Barrier'},'combat-mechanic').includes('침식 장벽'));
  assert(nameAliases({ko:'[침식 장벽]'},'combat-mechanic').includes('침식장벽'));
  assert(nameAliases({en:'Core Passive: Sample Effect'},'skill').includes('Sample Effect'));
  for(const text of ['침식 장벽','침식장벽','[침식 장벽]']){
    assert.equal(relevantTerms(entries,text).find(e=>e.id==='noun:2000001')?.preferred.en,'Corruptive Barrier');
  }
});

test('reviewed combat mechanics are available while conflicting minigame terms remain excluded', () => {
  for(const [en,ko] of [['Sharp DMG','예리 피해'],['Laceration DMG','절상 피해'],['Gash','잔흔'],['Maim','파상'],['Qingming Sword Force','청명검세'],['Enlightened Mind','명심경']]){
    const e=relevantTerms(entries,en).find(e=>e.mechanicReviewedAt);
    assert(e,en);assert.equal(e.preferred.ko.replace(/^\[|\]$/g,''),ko);
  }
  assert(!relevantTerms(entries,'Chain Attack').some(e=>e.id==='noun:4000030'));
  for (const [en,ko,ja,zh] of [
    ['Shutdown','완벽 대응','完全反撃','完美反制'],
    ['Impaired','부위 파괴','部位破壊','部位破坏'],
    ['Dissonance','부조화 수치','乱相値','紊相值'],
    ['Dissonant state','부조화 상태','乱相状態','紊相状态'],
  ]) {
    const e=relevantTerms(entries,en).find(e=>e.preferred.en===en);
    assert(e,en);assert.deepEqual(e.preferred,{ko,en,ja,'zh-CN':zh});
  }
});

test('reported boss family names and buff slang use known names without inventing a variant', () => {
  const ucc=relevantTerms(entries,'UCC boss').find(e=>e.id==='monster:30009');
  assert.equal(ucc?.preferred.ko,'미지의 복합 침식체');
  assert(!relevantTerms(entries,'XUCCcode').some(e=>e.id==='monster:30009'));
  assert.equal(relevantTerms(entries,'scorched horizon boss').find(e=>e.id==='community:scorched-horizon-base-name')?.preferred.ko,'태양의 잔불');
  assert.equal(relevantTerms(entries,'typhon boss').find(e=>e.id==='community:typhon-family-name')?.preferred.ko,'티폰');
  assert.equal(relevantTerms(entries,'shill buffs').find(e=>e.id==='community:shill-buff')?.preferred.ko,'접대');
});

test('large catalogs prioritize a specific full name before the thirty-term limit', () => {
  const many=Array.from({length:35},(_,i)=>({id:`short:${i}`,aliases:['skill']}));
  const exact={id:'exact',aliases:['Very Specific Skill Name']};
  const matches=relevantTerms([...many,exact],'Very Specific Skill Name and another skill');
  assert.equal(matches.length,30);assert.equal(matches[0].id,'exact');
});
test('ambiguous community terms stay separate and are not unconditional replacements', () => {
  const eba = entries.find(e => e.id === 'enhanced-basic-attack');
  assert.equal(eba.status, 'user-provided');
  assert.equal(eba.category, 'community'); assert(eba.rule.includes('무조건'));
  assert(relevantTerms(entries, 'EBA then QA').some(e => e.id === 'combat:quick-assist'));
});
test('DA exposes both concepts as separate candidates without matching inside words', () => {
  for (const text of ['DA', 'da', 'DA로 시작']) {
    const matches = relevantTerms(entries, text);
    assert(matches.some(e => e.id === 'combat:dash-attack' && e.preferred.ko === '대시 공격'));
    assert(matches.some(e => e.id === 'mode:deadly-assault' && e.preferred.ko === '위험한 강습전'));
  }
  assert(!relevantTerms(entries, 'data today').some(e => e.id === 'mode:deadly-assault' || e.id === 'combat:dash-attack'));
  assert.deepEqual(relevantTerms(entries, 'Deadly Assault').map(e => e.id), ['mode:deadly-assault']);
  const separate = relevantTerms(entries, 'Deadly Assault bosses take Assault damage');
  assert(separate.some(e => e.id === 'mode:deadly-assault'));
  assert(separate.some(e => e.id === 'noun:3000006'));
  assert(!relevantTerms(entries, 'Dash Attack').some(e => e.id === 'mode:deadly-assault'));
});
test('English combo variants and plural Culminations resolve without matching inside unrelated words', () => {
  for(const text of ['EX → EX → BA','EX→EX→BA','EX -> EX -> BA','EX-EX-BA','EX EX BA']) {
    assert(relevantTerms(entries,text).some(e=>e.id==='community:ex-ex-basic-combo'),text);
  }
  assert(relevantTerms(entries,'Culminations').some(e=>e.id==='effect:1431:culmination'));
  assert(!relevantTerms(entries,'CulminationsXYZ').some(e=>e.id==='effect:1431:culmination'));
  assert(relevantTerms(entries,'holding EX').some(e=>e.id==='community:hold-ex-special'));
  assert(!relevantTerms(entries,'withholding examples').some(e=>e.id==='community:hold-ex-special'));
  const timers=relevantTerms(entries,'Notorious timer and da timer');
  assert.equal(timers.find(e=>e.id==='community:notorious-label')?.preferred.ko,'노토리우스');
  assert.equal(timers.find(e=>e.id==='mode:deadly-assault')?.communityPreferred.ko,'강습');
});

test('Adversity Mode has localized difficulty names and remains distinct from the parent mode', () => {
  for(const text of ['절망 모드','절망모드','이번 절망은 3만점','Adversity Mode','Adversity','逆境モード','绝境模式']) {
    const entry=relevantTerms(entries,text).find(e=>e.id==='mode:deadly-assault-adversity');
    assert(entry,text);
    assert.deepEqual(entry.preferred,{ko:'절망 모드',en:'Adversity Mode',ja:'逆境','zh-CN':'绝境'});
    assert.equal(entry.communityPreferred.ko,'절망');
    assert(entry.rule.includes('일반 감정'));
  }
  assert(!relevantTerms(entries,'adversityXYZ').some(e=>e.id==='mode:deadly-assault-adversity'));
  assert(!relevantTerms(entries,'Deadly Assault').some(e=>e.id==='mode:deadly-assault-adversity'));
});

test('Trial Mode aliases keep it distinct from Adversity Mode and generic challenges', () => {
  for(const text of ['시련 모드','시련모드','이번 강습 시련은 9별','Trial Mode','Trial','試練モード','试炼模式']) {
    const entry=relevantTerms(entries,text).find(e=>e.id==='mode:deadly-assault-trial');
    assert(entry,text);
    assert.deepEqual(entry.preferred,{ko:'시련 모드',en:'Trial Mode',ja:'試練','zh-CN':'试炼'});
    assert.equal(entry.communityPreferred.ko,'시련');
  }
  assert(!relevantTerms(entries,'Challenge Mode').some(e=>e.id==='mode:deadly-assault-trial'));
  assert(!relevantTerms(entries,'TrialXYZ').some(e=>e.id==='mode:deadly-assault-trial'));
  const modes=relevantTerms(entries,'시련모드 킬이나 절망모드 3별');
  assert(modes.some(e=>e.id==='mode:deadly-assault-trial'));
  assert(modes.some(e=>e.id==='mode:deadly-assault-adversity'));
});

test('single M0W1 and full-team M0W1 shorthand retain separate scopes and numeric notation', () => {
  for(const text of ['명전','명함전무','M0W1','m0w1','M0 W1','M0/W1']) {
    const entry=relevantTerms(entries,text).find(e=>e.id==='community:m0w1-build');
    assert(entry,text);assert.equal(entry.communityPreferred.en,'M0W1');
  }
  for(const text of ['올명전 팀','올 명전 팀','전원 명전','full M0W1 team','all M0W1']) {
    const matches=relevantTerms(entries,text);
    const team=matches.find(e=>e.id==='community:all-m0w1-team');
    assert(team,text);assert.equal(team.communityPreferred.en,'full M0W1');
    assert(team.rule.includes('팀 전체'));assert(team.rule.includes('더 긴'));
  }
  assert(!relevantTerms(entries,'명전').some(e=>e.id==='community:all-m0w1-team'));
  assert(!relevantTerms(entries,'otherM0W1name').some(e=>e.id==='community:m0w1-build'));
  assert(!relevantTerms(entries,'M1W1').some(e=>e.id==='community:m0w1-build'));
  assert(!relevantTerms(entries,'M0W5').some(e=>e.id==='community:m0w1-build'));
});

test('basic attribute words match separately from damage bonuses and AP uses reviewed Korean output', () => {
  for(const [en,ko] of [['Wind','바람'],['Fire','불'],['Ice','얼음'],['Electric','전기'],['Ether','에테르'],['Physical','물리']]) {
    assert.equal(relevantTerms(entries,`${en.toLowerCase()} weak`).find(e=>e.id===`attribute:${en.toLowerCase()}`)?.preferred.ko,ko);
  }
  assert(!relevantTerms(entries,'windyPlayer').some(e=>e.id==='attribute:wind'));
  for(const text of ['AP','상마','이상마']) {
    const ap=relevantTerms(entries,text).find(e=>e.id==='stat:31300');
    assert(ap,text);assert.equal(ap.communityPreferred.ko,'이상마');
    assert.equal(ap.preferred.ko,'이상 마스터리');
  }
});

test('catalog totals and snapshot checksums are consistent', () => {
  const data = JSON.parse(readFileSync('glossary/zzz.json', 'utf8'));
  assert.equal(Object.values(data.counts).reduce((a, b) => a + b, 0), entries.length);
  const sources = JSON.parse(readFileSync('glossary/sources.json', 'utf8'));
  assert(sources.sources.length >= 17);
  assert(sources.sources.every(s => /^[a-f0-9]{64}$/.test(s.sha256)));
});

const namedEntry = (id, ko, en) => ({ id, category: 'agent', aliases: [ko, en], preferred: { ko, en, ja: ko, 'zh-CN': ko },
  meaning: 'Fixture', rule: 'Fixture rule', status: 'source-matched', sourceVersion: '3.2' });
test('changing only a community output spelling is visible in lifecycle review', () => {
  const original=namedEntry('agent:1','원래명','Full Name');
  const previous={version:1,sourceVersion:'3.2',entries:[original]};
  const live={...previous,entries:[{...original,communityPreferred:{en:'FN'}}]};
  const {changes}=composeCatalog(live,null,previous,'2026-10-12');
  assert.equal(changes.changed.length,1);
  assert.deepEqual(changes.changed[0].currentCommunityPreferred,{en:'FN'});
  assert.equal(changes.changed[0].current.en,'Full Name');
});
test('release promotion compares stable IDs, adopts published names and retains beta names as historical aliases', () => {
  const old = { version: 1, sourceVersion: '3.2', entries: [{ ...namedEntry('agent:1', '가칭', 'BetaName'), releaseStatus: 'prerelease', releaseVersion: '3.3', sourceVersion: '3.3.4+123' }] };
  const live = { version: 1, sourceVersion: '3.3', entries: [namedEntry('agent:1', '출시명', 'PublishedName')] };
  const { catalog, changes } = composeCatalog(live, null, old, '2026-10-08');
  assert.equal(catalog.entries[0].preferred.en, 'PublishedName');
  assert(catalog.entries[0].aliases.includes('BetaName')); assert(catalog.entries[0].aliases.includes('가칭'));
  assert.equal(catalog.entries[0].releaseStatus, 'live'); assert.equal(changes.promoted.length, 1); assert.equal(changes.promoted[0].nameChanged, true);
  assert.equal(catalog.entries[0].nameHistory[0].sourceVersion, '3.3.4+123');
  const again = composeCatalog(live, null, catalog, '2026-10-09');
  assert(again.catalog.entries[0].aliases.includes('BetaName'), 'old names remain searchable after later refreshes');
});
test('prerelease data cannot replace published concepts; partial names remain partial and vanished concepts stop auto-use', () => {
  const liveEntry = namedEntry('agent:1', '출시명', 'PublishedName');
  const partial = { ...namedEntry('enemy:2', 'test', 'BetaBoss'), preferred: { en: 'BetaBoss' }, aliases: ['BetaBoss'] };
  const live = { version: 1, sourceVersion: '3.2', entries: [liveEntry] };
  const beta = { version: 1, sourceVersion: '3.3.4+123', entries: [namedEntry('agent:1', '수정중', 'ChangingName'), partial] };
  const old = { ...live, entries: [liveEntry, { ...namedEntry('enemy:removed', '누락', 'Missing'), releaseStatus: 'prerelease' }] };
  const { catalog, changes } = composeCatalog(live, beta, old, '2026-10-08');
  assert.equal(catalog.entries.find(e => e.id === 'agent:1').preferred.en, 'PublishedName');
  assert.deepEqual(catalog.entries.find(e => e.id === 'enemy:2').preferred, { en: 'BetaBoss' });
  assert.equal(catalog.entries.find(e => e.id === 'enemy:2').releaseStatus, 'prerelease');
  assert.equal(catalog.entries.find(e => e.id === 'enemy:removed').autoUse, false);
  assert.equal(changes.betaDifferences.length, 1); assert.equal(changes.removed.length, 1);
});
test('version source rejects unlisted versions and unsafe URL fragments', () => {
  assert.deepEqual(checkManifest({ zzz: { live: '3.2', latest: '3.3.4+123', available: ['3.2', '3.3.4+123'] } }), { live: '3.2', latest: '3.3.4+123', beta: '3.3.4+123' });
  for (const latest of ['../secret', 'https://example.com', '3.3/ko', '3.3.4+123']) assert.throws(() => checkManifest({ zzz: { live: '3.2', latest, available: ['3.2'] } }));
});

test('Astral exposes the disc and its named buff as distinct concepts', () => {
  for (const text of ['for the sake of astral', '3 stacks of Astral']) {
    const matches = relevantTerms(entries, text);
    assert(matches.some(e => e.id === 'equipment:32800' && e.preferred.ko === '고요 속의 별'));
    assert(matches.some(e => e.id === 'effect:32800:astral' && e.preferred.ko === '별'));
  }
  assert(relevantTerms(entries, '고요 4세트').some(e => e.id === 'equipment:32800'));
  assert(!relevantTerms(entries, 'astrally').some(e => e.id === 'equipment:32800' || e.id === 'effect:32800:astral'));
  assert(!relevantTerms(entries, '밤하늘의 별').some(e => e.id === 'effect:32800:astral'));
  assert.equal(find('Astral', 'equipment-effect').preferred.ja, '天籟');
  assert.equal(find('Astral', 'equipment-effect').preferred['zh-CN'], '嘉音');
});

test('Perfect Dodge retains its qualifier in all four languages', () => {
  const perfect = find('Perfect Dodge');
  assert.equal(perfect.preferred.ko, '극한 회피');
  assert.equal(perfect.preferred.ja, '極限回避');
  assert.equal(perfect.preferred['zh-CN'], '极限闪避');
  for (const text of ['perfect dodge upon swap', '극한회피', '極限回避', '极限闪避']) {
    assert(relevantTerms(entries, text).some(e => e.id === perfect.id));
  }
  assert(!relevantTerms(entries, 'dodge upon swap').some(e => e.id === perfect.id));
  assert(!relevantTerms(entries, 'Dodge Counter').some(e => e.id === perfect.id));
});

test('Korean short names, including attached particles, resolve to multilingual concepts', () => {
  const samples = [
    { text: '빠지로 교체', id: 'combat:quick-assist', en: 'Quick Assist', ja: 'クイック支援', zh: '快速支援' },
    { text: '이번 강습은 9별', id: 'mode:deadly-assault', en: 'Deadly Assault', ja: '危局強襲戦', zh: '危局强袭战' },
    { text: '고요를 4세트 장착', id: 'equipment:32800', en: 'Astral Voice', ja: '静寂のアストラ', zh: '静听嘉音' },
    { text: '강특을 쓴 다음 교체', id: 'combat:ex-special-attack', en: 'EX Special Attack', ja: '強化特殊スキル', zh: '强化特殊技' },
  ];
  for (const sample of samples) {
    const match = relevantTerms(entries, sample.text).find(e => e.id === sample.id);
    assert(match, sample.text);
    assert.equal(match.preferred.en, sample.en);
    assert.equal(match.preferred.ja, sample.ja);
    assert.equal(match.preferred['zh-CN'], sample.zh);
  }
  // Extending the Korean alias list must preserve both interpretations of DA.
  const da = relevantTerms(entries, 'DA');
  assert(da.some(e => e.id === 'combat:dash-attack'));
  assert(da.some(e => e.id === 'mode:deadly-assault'));
});

test('reported boss aliases retain the correct boss and Notorious variant', () => {
  for (const text of ['매살자', '매살자는 3630', '매지컬 도살자', '매지컬도살자', '노토리우스 죽음의 도살자']) {
    const matched = relevantTerms(entries, text).find(entry => entry.id === 'monster:300072');
    assert(matched, text); assert.equal(matched.preferred.en, 'Notorious - Dead End Butcher');
    assert(matched.communityRule.includes('Magical'));
  }
  assert(!relevantTerms(entries, '그냥 Butcher').some(entry => entry.id === 'monster:300072'));
  assert(relevantTerms(entries, '연옥 4그로기').some(entry => entry.id === 'monster:30052' && entry.preferred.en === 'Infernal Revenant'));
  assert(relevantTerms(entries, '기르타블리르').some(entry => entry.id === 'monster:40006' && entry.preferred.en === 'Girtablullu'));
});

test('percent, flat, base and penetration abbreviations preserve distinct concepts across languages', () => {
  const samples = [
    ['공퍼를 올려', 'stat-percent-atk', 'ATK%'], ['방퍼', 'stat-percent-def', 'DEF%'], ['체퍼', 'stat-percent-hp', 'HP%'],
    ['깡공', 'stat-flat-atk', 'flat ATK'], ['깡방', 'stat-flat-def', 'flat DEF'], ['깡체', 'stat-flat-hp', 'flat HP'],
    ['깡관', 'stat-flat-pen', 'flat PEN'], ['관퍼', 'stat:31100', 'PEN Ratio'], ['기초공', 'stat-base-atk', 'base ATK'],
    ['大攻击', 'stat-percent-atk', 'ATK%'], ['小攻击', 'stat-flat-atk', 'flat ATK'],
    ['攻撃力実数値', 'stat-flat-atk', 'flat ATK'], ['HP％', 'stat-percent-hp', 'HP%'],
  ];
  for (const [text,id,en] of samples) {
    const entry = relevantTerms(entries,text).find(e=>e.id===id);
    assert(entry, text); assert.equal(entry.preferred.en,en);
    for (const language of ['ko','en','ja','zh-CN']) assert(entry.preferred[language], `${id}/${language}`);
  }
  assert(!relevantTerms(entries,'깡공').some(e=>e.id==='stat-base-atk' || e.id==='stat-percent-atk'));
  assert(!relevantTerms(entries,'깡관').some(e=>e.id==='stat:31100'));
  assert(!relevantTerms(entries,'CATK% flat ATKfoo xPEN%').some(e=>['stat-percent-atk','stat-flat-atk','stat:31100'].includes(e.id)));
});

test('stat abbreviations and equipment expressions resolve while CD retains competing meanings', () => {
  for (const [text,id] of [['치확','stat:31000'],['치피','stat:32700'],['이상마','stat:31300'],['AP','stat:31300'],['장악','stat:33000'],['AM','stat:33000'],['주옵','community:main-stat'],['부옵','community:sub-stat'],['8.3 subs','community:sub-stat'],['전무','community:signature-engine'],['astra sig','community:signature-engine'],['餅武器','community:signature-engine'],['专武','community:signature-engine']]) {
    assert(relevantTerms(entries,text).some(e=>e.id===id),text);
  }
  const cd = relevantTerms(entries,'CD');
  assert(cd.some(e=>e.id==='stat:32700')); assert(cd.some(e=>e.id==='community:cooldown'));
  assert(!relevantTerms(entries,'scampi scraped edition').some(e=>['stat:31300','stat:33000','stat:32700'].includes(e.id)));
  for (const [text,n] of [['명함',0],['無凸',0],['零命',0],['M2',2],['2돌',2],['2影',2],['풀돌',6],['完凸',6]]) {
    assert(relevantTerms(entries,text).some(e=>e.id===`community:mindscape-${n}`),text);
  }
  assert(!relevantTerms(entries,'M20').some(e=>e.id==='community:mindscape-2'));
});

test('new combat aliases retain earlier contextual rules and source provenance', () => {
  for (const [text,id] of [['평타','combat:basic-attack'],['회반','combat:dodge-counter'],['EX','combat:ex-special-attack'],['지돌','combat:assist-follow-up'],['극한회피','combat:perfect-dodge']]) {
    assert(relevantTerms(entries,text).some(e=>e.id===id),text);
  }
  assert(entries.find(e=>e.id==='combat:ex-special-attack').communityRule.includes('길게 누르기'));
  const community = JSON.parse(readFileSync('glossary/community.json','utf8')).entries;
  for (const entry of community.filter(e=>e.reviewedAt==='2026-10-09')) {
    assert(entry.sources.length); assert(entry.rule.length);
    if (entry.status === 'reviewed-community') assert(entry.rule.includes('문맥'));
  }
});

test('san-z is preserved in every language without matching inside another Latin name', () => {
  for (const text of ['san-z', 'San-Z가 말했어', 'SAN-Z said this']) {
    const entry = relevantTerms(entries, text).find(e=>e.id==='community:preserve-san-z');
    assert(entry, text);
    for (const lang of ['ko','en','ja','zh-CN']) assert.equal(entry.preferred[lang], 'san-z');
    assert(entry.rule.includes('대소문자')); assert(entry.rule.includes('음역'));
  }
  assert(!relevantTerms(entries, 'otherSan-Zname').some(e=>e.id==='community:preserve-san-z'));
});

test('reviewed Korean aliases and outputs preserve full-name fallback and flat PEN specificity', () => {
  const community=JSON.parse(readFileSync('glossary/community.json','utf8')).entries;
  for(const alias of ['이마','이장','임팩트','화피증','빙피증','연계스킬','궁기','극회','방어 지원','방어지원','타이폰']){
    assert(!community.some(e=>e.aliases.includes(alias)),alias);
  }
  for(const [text,id] of [['꽝꽝이','weapon:13115'],['관통','stat:31100'],['콤스','combat:chain-attack'],['치치','community:crit-pair']]){
    assert(relevantTerms(entries,text).some(e=>e.id===id),text);
  }
  for(const [id,output] of [['stat:31100','관통%'],['stat:33000','장악'],['stat:31600','에회'],['stat:32500','얼피증'],['community:crit-pair','치치'],['community:signature-engine','전무'],['community:resistance-reduction','속저깎'],['monster:30009','침식체']]){
    assert.equal(entries.find(e=>e.id===id).communityPreferred.ko,output,id);
  }
  for(const id of ['combat:assist-follow-up','combat:perfect-dodge']) assert.equal(entries.find(e=>e.id===id).communityPreferred?.ko,undefined);
  assert.equal(entries.find(e=>e.id==='community:signature-engine').preferred.ko,'전용 W-엔진');
  for(const text of ['깡관통','고정 관통','고정관통']) {
    const found=relevantTerms(entries,text);
    assert(found.some(e=>e.id==='stat-flat-pen'),text);
    assert(!found.some(e=>e.id==='stat:31100'),text);
  }
  const mixed=relevantTerms(entries,'깡관통과 관통 24%');
  assert(mixed.some(e=>e.id==='stat-flat-pen'));
  assert(mixed.some(e=>e.id==='stat:31100'));
});

test('resistance reduction and ignore have separate concepts and preserve qualified source effects', () => {
  for(const text of ['불 속성 피해 저항을 25% 무시한다','모든 속성 피해 저항이 15% 감소한다','ignore 25% of Fire RES','15% All-Attribute RES reduction']){
    const found=relevantTerms(entries,text);
    const reduction=found.find(e=>e.id==='community:resistance-reduction');
    const ignore=found.find(e=>e.id==='community:resistance-ignore');
    assert(reduction,text);assert(ignore,text);
    assert.equal(reduction.preferred.ko,'속성 피해 저항 감소');
    assert.equal(reduction.communityPreferred.ko,'속저깎');
    assert.equal(ignore.preferred.ko,'속성 피해 저항 무시');
    assert.equal(ignore.communityPreferred,undefined);
    assert(ignore.rule.includes('속저깎으로 치환하지 않는다'));
    assert(ignore.rule.includes('수치'));assert(reduction.rule.includes('수치'));
  }
});

test('Soaring Light and Return to Dust remain distinct named skills in four languages and Korean shorthand', () => {
  for(const [index,ko,en] of [[3,'섬광','Soaring Light'],[4,'귀결','Return to Dust']]) {
    const id=`skill:1431:special:${index}`;
    const entry=entries.find(e=>e.id===id);
    assert(entry,id);
    assert.equal(entry.preferred.ko,`강화 특수 스킬: 명심경·${ko}`);
    assert.equal(entry.preferred.en,`EX Special Attack: Enlightened Mind - ${en}`);
    assert.equal(entry.sourceKey,`/skill/special/description/${index}/name`);
    assert.equal(entry.sources.length,4);
    for(const lang of ['ko','en','ja','zh-CN'])assert(entry.preferred[lang],lang);
    for(const text of [ko,`명심경 ${ko}`,`명심경${ko}`,`명심경·${ko}`,en,`Enlightened Mind - ${en}`]) {
      const match=relevantTerms(entries,text).find(e=>e.id===id);
      assert(match,text);assert.equal(match.communityPreferred.en,en);
    }
  }
  assert(!relevantTerms(entries,'Return to Dusty').some(e=>e.id==='skill:1431:special:4'));
});

test('Ye Shunguang nicknames, named stacks and compact inputs resolve as separate concepts', () => {
  for (const text of ['빛나가 2돌', '빛나는 극치 소모', 'YSG', 'ysg의 콤보', 'Ye M2', 'ye의 극치']) {
    const match=relevantTerms(entries,text).find(e=>e.id==='character:1431');
    assert(match,text); assert.equal(match.preferred.en,'Ye Shunguang');
    assert(match.communityRule.includes('일반 동사'));
    assert(!relevantTerms(entries,text).some(e=>e.preferred.en==='Burnice'));
  }
  assert(!relevantTerms(entries,'MYSGames').some(e=>e.id==='character:1431'));
  assert(!relevantTerms(entries,'yes yesterday eye').some(e=>e.id==='character:1431'));
  for (const text of ['YX', 'yx 팀']) {
    const yx = relevantTerms(entries,text).find(e=>e.id==='character:1371');
    assert(yx); assert.equal(yx.preferred.en,'Yixuan'); assert.equal(yx.preferred.ko,'의현');
    assert(!relevantTerms(entries,text).some(e=>e.id==='character:1431'));
  }
  assert(!relevantTerms(entries,'onyx').some(e=>e.id==='character:1371'));
  const matched=relevantTerms(entries,'빛나 2돌 극치 강강평 강꾹');
  const effect=matched.find(e=>e.id==='effect:1431:culmination');
  assert.deepEqual(effect.preferred,{ko:'극치',en:'Culmination',ja:'圧巻','zh-CN':'观止'});
  assert.equal(effect.sourceKey,'/skill/basic/description/7/name');
  assert.equal(effect.sources.length,4);
  assert(effect.rule.includes('청명검세')); assert(effect.rule.includes('일반 문장'));
  assert.equal(matched.find(e=>e.id==='community:ex-ex-basic-combo').preferred.en,'EX Special Attack → EX Special Attack → Basic Attack');
  assert.equal(matched.find(e=>e.id==='community:hold-ex-special').preferred.en,'hold EX Special Attack');
  assert(!relevantTerms(entries,'강아지가 강물을 본다').some(e=>e.id.startsWith('community:ex-')||e.id==='community:hold-ex-special'));
});
