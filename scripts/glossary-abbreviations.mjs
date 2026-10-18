import {readFileSync,writeFileSync} from 'node:fs';
const data=JSON.parse(readFileSync('glossary/community.json','utf8'));
const catalog=JSON.parse(readFileSync('glossary/zzz.json','utf8'));
const cell=value=>String(value??'—').replaceAll('|','\\|').replaceAll('\n',' ');
const row=values=>'| '+values.map(cell).join(' | ')+' |';
const date=data.entries.map(e=>e.reviewedAt||e.verifiedAt||'').sort().at(-1);
const lines=['# 커뮤니티 약어 목록','','확인일: '+date+'. 관리 그룹 '+data.entries.length+'개. 입력 별칭과 번역 출력은 별도로 관리합니다. 한 표기는 문맥에 따라 여러 뜻을 가질 수 있습니다.','','기존 게임 명칭에 연결되는 별칭은 해당 개념의 네 언어 명칭을 참조합니다. 별도 개념은 커뮤니티 번역이며 공식 UI 표제라는 뜻이 아닙니다. 영문 대소문자는 구분하지 않습니다. 문맥이 부족하면 원래 표현을 유지합니다.','','| 인식하는 표기 | 한국어 | 영어 | 일본어 | 중국어 간체 |','|---|---|---|---|---|'];
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
'| 용어 | 한국어 출력 | 영어 출력 | 일본어 출력 | 중국어 출력 |','|---|---|---|---|---|');
for(const e of data.entries.filter(e=>e.communityPreferred)){
 const target=catalog.entries.find(c=>c.id===(e.targetId??e.id)),p=e.communityPreferred;
 lines.push(row([target?.preferred?.ko??e.id,p.ko,p.en,p.ja,p['zh-CN']]));
}
lines.push('','## 출처와 유지보수','','상세 의미·적용 조건·출처는 [community.json](community.json)에 기록합니다. 표기 변형과 커뮤니티 출력은 출처의 개념을 바탕으로 정리한 것으로, 모든 별칭이 원문 출처에 등장한다는 뜻은 아닙니다.','','[갱신 절차](LIFECYCLE.md)에 따라 후보를 검토·적용한 후 관리 프로젝트에서 scripts/glossary-abbreviations.mjs를 실행해 이 표를 갱신합니다.');
writeFileSync('glossary/ABBREVIATIONS.md',lines.join('\n')+'\n');
console.log(JSON.stringify({concepts:catalog.entries.length,groups:data.entries.length}));
