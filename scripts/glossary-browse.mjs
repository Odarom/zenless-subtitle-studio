import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { localizedNames, TEXT_LANGUAGES } from '../src/languages.js';

const labels = ['한국어', 'English', '日本語', '简体中文'];
const nav = labels.map(label => `[${label}](#${label.toLowerCase()})`).join(' · ');
const categories = {
  agent: ['캐릭터','Characters','キャラクター','角色'],
  'w-engine': ['W-엔진','W-Engines','音動機','音擎'],
  'drive-disc': ['디스크 세트','Drive Discs','ディスク','驱动盘'],
  bangboo: ['방부','Bangboo','ボンプ','邦布'],
  enemy: ['적·보스','Enemies and bosses','敵・ボス','敌人与首领'],
  'character-mechanic': ['캐릭터 기믹','Character mechanics','キャラ固有要素','角色机制'],
  'combat-mechanic': ['전투 기믹','Combat mechanics','戦闘仕様','战斗机制'],
  'contextual-term': ['참고 명사','Contextual terms','文脈を要する用語','语境用语'],
  currency: ['재화','Currencies','通貨','货币'], material: ['재료','Materials','素材','材料'],
  skill: ['스킬·패시브','Skills and passives','スキル・パッシブ','技能与被动'],
  'combat-action': ['전투 동작','Combat actions','戦闘アクション','战斗动作'],
  'mindscape-name': ['형상 시네마','Mindscapes','心象映画','影画'],
  stat: ['능력치','Stats','ステータス','属性'],
  'game-mode': ['게임 모드','Game modes','ゲームモード','游戏模式'],
  'equipment-effect': ['장비 효과','Equipment effects','装備効果','装备效果'],
  'combat-attribute': ['전투 속성','Combat attributes','戦闘属性','战斗属性'],
  'combat-effect': ['전투 효과','Combat effects','戦闘効果','战斗效果'],
  community: ['커뮤니티 표현','Community expressions','コミュニティ表現','社区用语']
};
const md = value => String(value ?? '—').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\/g,'\\\\').replace(/([\[\]`*_])/g,'\\$1').replace(/\|/g,'&#124;').replace(/[\r\n]+/g,' ');
const anchor = id => id.toLowerCase().replace(/[^a-z0-9_-]/g,'');
const sections = paragraphs => paragraphs.map((text, i) => `## ${labels[i]}\n\n${text}\n`).join('\n');
const title = category => (categories[category] || [category,category,category,category]).join(' / ');
const tagLabels = {official:'공식 / Official / 正式 / 官方',unofficial:'비공식 / Unofficial / 非公式 / 非官方','needs-review':'확인 필요 / Needs review / 要確認 / 待确认'};
const tagged = (value, tag) => md(value) + (value && tag ? ` [${tagLabels[tag]}]` : '');
const guide = sections([
  '같은 ID가 같은 개념입니다. 명칭은 언어별로, 별칭은 입력 인식용으로, 커뮤니티 출력은 약어 스타일용으로 구분합니다. 의미·규칙은 DB 원문으로 표시하며 현재 주로 한국어입니다. 빈 언어 이름은 만들지 않습니다. `prerelease`는 기존 미출시 자료, `autoUse: false`는 자동 참조 제외입니다. `live`도 제작사 직접 검수를 뜻하지 않습니다.',
  'One ID represents one concept. Names, input aliases and community-style output have different roles. Meanings/rules retain the DB’s original editorial language, currently mostly Korean. Missing names are not invented. prerelease marks existing unreleased material; autoUse:false disables automatic reference. live does not mean publisher verification.',
  '同じIDは同じ概念です。言語別の名称、入力照合用の別名、コミュニティ出力を区別します。意味・規則はDBの原文（主に韓国語）で表示します。不明な名称は補作しません。prereleaseは既存の未公開資料、autoUse:falseは自動参照対象外です。liveは制作会社の直接確認を意味しません。',
  '同一ID代表同一概念。请区分语言名称、输入匹配别名与社区风格输出。含义及规则保留DB原文，目前主要为韩语；不编造缺失名称。prerelease表示既有未发布资料，autoUse:false表示不自动引用。live不等于制作方直接审核。'
]);
function entryText(entry) {
  const names = localizedNames(entry), outputs = entry.communityPreferred || {};
  const allLanguages = Object.keys(TEXT_LANGUAGES);
  const sources = (entry.sources || []).filter(source => typeof source === 'string' && /^https:\/\//.test(source));
  return `### ${entry.id}\n\n` +
    `| ${labels.join(' | ')} |\n|---|---|---|---|\n| ${['ko','en','ja','zh-CN'].map(lang => tagged(names[lang],entry.classification?.names?.[lang])).join(' | ')} |\n\n` +
    `<details><summary>추가 언어 / More languages / その他の言語 / 其他语言</summary>\n\n| Language | Name |\n|---|---|\n${allLanguages.filter(lang => !['ko','en','ja','zh-CN'].includes(lang)).map(lang => `| ${md(TEXT_LANGUAGES[lang])} (${lang}) | ${md(names[lang])} |`).join('\n')}\n\n</details>\n\n` +
    `- ID: ${md(entry.id)} · Status: ${md(entry.releaseStatus || 'supplemental')} · autoUse: ${entry.autoUse !== false}\n` +
    (entry.tags ? `- [태그 / Tags / タグ / 标签](../TAGS.md): ${entry.tags.map(tag=>tagLabels[tag]).join(' · ')}\n` : '') +
    (entry.classification ? Object.entries(entry.classification.aliases).map(([tag,values])=>values.length ? `- 입력 별칭 / Input aliases / 入力別名 / 输入别名 [${tagLabels[tag]}]: ${values.map(md).join(' · ')}\n` : '').join('') : `- 입력 별칭 / Input aliases / 入力別名 / 输入别名: ${(entry.aliases || []).map(md).join(' · ')}\n`) +
    (Object.keys(outputs).length ? `- 커뮤니티 출력 / Community output / コミュニティ出力 / 社区输出: ${Object.entries(outputs).map(([lang,name]) => `${lang}: ${tagged(name,entry.classification?.communityOutputs?.[lang])}`).join(' · ')}\n` : '') +
    `- 의미 / Meaning / 意味 / 含义: ${md(entry.meaning)}\n` +
    `- 적용 규칙 / Usage rule / 適用規則 / 使用规则: ${md(entry.rule)}\n` +
    (entry.communityRule ? `- 약어 규칙 / Shorthand rule / 略語規則 / 简称规则: ${md(entry.communityRule)}\n` : '') +
    (sources.length ? `- 출처 / Sources / 出典 / 来源: ${sources.map((source,i) => `[${i+1}](${source.replace(/[()\s]/g, char => encodeURIComponent(char))})`).join(' · ')}\n` : '') + '\n';
}
export function buildCatalogBrowser(catalog, output) {
  const files = new Map(), groups = new Map(), locations = new Map();
  for (const entry of catalog.entries) {
    if (!/^[a-z0-9-]+$/.test(entry.category)) throw new Error('Invalid catalog category');
    if (!/^[a-z0-9:_-]+$/i.test(entry.id)) throw new Error('Invalid catalog ID');
    const list = groups.get(entry.category) || []; list.push(entry); groups.set(entry.category,list);
  }
  const groupPages = [];
  for (const [category, entries] of groups) {
    const pages = []; let parts = [], size = 0;
    const flush = () => { if(parts.length) { pages.push(parts); parts=[]; size=0; } };
    for (const entry of entries) { const body=entryText(entry); if(parts.length>=50 || size+Buffer.byteLength(body)>150000) flush();parts.push({entry,body});size+=Buffer.byteLength(body); } flush();
    const links = [];
    for (let page=0;page<pages.length;page++) {
      const file=`catalog/terms/${category}-${page+1}.md`; links.push(`[${page+1}](terms/${category}-${page+1}.md)`);
      const neighbors = [page>0?`[←](./${category}-${page}.md)`:'', '[분류 / Categories / 分類 / 分类](../BROWSE.md)', '[전체 / Index / 全件 / 全部](../INDEX.md)', page+1<pages.length?`[→](./${category}-${page+2}.md)`:''].filter(Boolean).join(' · ');
      const body=`# ${title(category)} (${page+1}/${pages.length})\n\n${neighbors}\n\n${nav}\n\n${guide}\n`+pages[page].map(item=>{locations.set(item.entry.id,`terms/${category}-${page+1}.md#${anchor(item.entry.id)}`);return item.body;}).join('\n')+'\n'+neighbors+'\n';
      files.set(file,body);
    }
    groupPages.push(`| ${title(category)} | ${entries.length} | ${links.join(' · ')} |`);
  }
  const report='https://github.com/Odarom/zenless-translation-database/issues/new/choose';
  files.set('catalog/BROWSE.md',`# 카탈로그 둘러보기 / Browse / 用語一覧 / 浏览目录\n\n[전체 명칭 색인 / Name index / 名称索引 / 名称索引](INDEX.md) · [약어 / Abbreviations / 略語 / 简称](ABBREVIATIONS.md) · [공식·비공식 태그 / Tags / タグ / 标签](TAGS.md) · [DB 안내 / Guide / 案内 / 说明](README.md) · [신고 / Report / 報告 / 举报](${report})\n\n${nav}\n\n${guide}\n| 분류 / Category / 分類 / 分类 | 항목 / Count / 件数 / 数量 | 페이지 / Pages / ページ / 分页 |\n|---|---:|---|\n${groupPages.join('\n')}\n\n${catalog.entries.length} concepts · ${catalog.retrievedAt || 'reviewed'}\n`);
  const indexRows = [...catalog.entries].sort((a,b)=>(a.preferred?.ko || a.preferred?.en || a.id).localeCompare(b.preferred?.ko || b.preferred?.en || b.id,'ko')).map(entry=>`| [${md(entry.id)}](${locations.get(entry.id)}) | ${['ko','en','ja','zh-CN'].map(lang=>md(entry.preferred?.[lang])).join(' | ')} | ${Object.entries(entry.communityPreferred || {}).map(([lang,name])=>`${lang}: ${md(name)}`).join(' · ')} | ${md(entry.releaseStatus || 'supplemental')} | ${(entry.tags || []).map(tag=>md(tag)).join(' · ')} |`);
  files.set('catalog/INDEX.md',`# 전체 명칭 색인 / Name index / 名称索引 / 名称索引\n\n[분류 / Categories / 分類 / 分类](BROWSE.md) · [약어 / Abbreviations / 略語 / 简称](ABBREVIATIONS.md) · [공식·비공식 태그 / Tags / タグ / 标签](TAGS.md)\n\n${nav}\n\n${sections(['브라우저 찾기(Ctrl+F)로 네 기본 언어의 이름과 커뮤니티 출력을 검색하세요. ID를 누르면 입력 별칭·세부 규칙과 추가 9개 언어 이름을 볼 수 있습니다.','Use browser Find (Ctrl+F) for names in the four base languages and community output. Select an ID for input aliases, rules and names in nine additional languages.','ブラウザ検索（Ctrl+F）で基本4言語の名称とコミュニティ出力を探せます。IDから入力別名・規則・追加9言語の名称を確認できます。','使用浏览器查找（Ctrl+F）搜索基础四种语言名称及社区输出；点击ID查看输入别名、规则及其他九种语言名称。'])}\n| ID | ${labels.join(' | ')} | 약어 / Shorthand / 略語 / 简称 | Status | Tags |\n|---|---|---|---|---|---|---|---|\n${indexRows.join('\n')}\n`);
  for (const [file, text] of files) { mkdirSync(join(output, file.slice(0,file.lastIndexOf('/'))),{recursive:true});writeFileSync(join(output,file),text); }
  return [...files.keys()];
}

export function databaseGuides(catalog, repository) {
  const count=catalog.entries.length, raw=`https://raw.githubusercontent.com/${repository}/main/catalog/zzz.json`;
  const links='[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)';
  const data = {
    ko: ['ZZZ 번역 데이터베이스','Discord 봇과 영상 자막 작업실에서 함께 쓰는', '둘러보기','설치 없이 이름과 약어, 적용 규칙을 확인할 수 있습니다.','분류별 목록','전체 명칭 색인','약어 설명','범위·출처 안내','데이터 파일','이름·규칙·기본 4개 및 추가 9개 언어를 연결한 전체 DB. 큰 파일이므로 원본 보기로 연결합니다.','입력 별칭·커뮤니티 출력의 원본','출처를 대조해 보완한 명칭','문맥을 검토한 전투·자원 규칙','기존 개념에 연결한 추가 언어 이름','원본 버전·수집 시점·해시','프로그램용 업데이트 정보','후보 생성·검토·백업·적용 절차','이용·업데이트','화면의 기본 언어는 한국어·영어·일본어·중국어 간체이며 번역 명칭은 총 13개 언어를 지원합니다. 언어별로 등록된 항목 수는 다릅니다. 앱 설정에서 용어집 업데이트를 적용하면 이후 번역에 사용하며 기존 자막은 자동 변경되지 않습니다.','오류 신고','프로그램 없이 약어·공식 명칭·누락·규칙을 직접 신고할 수 있습니다. GitHub 로그인과 공개 게시가 필요합니다. 앱·Discord에서 보낸 비공개 신고와 함께 운영자가 요청할 때 검토하며, 제출만으로 DB가 바뀌지 않습니다.','팬 프로젝트이며 제작사의 공식·검수 사전이 아닙니다. 기존 미출시 자료는 상태를 표시하며 새로운 미출시 항목은 라이브 적용 확인 후 검토합니다. API 키·개인 기록·신고 원문은 공개 DB에 포함하지 않습니다.'],
    en: ['ZZZ translation database','Shared by the Discord bot and Subtitle Studio:', 'Browse','Read names, shorthand and rules without installing a program.','By category','Name index','Abbreviations','Scope and provenance','Data files','Complete names/rules DB with four base and nine additional languages. Opens the raw file because the JSON is large.','Input aliases and community output','Source-supported supplemental names','Reviewed combat/resource context rules','Additional names for existing concepts','Source versions, retrieval dates and hashes','Program update manifest','Candidate, review, backup and apply workflow','Use and updates','Interface guides use Korean, English, Japanese and Simplified Chinese; translation names cover 13 languages with different coverage. Apply a glossary update in the app for future translations; existing subtitles do not change automatically.','Report errors','Manually report shorthand, official names, missing terms or rules without the app. GitHub login is required and reports are public. Maintainer-requested review combines these with private app/Discord reports; submission does not change the DB automatically.','This is a fan project, not an official or publisher-reviewed dictionary. Existing prerelease material is labeled; new unreleased entries await confirmed live availability. Public DB files contain no API keys, user history or private report bodies.'],
    ja: ['ZZZ翻訳データベース','Discordボットと字幕スタジオで共有する', '閲覧','アプリなしで名称・略語・適用規則を確認できます。','分類別一覧','名称索引','略語の説明','範囲・出典','データファイル','基本4言語・追加9言語の名称と規則を含む全DB。大きいJSONのため原文表示へリンクします。','入力別名とコミュニティ出力','出典照合による補完名','確認済みの戦闘・リソース文脈規則','既存概念に追加した言語名','資料版・取得日時・ハッシュ','プログラム用更新情報','候補生成・確認・バックアップ・適用','利用・更新','画面と説明は韓国語・英語・日本語・簡体字中国語、翻訳名称は計13言語です。言語ごとの収録数は異なります。アプリの用語集更新は以後の翻訳に使い、既存字幕は自動変更しません。','誤りを報告','アプリなしで略語・正式名・未登録語・規則を報告できます。GitHubログインが必要で内容は公開されます。管理者が依頼時にアプリ・Discordの非公開報告と併せて確認します。投稿だけでDBは変わりません。','ファン制作で、制作会社の公式・監修辞典ではありません。既存の未公開資料は状態を表示し、新規の未公開語は正式実装確認後に検討します。APIキー・利用履歴・非公開報告原文は含みません。'],
    'zh-CN': ['ZZZ翻译数据库','Discord机器人与字幕工作室共用的', '浏览','无须安装程序即可查阅名称、简称及适用规则。','按分类浏览','名称索引','简称说明','范围与来源','数据文件','含基础四种及额外九种语言名称和规则的完整DB；JSON较大，链接打开原始文件。','输入别名与社区输出','按来源核对的补充名称','审核后的战斗及资源语境规则','为既有概念补充的语言名称','资料版本、收集日期及哈希','程序更新清单','候选生成、审核、备份与应用','使用与更新','界面及说明采用韩语、英语、日语、简体中文；翻译名称支持共13种语言，各语言覆盖数量不同。在程序中应用术语表更新后用于今后的翻译，既有字幕不会自动修改。','举报错误','无须程序即可提交简称、官方名称错误、缺失用语或规则。需要GitHub登录，内容公开。维护者在请求审核时与程序及Discord私密举报统一处理，提交不会自动改写DB。','粉丝制作，并非制作方官方或审核词典。已有未发布资料明确标注状态，新增未发布用语须确认正式实装后再审核。公开DB不含API密钥、用户记录或私密举报原文。']
  };
  return Object.fromEntries(Object.entries(data).map(([lang,s])=>[lang,`# ${s[0]}\n\n${links}\n\n${s[1]} **${count}** ${{ko:'개념 항목',en:'concepts',ja:'概念','zh-CN':'个概念'}[lang]} · **13** ${{ko:'개 언어',en:'languages',ja:'言語','zh-CN':'种语言'}[lang]}\n\n## ${s[2]}\n\n${s[3]}\n\n- [**${s[4]}**](catalog/BROWSE.md)\n- [${s[5]}](catalog/INDEX.md)\n- [${s[6]}](catalog/ABBREVIATIONS.md)\n- [${s[7]}](catalog/README.md)\n- [${tagLabels.official} · ${tagLabels.unofficial}](catalog/TAGS.md)\n\n## ${s[8]}\n\n| File | Description |\n|---|---|\n| [zzz.json — Raw](${raw}) | ${s[9]} |\n| [community.json](catalog/community.json) | ${s[10]} |\n| [curated.json](catalog/curated.json) | ${s[11]} |\n| [reviewed-mechanics.json](catalog/reviewed-mechanics.json) | ${s[12]} |\n| [localizations.json](catalog/localizations.json) | ${s[13]} |\n| [sources.json](catalog/sources.json) | ${s[14]} |\n| [latest.json](latest.json) | ${s[15]} |\n| [classification.json](catalog/classification.json) | ${tagLabels.official} / ${tagLabels.unofficial} |\n| [LIFECYCLE.md](catalog/LIFECYCLE.md) | ${s[16]} |\n\n## ${s[17]}\n\n${s[18]}\n\n[Subtitle Studio](https://github.com/Odarom/zenless-subtitle-studio/releases/latest) · [Discord](https://github.com/Odarom/zenless-discord-translator)\n\n## ${s[19]}\n\n[GitHub](${`https://github.com/${repository}/issues/new/choose`}) — ${s[20]}\n\n${s[21]}\n`]));
}
