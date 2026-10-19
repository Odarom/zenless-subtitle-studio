# ZZZ 번역 데이터베이스 · ZZZ translation database · ZZZ用語DB · ZZZ术语库

[**용어·약어 오류 신고**](https://github.com/Odarom/zenless-translation-database/issues/new/choose) · [Report names / shorthand](https://github.com/Odarom/zenless-translation-database/issues/new/choose) · [用語・略語を報告](https://github.com/Odarom/zenless-translation-database/issues/new/choose) · [举报术语或简称](https://github.com/Odarom/zenless-translation-database/issues/new/choose)

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

## 한국어

2026-10-19 기준 **2,313개 개념 항목**을 저장했습니다. 정식 자료와 보완 항목 2,186개, 미출시 자료에만 있는 항목 127개입니다. 같은 표기가 여러 개념에 쓰이면 ID를 분리하므로 서로 다른 단어 2,313개라는 뜻은 아닙니다.

한국어·영어·일본어·중국어 간체의 같은 ID와 원본 위치를 연결합니다. 캐릭터·장비·보스 이름뿐 아니라 **62명 전체의 스킬·패시브 명칭 1,047개와 형상 시네마 이름 372개**를 포함합니다. 출처가 정식으로 표시한 캐릭터 60명과 미출시 2명이며, 스킬 수치표와 설명 본문은 공유 사전에 넣지 않습니다.

## 수집 범위

| 분류 | 항목 수 |
|---|---:|
| 캐릭터 | 62 |
| W-엔진 | 103 |
| 디스크 세트 | 30 |
| 방부 | 42 |
| 적·보스 | 277 |
| 캐릭터 기믹 | 44 |
| 전투 기믹 보완 | 7 |
| 문맥 검수가 필요한 참고 용어 | 95 |
| 재화 | 13 |
| 성장 재료 등 | 135 |
| 캐릭터 스킬·핵심 패시브·추가 능력 이름 | 1,047 |
| 형상 시네마 이름 | 372 |
| 공통 전투 동작·패시브 구분 | 22 |
| 능력치·속성 피해 | 17 |
| 단독 전투 속성 이름 | 6 |
| 커뮤니티 별도 개념 | 37 |
| 콘텐츠·모드 보완 명칭 | 3 |
| 장비 효과 보완 명칭 | 1 |

참고 용어 95개 중 전투 문맥을 검토한 **25개는 자동 참조**하고, 다른 콘텐츠·미니게임과 혼동할 수 있는 **70개는 제외**합니다. 예리 피해·절상 피해·잔흔·파상·청명검세·명심경 등이 포함됩니다. 효과 이름 `Chain Attack = 콤보`가 전투 동작 `Chain Attack = 콤보 스킬`을 덮어쓰지 않도록 제외 상태를 유지합니다.

전체 스토리 고유명사, 스킬 설명 속 모든 효과, 모든 지역의 커뮤니티 약어까지 완성한 사전은 아닙니다. 이름 대응을 넓힌 것이며 모델의 문장 해석과 표현 품질을 보장하지 않습니다.

## 채팅에서 이름을 찾는 방식

원본의 `[침식 장벽]`처럼 UI 장식이 있는 이름도 `침식 장벽`·`침식장벽`으로 찾습니다. 캐릭터 스킬은 전체 명칭과 종류 접두어를 뺀 이름으로 검색하고, 캐릭터 정보를 함께 전달해 같은 이름을 구분하도록 합니다.

직접 메시지에서 찾은 이름을 우선하고 답글·최근 문맥의 이름을 보완합니다. **해당 문장과 관련된 항목만 최대 30개** AI에 전달하며 사전 전체를 매번 보내지 않습니다. 영상은 기본 전체 용어집을 사용하며 작은 모델은 관련 용어만 직접 선택합니다. 관리용 출처·이력은 프롬프트에서 제외하고 DeepL은 DB를 로컬 용어 보호에 사용합니다. 더 긴 명칭을 우선하고, 그 이름 안의 짧은 단어를 별개 개념으로 검색하지 않습니다. 예를 들어 `Deadly Assault`만 있으면 물리 이상 효과 `Assault`를 함께 전달하지 않습니다. 같은 문장에 별도로 `Assault`가 등장하면 두 개념을 유지합니다.

같은 범위의 `DA`가 대시 공격과 강습을 뜻할 수 있는 경우 두 후보를 유지합니다. 콤보·길게 누르기 같은 커뮤니티 표현은 구성 동작도 함께 전달합니다. 애매한 약어의 뜻은 문맥으로 판단하며 근거가 부족하면 원문을 유지하도록 안내합니다.

## 약어와 신고 보완

커뮤니티 관리 그룹은 73개이며 [전체 약어 목록](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/ABBREVIATIONS.md)에 네 언어 대응과 출력 약어가 있습니다. `빠지/QA`, `강특/EX`, `강강평/EX → EX → BA`, `강꾹/hold EX`, `공퍼/깡공/기초공`, `관통%/깡관`, `이상마/AP`, `장악/AM`, `명전/M0W1`, `전무/sig`, `YSG/Ye/빛나`, `YX` 등을 인식합니다.

`communityPreferred`는 커뮤니티 스타일의 출력 표현입니다. 입력 별칭인 `aliases`와 별도이며, 출력 약어가 없는 언어는 원본 명칭을 사용합니다. 캐릭터·숫자·조건을 생략하거나 새로운 약어를 만들어내는 설정은 아닙니다.

2026-10-19에는 한국어 명칭을 **W-엔진·전용 W-엔진**으로 정리하고 입력 별칭과 커뮤니티 출력을 수정했습니다. `꽝꽝이·관통·콤스·치치`를 인식하며, 출력은 `관통%·장악·에회·얼피증·치치·속저깎`을 사용합니다. `전무`는 유지하고 지원 돌격·극한 회피의 한국어 단축 출력은 사용하지 않습니다. **속성 피해 저항 감소와 속성 피해 저항 무시는 별도 개념**이며 속성·수치·적용 공격·조건을 바꾸지 않습니다. 구체적인 입력·출력 표기는 전체 약어 목록을 참고하세요.

2026-10-13 추가 신고 5건에서 다음을 보완했습니다.

- `침식 장벽 → Corruptive Barrier`: 올바른 대응은 이미 있었으나 대괄호 없는 입력이 검색되지 않아 UI 표기 변형을 추가했습니다.
- 보스 약칭 `UCC → 미지의 복합 침식체`를 같은 보스 ID에 병합했습니다.
- `Typhon → 티폰`, `Scorched Horizon → 태양의 잔불`을 기본 이름으로 연결했습니다. 원문에 변형명이 없으면 챌린저·파에톤·융합 등을 추측하지 않습니다.
- 게임 버프 문맥의 `shill buffs → 접대`는 사용자가 확인한 커뮤니티 표현으로 추가했습니다.

기존 `Astral Voice/고요`와 `Astral/별` 효과, 엽빛나의 `극치/Culmination`, `섬광/Soaring Light`, `귀결/Return to Dust`, 강습의 `시련/Trial Mode`와 `절망/Adversity Mode`도 유지합니다. 일반 단어와 겹치는 표현에는 각각 적용 문맥이 있습니다.

## 출처와 검수 범위

[Nanoka](https://zzz.nanoka.cc/)가 수집 시점에 정식으로 표시한 **3.2**와 최신 미출시 **3.3.12+19629936**을 구분했습니다. 514개 공개 원본 파일의 해시·버전을 `sources.json`에 기록합니다. 모든 캐릭터의 네 언어 상세 자료를 수집하며, 앞으로 버전 갱신 때 스킬·패시브·형상 이름도 다시 비교합니다.

`curated.json`의 보완 명칭은 제작사 다국어 공지, 같은 ID의 팬 데이터, 일부 커뮤니티 자료를 항목별로 구분해 기록합니다. 완벽 대응·부위 파괴·부조화 수치/상태는 [ZenlessData 언어별 자료](https://git.mero.moe/dimbreath/ZenlessData/src/branch/master/TextMap)의 같은 설명 키에서 이름을 대조했습니다. 해당 설명의 버프 수치는 저장하지 않습니다.

[Honey Hunter 일본어 엔비 자료](https://zzz.honeyhunterworld.com/1011-char/?lang=JP)는 일부 표본만 교차 대조했습니다. 두 팬 사이트의 전 항목을 교차 검수하거나 실제 게임 클라이언트 전체와 대조했다는 뜻은 아닙니다. `source-matched`는 출처의 동일 항목을 연결했다는 의미이며 제작사 직접 검수 완료 표시가 아닙니다. 커뮤니티 확장 표현도 공식 UI 번역으로 주장하지 않습니다.

미출시 이름은 바뀔 수 있습니다. 자리표시자 언어는 제외하고 확인된 언어만 저장하며, 번역 대상 언어 이름이 없으면 원래 고유명사를 유지하도록 안내합니다. 정식 자료의 이름은 베타 이름으로 덮어쓰지 않습니다.

## 필드와 유지보수

- `id`, `preferred`, `aliases`: 개념 ID, 언어별 원본 명칭, 검색할 표기.
- `communityPreferred`: 커뮤니티 스타일에서 우선 출력할 언어별 약어.
- `category`, `meaning`, `rule`, `communityRule`: 개념 종류와 적용 조건.
- `characterId`, `characterName`, `relatedSkills`: 해당 캐릭터·스킬을 구분하는 정보.
- `autoUse`: false이면 자동 번역에서 참조하지 않음.
- `sources`, `sourceKey`, `sourceVersion`, `retrievedAt`: 출처와 원본 위치·버전·수집일.
- `releaseStatus`, `releaseVersion`, `nameHistory`: 정식·미출시 상태와 과거 이름 이력.

공유할 자료는 `zzz.json`, `community.json`, `curated.json`, `reviewed-mechanics.json`, `sources.json`입니다. `.env`·API 키·서버 설정·신고 원문은 공유 자료에 포함하지 않습니다. 새 약어는 `community.json`, 자동 수집 밖의 대조 명칭은 `curated.json`, 참고 용어의 활성화 판단은 `reviewed-mechanics.json`에서 관리합니다. 검토한 영어 원본 이름이 달라지면 해당 참고 용어는 다시 자동 참조에서 제외됩니다.

```powershell
# 정식·미출시 자료로 비교 후보 생성
npm run glossary:sync
# glossary/updates/review.md를 검토한 뒤 적용
npm run glossary:apply
```

후보 생성과 적용을 분리하고 이전 자료를 백업합니다. 오라클 반영은 그 뒤에 별도로 수행합니다. [출시 후 재확인 절차](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/LIFECYCLE.md)를 따르며 예약 감시는 아직 등록하지 않았습니다.

---

## English

As of 2026-10-19, the catalog contains 2,313 concepts: 2,186 released/supplemental and 127 prerelease-only entries. IDs distinguish concepts sharing a spelling, so this is not 2,313 unique strings. Names align Korean, English, Japanese and Simplified Chinese by source ID/location. Includes all 62 listed characters (60 source-marked released, 2 prerelease), 1,047 skill/passive names and 372 Mindscape names. Complete skill prose/stat tables are excluded. See the multilingual count/field tables below.

Of 95 context-sensitive references, 25 reviewed combat terms are enabled and 70 potentially confusing content/minigame terms are excluded. This prevents an effect named Chain Attack from replacing the combat action Chain Attack. The catalog does not cover every story name, effect or regional abbreviation and does not guarantee sentence quality.

### Matching and output

UI brackets/quotes and Korean spacing variants become aliases. Skills include full names, type-prefix-free forms and character context. Chat prioritizes the message, then reply/recent context, and sends at most 30 related candidates in the same translation call. Longer names suppress contained shorter terms unless the shorter term occurs separately. Deadly Assault alone therefore does not also select Assault. Equal-span DA meanings remain as candidates, and community combo/hold phrases also retain component actions. Ambiguity is resolved by context in the translation call; preserve the original when evidence is insufficient. Video defaults to the full glossary, excluding administrative provenance/history; smaller models may explicitly choose related terms only. DeepL uses the full DB locally for term protection.

There are 73 community groups in [ABBREVIATIONS.md](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/ABBREVIATIONS.md). aliases governs input matching; communityPreferred governs output, falling back to original names where no abbreviation exists. It does not authorize omitted characters/numbers/conditions or invented abbreviations. On 2026-10-19 Korean names were standardized to W-엔진/전용 W-엔진, inputs 꽝꽝이·관통·콤스·치치 were added, and outputs 관통%·장악·에회·얼피증·치치·속저깎 updated. 전무 remains; Assist Follow-Up/Perfect Dodge are not shortened in Korean. RES reduction and RES ignore are different effects: retain attribute, value, target, attack and condition.

Earlier 2026-10-13 review added undecorated Corruptive Barrier aliases, merged UCC into Unknown Corruption Complex, linked Typhon/Scorched Horizon without inventing boss forms, and recorded contextual shill buffs as community language. Existing Astral Voice versus Astral, Culmination, Soaring Light, Return to Dust, Trial Mode and Adversity Mode distinctions remain. General-word collisions require context.

### Provenance and maintenance

Source-marked live 3.2 and prerelease 3.3.12+19629936 are distinguished. sources.json records versions/hashes for 514 public source files from [Nanoka](https://zzz.nanoka.cc/). Detailed character names are re-compared on source-version updates. Curated names distinguish publisher multilingual notices, same-ID fan data and community evidence. Certain combat names were checked at matching description keys in [ZenlessData](https://git.mero.moe/dimbreath/ZenlessData/src/branch/master/TextMap); buff numbers are not stored. [Honey Hunter Japanese Anby](https://zzz.honeyhunterworld.com/1011-char/?lang=JP) was sampled only. This is not exhaustive cross-validation of fan sites or a complete game client. source-matched is not direct publisher verification. Community expressions are not official UI claims.

Prerelease names may change. Exclude placeholder languages; preserve the source noun if a target-language name is missing. Beta names never overwrite released names. Share zzz.json,community.json,curated.json,reviewed-mechanics.json,sources.json only; never keys, server settings or reports. Edit community.json for aliases,curated.json for supplemental names,reviewed-mechanics.json for activation decisions. A changed reviewed English source name disables that reference pending review. Generate candidates, review, then apply with backups using[LIFECYCLE.md](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/LIFECYCLE.md). Oracle deployment is separately verified; no scheduled source monitor is registered.

---

## 日本語

2026-10-19時点で2,313概念を収録し、正式・補完2,186件と未公開のみ127件に分かれます。同じ表記の別概念はIDを分けるため、単語数とは異なります。韓国語・英語・日本語・簡体字中国語を原IDと位置で対応付けます。掲載全62キャラ（資料上正式60・未公開2）、スキル/パッシブ名1,047件、心象映画名372件を含み、説明全文と数値表は含めません。下の共通表で件数とフィールドを確認できます。

文脈要確認95件のうち戦闘確認済み25件を自動参照し、別コンテンツやミニゲームと混同する70件を除きます。効果名Chain Attackが同名の戦闘動作を上書きしないためです。全ストーリー名・効果・地域略語を網羅せず、文章品質も保証しません。

### 検索と出力

括弧・引用符などのUI装飾や韓国語空白変種も検索別名にします。スキルは全名・種別接頭語なしの形とキャラ文脈を使用します。チャットは本文、返信、直近文脈を優先し最大30関連候補を同じ翻訳要求に送ります。長い名前に含まれる短語は別出現がある場合だけ残し、Deadly AssaultだけならAssaultを加えません。同範囲のDA等の多義候補と、コンボ/長押しを構成する動作は維持します。意味は同じ翻訳要求で文脈判断し、不明なら原文を保ちます。動画は標準で管理用の出典・履歴を除いた用語集全体を送り、小型モデルでは関連用語のみを明示選択できます。DeepLは全DBをローカル用語保護に使います。

[略語一覧](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/ABBREVIATIONS.md)は73管理グループです。aliasesは入力、communityPreferredは出力で、略語がない言語は元名を使います。キャラ・数値・条件の省略や新略語の創作は認めません。2026-10-19に韓国語名をW-엔진/전용 W-엔진へ統一し、꽝꽝이・관통・콤스・치치の入力、관통%・장악・에회・얼피증・치치・속저깎の出力を整理しました。전무を維持し、支援突撃・極限回避の韓国語出力は略しません。耐性低下と耐性無視は別効果で、属性・値・対象・攻撃・条件を保存します。

2026-10-13の確認では、Corruptive Barrierの装飾なし検索、UCCの未確認複合侵蝕体への統合、Typhon/Scorched Horizonの原形対応、文脈付きshill buffsを追加しました。原文なしにボス変種を推測しません。Astral Voice/Astral、Culmination、Soaring Light、Return to Dust、Trial Mode、Adversity Modeの区別も維持し、一般語と重なる場合は文脈条件があります。

### 出典と保守

[Nanoka](https://zzz.nanoka.cc/)の正式表示3.2と未公開3.3.12+19629936を区別し、公開原本514件のハッシュ・版をsources.jsonに記録します。版更新時はキャラ詳細名も再比較します。curated.jsonでは制作会社の多言語告知・同IDファン資料・コミュニティ根拠を区別します。一部戦闘名は[ZenlessData](https://git.mero.moe/dimbreath/ZenlessData/src/branch/master/TextMap)の同じ説明キーで比較し、バフ数値は保存しません。[Honey Hunter日本語アンビー](https://zzz.honeyhunterworld.com/1011-char/?lang=JP)は一部標本のみです。ファン資料全体やゲームクライアント全体の照合ではありません。source-matchedは制作会社の直接監修済み表示ではなく、コミュニティ表現も公式UI名と主張しません。

未公開名は変わる場合があります。占位言語を除き、翻訳先名がなければ元の固有名を保ち、正式名をベータ名で上書きしません。共有対象はzzz.json・community.json・curated.json・reviewed-mechanics.json・sources.jsonで、キー・運営設定・報告原文は含めません。別名はcommunity.json、補完名はcurated.json、参照有効化はreviewed-mechanics.jsonで管理します。確認時の英語名が変われば自動参照を止めます。[更新手順](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/LIFECYCLE.md)で候補生成・確認・適用・バックアップを行い、Oracle反映は別途検証します。資料監視の予約は登録していません。

---

## 简体中文

截至2026-10-19，收录2,313个概念，其中正式/补充2,186条、仅未发布127条。同一拼写可能对应不同ID，所以不是2,313个唯一字符串。按原ID和位置连接韩语、英语、日语及简体中文。含全部62位已列角色（来源标为正式60、未发布2）、1,047个技能/被动名称与372个影画名称，不包含完整说明或技能数值表。数量和字段见下方四语言表。

95个需语境复核的参考词中，25条已审战斗词自动引用，70条可能混淆内容/小游戏的词排除。例如避免名为Chain Attack的效果覆盖同名战斗动作。词典不覆盖全部剧情名、效果或地区简称，也不保证句子理解质量。

### 匹配及输出

方括号、引号等UI装饰及韩文空格变体也可通过别名找到。技能包含全名、移除类型前缀的名称及角色语境。聊天优先正文，再补充回复与近期上下文，同一次翻译最多发送30个相关候选。长名称内的短词不作为独立概念，除非另有单独出现；只有Deadly Assault时不会附加Assault。保留同范围DA等多义候选，以及社区连招/长按表达的组成动作。由同一次翻译按语境判断，证据不足则保留原文。视频默认发送移除管理来源与历史后的完整术语表，小模型可手动选仅相关术语。DeepL在本地用完整DB保护术语。

[简称表](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/ABBREVIATIONS.md)有73个管理组。aliases控制输入匹配，communityPreferred控制输出，没有简称则使用原名，不允许省略角色、数值、条件或编造简称。2026-10-19将韩文名称整理为W-엔진/전용 W-엔진，新增꽝꽝이、관통、콤스、치치输入，输出使用관통%、장악、에회、얼피증、치치、속저깎。保留전무，韩文支援突击/极限闪避不使用自造缩写。抗性降低和抗性无视是不同效果，必须保留属性、数值、对象、攻击和条件。

2026-10-13的审核补充Corruptive Barrier无装饰搜索，将UCC合并至未知复合侵蚀体，连接Typhon/Scorched Horizon基础名而不推断首领变体，并记录语境限定的shill buffs社区说法。保留Astral Voice/Astral、Culmination、Soaring Light、Return to Dust、Trial Mode、Adversity Mode区别，与普通词冲突时需满足语境。

### 来源与维护

区分[Nanoka](https://zzz.nanoka.cc/)标为正式的3.2和未发布3.3.12+19629936，514份公开原本的哈希、版本记录在sources.json。版本更新也会重新比较角色详细名称。curated.json区分制作方多语言公告、相同ID粉丝数据与社区依据。部分战斗名在[ZenlessData](https://git.mero.moe/dimbreath/ZenlessData/src/branch/master/TextMap)相同说明键中对照，不存增益数值。[Honey Hunter日语安比](https://zzz.honeyhunterworld.com/1011-char/?lang=JP)仅抽样核对，不等于全面核验粉丝站或游戏客户端。source-matched不表示制作方直接审核，社区表达也不声称是官方UI。

未发布名称可能变化，排除占位语言，目标名缺失时保留原固有名，不用测试名覆盖正式名。共享zzz.json、community.json、curated.json、reviewed-mechanics.json、sources.json，不含密钥、运营设置或举报原文。别名在community.json，补充名称在curated.json，自动启用判断在reviewed-mechanics.json；已审英文原名变化时暂停自动引用。遵循[更新流程](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/LIFECYCLE.md)生成候选、审核、备份、应用，并另行验证Oracle部署。未注册来源监控计划。

---

## 수집 범위 · Catalog scope · 収録範囲 · 收录范围

| 한국어 / Korean / 韓国語 / 韩语 | English | 日本語 | 简体中文 | 항목 / Count / 件数 / 数量 |
|---|---|---|---|---:|
| 캐릭터 | Characters | キャラクター | 角色 | 62 |
| W-엔진 | W-Engines | 音動機 | 音擎 | 103 |
| 디스크 세트 | Drive Disc sets | ディスクセット | 驱动盘套装 | 30 |
| 방부 | Bangboo | ボンプ | 邦布 | 42 |
| 적·보스 | Enemies/bosses | 敵・ボス | 敌人/首领 | 277 |
| 캐릭터 기믹 | Character mechanics | キャラクター機構 | 角色机制 | 44 |
| 전투 기믹 보완 | Combat mechanics | 戦闘機構の補完 | 战斗机制补充 | 7 |
| 문맥 검토 참고 용어 | Context-sensitive references | 文脈要確認の参考語 | 需语境审核的参考词 | 95 |
| 재화 | Currencies | 通貨 | 货币 | 13 |
| 성장 재료 등 | Upgrade materials | 育成素材など | 培养材料等 | 135 |
| 스킬·패시브 이름 | Skill/passive names | スキル・パッシブ名 | 技能/被动名称 | 1,047 |
| 형상 시네마 | Mindscape names | 心象映画名 | 影画名称 | 372 |
| 공통 전투 동작 | Common combat actions | 共通戦闘動作 | 共通战斗动作 | 22 |
| 능력치·속성 피해 | Stats/elemental damage | 能力値・属性ダメージ | 属性/属性伤害 | 17 |
| 전투 속성 이름 | Combat attributes | 戦闘属性名 | 战斗属性名称 | 6 |
| 커뮤니티 별도 개념 | Community concepts | コミュニティ独自概念 | 社区独立概念 | 37 |
| 콘텐츠·모드 보완 | Content/mode names | コンテンツ・モード補完 | 内容/模式补充 | 3 |
| 장비 효과 보완 | Equipment effect names | 装備効果補完 | 装备效果补充 | 1 |

## 필드 · Fields · フィールド · 字段

| 필드 / Field | 한국어 | English | 日本語 | 简体中文 |
|---|---|---|---|---|
| id, preferred, aliases | 개념·언어별 이름·검색 표기 | Concept ID, names and search forms | 概念ID・言語別名・検索形 | 概念ID、语言名称与搜索形式 |
| communityPreferred | 커뮤니티 스타일 출력 | Community-style output | コミュニティ出力 | 社区风格输出 |
| category, meaning, rule, communityRule | 종류·뜻·적용 조건 | Category, meaning and conditions | 分類・意味・適用条件 | 类别、含义与适用条件 |
| characterId, characterName, relatedSkills | 캐릭터·스킬 구분 | Character/skill disambiguation | キャラ・スキルの識別 | 角色/技能区分 |
| autoUse | false면 자동 참조 제외 | false excludes automatic reference | falseなら自動参照除外 | false时禁止自动引用 |
| sources, sourceKey, sourceVersion, retrievedAt | 출처·위치·버전·날짜 | Provenance, location, version, date | 出典・位置・版・日付 | 来源、位置、版本与日期 |
| releaseStatus, releaseVersion, nameHistory | 정식·미출시·이름 이력 | Release state and name history | 公開状態・名前の履歴 | 正式/未发布状态与名称历史 |


## 2026-10-19 · 13 languages

### 한국어

번역 언어는 한국어·영어·일본어·중국어 간체/번체·독일어·프랑스어·스페인어·포르투갈어·러시아어·태국어·베트남어·인도네시아어 13개입니다. 화면 표시와 설명서는 기존 4개 언어를 유지합니다. 기존 항목 1,868개에 추가 9개 언어의 이름 16,802개를 연결했습니다. 테스트 표시가 있는 10개 값은 제외했으며, 없는 이름은 만들어 채우지 않습니다. 신규·미출시 용어는 라이브 적용 확인 후 검토합니다. 프로그램을 이번 버전으로 업데이트한 뒤에는 같은 13개 언어의 이름 추가·수정을 DB 업데이트로 받을 수 있습니다. 새 언어 코드 자체를 추가할 때는 프로그램 업데이트도 필요합니다.

### English

Translation supports 13 languages: Korean, English, Japanese, Simplified/Traditional Chinese, German, French, Spanish, Portuguese, Russian, Thai, Vietnamese and Indonesian. Interface text and guides remain in four languages. Another 16,802 localized names extend 1,868 existing concepts across nine additional languages. Ten placeholder values are excluded; missing names are not invented. New/unreleased terms require confirmed live availability before review. After installing this program update, additions and corrections within these 13 languages can arrive through DB updates. Adding a new language code still requires a program update.

### 日本語

翻訳は韓国語・英語・日本語・簡体字/繁体字中国語・ドイツ語・フランス語・スペイン語・ポルトガル語・ロシア語・タイ語・ベトナム語・インドネシア語の13言語に対応します。画面表示と説明書は従来の4言語です。既存1,868概念に追加9言語の名称16,802件を対応付け、テスト用の値10件を除外しました。不明な名称は補作しません。新規・未公開用語は正式実装を確認してから検討します。このプログラム更新後、同じ13言語内の名称追加・修正はDB更新で受け取れます。新しい言語コード自体の追加にはプログラム更新も必要です。

### 简体中文

翻译支持韩语、英语、日语、简体/繁体中文、德语、法语、西班牙语、葡萄牙语、俄语、泰语、越南语和印尼语，共13种语言。界面及说明保留原有4种语言。为1,868个既有概念关联额外9种语言的16,802个名称，排除10个测试占位值，不编造缺失名称。新增及未发布术语须确认正式实装后再审核。安装本次程序更新后，同一13种语言内的名称补充和修正可通过DB更新接收；增加新语言代码仍需程序更新。

`preferred`: ko/en/ja/zh-CN. `localizedNames`: zh-Hant/de/fr/es/pt/ru/th/vi/id. `localizations.json`: additional-name inputs with four-language baseline checks. `textLanguages` / `localizationCoverage`: language list / coverage counts.
