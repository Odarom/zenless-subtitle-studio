# ZZZ Subtitle Studio 0.6.6

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

## 한국어

자막 확인 목록과 영상 위의 자막 메뉴에서 개별 자막을 삭제할 수 있습니다. 삭제한 자막은 재생·저장 파일에서 빠지며, 작업실의 「삭제한 자막」 탭에서 복원할 수 있습니다. 유튜브에서는 PC에 연결해 완료 작업을 적용한 뒤 음성·화면 자막을 클릭하면 신고·삭제 메뉴가 열립니다. 메뉴를 열면 재생을 잠시 멈추고, 닫으면 원래 재생 중이었을 때 다시 재생합니다. 신고는 설명을 입력해 보내기를 눌렀을 때 기존 비공개 신고 서버로 전송합니다. 프로그램 업데이트 후 확장 관리 화면에서 확장을 새로고침하고 유튜브 페이지도 새로고침하세요. 저장 대상의 기본값은 「음성 자막 + 화면 자막」이며 「음성 자막만」「화면 자막만」도 선택할 수 있습니다. SRT·VTT·위치 포함 VTT·프로젝트 JSON에 동일하게 적용됩니다. 고정 글자의 낮은 신뢰도 오타가 앞뒤의 같은 문구 사이 한 프레임에만 있을 때는 보정하며, 숫자·부정 표현의 변화와 사라진 구간은 합치지 않습니다.

화면 글자를 참고 문맥으로만 취급하고 원문 그대로 반환하는 사례에 대응해 번역 요청문을 보강했습니다. 화면 설명·제목·UI도 모두 번역 대상임을 명시하고, 번역 언어와 음성·화면의 대상 수를 용어집 뒤에도 다시 제공합니다. 같은 문구·고정 위치의 화면 글자는 코드로 묶어 한 번 번역한 뒤 원래 ID·시간·위치에 다시 연결합니다. 연속 표시만 한 구간으로 합치며, 사라진 시간에는 표시하지 않습니다. 문구·숫자·대소문자·위치가 다르거나 이동하는 글자는 별도로 처리합니다. OCR 상자의 작은 위치 흔들림만 허용합니다. 추가 언어 판별·차단·자동 재번역은 넣지 않았고 기존 검사는 유지합니다. 전체 영상과 용어집의 기본 1회 요청 방식은 같습니다. 기존 완료 결과는 자동 변경되지 않습니다. 요청 구성·중복 재사용·타이밍·실제 배포 ZIP을 검사했으며 실제 API 번역 품질 개선은 아직 확인하지 않았습니다.

## English

Delete individual subtitles from the review list or the menu opened by clicking a subtitle. Deleted items are omitted from playback and saved files; restore them in the Deleted subtitles tab. On YouTube, connect the PC app and apply a completed job, then click speech or screen subtitles to report/delete them. The menu pauses playback and resumes on close only if it was previously playing. Reports go to the existing private report service only after you enter an explanation and submit. After updating the app, reload the extension in the browser’s extension manager and refresh YouTube. Saving defaults to Speech + screen subtitles; Speech subtitles only and Screen subtitles only are also available for SRT, VTT, positioned VTT and project JSON. A low-confidence one-frame OCR spelling flicker between repeated stationary text may be corrected; changed numbers, negations and disappearance gaps are preserved.

Strengthened translation instructions so screen explanations, headings and UI are explicit translation targets, with target language and speech/screen counts repeated after the glossary. Code groups identical stationary screen text for one translation, then restores every original ID, interval and position. Continuous display may merge; disappearance gaps remain empty. Different words, numbers, case, locations and moving text remain separate, allowing only small OCR-box jitter. No new language detection, blocking or automatic retranslation was added; existing checks remain. Whole-video/full-glossary single-request behavior is unchanged. Saved completed results are not automatically modified. Request construction, reuse, timing and actual release ZIP were checked; actual API translation quality improvement has not yet been verified.

## 日本語

確認一覧や字幕をクリックして開くメニューから個別字幕を削除できます。削除分は再生・保存ファイルから除外され、「削除した字幕」タブで復元できます。YouTubeではPCに接続して完了作業を適用後、音声・画面字幕をクリックすると報告・削除メニューが開きます。メニュー表示中は停止し、閉じると元々再生中だった場合のみ再開します。説明を入力して送信した報告だけが既存の非公開受付へ届きます。アプリ更新後、拡張機能管理画面で拡張を再読み込みし、YouTubeページも更新してください。保存対象の標準は「音声字幕 + 画面字幕」で、「音声字幕のみ」「画面字幕のみ」もSRT・VTT・位置付きVTT・プロジェクトJSONで選べます。同じ固定文言の間にある低信頼度・1フレームだけのOCR誤字は補正しますが、数値・否定表現の変化や消えた区間は結合しません。

画面の説明・見出し・UIも翻訳対象と明示し、翻訳先と音声・画面の対象数を用語集の後にも記載するよう要求を強化しました。同じ文言・固定位置の画面文字はコードでまとめて1回翻訳し、元のID・表示時刻・位置へ戻します。連続表示だけを結合し、消えた時間には表示しません。文言・数値・大文字小文字・位置が異なる場合や移動文字は別扱いとし、OCR枠の小さな揺れのみ許容します。新しい言語判定・ブロック・自動再翻訳は加えず既存の検査を維持します。動画全体と全用語集を1回で送る標準動作は同じです。完了済みの保存訳は自動変更しません。要求構成・再利用・時刻・実際の配布ZIPを検証しましたが、実APIでの翻訳品質改善は未確認です。

## 简体中文

可在校对列表或点击字幕打开的菜单中删除单条字幕。删除后不再播放或导出，可在“已删除字幕”标签页恢复。在YouTube连接PC并应用已完成任务后，点击语音或屏幕字幕即可举报/删除。菜单打开时暂停，关闭时仅在原本播放中的情况下继续播放。填写说明并点击发送后，举报才会送达现有私密举报服务。更新程序后，请在浏览器扩展管理页重新加载扩展并刷新YouTube。导出默认“语音字幕 + 屏幕字幕”，SRT、VTT、含位置VTT及项目JSON也可选择“仅语音字幕”或“仅屏幕字幕”。相同固定文案之间仅一帧、置信度较低的OCR拼写抖动可修正；数值、否定变化及消失时段保持独立。

加强翻译要求，明确屏幕说明、标题及UI也是翻译目标，并在术语表后重申目标语言及语音/屏幕各自数量。代码将相同文案和固定位置的屏幕文字合并请求一次翻译，再恢复每个原始ID、时段及位置。只合并连续显示，消失期间不会显示。不同文案、数值、大小写、位置及移动文字分开处理，仅容许OCR框轻微抖动。不新增语言检测、拦截或自动重译，保留既有检查；默认整段视频及完整术语表单次请求不变。已完成的保存结果不会自动修改。已验证请求构成、复用、时间及实际发行ZIP，尚未验证实际API翻译质量是否改善。
