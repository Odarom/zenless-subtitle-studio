# ZZZ Subtitle Studio 0.6.4

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

## 한국어

누락 응답에서도 정상 번역은 보관합니다. 이어하기는 미완료 ID만 요청하고, 완료 구간의 원문은 문맥으로 함께 보냅니다. 반복되는 화면 글자도 각 구간의 번역을 반환하도록 요청 형식을 보강했습니다. 전체 용어집·처음 전체 영상 1회 요청·자동 재요청 없음은 유지합니다. 0.6.3까지 저장되지 않은 번역 응답은 복구할 수 없지만, 기존 음성 인식·OCR 결과는 재사용합니다.

## English

Valid translations are saved even when a response omits cues. Resume requests unfinished IDs only, retaining completed source cues as context. Response coverage is constrained so repeated screen text is requested for every cue. The full glossary, initial whole-video single request and no automatic retries remain. Unsaved responses from 0.6.3 and earlier cannot be recovered, but existing ASR/OCR is reused.

## 日本語

応答に欠落があっても有効な翻訳を保存します。「再開」では未完了IDのみ要求し、完了区間の原文は文脈として送ります。同じ画面文字も全区間で返すよう応答形式を補強しました。全用語集・初回の動画全体1回要求・自動再試行なしは維持します。0.6.3以前で未保存の応答は復元できませんが、音声認識・OCR結果は再利用します。

## 简体中文

响应缺段时仍保存有效翻译。继续时仅请求未完成ID，已完成片段的原文作为语境发送。加强响应覆盖约束，要求重复屏幕文字也逐段返回翻译。保留完整术语表、初次整段视频单次请求及不自动重试。0.6.3及更早版本未保存的响应无法恢复，但可复用既有语音识别与OCR结果。
