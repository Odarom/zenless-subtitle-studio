# ZZZ Discord Runner 0.3.4

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

## 한국어

중국어 세 에이전트 파티 약칭은 기존 DB의 이름 첫 글자에서 후보를 찾아 같은 번역 요청의 문맥으로 해석합니다. 별도 AI 호출이나 모든 조합의 사전 등록은 하지 않습니다. 모호하면 원문을 유지하고 한국어 첫 글자 조합은 자동 추론하지 않습니다. 한국어 커뮤니티 출력은 확인된 각 에이전트의 한국어 이름 첫 글자를 순서대로 이어 붙입니다(仪琉卢 → 의현·다이아린·루시아 → 의다루). 파티마다 별도 DB 항목을 등록하지 않으며 공식 스타일은 이름을 풀어 씁니다. 원문과 완료된 번역은 보존하며 새 지침은 이후 번역·미완료 구간에 적용합니다.

## English

Chinese three-agent team initials retrieve candidate agents from existing DB names for interpretation in the same translation request. No extra AI call or exhaustive team list is used. Ambiguous codes stay unchanged; Korean initials are not inferred. Korean community output concatenates the first Korean syllable of each resolved agent name in order (仪琉卢 → 의현 / 다이아린 / 루시아 → 의다루), without registering a DB entry per team. Official style uses full names. Source text and completed translations are preserved; guidance applies to new translations and pending cues.

## 日本語

中国語の3人編成の頭文字略称は、既存DBの名前から候補を抽出し、同じ翻訳要求の文脈で判断します。追加AI呼び出しや全組み合わせの登録は不要です。不明確な略称は保持し、韓国語の頭文字は自動推測しません。韓国語コミュニティ出力では、特定した各エージェントの韓国語名の先頭音節を順に連結します（仪琉卢 → 의현・다이아린・루시아 → 의다루）。編成ごとのDB登録は行わず、正式スタイルでは名前を省略せず表記します。原文と完了済み翻訳は保持し、新規翻訳・未完了区間に適用します。

## 简体中文

中文三人配队简称会从现有数据库姓名首字检索候选，在同一次翻译请求中结合上下文判断，无需额外AI调用或穷举所有组合。无法消歧时保留原文，不自动推断韩文首字简称。韩文社区译法按顺序连接已确认代理人韩文名的首个音节（仪琉卢 → 의현、다이아린、루시아 → 의다루），无需逐个配队登记数据库条目；官方风格则使用完整姓名。保留原文及已完成译文，新指引仅用于新翻译和未完成片段。
