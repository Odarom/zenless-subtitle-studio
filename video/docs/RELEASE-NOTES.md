# ZZZ Subtitle Studio 0.6.2

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

## 한국어

전체 용어집의 항목·의미·적용 규칙을 유지하면서 반복 설명을 공유해 전송량을 줄였습니다. 명칭·캐릭터명·관련 스킬명은 선택한 원어와 번역어만 보냅니다. 원어 자동 감지는 번역어 명칭과 실제 원문에 일치한 별칭을 사용합니다. Gemini 429 응답에 한도 정보가 있으면 분당 입력 토큰·분당 요청·하루 요청·할당량 0을 구분해 표시하며, 정보가 없으면 원인 미확인으로 안내합니다. 기본 영상 전체 1회 요청과 자동 재요청 없음은 유지합니다. 번역 결과가 없던 0.6.1 실패 작업은 원문을 다시 인식하지 않고 ‘이어하기’로 진행할 수 있습니다. 무료 한도의 실제 통과 여부와 번역 품질은 별도로 확인해야 합니다.

## English

Reduced glossary payload size by sharing repeated descriptions without removing entries, meanings or rules. Names, character names and related skills use only the chosen source and target languages. Auto-detected sources use target-language names and aliases actually matching the input. When Gemini provides HTTP 429 quota details, the app distinguishes input tokens/minute, requests/minute, requests/day and zero allocation; missing details stay unidentified. Whole-video single-request defaults and no automatic retries remain. Failed 0.6.1 jobs with no translated results can Resume without repeating transcription. Actual free-tier acceptance and translation quality still require separate verification.

## 日本語

用語集の全項目・意味・適用規則を維持し、重複説明を共有して送信量を削減しました。名称・キャラクター名・関連スキル名は選択した原語と翻訳先だけを送ります。原語の自動検出時は翻訳先の名称と実際の原文に一致した別名を使います。Geminiの429応答に情報があれば分間入力トークン・分間リクエスト・1日のリクエスト・割り当て0を区別し、なければ原因未確認と表示します。動画全体1回の要求と自動再試行なしは維持します。翻訳結果がない0.6.1の失敗作業は、再認識せず「再開」できます。無料上限内での成功と翻訳品質は別途確認が必要です。

## 简体中文

保留术语表的全部条目、含义和规则，通过共享重复说明减少发送量。名称、角色名及相关技能名仅发送所选原文和目标语言。原文自动检测时使用目标语言名称及实际匹配原文的别名。Gemini的429响应若提供配额详情，将区分每分钟输入token、每分钟请求、每日请求及配额为0；无详情则提示原因未确认。仍默认整段视频单次请求，不自动重试。0.6.1中未生成翻译的失败任务可直接继续，无需重新识别。实际是否满足免费配额及翻译质量仍需单独验证。
