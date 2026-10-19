# ZZZ Subtitle Studio 0.6.5

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

## 한국어

긴 영상의 구간 수·ID를 응답 형식 제약에 모두 넣어 Gemini가 HTTP 400으로 거절할 수 있던 0.6.4 변경을 수정했습니다. 응답 형식은 작은 고정 구조로 유지하고 개수·ID는 코드에서 검증합니다. 누락 시 정상 결과 보관과 미완료 구간만 수동 재요청하는 기능은 유지합니다. 기존 실패 작업은 인식 결과와 완료 번역을 보존해 이어할 수 있습니다. 400 오류도 알려진 응답 형식·입력 크기·키·권한·모델 사유를 구분하며 불명확한 오류를 키 문제로 단정하지 않습니다. 작업 기록과 상세 화면에 삭제·중단 버튼을 추가했습니다. 삭제는 해당 작업의 기록·자막·임시 파일만 지우며 원본 영상·업로드·키·다른 작업은 보존합니다. 실행 중에는 먼저 중단해야 합니다. 실패·취소·중단 중에는 진행 애니메이션을 멈추고, Windows 도구 중단은 PATH 없이도 동작하도록 수정했습니다. 실제 번역 API를 추가 호출하지 않고 모의 400 응답·기존 작업 재개와 실제 도구 종료를 검사했습니다.

## English

Fixed the 0.6.4 response constraints that could make Gemini reject long-video requests with HTTP 400. The schema stays small and constant; code validates counts/IDs and still saves valid partial results for manual missing-only resume. Existing failed jobs retain transcription and completed translations. Known schema, input-size, key, permission and model errors are distinguished; unknown 400s are not blamed on keys. History and detail views now offer stop/delete controls. Deletion removes only that job’s record, subtitles and temporary files; original/uploaded files, keys and other jobs remain. Stop active jobs first. Progress animation stops on failure, cancellation and stopping. Windows tool cancellation works without PATH. Mock error/resume tests and real process termination were checked without making additional translation API calls.

## 日本語

長い動画の件数・IDを応答制約へ入れることでGeminiがHTTP 400を返す可能性がある0.6.4の変更を修正しました。形式を小さな固定構造にし、件数とIDはコードで検証します。有効な翻訳の保存と未完了分のみの手動再開は維持し、既存の失敗作業も認識結果・完了翻訳を再利用できます。形式・入力サイズ・キー・権限・モデルの既知のエラーを区別し、不明な400をキーの問題と断定しません。履歴と詳細に停止・削除操作を追加しました。削除対象はその作業の履歴・字幕・一時ファイルだけで、元ファイル・アップロード・キー・他の作業は残ります。実行中は先に停止してください。失敗・中断・停止中はアニメーションを止め、Windowsツールの停止をPATHなしでも実行できるよう修正しました。追加の翻訳API呼び出しなしで模擬400応答・再開・実プロセス停止を検証しました。

## 简体中文

修复0.6.4将长视频段数与ID列表写入响应约束、可能导致Gemini返回HTTP 400的变更。响应格式保持小型固定结构，段数及ID由代码验证；继续保留有效部分结果，手动仅重试未完成片段。既有失败任务可复用识别结果与已完成翻译。区分已知格式、输入大小、密钥、权限及模型错误，不再将未知400一概归因于密钥。记录与详情新增停止及删除操作，仅删除该任务的记录、字幕及临时文件，保留原始/已上传文件、密钥与其他任务；运行中须先停止。失败、已取消及正在停止时停止进度动画，Windows工具停止不再依赖PATH。未额外调用翻译API，已验证模拟400、旧任务继续及真实进程终止。
