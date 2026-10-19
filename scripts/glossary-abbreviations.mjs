import {readFileSync,writeFileSync} from 'node:fs';
import {EXTRA_LANGUAGES,TEXT_LANGUAGES} from '../src/languages.js';
const data=JSON.parse(readFileSync('glossary/community.json','utf8'));
const catalog=JSON.parse(readFileSync('glossary/zzz.json','utf8'));
const cell=value=>String(value??'—').replaceAll('|','\\|').replaceAll('\n',' ');
const row=values=>'| '+values.map(cell).join(' | ')+' |';
const date=data.entries.map(e=>e.reviewedAt||e.verifiedAt||'').sort().at(-1);
const lines=['# 커뮤니티 약어 · Community shorthand · コミュニティ略語 · 社区简称','','[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)','','## 한국어','','확인일: '+date+'. 관리 그룹 '+data.entries.length+'개. 입력 별칭과 번역 출력은 별도로 관리합니다. 한 표기는 문맥에 따라 여러 뜻을 가질 수 있습니다.','','기존 게임 명칭에 연결되는 별칭은 해당 개념의 네 언어 명칭을 참조합니다. 별도 개념은 커뮤니티 번역이며 공식 UI 표제라는 뜻이 아닙니다. 영문 대소문자는 구분하지 않습니다. 문맥이 부족하면 원래 표현을 유지합니다.','','| 입력 / Input / 表記 / 写法 | 한국어 | English | 日本語 | 简体中文 |','|---|---|---|---|---|'];
for(const e of data.entries){
 const target=catalog.entries.find(c=>c.id===(e.targetId??e.id));
 const p=target?.preferred??e.preferred??{};
 lines.push(row([e.aliases.join(' · '),p.ko,p.en,p.ja,p['zh-CN']]));
}
lines.push('','## 구분 규칙','',
'- 깡공·깡방·깡체는 고정 수치, 공퍼·방퍼·체퍼는 퍼센트입니다. 깡공과 기초공은 다릅니다.',
'- 깡관·깡관통·고정 관통은 고정 수치입니다. 능력치 문맥의 관통·관통%는 관통률이며 고정 수치에 %를 붙이지 않습니다.',
'- 이상마·상마·AP는 이상 마스터리, 장악·AM은 이상 장악력입니다. 일반 영어 I am이나 오전 AM에는 적용하지 않습니다.',
'- CD는 능력치 문맥의 치명타 피해와 시간 문맥의 재사용 대기시간을 구분합니다.',
'- 캐릭터 M0~M6와 W-엔진 재련은 분리합니다. 전무/sig는 전용 W-엔진을 뜻하며 캐릭터나 장비 이름을 임의로 추가하지 않습니다.',
'- 속성 피해 저항 감소(RES reduction/shred)의 한국어 커뮤니티 출력은 속저깎입니다. 속성 피해 저항 무시(ignore RES)는 별개 효과이며 속저깎으로 바꾸지 않습니다. 속성·수치·대상·적용 공격·조건을 보존합니다.',
'- 지돌은 입력 별칭만 유지하며 한국어 출력은 지원 돌격을 사용합니다. 극한 회피도 임의로 줄이지 않습니다.',
'- 침식체는 문맥에서 미지의 복합 침식체를 지칭할 때만 해당 보스의 단축 출력으로 사용합니다. 다른 침식체 전체를 이 보스로 바꾸지 않습니다.',
'- DA·Astral의 다의어와 평꾹/EBA·반복 콤보 입력의 기존 구분을 유지합니다.','',
'## 커뮤니티 스타일 출력','',
'아래에 등록한 언어별 표현만 우선 사용합니다. 대시(—)는 별도 단축 출력이 없다는 뜻이며 기존 명칭으로 번역합니다. 정식 명칭 스타일에서는 전체 명칭을 사용합니다.','',
'| 개념 / Concept / 概念 | 한국어 | English | 日本語 | 简体中文 |','|---|---|---|---|---|');
for(const e of data.entries.filter(e=>e.communityPreferred)){
 const target=catalog.entries.find(c=>c.id===(e.targetId??e.id)),p=e.communityPreferred;
 lines.push(row([target?.preferred?.ko??e.id,p.ko,p.en,p.ja,p['zh-CN']]));
}
lines.push('','## 출처와 유지보수','','상세 의미·적용 조건·출처는 [community.json](community.json)에 기록합니다. 표기 변형과 커뮤니티 출력은 출처의 개념을 바탕으로 정리한 것으로, 모든 별칭이 원문 출처에 등장한다는 뜻은 아닙니다.','','[갱신 절차](LIFECYCLE.md)에 따라 후보를 검토·적용한 후 관리 프로젝트에서 scripts/glossary-abbreviations.mjs를 실행해 이 표를 갱신합니다.');
for(const [language,body] of [["English","Input aliases and translation output are separate. The tables in the Korean section show the same four-language data for all readers. A spelling may have several contextual meanings. Existing game aliases link to the concept's original four-language names; standalone community concepts are not official UI labels. English matching ignores case and insufficient context preserves the source.\n\n### Disambiguation\n\n- Flat ATK/DEF/HP and percentage ATK/DEF/HP are distinct; flat ATK is not base ATK.\n- Flat PEN stays fixed. 관통/관통% in stat context means PEN Ratio; never add % to a fixed value.\n- 이상마/상마/AP means Anomaly Proficiency, 장악/AM Anomaly Mastery; not ordinary I am or time-of-day AM.\n- CD can mean CRIT DMG in stats or cooldown in timing context.\n- Character M0–M6 and W-Engine overclocking are separate. 전무/sig means signature W-Engine without inventing a character or item name.\n- 속저깎 means RES reduction. RES ignore is a different effect. Preserve element, value, target, attack and condition.\n- 지돌 is an input alias only; Korean output is 지원 돌격. Do not arbitrarily shorten Perfect Dodge.\n- 침식체 abbreviates Unknown Corruption Complex only when context identifies that boss.\n- Preserve DA/Astral ambiguity and distinctions between held-basic/EBA and repeated combo expressions.\n\nUse only registered language-specific shorthand in communityPreferred. A dash (—) means no shorthand and falls back to the original name; official-name style uses full names. Meaning, conditions and sources are in community.json. Not every spelling variant appears literally in its cited source. After candidate review/application under LIFECYCLE.md, run node scripts/glossary-abbreviations.mjs in the maintainer project to regenerate the tables. The review date and managed-group count above are generated from community.json."],["日本語","入力別名と翻訳出力は別管理です。韓国語節の表は全読者共通の4言語データです。同じ表記に文脈別の意味がある場合があります。既存概念は元の4言語名に接続し、独自コミュニティ概念を公式UI名とは主張しません。英語は大文字小文字を区別せず、文脈不足なら原文を保持します。\n\n### 識別ルール\n\n- 攻撃力・防御力・HPの固定値とパーセントを分け、固定攻撃力と基礎攻撃力も区別します。\n- 固定貫通値に%を付けません。能力値文脈の관통/관통%は貫通率です。\n- 이상마/상마/APは異常マスタリー、장악/AMは異常掌握です。一般英語I amや午前AMには適用しません。\n- CDは能力値の会心ダメージと時間文脈のクールタイムを区別します。\n- キャラM0〜M6と音動機の段階は別です。전무/sigはモチーフ音動機で、キャラや装備名を推測しません。\n- 속저깎は耐性低下です。耐性無視と混同せず属性・値・対象・攻撃・条件を保ちます。\n- 지돌は入力だけに残し、韓国語出力は지원 돌격です。極限回避も勝手に略しません。\n- 침식체は文脈上そのボスを指す場合だけ未確認複合侵蝕体の略称とします。\n- DA/Astralの多義、長押し通常攻撃/EBAと反復コンボを区別します。\n\ncommunityPreferredの登録済み言語別出力だけを優先し、—なら元名、正式名スタイルなら全名を使います。意味・条件・出典はcommunity.jsonで管理し、全別名が出典にそのまま現れるとは限りません。LIFECYCLE.mdで確認・適用後、管理プロジェクトでnode scripts/glossary-abbreviations.mjsを実行して表を更新します。冒頭の確認日と件数はcommunity.jsonから生成します。"],["简体中文","输入别名与翻译输出分别管理。韩文部分的表格是所有读者共用的四语言数据。同一写法可能有多种语境含义。已有概念连接其原四语言名称，独立社区概念不声称为官方UI。英文匹配不区分大小写，语境不足保留原文。\n\n### 区分规则\n\n- 固定攻击/防御/生命与百分比不同，固定攻击也不同于基础攻击。\n- 固定穿透值不加%。属性语境的관통/관통%表示穿透率。\n- 이상마/상마/AP为异常精通，장악/AM为异常掌控；不用于普通英文I am或上午AM。\n- CD在属性中可指暴击伤害，在时间语境指冷却。\n- 角色M0–M6与音擎叠层分开。전무/sig表示专属音擎，不推断角色或装备名。\n- 속저깎表示抗性降低，无视抗性是另一效果，必须保留属性、数值、对象、攻击与条件。\n- 지돌只保留输入，韩文输出지원 돌격；极限闪避也不随意缩写。\n- 침식체只在语境指向未知复合侵蚀体时作为该首领简称。\n- 保留DA/Astral多义、长按普攻/EBA及重复连招的区别。\n\n只优先使用communityPreferred登记的语言输出，—表示无简称而用原名，正式名称风格用全名。含义、条件、来源见community.json，不意味着每个变体都逐字出现于来源。按LIFECYCLE.md审核应用后，在管理项目运行node scripts/glossary-abbreviations.mjs生成表格。顶部审核日期及组数由community.json自动生成。"]]) lines.push('','---','','## '+language,'',body);
lines.push('','## 추가 언어 약어 등록칸 · Additional-language shorthand slots · 追加言語の略語欄 · 附加语言简称栏','','추가 9개 언어의 미등록 칸입니다. 검토된 약어만 communityPreferred로 옮기며, 빈 칸은 번역에 사용하지 않고 정식 명칭을 사용합니다.','','These nine additional-language slots are unreviewed. Only approved shorthand moves into communityPreferred; empty slots never enter translation prompts and fall back to full names.','','追加9言語の未登録欄です。確認済みの略語だけをcommunityPreferredへ移し、空欄は翻訳に使用せず正式名を使います。','','以下为额外9种语言的未登记栏，仅审核后的简称才写入communityPreferred；空栏不用于翻译，使用正式名称。','',row(['개념 / Concept',...EXTRA_LANGUAGES.map(code=>TEXT_LANGUAGES[code])]),row(Array(EXTRA_LANGUAGES.length+1).fill('---')));
for(const entry of data.entries){const target=catalog.entries.find(row=>row.id===(entry.targetId??entry.id));lines.push(row([target?.preferred?.ko??entry.id,...EXTRA_LANGUAGES.map(code=>entry.communityPreferred?.[code]??null)]));}
const document=(lines.join('\n')+'\n').replaceAll('](LIFECYCLE.md','](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/LIFECYCLE.md').replaceAll('](community.json','](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/community.json');
writeFileSync('glossary/ABBREVIATIONS.md',document);
console.log(JSON.stringify({concepts:catalog.entries.length,groups:data.entries.length}));
