# 용어 태그 · Terminology tags · 用語タグ · 术语标签

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

## 한국어

`official`은 공식 명칭, `unofficial`은 비공식·커뮤니티 표현, `needs-review`는 공식성 확인이 필요한 표현입니다. `tags`는 항목에 포함된 표현 종류의 합집합이므로 하나의 항목에 여러 태그가 붙을 수 있습니다. 공식 캐릭터명과 커뮤니티 약칭을 같은 항목에 보관하는 경우가 이에 해당합니다. `live`·`prerelease`·자동 참조 여부는 별도 상태이며 공식 태그가 출시 확정이나 제작사의 사전 검수를 뜻하지는 않습니다.

`classification.names`는 기본 언어의 이름, `classification.localizedNames`는 추가 언어의 이름, `classification.aliases`는 입력 표현, `classification.communityOutputs`는 현재 대표 출력의 분류입니다. `classification.json`에는 사람이 정한 예외를 기록합니다. 자료에서 연결한 명칭은 공식 명칭으로 분류하고, 보완 설명이나 약칭의 공식성이 불분명하면 확인 필요로 둡니다. 예를 들어 커뮤니티 항목 안의 한국어 「피해 증가」도 사용자 확인에 따라 공식으로 분류합니다.

여러 입력 별칭과 표현 후보는 유지합니다. 자주 사용하는 대표 번역 하나는 사용자가 직접 지정하며 태그 추가가 기존 `preferred`·`communityPreferred`나 번역 규칙을 바꾸지는 않습니다. 분류 정보는 번역 API의 용어집 본문에 추가 전송하지 않습니다. 현재 용어집의 분류만 재구성하려면 `node scripts/sync-glossary.mjs sync --classifications-only`로 후보를 만들고 검토 후 `node scripts/sync-glossary.mjs apply`를 실행합니다. 원본 갱신이나 새 용어 추가 없이 현재 자료와 모든 출시 상태를 유지합니다.

## English

`official` marks official names, `unofficial` marks community/non-official expressions, and `needs-review` marks expressions whose naming status needs confirmation. Entry `tags` are a union: official names and community aliases may share one concept. Release status (`live`/`prerelease`) and automatic-use status remain separate. An official tag does not confirm release or publisher review of this dictionary.

`classification.names` classifies base-language names, `classification.localizedNames` additional names, `classification.aliases` input forms, and `classification.communityOutputs` the currently selected outputs. Human overrides live in `classification.json`. Linked source names are official; supplemental descriptions with uncertain status stay needs-review. For example, the Korean name 피해 증가 is official based on the user's confirmation even though its entry also contains community expressions.

Keep multiple aliases and expression candidates. The user personally selects one commonly used translation output. Tags do not change `preferred`, `communityPreferred` or translation rules, and are not added to the glossary sent to translation APIs. Run `node scripts/sync-glossary.mjs sync --classifications-only`, review the candidate, then run `node scripts/sync-glossary.mjs apply` to classify the current snapshot without importing sources, adding terms or changing release states.

## 日本語

`official`は正式名称、`unofficial`は非公式・コミュニティ表現、`needs-review`は名称の公式性を確認する必要がある表現です。項目の`tags`は含まれる表現種別の集合で、正式名称と略称が同じ概念に存在する場合は複数付きます。`live`・`prerelease`・自動参照可否とは別であり、正式名称タグは実装済みや制作会社による本辞書の確認を意味しません。

`classification.names`は基本言語の名称、`classification.localizedNames`は追加言語、`classification.aliases`は入力表現、`classification.communityOutputs`は現在の代表出力を分類します。人が判断した例外は`classification.json`に保存します。資料から対応付けた名称を正式名称とし、説明的な補足や不明な表現は要確認に残します。コミュニティ項目内の韓国語「피해 증가」も、利用者の確認に基づき正式として分類します。

複数の別名・表現候補は保持し、よく使う代表訳は利用者が指定します。タグ付けでは`preferred`・`communityPreferred`や翻訳ルールを変更せず、翻訳APIへ送る用語集にも分類情報を追加しません。`node scripts/sync-glossary.mjs sync --classifications-only`で候補を作り、確認後`node scripts/sync-glossary.mjs apply`で適用します。新規資料・用語を取り込まず、既存の実装状況も保持します。

## 简体中文

`official`表示官方名称，`unofficial`表示非官方或社区表达，`needs-review`表示尚需确认名称性质的表达。条目`tags`是所含表达类型的并集；同一概念包含官方名及社区简称时可有多个标签。发布状态（`live`/`prerelease`）和自动引用状态独立，官方标签不代表已上线，也不表示制作方审核了本词库。

`classification.names`分类基础语言名称，`classification.localizedNames`分类追加语言名称，`classification.aliases`分类输入表达，`classification.communityOutputs`分类当前代表输出。人工确认的例外保存在`classification.json`。资料中对应的名称标为官方，性质不明的补充说明或表达保留为待确认。例如社区条目中的韩文“피해 증가”也按用户确认标为官方。

保留多个别名及表达候选，由用户亲自指定常用的代表译法。增加标签不修改`preferred`、`communityPreferred`或翻译规则，也不会把分类信息增加到发送给翻译API的术语表。运行`node scripts/sync-glossary.mjs sync --classifications-only`生成候选，检查后运行`node scripts/sync-glossary.mjs apply`。此流程不导入新资料、不添加词条，并保留现有发布状态。
