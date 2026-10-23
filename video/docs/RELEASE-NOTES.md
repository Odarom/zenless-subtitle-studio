# ZZZ Subtitle Studio 0.7.3

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

## 한국어

음성 인식에서 이름·게임 용어의 철자가 조금 틀려도 기존 DB의 유사 명칭·등록 별칭을 번역 참고 후보로 제공합니다. 기존 번역 요청에서 문맥과 화면 글자를 함께 대조하며 추가 교정 API 호출은 하지 않습니다. 후보는 확정된 별칭이나 자동 치환이 아닙니다. 미출시·자동 적용 금지 항목, 짧은 표현·숫자 포함 명칭은 후보에서 제외합니다. 인식 원문·타이밍·신고의 원문/번역 쌍과 이미 완료한 번역은 보존합니다. 남은 구간의 이어하기에는 새 지침을 적용합니다. DeepL은 기존의 정확한 명칭 보호를 유지합니다.

## English

Small spelling errors in speech names and game terms now retrieve similar existing DB names/registered aliases as unverified translation hints. The existing translation request uses context and screen text; no separate correction API call is made. Hints are neither confirmed aliases nor automatic substitutions. Prerelease/disabled terms, short expressions and names containing numbers are excluded. Original transcripts, timing, matching report source/translation pairs and completed translations are preserved. Resumed pending cues use the new guidance. DeepL keeps its existing exact-name protection.

## 日本語

音声認識で名前・ゲーム用語の綴りが少し誤っていても、既存DBの類似名称・登録別名を未確定の翻訳候補として参照します。既存の翻訳要求で文脈と画面文字を照合し、別の訂正APIは呼び出しません。候補は確定済みの別名や自動置換ではありません。未実装・自動適用禁止の項目、短い表現・数字を含む名称は候補から除外します。認識原文・時間・報告の原文/訳文の対応と完了済み翻訳を保持し、再開時は未完了区間に新しい指示を適用します。DeepLの完全一致による名称保護は維持します。

## 简体中文

语音识别中的姓名、游戏术语出现少量拼写错误时，会从现有数据库检索相似名称和已登记别名，作为未经确认的翻译参考候选。在原有翻译请求中结合上下文与画面文字判断，不额外调用纠错API。候选并非已确认别名，也不会自动替换原文。候选排除未上线、禁止自动应用的条目，以及短表达和含数字的名称。保留识别原文、时间、举报对应的原文/译文和已完成翻译；继续任务时仅对未完成区间应用新指引。DeepL仍使用原有的名称精确保护方式。
