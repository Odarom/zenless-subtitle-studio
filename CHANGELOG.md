# 업데이트 내역 · Release history · 更新履歴 · 更新记录

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

0.6.7 및 이전 README에 기록된 변경 안내입니다. / Notes retained from the 0.6.7 and earlier README. / 0.6.7以前のREADMEに記載された更新案内です。 / 保留自0.6.7及此前README的更新说明。

## 한국어

### 0.7.1

작업 기록 카드에서 아카이브 공유·공유 취소를 바로 실행할 수 있습니다. 공유 창의 음성·화면 옵션을 카드로 묶고 체크박스와 문구를 나란히 정렬했습니다. 글자 크기·시간 조절과 공개 동의도 간결하게 배치했습니다.

### 0.7.0

공유된 자막 아카이브를 추가했습니다. 원작자의 YouTube 영상에서 확장만으로 공유 자막을 보고 오역을 신고할 수 있습니다. PC 작업실에서 자막·표시 설정을 공개 동의 후 공유하고 취소할 수 있습니다. 완료된 YouTube 작업의 임시 영상만 삭제해 자막·기록을 유지하며 공간을 정리할 수 있습니다.

### 0.6.11

오역 신고 방법과 신고가 ZZZ 게임 용어 DB·번역 품질 개선에 도움이 된다는 안내를 강화했습니다. 설치 안내 바로 아래의 README와 번역 완료 화면·확장에 안내를 표시합니다. 신고 접수·공유 방식은 그대로입니다.

### 0.6.10

음성 자막과 화면 번역 자막이 겹칠 때 음성 자막이 앞에 보이도록 표시 순서를 고정했습니다. 화면 번역 글자는 인식된 상자의 가로·세로 중앙에 정렬합니다. 유튜브 확장과 로컬 영상 미리보기에 적용됩니다. 인식된 상자의 위치·내용·시간은 변경하지 않습니다.

### 0.6.9

화면 번역 자막을 눌러 신고·삭제 메뉴를 열 수 없던 문제를 수정했습니다. 재생바와 겹친 부분은 재생바를 조작할 수 있도록 두고, 나머지 영역에서 자막을 클릭할 수 있습니다. 확장 설정과 로컬 영상 미리보기에서 음성·화면 자막의 배경을 각각 켜고 끌 수 있으며 설정을 기억합니다. 업데이트 버튼 아래에 확장 새로고침·브라우저 재시작 안내를 짧게 표시합니다. 자동 팝업은 띄우지 않습니다.

### 0.6.8

음성 자막에 마우스를 올리면 나타나는 **↕ 이동** 손잡이를 위아래로 끌면 모든 음성 자막의 높이가 함께 바뀝니다. 클릭하면 기존 신고·삭제 메뉴가 열립니다. 확장 설정이나 미리보기의 **음성 자막 높이 / 기본 위치**로도 조절할 수 있습니다. 높이는 연결된 작업에 자동 저장됩니다. VTT·프로젝트 JSON에는 조절한 위치가, SRT에는 내용·시간만 반영됩니다. 문구 수정도 다운로드 전에 저장됩니다. 재생바가 보일 때에는 겹친 화면 번역의 해당 부분만 클릭을 통과시켜 재생 조작을 우선합니다. 자막의 나머지 부분은 계속 클릭할 수 있습니다.

[README](README-ko.md)

작업 기록을 삭제하면 해당 작업을 위해 프로그램 안에 보관된 영상·음성·업로드 자막 사본, 생성 자막과 중간 파일을 함께 지웁니다. 같은 사본을 다른 작업도 쓰면 마지막 기록을 삭제할 때 정리합니다. 업데이트 후 실행할 때에는 이전 버전에서 기록 없이 남겨진 업로드 사본과 정보 파일도 자동 정리합니다. 남아 있는 작업의 입력 파일, PC의 원본, 따로 다운로드한 영상·자막, API 키·설정·신고는 유지합니다. 정리 결과와 실패 안내는 작업 기록 화면에 표시됩니다. 완료된 유튜브 작업의 「유튜브 영상 저장 ↓」로 음성이 포함된 영상을 최대 1080p로 따로 저장할 수 있습니다. 번역 자막이 영상에 합쳐지는 기능은 아니며, 자막은 SRT/VTT 등으로 따로 저장하세요. 저장 위치는 브라우저의 다운로드 설정에 따릅니다.

자막 확인 목록과 영상 위의 자막 메뉴에서 개별 자막을 삭제할 수 있습니다. 삭제한 자막은 재생·저장 파일에서 빠지며, 작업실의 「삭제한 자막」 탭에서 복원할 수 있습니다. 유튜브에서는 PC에 연결해 완료 작업을 적용한 뒤 음성·화면 자막을 클릭하면 신고·삭제 메뉴가 열립니다. 메뉴를 열면 재생을 잠시 멈추고, 닫으면 원래 재생 중이었을 때 다시 재생합니다. 신고는 설명을 입력해 보내기를 눌렀을 때 기존 비공개 신고 서버로 전송합니다. 프로그램 업데이트 후 확장 관리 화면에서 확장을 새로고침하고 유튜브 페이지도 새로고침하세요. 저장 대상의 기본값은 「음성 자막 + 화면 자막」이며 「음성 자막만」「화면 자막만」도 선택할 수 있습니다. SRT·VTT·위치 포함 VTT·프로젝트 JSON에 동일하게 적용됩니다. 고정 글자의 낮은 신뢰도 오타가 앞뒤의 같은 문구 사이 한 프레임에만 있을 때는 보정하며, 숫자·부정 표현의 변화와 사라진 구간은 합치지 않습니다.

화면 글자를 참고 문맥으로만 취급하고 원문 그대로 반환하는 사례에 대응해 번역 요청문을 보강했습니다. 화면 설명·제목·UI도 모두 번역 대상임을 명시하고, 번역 언어와 음성·화면의 대상 수를 용어집 뒤에도 다시 제공합니다. 같은 문구·고정 위치의 화면 글자는 코드로 묶어 한 번 번역한 뒤 원래 ID·시간·위치에 다시 연결합니다. 연속 표시만 한 구간으로 합치며, 사라진 시간에는 표시하지 않습니다. 문구·숫자·대소문자·위치가 다르거나 이동하는 글자는 별도로 처리합니다. OCR 상자의 작은 위치 흔들림만 허용합니다. 추가 언어 판별·차단·자동 재번역은 넣지 않았고 기존 검사는 유지합니다. 전체 영상과 용어집의 기본 1회 요청 방식은 같습니다. 기존 완료 결과는 자동 변경되지 않습니다. 요청 구성·중복 재사용·타이밍·실제 배포 ZIP을 검사했으며 실제 API 번역 품질 개선은 아직 확인하지 않았습니다.

0.6.5에서는 긴 영상의 응답 형식 제약을 단순화해 HTTP 400을 유발할 수 있던 부분을 수정했습니다. 구간 수와 ID는 프로그램에서 검증하며 정상 번역 보관·미완료 구간만 수동 재요청하는 방식은 유지합니다. 작업 기록과 상세 화면에서 중단·삭제할 수 있고, 실행 중인 작업은 먼저 중단해야 합니다. 현재 버전은 기록 삭제 시 프로그램 안의 영상 사본까지 함께 정리하며, 별도로 저장한 파일과 API 설정은 유지합니다. 실패·중단 상태에서는 진행 애니메이션을 멈춥니다.

전체 용어집의 항목·의미·적용 규칙을 유지하면서 반복 설명을 공유해 전송량을 줄였습니다. 명칭·캐릭터명·관련 스킬명은 선택한 원어와 번역어만 보냅니다. 원어 자동 감지는 번역어 명칭과 실제 원문에 일치한 별칭을 사용합니다. Gemini 429 응답에 한도 정보가 있으면 분당 입력 토큰·분당 요청·하루 요청·할당량 0을 구분해 표시하며, 정보가 없으면 원인 미확인으로 안내합니다. 기본 영상 전체 1회 요청과 자동 재요청 없음은 유지합니다. 번역 결과가 없던 0.6.1 실패 작업은 원문을 다시 인식하지 않고 ‘이어하기’로 진행할 수 있습니다. 무료 한도의 실제 통과 여부와 번역 품질은 별도로 확인해야 합니다.

용어집 카드의 언어 수는 현재 설치된 DB에서 계산합니다. 화면 언어는 메뉴 표시용 4개이고, 영상의 원어·번역 언어는 13개입니다. 유튜브 음성을 새로 받아쓰는 옵션은 기본 켜짐이며, 끄면 기존 원어 자막(자동 생성 포함)을 먼저 사용하고 없을 때 음성을 인식합니다. ‘번역 없이 원어 자막만 저장하기’는 기본 꺼짐입니다. 이 옵션을 켜면 번역 API 호출·요금 없이 원문을 저장하며, 음성·화면 인식은 선택한 옵션대로 진행합니다.

번역 언어는 한국어·영어·일본어·중국어 간체/번체·독일어·프랑스어·스페인어·포르투갈어·러시아어·태국어·베트남어·인도네시아어 13개입니다. 화면 표시와 설명서는 기존 4개 언어를 유지합니다. 기존 항목 1,868개에 추가 9개 언어의 이름 16,802개를 연결했습니다. 테스트 표시가 있는 10개 값은 제외했으며, 없는 이름은 만들어 채우지 않습니다. 신규·미출시 용어는 라이브 적용 확인 후 검토합니다. 프로그램을 이번 버전으로 업데이트한 뒤에는 같은 13개 언어의 이름 추가·수정을 DB 업데이트로 받을 수 있습니다. 새 언어 코드 자체를 추가할 때는 프로그램 업데이트도 필요합니다.

음성 인식과 번역 언어를 13개로 확장했습니다. 화면 OCR은 한국어·영어·일본어·중국어 간체/번체·러시아어 6개 언어를 지원합니다. 다른 언어를 번역 대상으로 선택해도 OCR 언어는 이 지원 범위에서 별도로 선택합니다. 영상은 전체 개념을 유지하며, 번역에 필요한 언어별 이름과 실제 일치한 별칭만 전송합니다. 기본 한 번 요청과 한도 오류 후 자동 재요청 없음은 유지합니다.

누락 응답에서도 정상 번역은 보관합니다. 이어하기는 미완료 ID만 요청하고, 완료 구간의 원문은 문맥으로 함께 보냅니다. 반복되는 화면 글자도 각 구간의 번역을 반환하도록 요청 형식을 보강했습니다. 전체 용어집·처음 전체 영상 1회 요청·자동 재요청 없음은 유지합니다. 0.6.3까지 저장되지 않은 번역 응답은 복구할 수 없지만, 기존 음성 인식·OCR 결과는 재사용합니다.

---

## English

### 0.7.1

Share or unshare archive captions directly from job history cards. The sharing dialog groups speech and screen options into compact cards, aligns checkboxes with their labels, and organizes size, timing and consent controls.

### 0.7.0

Added the Shared Subtitle Archive. View shared captions on the original creator’s YouTube video and report errors with only the extension. Publish captions and display settings with explicit consent from the PC studio, or unshare them. Completed YouTube jobs can delete cached videos while keeping subtitles and history.

### 0.6.11

Made reporting easier to discover and explained how it helps improve the ZZZ game terminology DB and translation quality. Guidance follows setup in the README and appears in completed video jobs and the extension. Report submission and sharing behavior is unchanged.

### 0.6.10

Speech subtitles now appear in front of screen translations when they overlap, in both the YouTube extension and local video preview. Screen translation text is centered horizontally and vertically inside its detected box. Detected box positions, text and timing are unchanged.

### 0.6.9

Fixed screen captions that did not open the report/delete menu when clicked. Areas overlapping playback controls continue to pass clicks through, while the rest of each caption remains clickable. Speech and screen subtitle backgrounds can be switched on or off separately in extension settings and local video preview, with preferences remembered. A short note below the update buttons explains extension reload or browser restart; there is no automatic popup.

### 0.6.8

Hover over speech subtitles and drag the **↕ Move** handle up or down to move all speech cues together. Clicking the subtitle still opens report/delete. **Speech subtitle height / Reset position** is also available in extension settings and the preview. Height is automatically saved to the connected job. VTT and project JSON preserve the adjusted position; SRT stores text and timing only. Text edits are also saved before downloading. When player controls are visible, only the overlapping portion of screen captions lets clicks pass through to the controls. The rest of each caption remains clickable.

[README](README-en.md)

Deleting a job record also removes all video/audio/uploaded-subtitle copies, generated subtitles and intermediate files stored for that job in the app. Shared copies remain until their last job is deleted. Startup after updating also clears upload copies and metadata left without a job record by older versions. Inputs for retained jobs, original PC files, separate video/subtitle downloads, API keys, settings and reports stay. The history view shows cleanup results or failures. On a completed YouTube job, Save YouTube video ↓ downloads a separate video with audio, up to 1080p. Translated subtitles are not burned into the video; save SRT/VTT separately. The destination follows your browser’s download settings.

Delete individual subtitles from the review list or the menu opened by clicking a subtitle. Deleted items are omitted from playback and saved files; restore them in the Deleted subtitles tab. On YouTube, connect the PC app and apply a completed job, then click speech or screen subtitles to report/delete them. The menu pauses playback and resumes on close only if it was previously playing. Reports go to the existing private report service only after you enter an explanation and submit. After updating the app, reload the extension in the browser’s extension manager and refresh YouTube. Saving defaults to Speech + screen subtitles; Speech subtitles only and Screen subtitles only are also available for SRT, VTT, positioned VTT and project JSON. A low-confidence one-frame OCR spelling flicker between repeated stationary text may be corrected; changed numbers, negations and disappearance gaps are preserved.

Strengthened translation instructions so screen explanations, headings and UI are explicit translation targets, with target language and speech/screen counts repeated after the glossary. Code groups identical stationary screen text for one translation, then restores every original ID, interval and position. Continuous display may merge; disappearance gaps remain empty. Different words, numbers, case, locations and moving text remain separate, allowing only small OCR-box jitter. No new language detection, blocking or automatic retranslation was added; existing checks remain. Whole-video/full-glossary single-request behavior is unchanged. Saved completed results are not automatically modified. Request construction, reuse, timing and actual release ZIP were checked; actual API translation quality improvement has not yet been verified.

Version 0.6.5 simplifies long-video response constraints that could trigger HTTP 400. The program validates IDs and counts, saves valid translations and manually requests unfinished cues only. History and detail views offer stop and delete controls; stop running jobs first. The current version also removes the job’s app-owned video copies; separately saved files and API settings stay. Progress animation stops on failure or cancellation.

Reduced glossary payload size by sharing repeated descriptions without removing entries, meanings or rules. Names, character names and related skills use only the chosen source and target languages. Auto-detected sources use target-language names and aliases actually matching the input. When Gemini provides HTTP 429 quota details, the app distinguishes input tokens/minute, requests/minute, requests/day and zero allocation; missing details stay unidentified. Whole-video single-request defaults and no automatic retries remain. Failed 0.6.1 jobs with no translated results can Resume without repeating transcription. Actual free-tier acceptance and translation quality still require separate verification.

The glossary card counts languages from the currently installed DB. Menu text has four languages; video source and translation choices have 13. Fresh YouTube audio transcription is on by default. Turn it off to prefer existing source-language captions, including auto-generated ones, with speech recognition as fallback. “Save source subtitles without translating” is off by default. Enabling it saves the original text without translation API calls or charges; selected speech/screen recognition still runs.

Translation supports 13 languages: Korean, English, Japanese, Simplified/Traditional Chinese, German, French, Spanish, Portuguese, Russian, Thai, Vietnamese and Indonesian. Interface text and guides remain in four languages. Another 16,802 localized names extend 1,868 existing concepts across nine additional languages. Ten placeholder values are excluded; missing names are not invented. New/unreleased terms require confirmed live availability before review. After installing this program update, additions and corrections within these 13 languages can arrive through DB updates. Adding a new language code still requires a program update.

Speech recognition and translation language choices now cover 13 languages. Screen OCR supports six: Korean, English, Japanese, Simplified/Traditional Chinese and Russian. Select OCR language independently, including when translating into another language. Video retains every glossary concept while sending needed localized spellings and actually matching aliases. Single-request defaults and no automatic retry after rate limits remain.

Valid translations are saved even when a response omits cues. Resume requests unfinished IDs only, retaining completed source cues as context. Response coverage is constrained so repeated screen text is requested for every cue. The full glossary, initial whole-video single request and no automatic retries remain. Unsaved responses from 0.6.3 and earlier cannot be recovered, but existing ASR/OCR is reused.

---

## 日本語

### 0.7.1

作業履歴カードから直接アーカイブへの共有・取消ができます。共有画面の音声・画面オプションを小さなカードにまとめ、チェックボックスと説明を横に揃えました。文字サイズ・時間調整・公開同意も整理しました。

### 0.7.0

共有字幕アーカイブを追加しました。拡張機能のみで制作者の元のYouTube動画に共有字幕を適用し、誤訳を報告できます。PC作業室から同意のうえ字幕と表示設定を共有・取消できます。完了したYouTube作業の一時動画のみ削除し、字幕と履歴を保持して容量を整理できます。

### 0.6.11

誤訳報告の見つけやすさと、ZZZゲーム用語DB・翻訳品質の改善に役立つことの案内を強化しました。READMEの導入手順直後と、完了した動画作業・拡張に案内を表示します。報告の受付・共有方法は従来どおりです。

### 0.6.10

音声字幕と画面翻訳が重なるとき、音声字幕が前面に表示されるよう表示順序を固定しました。YouTube拡張とローカル動画プレビューに適用されます。画面翻訳の文字は検出された枠内で上下左右の中央に配置します。検出枠の位置・内容・時刻は変更しません。

### 0.6.9

画面字幕をクリックしても報告・削除メニューが開かない問題を修正しました。再生コントロールと重なる部分ではクリックを通し、それ以外の字幕領域は引き続きクリックできます。拡張設定とローカル動画のプレビューで音声・画面字幕の背景を個別に切り替え、設定を保持します。更新ボタンの下に拡張の再読み込み・ブラウザ再起動の短い案内を表示します。自動ポップアップは表示しません。

### 0.6.8

音声字幕にマウスを重ねて表示される **↕ 移動** ハンドルを上下にドラッグすると、すべての音声字幕の高さが変わります。字幕のクリックでは従来どおり報告・削除メニューが開きます。拡張設定とプレビューの **音声字幕の高さ / 位置をリセット** でも調整できます。高さは接続した作業に自動保存されます。VTTとプロジェクトJSONには調整した位置が、SRTには内容と時間のみが反映されます。文章の修正もダウンロード前に保存されます。再生コントロールの表示中は、画面字幕の重なった部分だけクリックを再生バーに通し、字幕の残りの部分は引き続きクリックできます。

[README](README-ja.md)

履歴を削除すると、その作業用にアプリ内に保存した動画・音声・アップロード字幕のコピー、生成字幕、中間ファイルをすべて消去します。共有コピーは最後の作業履歴を削除するときに整理します。更新後の起動時には、旧版で履歴のないまま残ったアップロードコピーと情報ファイルも自動整理します。残っている作業の入力、PC上の元ファイル、別途ダウンロードした動画・字幕、APIキー・設定・報告は保持します。整理結果や失敗は作業履歴画面に表示します。完了したYouTube作業の「YouTube動画を保存 ↓」から、音声を含む最大1080pの動画を別途保存できます。翻訳字幕は動画に焼き込まれません。SRT/VTTなどで別途保存してください。保存先はブラウザのダウンロード設定に従います。

確認一覧や字幕をクリックして開くメニューから個別字幕を削除できます。削除分は再生・保存ファイルから除外され、「削除した字幕」タブで復元できます。YouTubeではPCに接続して完了作業を適用後、音声・画面字幕をクリックすると報告・削除メニューが開きます。メニュー表示中は停止し、閉じると元々再生中だった場合のみ再開します。説明を入力して送信した報告だけが既存の非公開受付へ届きます。アプリ更新後、拡張機能管理画面で拡張を再読み込みし、YouTubeページも更新してください。保存対象の標準は「音声字幕 + 画面字幕」で、「音声字幕のみ」「画面字幕のみ」もSRT・VTT・位置付きVTT・プロジェクトJSONで選べます。同じ固定文言の間にある低信頼度・1フレームだけのOCR誤字は補正しますが、数値・否定表現の変化や消えた区間は結合しません。

画面の説明・見出し・UIも翻訳対象と明示し、翻訳先と音声・画面の対象数を用語集の後にも記載するよう要求を強化しました。同じ文言・固定位置の画面文字はコードでまとめて1回翻訳し、元のID・表示時刻・位置へ戻します。連続表示だけを結合し、消えた時間には表示しません。文言・数値・大文字小文字・位置が異なる場合や移動文字は別扱いとし、OCR枠の小さな揺れのみ許容します。新しい言語判定・ブロック・自動再翻訳は加えず既存の検査を維持します。動画全体と全用語集を1回で送る標準動作は同じです。完了済みの保存訳は自動変更しません。要求構成・再利用・時刻・実際の配布ZIPを検証しましたが、実APIでの翻訳品質改善は未確認です。

0.6.5ではHTTP 400の原因となり得る長い動画の応答制約を簡素化しました。件数とIDはアプリ側で検証し、有効な翻訳の保存と未完了分のみの手動再開は維持します。履歴と詳細で停止・削除でき、実行中は先に停止してください。現行版ではアプリ内の動画コピーも一緒に整理し、別途保存したファイルとAPI設定は保持します。失敗・中断時の進行アニメーションを停止します。

用語集の全項目・意味・適用規則を維持し、重複説明を共有して送信量を削減しました。名称・キャラクター名・関連スキル名は選択した原語と翻訳先だけを送ります。原語の自動検出時は翻訳先の名称と実際の原文に一致した別名を使います。Geminiの429応答に情報があれば分間入力トークン・分間リクエスト・1日のリクエスト・割り当て0を区別し、なければ原因未確認と表示します。動画全体1回の要求と自動再試行なしは維持します。翻訳結果がない0.6.1の失敗作業は、再認識せず「再開」できます。無料上限内での成功と翻訳品質は別途確認が必要です。

用語集カードの言語数は現在のDBから計算します。メニュー表示は4言語、動画の原語・翻訳先は13言語です。YouTube音声の新規書き起こしは標準でオンです。オフにすると既存の原語字幕（自動生成を含む）を優先し、なければ音声認識します。「翻訳せず原語字幕だけを保存」は標準でオフです。オンにすると翻訳APIの呼び出し・料金なしで原文を保存し、選択した音声・画面認識は行います。

翻訳は韓国語・英語・日本語・簡体字/繁体字中国語・ドイツ語・フランス語・スペイン語・ポルトガル語・ロシア語・タイ語・ベトナム語・インドネシア語の13言語に対応します。画面表示と説明書は従来の4言語です。既存1,868概念に追加9言語の名称16,802件を対応付け、テスト用の値10件を除外しました。不明な名称は補作しません。新規・未公開用語は正式実装を確認してから検討します。このプログラム更新後、同じ13言語内の名称追加・修正はDB更新で受け取れます。新しい言語コード自体の追加にはプログラム更新も必要です。

音声認識・翻訳の選択肢を13言語へ拡張しました。画面OCRは韓国語・英語・日本語・簡体字/繁体字中国語・ロシア語の6言語です。翻訳先と独立してOCR対応言語を選択します。全概念を維持し、必要な言語の名称と実際に一致した別名のみ送信します。標準の1回要求とレート制限後の自動再試行なしを維持します。

応答に欠落があっても有効な翻訳を保存します。「再開」では未完了IDのみ要求し、完了区間の原文は文脈として送ります。同じ画面文字も全区間で返すよう応答形式を補強しました。全用語集・初回の動画全体1回要求・自動再試行なしは維持します。0.6.3以前で未保存の応答は復元できませんが、音声認識・OCR結果は再利用します。

---

## 简体中文

### 0.7.1

可直接在任务记录卡片共享字幕或取消共享。共享窗口将语音与画面选项分组为紧凑卡片，使复选框与说明并排，并整理字号、时间调整及公开同意设置。

### 0.7.0

新增共享字幕档案馆。仅使用扩展即可在原作者的YouTube视频观看共享字幕并举报误译。可在PC工作室明确同意后发布字幕与显示设置，也可取消共享。已完成的YouTube任务可仅删除临时视频，保留字幕及记录并释放空间。

### 0.6.11

加强误译举报入口及其有助于改进ZZZ游戏术语数据库与翻译质量的说明。在README安装步骤后、视频任务完成页面及扩展中显示指南。举报提交与分享方式保持不变。

### 0.6.10

语音字幕与屏幕翻译重叠时，语音字幕将显示在前面。适用于YouTube扩展和本地视频预览。屏幕翻译文字在识别框内水平和垂直居中显示。识别框位置、内容和时间保持不变。

### 0.6.9

修复了点击屏幕字幕无法打开举报和删除菜单的问题。与播放控件重叠的部分仍允许点击穿透，其余字幕区域可以点击。在扩展设置和本地视频预览中，可分别开关语音字幕和屏幕字幕的背景，并记住设置。更新按钮下方简要说明扩展重新加载或浏览器重启方式，不自动弹窗。

### 0.6.8

将鼠标移到语音字幕附近，拖动出现的 **↕ 移动** 手柄可同时调整所有语音字幕的高度。点击字幕仍会打开举报和删除菜单。扩展设置和预览中的 **语音字幕高度 / 重置位置** 也可调整。高度会自动保存到已连接的任务中。VTT和项目JSON会保留调整的位置，SRT仅保存内容和时间。下载前也会保存文字修改。播放器控件显示时，屏幕字幕仅在重叠区域让点击穿透到播放控件，其余部分仍可点击。

[README](README-zh-CN.md)

删除任务记录时，同时删除应用为该任务保存的视频、音频、上传字幕副本、生成字幕及中间文件。共享副本在最后一条相关任务记录删除时清理。更新后启动时，也会自动清理旧版本遗留的无任务记录关联的上传副本及信息文件。保留现有任务的输入文件、电脑上的原始文件、另行下载的视频和字幕、API密钥、设置及举报。清理结果或失败提示显示在任务记录页面。已完成的YouTube任务新增“保存YouTube视频 ↓”，可另外下载最高1080p且包含声音的视频。译文字幕不会烧录进视频，请另存SRT/VTT等字幕。保存位置取决于浏览器的下载设置。

可在校对列表或点击字幕打开的菜单中删除单条字幕。删除后不再播放或导出，可在“已删除字幕”标签页恢复。在YouTube连接PC并应用已完成任务后，点击语音或屏幕字幕即可举报/删除。菜单打开时暂停，关闭时仅在原本播放中的情况下继续播放。填写说明并点击发送后，举报才会送达现有私密举报服务。更新程序后，请在浏览器扩展管理页重新加载扩展并刷新YouTube。导出默认“语音字幕 + 屏幕字幕”，SRT、VTT、含位置VTT及项目JSON也可选择“仅语音字幕”或“仅屏幕字幕”。相同固定文案之间仅一帧、置信度较低的OCR拼写抖动可修正；数值、否定变化及消失时段保持独立。

加强翻译要求，明确屏幕说明、标题及UI也是翻译目标，并在术语表后重申目标语言及语音/屏幕各自数量。代码将相同文案和固定位置的屏幕文字合并请求一次翻译，再恢复每个原始ID、时段及位置。只合并连续显示，消失期间不会显示。不同文案、数值、大小写、位置及移动文字分开处理，仅容许OCR框轻微抖动。不新增语言检测、拦截或自动重译，保留既有检查；默认整段视频及完整术语表单次请求不变。已完成的保存结果不会自动修改。已验证请求构成、复用、时间及实际发行ZIP，尚未验证实际API翻译质量是否改善。

0.6.5简化了可能导致长视频HTTP 400的响应约束，由程序验证段数与ID，保留有效翻译并支持手动仅请求未完成片段。记录及详情页面新增停止和删除操作，运行中须先停止。当前版本同时清理应用保存的视频副本，保留另行保存的文件及API设置。失败或已取消时停止进度动画。缺少片段时仍保存有效结果；0.6.3及更早版本未保存的翻译响应无法恢复，但可复用语音识别及OCR结果。

保留术语表的全部条目、含义和规则，通过共享重复说明减少发送量。名称、角色名及相关技能名仅发送所选原文和目标语言。原文自动检测时使用目标语言名称及实际匹配原文的别名。Gemini的429响应若提供配额详情，将区分每分钟输入token、每分钟请求、每日请求及配额为0；无详情则提示原因未确认。仍默认整段视频单次请求，不自动重试。0.6.1中未生成翻译的失败任务可直接继续，无需重新识别。实际是否满足免费配额及翻译质量仍需单独验证。

术语表卡片根据当前安装的数据库计算语言数量。菜单显示有4种语言，视频原文和目标语言有13种。从YouTube音频重新转写默认开启；关闭后优先使用既有原文字幕（含自动生成字幕），没有时再识别音频。“仅保存原文字幕，不翻译”默认关闭。开启后保存原文，不调用翻译API也不产生翻译API费用；语音和屏幕识别仍按所选设置进行。

翻译支持韩语、英语、日语、简体/繁体中文、德语、法语、西班牙语、葡萄牙语、俄语、泰语、越南语和印尼语，共13种语言。界面及说明保留原有4种语言。为1,868个既有概念关联额外9种语言的16,802个名称，排除10个测试占位值，不编造缺失名称。新增及未发布术语须确认正式实装后再审核。安装本次程序更新后，同一13种语言内的名称补充和修正可通过DB更新接收；增加新语言代码仍需程序更新。

语音识别及翻译选项扩展至13种语言。屏幕OCR支持韩语、英语、日语、简体/繁体中文及俄语6种语言，与翻译目标分开选择。保留全部术语概念，仅发送所需语言名称及实际匹配的别名。继续默认单次请求，遇到速率限制后不自动重试。
