# 용어집 갱신 · Glossary lifecycle · 用語集更新 · 术语表更新

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

## 한국어

정식 데이터는 정식 버전으로, 미출시 데이터는 그 자료의 버전으로 구분합니다. 현재 출처는 Nanoka 공개 데이터입니다. 출처의 `live` 표시가 제작사 직접 검수 완료를 뜻하지는 않습니다.

## 확인하고 반영하는 순서

이 프로젝트에서 **“미출시·정식 용어집 갱신 확인하고 반영해줘”**라고 요청하면 됩니다. 도구는 아래 순서로 처리합니다.

1. 출처의 정식(`live`)·최신(`latest`)·제공 버전(`available`)을 확인합니다.
2. 정식·미출시 원본을 별도로 내려받아 캐릭터·W-엔진·디스크·방부·적/보스·명사·재료·전투 명칭을 같은 ID로 대조합니다. 캐릭터 목록에 있는 전체 캐릭터의 네 언어 상세 자료도 수집해 스킬·핵심 패시브·추가 능력·형상 시네마 이름을 같은 위치로 대조합니다.
3. 정식 자료의 기존 개념은 유지하고 미출시 자료의 새로운 ID를 추가 후보로 만듭니다. 정식과 베타가 같은 ID의 이름을 다르게 표시하면 정식 명칭을 유지하고 차이 목록에 기록합니다.
4. 지난 미출시 ID가 새 정식 자료에 나타나면 **출시 전환**으로 기록합니다. 변경된 이름은 새 이름을 선호 명칭으로 채택하고 이전 이름은 이력과 검색 별칭으로 남깁니다. 이름이 같아도 재조회한 자료의 버전·해시가 기록됩니다.
5. 최신 정식·미출시 자료 양쪽에서 사라진 ID는 삭제하지 않고 `needs-review`로 보관하며 자동 번역 참조를 중지합니다.
6. 변경 자료를 검토하고 검사한 뒤 용어집에 반영합니다. 이전 자료는 `glossary/history/`에 보관합니다. 오라클 봇에 파일을 적용하는 단계까지 별도로 확인합니다.

## 직접 확인하기

**`glossary-sync.cmd`를 실행하면 변경 후보만 생성**합니다. 봇의 현재 용어집은 바뀌지 않습니다. 결과는 `glossary/updates/review.md`에서 읽습니다.

```powershell
npm run glossary:sync
# 원본을 이미 내려받았다면 네트워크에서 버전 목록만 확인하고 캐시로 후보 생성
node scripts/sync-glossary.mjs sync --cached
# 후보를 검토한 뒤 로컬 용어집에 적용
npm run glossary:apply
```

후보 생성 이후 현재 용어집·커뮤니티 별칭·보완 명칭·기믹 검토 목록·후보 파일이 달라지면 적용을 중단합니다. 최신 자료로 다시 비교하면 됩니다. 공유 사전을 AI가 마음대로 수정하는 방식이 아닙니다. 어떤 의미의 약어인지와 보스 변형의 문맥 등은 사람이 검토해야 합니다.

기존 단일 버전 생성 스크립트로 통합 용어집을 덮어쓰면 미출시 자료가 빠질 수 있으므로, 통합 이후에는 `glossary:sync` → `glossary:apply` 절차를 사용합니다.

## 번역에서 사용하는 상태

- `releaseStatus: live`: 출처가 정식으로 표시한 버전의 항목.
- `releaseStatus: prerelease`: 미출시 자료에만 등장하는 ID. 변경 가능성이 있습니다.
- `releaseStatus: needs-review`, `autoUse:false`: 최신 자료에서 ID가 사라져 확인이 필요한 항목.
- `releaseVersion`, `sourceVersion`, `retrievedAt`: 출시 대상 버전, 실제 원본 버전, 조회 날짜.
- `nameHistory`: 과거 명칭과 해당 자료 버전. 새 명칭으로 변경된 경우에도 검색할 수 있습니다.

미출시 데이터의 일부 언어가 `BriefName_…`, `OfficialName_…`, `(Test…)` 등 자리표시자이면 그 언어 명칭을 등록하지 않습니다. 실제 이름이 있는 언어만 참조하고, 대상 언어의 명칭이 없으면 원래 고유명사를 유지합니다. 확인되지 않은 공식 이름이나 스킬 수치를 만들어 넣지 않습니다.

수집 범위는 짧은 명칭입니다. 전체 스킬 설명·신규 보스 수치·모든 커뮤니티 약어가 자동으로 검증되는 것은 아닙니다. 새로운 약칭은 `community.json`에 적용 문맥과 출처를 별도로 기록합니다.

일반 전투 용어와 충돌할 수 있는 참고 명사는 `reviewed-mechanics.json`에 검토한 원본 이름과 적용 문맥을 저장합니다. 같은 ID라도 영어 원본 이름이 검토 당시와 달라지면 자동 참조를 중지해 다시 확인하게 합니다. 원본 이름의 대괄호·따옴표 같은 UI 장식이나 한국어 띄어쓰기 변형은 검색 별칭으로 만들며, 공유하는 선호 명칭 자체는 원본대로 보존합니다.

현재 갱신은 이 프로젝트에서 도구를 실행하는 시점에 이루어집니다. 매일 버전 변경을 감시하는 예약 작업은 등록하지 않았습니다. 봇의 API 키와 무관하며 공개 원본 수집·버전 비교에 AI API를 사용하지 않습니다.

---

## English

Released and prerelease entries retain their own source-version status. The current public source is Nanoka. A source's live label does not mean direct verification by the game publisher.

### Review before applying

In this local project you can request a released/prerelease glossary update. The workflow checks live/latest/available versions; downloads released and prerelease material separately; and compares characters, W-Engines, discs, Bangboo, enemies/bosses, nouns, materials and combat names by matching IDs. Detailed records for all listed characters link skill, core passive, additional ability and Mindscape names at matching positions across four languages.

Keep existing released concepts and propose new prerelease IDs separately. When live/beta names disagree for one ID, retain the live name and record the difference. If a prerelease ID appears in a later live source, record its release transition, prefer the newly released name, and retain the old name in history/search aliases. Record source hashes/versions even when the name is unchanged. IDs absent from both current sources are retained as needs-review with automatic use disabled; do not silently delete them.

Review the candidate diff and run relevant checks before applying. Backups go to glossary/history/. Deploying to an operating bot is a separate verified step. Running glossary-sync.cmd creates candidates only and does not change the active DB. Read glossary/updates/review.md.

~~~sh
npm run glossary:sync
node scripts/sync-glossary.mjs sync --cached
npm run glossary:apply
~~~

The cached mode still checks the version list online and reuses intact downloaded files. Apply aborts if the catalog, community aliases, curated names, reviewed mechanics or candidate changed after comparison. Regenerate a candidate instead of bypassing the check. Human review is necessary for ambiguous abbreviations and boss forms; AI does not freely edit the shared dictionary. After merging live/beta sources, use sync then apply, because the old single-version generator could remove prerelease material.

### State and scope

- releaseStatus:live means the source identifies the entry's version as released.
- releaseStatus:prerelease is an ID found only in prerelease material and may change.
- needs-review with autoUse:false means the ID needs rechecking and is not selected automatically.
- releaseVersion/sourceVersion/retrievedAt record release context, actual source version and retrieval date.
- nameHistory preserves earlier names/versions so renamed entries remain searchable.

Ignore language placeholders such as BriefName_…, OfficialName_… or (Test…). Store languages with actual names; if the target language is absent, preserve the source proper noun. Do not invent official names or skill numbers. Collection covers short names, not complete skill prose, boss statistics or every community abbreviation. Record new abbreviations with context and provenance in community.json.

Potentially conflicting reference nouns have reviewed source names/context in reviewed-mechanics.json. If their English source name changes even under the same ID, disable automatic reference pending review. Bracket/quote UI decoration and Korean spacing variants become aliases, while preferred names preserve the original. Updates run when these tools are invoked; no daily version-monitor automation is registered. Public collection/version comparison uses no translation AI API and is independent of bot keys.

---

## 日本語

正式公開項目と未公開項目は、それぞれの資料版と状態を区別します。現在の公開資料元はNanokaです。資料のlive表示はゲーム制作会社による直接確認を意味しません。

### 確認してから反映

このローカルプロジェクトで正式・未公開用語集の更新を依頼できます。live/latest/available版を確認し、正式・未公開資料を別々に取得して、キャラクター・音動機・ディスク・ボンプ・敵/ボス・名詞・素材・戦闘名を同じIDで比較します。掲載された全キャラクターの詳細も4言語で取得し、スキル・コアパッシブ・追加能力・心象映画名を同じ位置で対応付けます。

既存の正式項目を維持し、未公開の新IDを候補にします。同じIDの正式/ベータ名が異なる場合は正式名を保持して差分を記録します。未公開IDが新しい正式資料に現れたら正式移行を記録し、新名を優先、旧名を履歴・検索別名に残します。同名でも再取得した版とハッシュを記録します。両方の最新資料から消えたIDは削除せずneeds-reviewにして自動参照を止めます。

差分を確認・検査してから適用し、旧資料はglossary/history/へ保存します。稼働ボットへの反映は別途確認します。glossary-sync.cmdは候補生成のみで現在のDBを変えません。結果はglossary/updates/review.mdです。

~~~sh
npm run glossary:sync
node scripts/sync-glossary.mjs sync --cached
npm run glossary:apply
~~~

cachedでも版一覧はオンライン確認し、取得済みの完全なキャッシュを再利用します。比較後に現在の用語集・別名・補完名・機構確認一覧・候補が変わると適用を中断します。新しい候補を作り直してください。略語の意味やボス形態は人による確認が必要です。統合後はsync→applyを使い、旧単一版生成で未公開資料を消さないでください。

### 状態と範囲

- releaseStatus:live：資料元が正式版とした項目。
- releaseStatus:prerelease：未公開資料だけにあるIDで、変更される場合があります。
- needs-reviewとautoUse:false：要再確認で自動参照しません。
- releaseVersion/sourceVersion/retrievedAt：公開対象版・実資料版・取得日。
- nameHistory：過去名と版を残して改名後も検索可能にします。

BriefName_…、OfficialName_…、(Test…)等は名前として登録しません。実名のある言語だけを保存し、翻訳先名がなければ元の固有名を保持します。未確認の公式名・数値を作りません。対象は短い名称で、全スキル説明・ボス数値・すべての略語ではありません。新略語はcommunity.jsonに文脈と出典を記録します。

一般戦闘語と衝突する参考名詞はreviewed-mechanics.jsonに確認時の原名と文脈を残します。同じIDでも英語原名が変わると自動参照を停止します。括弧・引用符や韓国語空白の変種は検索別名にし、優先名は元表記を維持します。更新はツール実行時のみで、日次版監視の予約はありません。公開資料の取得・版比較は翻訳AI APIやボットキーを使用しません。

---

## 简体中文

正式及未发布条目分别记录来源版本和状态。当前公开来源为Nanoka，来源的live标记不代表已经由游戏制作方直接审核。

### 先审核再应用

可在本地项目请求更新正式及未发布术语。流程检查live/latest/available版本，分别下载正式与未发布数据，再按相同ID比较角色、音擎、驱动盘、邦布、敌人/首领、名词、材料及战斗名称。也会采集全部已列角色的四语言详细数据，在相同位置对应技能、核心被动、额外能力及影画名称。

保留既有正式概念，将未发布的新ID列为候选。同一ID正式和测试名不同则保留正式名并记录差异。旧未发布ID进入新正式数据时记录正式转换，新正式名优先，旧名保留在历史与搜索别名中；即使名称不变也记录重新读取的版本和哈希。两份最新来源都消失的ID不删除，而保留为needs-review并关闭自动引用。

审核差异并检查后才应用。旧数据备份到glossary/history/，运行中机器人的部署另行验证。glossary-sync.cmd仅生成候选，不改变当前DB，结果在glossary/updates/review.md。

~~~sh
npm run glossary:sync
node scripts/sync-glossary.mjs sync --cached
npm run glossary:apply
~~~

cached仍在线检查版本列表，并复用完整下载缓存。比较后若当前术语、别名、补充名称、机制审核表或候选文件发生变化，应用会停止，应重新生成候选。多义缩写及首领形态需人工审核，不允许AI随意改公共词典。合并多版本后使用sync→apply，旧单版本生成器可能移除未发布资料。

### 状态与范围

- releaseStatus:live：来源标为正式版本的条目。
- releaseStatus:prerelease：只出现在未发布资料中的ID，可能变化。
- needs-review和autoUse:false：需要复核，自动翻译不引用。
- releaseVersion/sourceVersion/retrievedAt：发布目标版本、实际来源版本及采集日期。
- nameHistory：保留旧名称和版本，改名后仍可搜索。

不把BriefName_…、OfficialName_…、(Test…)等占位符登记为名称。仅保存有实际名称的语言；目标语言缺失时保留原固有名，不编造官方名称或技能数值。范围是短名称，不含完整技能说明、首领数值或所有社区简称。新简称在community.json单独记录语境和来源。

可能与常规战斗术语冲突的参考名词在reviewed-mechanics.json保存已审原名与语境。同ID英文原名变化后暂停自动引用。括号、引号等UI装饰及韩文空格变体用作搜索别名，首选名保留来源原貌。仅在运行工具时更新，未注册每日版本监控。公开采集和版本比较不调用翻译AI API，也不使用机器人密钥。
