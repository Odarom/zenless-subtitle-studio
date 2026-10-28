# 번역 DB 개발자 안내

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

[concepts.json](../catalog/concepts.json)은 한 개념의 이름, 입력 별칭, 대표 출력, 사용 조건을 함께 제공합니다. 다른 파일을 조합하지 않고 사용할 수 있습니다. 기존 [zzz.json](../catalog/zzz.json)과 루트 [latest.json](../latest.json)은 현재 앱을 위해 그대로 유지합니다.

## 바로 실행하기

공개 DB 저장소를 내려받고 Node.js 24.17 이상에서 저장소 폴더를 기준으로 실행하세요. 패키지 설치나 API 키는 필요하지 않습니다.

```sh
node database/examples/query.mjs "Deadly Assault" ko en
```

인수는 원문, 출력 언어, 원문 언어 순서입니다. 예제는 후보와 번역 요청에 넣을 용어 자료를 출력합니다. 실제 번역 요청은 보내지 않으며 원문을 바꾸지 않습니다. 이 안내의 경로는 배포된 DB 저장소 기준입니다. 관리용 작업 폴더에서는 DB 빌드 결과 폴더에서 실행하세요.

앱에 연결할 때는 JSON을 한 번 읽고 조회 객체를 재사용합니다.

```js
import { readFile } from 'node:fs/promises';
import { createDatabase, GLOSSARY_INSTRUCTIONS } from './database/index.mjs';

const catalog = JSON.parse(await readFile('./catalog/concepts.json', 'utf8'));
const db = createDatabase(catalog);
const text = 'Deadly Assault';
const candidates = db.search(text);
const instructions = GLOSSARY_INSTRUCTIONS;
const glossary = db.prompt(candidates, {
  text,
  languages: ['en', 'ko'],
  style: 'official',
});
```

자신의 번역 요청에 `instructions`를 용어집 사용 지침으로 포함하고 `text`와 `glossary`를 자료로 전달하세요. 이 예제 자체는 API를 호출하지 않습니다. 원본 규칙에 남아 있는 `preferred`는 새 형식의 `names`, `communityPreferred`는 선택된 커뮤니티 출력을 뜻합니다. 지침이 이 대응 관계를 설명하므로 원본 규칙 문구를 바꿀 필요가 없습니다. 선택한 표기도 문맥·예외·대상 조건을 무시하는 근거가 될 수 없습니다.

## 조회 방법

| 호출 | 반환값과 용도 |
|---|---|
| `db.get(id)` | 해당 개념 전체. 없는 ID는 `undefined`. 비활성·미출시 항목도 직접 조회할 수 있습니다. |
| `db.lookup(alias)` | 입력 전체가 별칭과 일치하는 모든 개념. 대소문자를 구분하지 않습니다. |
| `db.search(text)` | 문장 속 별칭에 맞는 모든 후보. 영문·숫자 경계와 더 긴 명칭의 겹침을 처리합니다. |
| `db.prompt(candidates, { text, languages, style })` | 실제 일치한 별칭, 요청한 언어의 이름·출력과 의미·규칙·문맥 조건을 담은 배열. |

`lookup`과 `search`는 기본적으로 `autoUse: false`와 `prerelease`를 제외합니다. 검토용으로만 포함하려면 `{ includeDisabled: true, includePrerelease: true }`를 명시할 수 있습니다. 항목은 원본 데이터에 보존됩니다. 조회는 띄어쓰기·전각 문자 정규화, 오타·음성 유사어 추정, OCR 조각 결합을 하지 않습니다.

같은 약어의 여러 뜻은 모두 반환됩니다. 배열 첫 항목을 정답으로 선택하거나 별칭을 무조건 치환하면 안 됩니다. 주변 문장, 등장인물, 스킬과 `usage`의 조건을 함께 확인하고, 뜻이 불명확하면 원문 표현을 유지하세요. 검색에 필요한 앞뒤 문맥은 호출자가 제공해야 합니다.

`prompt`에는 이 조회 객체가 반환한 후보를 전달합니다. `text`는 필수이며, 검색에 사용한 원문과 관련 문맥을 그대로 전달합니다. 결과의 `matchedAliases`에는 이 텍스트에 실제로 일치한 별칭만 담습니다. `get`으로 넣은 개념이 텍스트에 없으면 빈 배열입니다. `languages`는 지원 언어 코드의 비어 있지 않은 배열이며 필수입니다. `style`은 `official` 또는 `community`입니다. `community`는 이미 지정된 `communityOutputs`만 사용하고, 없으면 해당 언어의 `names`를 사용합니다. 이름이 없는 언어의 표현을 만들지 않습니다. `official`도 모든 이름이 공식임을 보증하는 필터는 아닙니다. 실제 분류는 `classification`에서 확인하세요.

번역 요청용 결과에서는 `meaning`·`rule`·`communityRule`과 문맥 필드를 바깥으로 꺼내 제공합니다. 대표 출력이 `names`와 달라질 때만 `outputPreferred`가 있으며, 적용할 표현은 `outputPreferred?.[language] ?? names[language]`로 읽습니다. `prompt`는 전달받은 후보를 다시 제외하지 않으므로 `get`으로 직접 넣은 비활성·미출시 항목의 사용 여부는 호출자가 판단해야 합니다.

## 데이터 구조

최상위 `format`은 `zzz-translation-concepts`, `schemaVersion`은 `1`입니다. `languages`는 지원 언어 코드 목록, `source`는 이 파일을 만든 기존 DB의 해시·버전·수집 날짜입니다. 개념은 `concepts` 배열에 있습니다. 상세 형식은 [JSON Schema](catalog.schema.json)를 참고하세요.

언어 코드: `ko`, `en`, `ja`, `zh-CN`, `zh-Hant`, `de`, `fr`, `es`, `pt`, `ru`, `th`, `vi`, `id`.

| 필드 | 의미 |
|---|---|
| `id`, `category` | 개념 식별자와 분류. 이름을 바탕으로 ID를 새로 만들지 마세요. |
| `names` | 기본 4개와 추가 9개 언어의 이름을 하나로 모은 언어별 목록. 언어별 수록 범위는 다릅니다. |
| `aliases` | 입력을 알아보기 위한 표현들. 출력 후보 선택 순서가 아닙니다. |
| `communityOutputs` | 사용자가 지정한 언어별 대표 커뮤니티 출력. 검토 전 후보는 포함하지 않습니다. |
| `usage` | `meaning`, `rule`, 선택적 `communityRule`. 의미, 적용 조건, 약어 사용 조건을 보존합니다. |
| `context` | 선택적 `characterId`, 언어별 `characterName`·`relatedSkills`. 주체와 관련 스킬을 구분하는 자료입니다. |
| `availability` | `releaseStatus`, `autoUse`, 선택적 `releaseVersion`·`sourceVersion`. |
| `classification` | 이름·별칭·현재 대표 출력을 각각 `official`, `unofficial`, `needs-review`로 분류합니다. |
| `tags` | 개념에 포함된 표현 분류의 합집합. 개별 표현의 분류는 `classification`을 확인하세요. |

`live`는 공식성이나 제작사 검수를 뜻하지 않습니다. `prerelease`는 기존 미출시 자료이며, `unspecified`는 출시 상태 미지정입니다. 이름이 없는 언어는 원문을 유지하고 새 이름을 만들지 마세요. 의미와 규칙은 주로 한국어인 DB 원문을 유지합니다.

## 요청 크기와 업데이트

`prompt`는 이름·출력에 요청한 언어만 남기고 전체 별칭·분류·관리 자료를 보내지 않습니다. 의미·부정·예외·대상·스킬 조건은 그대로 유지합니다. `characterName`·`relatedSkills`에 요청 언어가 하나도 없으면 영어 문맥을, 영어도 없으면 `catalog.languages` 순서상 첫 등록 언어의 문맥을 보존합니다. 이는 문맥 단서이며 새로 만든 번역명이 아닙니다. 빈 문맥 목록은 생략합니다. 검색에서 빠진 문맥을 복원하거나 번역 품질을 보증하는 기능은 아니므로, 영상 전체를 부분별로 나눌 때는 문맥 유지도 별도로 검증하세요.

새 형식은 [database/latest.json](latest.json)을 사용합니다. `file`은 **저장소 루트 기준** 경로이며 불변 배포 파일을 가리킵니다. 파일 바이트의 SHA-256과 `bytes`를 확인한 뒤 사용하세요. `sourceSha256`은 기존 DB의 해시이므로 새 파일의 `sha256`과 구분합니다. SDK와 JSON은 같은 Git 커밋으로 고정하고 `schemaVersion`을 검사하세요. `catalog/concepts.json`은 현재 자료를 쉽게 읽기 위한 경로입니다.

이 저장소는 배포 자료입니다. `catalog`의 원본 관리·재구성 명령은 별도의 관리 작업 폴더에서 실행하며, 이 저장소에서 실행할 수 있다고 가정하면 안 됩니다. 수정 제안은 [신고 양식](https://github.com/Odarom/zenless-translation-database/issues/new/choose)으로 보내세요. 대표 출력은 임의로 선택하지 않고 사용자 확인을 거쳐 반영합니다.
