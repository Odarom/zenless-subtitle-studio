# 상세 안내 · Detailed guide · 詳細ガイド · 详细指南

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

## 한국어

음성 인식에서 이름·게임 용어의 철자가 조금 틀려도 기존 DB의 유사 명칭·등록 별칭을 번역 참고 후보로 제공합니다. 기존 번역 요청에서 문맥과 화면 글자를 함께 대조하며 추가 교정 API 호출은 하지 않습니다. 후보는 확정된 별칭이나 자동 치환이 아닙니다. 미출시·자동 적용 금지 항목, 짧은 표현·숫자 포함 명칭은 후보에서 제외합니다. 인식 원문·타이밍·신고의 원문/번역 쌍과 이미 완료한 번역은 보존합니다. 남은 구간의 이어하기에는 새 지침을 적용합니다. DeepL은 기존의 정확한 명칭 보호를 유지합니다.

긴 음성 자막을 문장·구절 단위로 나누어 차례로 표시합니다. 기존 완료 작업, 유튜브 확장, 로컬 미리보기와 SRT/VTT 저장에 적용되며 재번역이나 추가 API 호출은 필요 없습니다. 원래 구간 안에서 글 길이에 비례해 표시 시간을 나누므로 단어별 음성과 정확히 일치하는 방식은 아닙니다. 화면 자막과 편집·신고용 원본 구간은 유지합니다. 신고에는 같은 구간의 원문·번역 전체가 연결되며, 신고 창을 연 뒤 내용이 바뀌면 전송을 멈춥니다.

음성 자막과 화면 번역 자막이 겹칠 때 음성 자막이 앞에 보이도록 표시 순서를 고정했습니다. 화면 번역 글자는 인식된 상자의 가로·세로 중앙에 정렬합니다. 유튜브 확장과 로컬 영상 미리보기에 적용됩니다. 인식된 상자의 위치·내용·시간은 변경하지 않습니다.

음성·화면 자막의 배경은 확장 설정과 미리보기에서 각각 켜고 끌 수 있습니다. 배경 설정은 감상용이며 다운로드 파일의 스타일을 바꾸지 않습니다.

본인 영상 파일을 번역한 뒤 **로컬 영상으로 자막 미리보기**에서 같은 원본 파일을 선택하세요. 장면과 함께 확인하며, 자막 클릭으로 삭제·신고하고 미리보기 아래 입력칸에서 문구를 수정하는 방법을 추천합니다. [→ README](README-ko.md#본인-영상-파일-번역과-미리보기)

음성 자막에 마우스를 올리면 나타나는 **↕ 이동** 손잡이를 위아래로 끌면 모든 음성 자막의 높이가 함께 바뀝니다. 클릭하면 기존 신고·삭제 메뉴가 열립니다. 확장 설정이나 미리보기의 **음성 자막 높이 / 기본 위치**로도 조절할 수 있습니다. 높이는 연결된 작업에 자동 저장됩니다. VTT·프로젝트 JSON에는 조절한 위치가, SRT에는 내용·시간만 반영됩니다. 문구 수정도 다운로드 전에 저장됩니다. 재생바가 보일 때에는 겹친 화면 번역의 해당 부분만 클릭을 통과시켜 재생 조작을 우선합니다. 자막의 나머지 부분은 계속 클릭할 수 있습니다.

[README](README-ko.md)


### 영상에서 보기

처음에는 [Google AI Studio에서 무료 API 키 받기](https://aistudio.google.com/apikey)와 **Gemini 3.1 Flash-Lite**(`gemini-3.1-flash-lite`) 사용을 추천합니다. [무료 사용 구간](https://ai.google.dev/gemini-api/docs/pricing)이 있으며 계정·지역별 제공 여부와 RPM·일일 한도가 적용됩니다. 무료 키가 무제한 사용을 뜻하지는 않습니다.

기본 **영상 전체 한 번에 번역**은 인식된 음성 조각을 문장으로 묶고, 전체 음성·화면 텍스트와 전체 용어집을 한 요청에 보냅니다. 관리용 출처·수정 이력을 제외한 모든 용어의 명칭·별칭·의미·번역 규칙을 포함합니다. 작은 모델은 「관련 용어만」을 직접 선택할 수 있습니다. DeepL은 전체 DB를 로컬 용어 보호에 사용합니다. AI는 구간 번호와 번역문만 반환하고, 프로그램이 원래 시간·위치에 다시 연결하여 SRT/VTT를 만듭니다. 토큰 수는 로컬에서 추정하며 한 응답에 담기 어렵다면 전송 전에 멈춥니다. 긴 영상 분할은 직접 선택할 때만 사용합니다. 오류 뒤 자동 재시도는 하지 않으며 기본 **분당 1회** 간격은 다음 영상·이어하기에도 적용됩니다. 같은 키를 쓰는 다른 프로그램의 요청이나 서비스의 일일 한도는 별도입니다.

여기서 **PC 작업실**은 `Start.cmd`를 실행하면 브라우저에 열리는 **ZZZ 자막 작업실** 페이지(`http://127.0.0.1:4318`)를 말합니다.

1. Chrome/Edge의 확장 관리 화면에서 개발자 모드를 켜고 **압축해제된 확장 프로그램 로드**로 함께 받은 `video-extension` 폴더를 선택합니다.
2. 프로그램 폴더의 **Start.cmd**를 실행하고, 브라우저에 열린 프로그램 페이지로 이동합니다.
3. 페이지 **왼쪽 메뉴의 「API 및 연결 설정」**을 누릅니다. 아래로 내려 **「유튜브 확장 프로그램 연결」** 카드의 **「PC 연결 코드 복사」**를 누릅니다.
4. 유튜브 영상을 열고 브라우저 오른쪽 위의 확장 프로그램 아이콘에서 **ZZZ 자막 작업실**을 엽니다. **「PC 연결 코드」** 칸에 붙여 넣고 **「연결」**을 누릅니다. 이 코드는 번역 API 키와 별개입니다.
5. **「완료된 자막」**에서 해당 영상의 작업을 고르고 **「선택한 자막 적용」**을 누릅니다. 사용하는 동안 `Start.cmd` 실행 창을 켜 두세요. 이 PC에서 처리하므로 별도 영상 처리 서버는 필요 없습니다.

음성 자막과 화면 번역 표시를 따로 켜고 끌 수 있습니다. 영상 크기와 여백을 계산해 화면 글자 위치를 맞추며 확대·전체 화면에도 다시 계산합니다. 로컬 영상은 작업실의 미리보기에서 볼 수 있습니다. 브라우저가 재생하지 못하는 코덱은 외부 플레이어를 사용하세요.

### 저장과 긴 영상

- SRT / 일반 VTT: 텍스트와 시간. 화면 글자의 위치는 담지 않습니다.
- 위치 포함 VTT: 화면 위치를 포함하며 제작자가 YouTube CC로 업로드할 수 있습니다. 시청자의 글꼴·크기·배경 설정 때문에 확장 화면과 완전히 같은 모양을 보장하지 않습니다.
- 프로젝트 JSON: 원문·번역·시간·이동 위치를 보존합니다. 확장 프로그램에서 파일로 바로 불러올 수 있으며 PC 연결이 없어도 적용할 수 있습니다. 다른 영상 ID가 지정된 파일은 적용하지 않습니다.

영상·음성 입력은 최대 64GiB(화면에 약 64GB), SRT/VTT는 8MiB, 확장 프로그램의 프로젝트 JSON은 32MiB입니다. 유튜브 OCR용 영상 다운로드도 64GiB입니다. 1시간 영상을 지원하며 1초 간격 OCR은 약 3,600프레임을 검사합니다. 0.5초·1초·2초 간격과 검사 시작·종료를 선택할 수 있고 최대 30,000프레임입니다. 짧게 나타나는 글자는 놓칠 수 있으며 검사 간격 단위의 시간 정밀도입니다. 처리 시간은 PC 성능에 따라 달라집니다. 원본·중간 오디오·다운로드 영상·모델이 들어갈 충분한 디스크 공간이 필요합니다. 완료된 인식·번역 묶음은 중단 후 **이어하기**로 재사용합니다.

Intel/AMD CPU를 지원합니다. 음성 GPU 가속은 NVIDIA/AMD의 Vulkan 호환 장치와 드라이버가 필요합니다. 자동 모드는 GPU 실패 시 CPU로 전환합니다. OCR은 CPU에서 실행합니다. 모든 GPU 모델의 가속을 보장하지는 않습니다.

### 용어집과 신고

공용 용어집은 [GitHub](https://github.com/Odarom/zenless-translation-database)에 있습니다. 번들 자료를 포함하며 설정의 **새 버전 확인 → 용어집 업데이트**로 검토된 최신 자료를 받습니다. 실행 중 하루 한 번 확인은 선택 사항입니다. 확인은 알림용이며 설치는 버튼으로 수행합니다. 새 자료는 새 번역에 적용하고 진행 중인 작업은 차단합니다. 실패 시 기존 자료를 유지합니다. 설치 폴더를 다시 받을 필요가 없습니다.

완료 화면에서 **음성 자막 / 화면 글자 / 전체 보기**를 선택하고 원문·번역문·구간 번호 또는 시간으로 찾으세요. 각 구간 위의 **오역 신고**를 누르면 해당 원문과 번역이 바로 표시됩니다. 로컬 미리보기에서 표시 중인 자막이나 화면 글자를 눌러도 같은 신고 창이 열립니다.

설명을 적고 **신고 보내기**를 누르면 운영자 서버에 비공개로 접수됩니다. GitHub 로그인은 필요 없습니다. 원문·번역문·설명과 선택한 영상 주소를 전송하며 API 키와 로컬 경로는 제외합니다. 신고와 임의 설치 식별자·IP의 남용 방지용 해시는 최대 90일 보관합니다. 접수 번호가 표시되어야 전송 완료입니다. 실패한 신고는 PC에 남아 다시 보내거나 파일로 저장할 수 있습니다. 운영자는 Discord 신고와 함께 검토한 뒤 확인된 수정만 배포합니다.

### 프로그램 업데이트

[GitHub 배포 페이지](https://github.com/Odarom/zenless-subtitle-studio/releases/latest)에서 처음 설치합니다. 0.4.0부터 설정의 **프로그램 버전 확인 → 설치하고 다시 시작**으로 갱신할 수 있습니다. 파일 크기와 SHA-256을 검증한 뒤 설치하며 번역 중에는 설치하지 않습니다. API 키·모델·작업 기록을 유지하고 적용 실패 시 기존 파일로 복구합니다. 이전 파일 백업은 PC에 보관됩니다. 실행 환경 자체를 바꿔야 하는 버전은 전체 설치를 안내합니다.

0.3.0 이하에서는 최신 버전을 한 번 직접 설치해야 합니다. 새 배포 폴더의 `video-extension`을 다시 등록하세요. 이후 같은 폴더에서 업데이트하면 확장 파일도 갱신됩니다. Chrome/Edge 확장 관리에서 새로고침하고 열린 유튜브 페이지도 새로고침하세요.

API 키는 이 PC의 별도 암호화 저장소에 저장합니다. `app/data`, `app/.secrets`, PC 연결 코드, 본인 설정은 다른 사람에게 전달하지 마세요. 배포 원본 ZIP을 전달하세요. 번역 API에는 선택한 텍스트·문맥과 기본적으로 전체 용어집을 보냅니다. 입력량에 따라 무료 계정의 TPM 한도에 걸릴 수 있습니다. 팬 제작 도구이며 게임 제작사의 공식 프로그램은 아닙니다.

0.2.0의 대괄호 경로 설치 문제는 0.2.1부터 수정되었습니다. 대괄호·한글·공백 경로를 사용할 수 있습니다. 문제가 있으면 최신 배포본 폴더 전체를 새로 풀고 실행하세요. 준비를 다시 하려면 `Setup.cmd`를 사용하세요.

### 사용한 오픈소스와 라이선스

| 구성 요소 | 용도 | 라이선스·고지 |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 프로그램 실행 | [MIT + third-party notices](https://github.com/nodejs/node/blob/main/LICENSE) |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | 음성 받아쓰기 | [MIT](https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE) |
| [Whisper](https://github.com/openai/whisper) | 음성 인식 모델 | [MIT](https://github.com/openai/whisper/blob/main/LICENSE) |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | 유튜브 영상·자막 처리 | [Unlicense / Windows executable GPLv3+](https://github.com/yt-dlp/yt-dlp#licensing) |
| [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) | 오디오 변환·영상 프레임 추출 | [GPLv3 build](https://github.com/yt-dlp/FFmpeg-Builds) · [license information](https://ffmpeg.org/legal.html) |
| [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json) | 선택형 화면 글자 인식 | [MIT](https://github.com/hiroi-sora/RapidOCR-json/blob/main/LICENSE) |
| [7-Zip 7zr](https://github.com/ip7z/7zip/releases/tag/26.04) | OCR 도구 압축 해제 | [LGPL-2.1-or-later](https://www.7-zip.org/license.txt) · [source](https://github.com/ip7z/7zip/tree/26.04) |

Node.js는 배포 ZIP에 포함되며, 라이선스 원문은 `runtime/LICENSE-Node.txt`에 들어 있습니다. 나머지 도구·모델은 처음 사용할 때 배포처에서 직접 내려받습니다. yt-dlp 소스의 Unlicense와 Windows 실행 파일의 GPLv3+를 구분하며, 설치하는 FFmpeg는 GPL 빌드입니다. 빌드에 포함된 추가 라이브러리와 OCR 모델에는 각각의 라이선스가 적용됩니다. 자세한 출처·배포·고지는 [구성 요소 안내](THIRD-PARTY-NOTICES.md)를 확인하세요. 구성 요소를 재배포할 때는 해당 배포물의 고지·라이선스 원문과 필요한 소스 제공 조건도 확인해야 합니다.


---

## English

Small spelling errors in speech names and game terms now retrieve similar existing DB names/registered aliases as unverified translation hints. The existing translation request uses context and screen text; no separate correction API call is made. Hints are neither confirmed aliases nor automatic substitutions. Prerelease/disabled terms, short expressions and names containing numbers are excluded. Original transcripts, timing, matching report source/translation pairs and completed translations are preserved. Resumed pending cues use the new guidance. DeepL keeps its existing exact-name protection.

Long speech captions now play in short, consecutive sentences or phrases. This applies to completed jobs, the YouTube extension, local previews and SRT/VTT exports without retranslating or making extra API calls. Display times are distributed within the original interval by text length, rather than aligned to individual spoken words. Screen captions and original editing/reporting units are preserved. Reports use the complete matching source/translation pair and stop if captions change after the report form opens.

Speech subtitles now appear in front of screen translations when they overlap, in both the YouTube extension and local video preview. Screen translation text is centered horizontally and vertically inside its detected box. Detected box positions, text and timing are unchanged.

Switch speech and screen subtitle backgrounds on or off separately in extension settings and preview. These viewing preferences do not change the style of downloaded files.

After translating your own file, select the same original in **Preview subtitles with a local video**. We recommend watching the scene while reviewing: click subtitles to delete or report them, and edit wording in the fields below the preview. [→ README](README-en.md#translate-and-preview-your-own-video)

Hover over speech subtitles and drag the **↕ Move** handle up or down to move all speech cues together. Clicking the subtitle still opens report/delete. **Speech subtitle height / Reset position** is also available in extension settings and the preview. Height is automatically saved to the connected job. VTT and project JSON preserve the adjusted position; SRT stores text and timing only. Text edits are also saved before downloading. When player controls are visible, only the overlapping portion of screen captions lets clicks pass through to the controls. The rest of each caption remains clickable.

[README](README-en.md)


### Playback and export

Recommended starting point: get a [free Google AI Studio API key](https://aistudio.google.com/apikey) and choose **Gemini 3.1 Flash-Lite** (`gemini-3.1-flash-lite`). A [free tier](https://ai.google.dev/gemini-api/docs/pricing) is available subject to account/region availability, RPM and daily quotas; it is not unlimited.

The default whole-video mode joins speech fragments into sentences and sends all speech, screen text and the entire glossary in one request. All names, aliases, meanings and translation rules are included; administrative provenance/history is omitted. Select related terms only explicitly for smaller models. DeepL uses the full DB locally for term protection. The AI returns cue IDs and translated text; local code restores timing and positions and creates SRT/VTT. Local token estimates stop oversized requests before sending. Long-video batches require explicit selection. Errors are not retried automatically. The default one-request-per-minute spacing applies across videos and resumed jobs. Other apps using the same key and daily service quotas still count separately.

**PC Studio** means the **ZZZ Subtitle Studio** page opened in your browser by `Start.cmd` (`http://127.0.0.1:4318`).

1. In Chrome/Edge extension management, enable developer mode and load the included `video-extension` folder using **Load unpacked**.
2. Run **Start.cmd** in the program folder and open the program page that appears in your browser.
3. Click **API & connection in the left menu**. Scroll to the **Connect the YouTube extension** card and click **Copy PC connection code**.
4. Open a YouTube video, then open **ZZZ Subtitle Studio** from the browser’s extension icon at the top right. Paste into **PC connection code** and click **Connect**. This code is separate from your translation API key.
5. Choose the video’s job under **Finished subtitles** and click **Apply selected subtitles**. Keep the `Start.cmd` window open while using it. Processing runs on this PC; no separate video-processing server is needed.

Toggle speech and screen translations independently. Screen placement follows video dimensions, letterboxing and fullscreen changes. Preview local videos in the app; use an external player for codecs the browser cannot play.

- SRT / ordinary VTT: text and timing without screen positions.
- Positioned VTT: includes screen positions for creator uploads to YouTube CC. Viewer font, size and background settings can change the appearance.
- Project JSON: preserves source, translation, timing and moving positions. Import it directly into the extension without a PC connection. Projects assigned to another video ID are rejected.

Media uploads and YouTube OCR video downloads allow up to 64GiB (shown as approximately 64GB). SRT/VTT imports allow 8MiB; extension project JSON allows 32MiB. One-hour videos are supported: OCR at one-second intervals processes about 3,600 frames. Choose 0.5, 1 or 2 seconds and a scan range, up to 30,000 frames. Brief text may be missed; timing precision follows the sampling interval. Processing speed depends on hardware. Allow disk space for originals, downloaded video, intermediate audio and models. Resume interrupted jobs to reuse completed recognition and translation batches.

Intel/AMD CPUs are supported. Speech GPU acceleration requires a compatible NVIDIA/AMD Vulkan device and driver. Automatic mode falls back to CPU after a GPU failure. OCR runs on CPU. Acceleration is not guaranteed on every GPU.

### Glossary, reports and privacy

The bundled glossary can be updated from [GitHub](https://github.com/Odarom/zenless-translation-database) using **Check for updates → Update glossary**. Optional daily checks run while the app is open; installation is manual. Updates apply to new translations, are blocked during active jobs, and retain the old glossary on failure.

Choose **Speech subtitles / Screen text / Show all** and search by original text, translation, cue ID or time. The report button above each cue opens the matching source and translation. Clicking a displayed subtitle or screen item in local preview opens the same report form.

Enter an explanation and press **Send report** to submit privately to the maintainer; no GitHub login is needed. The source, translation, explanation and optional video URL are sent, excluding API keys and local paths. Reports, random installation IDs and abuse-prevention IP hashes are retained for up to 90 days. A receipt confirms delivery. Failed reports remain on this PC for retry or file export. The maintainer reviews video and Discord reports together and publishes verified fixes.

### Program updates

Install initially from [GitHub Releases](https://github.com/Odarom/zenless-subtitle-studio/releases/latest). From 0.4.0, use **Check program version → Install and restart** in settings. The app verifies size and SHA-256, blocks installation during active jobs, preserves API keys/models/history and restores previous files on installation failure. Backups stay on your PC. Releases requiring a newer runtime prompt for a full installation.

Users of 0.3.0 or earlier must install the latest version once manually and register the new `video-extension` folder. Future in-place updates also replace the extension files. Reload the extension in Chrome/Edge management and refresh open YouTube pages afterwards.

Keys are encrypted locally. Do not share `app/data`, `app/.secrets`, your connection code or personal app settings. Share the original release ZIP. Cloud translation receives selected text, context and the entire glossary by default. Input size may exceed a free account’s TPM quota. This is a fan project, not an official game product.

The bracket-path installation problem in 0.2.0 was fixed in 0.2.1. Brackets, Korean characters and spaces are supported. Extract a fresh complete release if needed. Run `Setup.cmd` to prepare tools again.

### Open-source components and licenses

| Component | Purpose | License and notices |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | Application runtime | [MIT + third-party notices](https://github.com/nodejs/node/blob/main/LICENSE) |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | Speech transcription | [MIT](https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE) |
| [Whisper](https://github.com/openai/whisper) | Speech recognition model | [MIT](https://github.com/openai/whisper/blob/main/LICENSE) |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | YouTube media and captions | [Unlicense / Windows executable GPLv3+](https://github.com/yt-dlp/yt-dlp#licensing) |
| [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) | Audio conversion and frame extraction | [GPLv3 build](https://github.com/yt-dlp/FFmpeg-Builds) · [license information](https://ffmpeg.org/legal.html) |
| [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json) | Optional screen OCR | [MIT](https://github.com/hiroi-sora/RapidOCR-json/blob/main/LICENSE) |
| [7-Zip 7zr](https://github.com/ip7z/7zip/releases/tag/26.04) | OCR archive extraction | [LGPL-2.1-or-later](https://www.7-zip.org/license.txt) · [source](https://github.com/ip7z/7zip/tree/26.04) |

Node.js is bundled in the ZIP with original notices in `runtime/LICENSE-Node.txt`. Other tools/models download directly from their distributors on first use. Distinguish the yt-dlp source Unlicense from its GPLv3+ Windows executable; the downloaded FFmpeg is a GPL build. Additional build libraries and OCR models retain their respective licenses. See [third-party notices](THIRD-PARTY-NOTICES.md) for sources and distribution details. Redistributing components also requires checking their notices, original licenses and any corresponding-source obligations.


---

## 日本語

音声認識で名前・ゲーム用語の綴りが少し誤っていても、既存DBの類似名称・登録別名を未確定の翻訳候補として参照します。既存の翻訳要求で文脈と画面文字を照合し、別の訂正APIは呼び出しません。候補は確定済みの別名や自動置換ではありません。未実装・自動適用禁止の項目、短い表現・数字を含む名称は候補から除外します。認識原文・時間・報告の原文/訳文の対応と完了済み翻訳を保持し、再開時は未完了区間に新しい指示を適用します。DeepLの完全一致による名称保護は維持します。

長い音声字幕を短い文・フレーズに分け、順番に表示します。完了済み作業、YouTube拡張、ローカルプレビュー、SRT/VTT保存に適用され、再翻訳や追加API呼び出しは不要です。表示時間は元の区間内で文字量に応じて配分するため、単語ごとの音声との厳密な同期ではありません。画面字幕と編集・報告用の元の区間は維持します。報告には同じ区間の原文・訳文全体を使用し、報告画面を開いた後に内容が変わった場合は送信を停止します。

音声字幕と画面翻訳が重なるとき、音声字幕が前面に表示されるよう表示順序を固定しました。YouTube拡張とローカル動画プレビューに適用されます。画面翻訳の文字は検出された枠内で上下左右の中央に配置します。検出枠の位置・内容・時刻は変更しません。

音声・画面字幕の背景は拡張設定とプレビューで個別に切り替えられます。視聴用の設定で、ダウンロードファイルのスタイルは変わりません。

自分のファイルを翻訳したら、**ローカル動画で字幕をプレビュー**で同じ元動画を選んでください。場面を見ながら確認し、字幕のクリックで削除・報告、プレビュー下の入力欄で文章を修正する方法をおすすめします。 [→ README](README-ja.md#自分の動画ファイルを翻訳プレビューする)

音声字幕にマウスを重ねて表示される **↕ 移動** ハンドルを上下にドラッグすると、すべての音声字幕の高さが変わります。字幕のクリックでは従来どおり報告・削除メニューが開きます。拡張設定とプレビューの **音声字幕の高さ / 位置をリセット** でも調整できます。高さは接続した作業に自動保存されます。VTTとプロジェクトJSONには調整した位置が、SRTには内容と時間のみが反映されます。文章の修正もダウンロード前に保存されます。再生コントロールの表示中は、画面字幕の重なった部分だけクリックを再生バーに通し、字幕の残りの部分は引き続きクリックできます。

[README](README-ja.md)


### 再生と保存

最初は[Google AI Studioの無料APIキー](https://aistudio.google.com/apikey)と**Gemini 3.1 Flash-Lite**（`gemini-3.1-flash-lite`）をおすすめします。[無料枠](https://ai.google.dev/gemini-api/docs/pricing)にはアカウント・地域による利用条件、RPM、日次上限があります。無制限ではありません。

標準の動画全体翻訳では、音声の断片を文にまとめ、音声・画面文字・用語集全体を1回のリクエストで送ります。管理用の出典・変更履歴を除き、全用語の名称・別名・意味・翻訳規則を含めます。小型モデルでは「関連用語のみ」を手動で選択できます。DeepLはDB全体をローカルの用語保護に使います。AIは字幕番号と訳文だけを返し、プログラムが元の時刻・位置に対応付けてSRT/VTTを作ります。トークン数はローカルで推定し、出力上限を超えそうな場合は送信前に停止します。長い動画の分割は利用者が選んだ場合のみ行います。エラー後の自動再送はせず、初期設定の1分1回の間隔は次の動画や再開時にも適用します。同じキーを使う他のアプリや日次上限は別途考慮してください。

**PC作業室**は、`Start.cmd`を実行するとブラウザに開く**ZZZ字幕スタジオ**のページ（`http://127.0.0.1:4318`）です。

1. Chrome/Edgeの拡張機能管理でデベロッパーモードを有効にし、同梱の`video-extension`フォルダーを展開済み拡張機能として読み込みます。
2. プログラムのフォルダーにある**Start.cmd**を実行し、ブラウザに開いたプログラムのページへ移動します。
3. **左メニューの「API・接続設定」**を開き、下へスクロールして**「YouTube拡張機能を接続」**カードの**「PC接続コードをコピー」**を押します。
4. YouTube動画を開き、ブラウザ右上の拡張機能アイコンから**ZZZ字幕スタジオ**を開きます。**「PC接続コード」**欄に貼り付けて**「接続」**を押します。このコードは翻訳APIキーとは別です。
5. **「完成した字幕」**から動画の作業を選び、**「選択した字幕を適用」**を押します。使用中は`Start.cmd`のウィンドウを開いたままにします。このPCで処理するため、別の動画処理サーバーは不要です。

音声字幕と画面翻訳の表示は個別に切り替えられます。画面位置は動画の寸法・余白・全画面表示に合わせて再計算します。ローカル動画はアプリでプレビューできます。ブラウザ非対応のコーデックは外部プレイヤーを使用してください。

- SRT・通常のVTT：文字と時刻。画面位置は含みません。
- 位置付きVTT：画面位置を含み、制作者がYouTube CCにアップロードできます。視聴者の文字サイズ・フォント・背景設定により見た目は異なります。
- プロジェクトJSON：原文・翻訳・時刻・移動位置を保持し、PC接続なしでも拡張に直接読み込めます。別動画のIDが指定されたファイルは適用しません。

動画・音声入力とYouTube OCR用動画のダウンロードは最大64GiB（画面では約64GB）、SRT/VTTは8MiB、拡張のプロジェクトJSONは32MiBです。1時間動画に対応し、1秒間隔なら約3,600フレームを検査します。0.5・1・2秒と検査範囲を選べ、最大30,000フレームです。短時間の文字を見落とす場合があり、時刻精度は検査間隔に依存します。速度はPC性能次第です。原本・中間音声・取得動画・モデル用の空き容量を確保してください。中断後の再開では完了済みの認識と翻訳を再利用します。

Intel/AMD CPUに対応します。音声GPU処理にはNVIDIA/AMDのVulkan対応デバイスとドライバーが必要です。自動モードはGPU失敗時にCPUへ切り替えます。OCRはCPUで動作します。すべてのGPUの高速化を保証するものではありません。

### 用語集・報告・個人情報

用語集は同梱され、設定の更新確認・更新ボタンで[GitHub](https://github.com/Odarom/zenless-translation-database)から取得できます。起動中の1日1回確認は任意で、インストールは手動です。新しい翻訳から適用し、実行中の更新は停止、失敗時は既存の資料を維持します。

完了画面の音声字幕・画面文字・すべて表示を切り替え、原文・訳文・字幕番号・時刻で検索できます。各区間上部の誤訳報告から対象の原文と訳文を開けます。ローカルプレビューで表示中の字幕や画面文字を押しても報告できます。

説明を入力して報告を送信すると、運営サーバーへ非公開で届きます。GitHubログインは不要です。原文・訳文・説明・任意の動画URLを送り、APIキーとローカルパスは除外します。報告、ランダムなインストールID、不正利用防止用のIPハッシュは最大90日保存します。受付番号が表示されれば送信完了です。失敗した報告はPCに残り、再送やファイル保存ができます。運営はDiscordの報告と合わせて検証し、確認した修正だけを公開します。

### プログラムの更新

初回は[GitHub Releases](https://github.com/Odarom/zenless-subtitle-studio/releases/latest)から取得します。0.4.0以降は設定の更新確認・インストールして再起動で更新できます。サイズとSHA-256を検証し、処理中はインストールしません。APIキー・モデル・履歴を保持し、適用失敗時は以前のファイルに戻します。バックアップはPCに保存します。新しい実行環境が必要な版では全体の再インストールを案内します。

0.3.0以前からは一度だけ最新版を手動で導入し、新しい`video-extension`フォルダーを登録してください。以降の同じ場所での更新では拡張ファイルも更新します。Chrome/Edgeの拡張機能管理で再読み込みし、開いているYouTubeページも更新してください。

キーはPC内で暗号化して保存します。`app/data`、`app/.secrets`、接続コードや個人設定は他人に渡さず、配布元のZIPを共有してください。クラウド翻訳には文章・文脈と標準で用語集全体を送信します。無料アカウントのTPM上限を超える場合があります。ゲーム公式ではないファン制作ツールです。

0.2.0の角括弧パスの問題は0.2.1以降で修正済みです。角括弧・韓国語・空白のあるパスに対応します。必要なら新しい配布版全体を展開し直してください。ツールの再準備には`Setup.cmd`を使います。

### 使用オープンソースとライセンス

| 構成要素 | 用途 | ライセンス・告知 |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | アプリ実行 | [MIT + third-party notices](https://github.com/nodejs/node/blob/main/LICENSE) |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | 音声の書き起こし | [MIT](https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE) |
| [Whisper](https://github.com/openai/whisper) | 音声認識モデル | [MIT](https://github.com/openai/whisper/blob/main/LICENSE) |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | YouTube動画・字幕処理 | [Unlicense / Windows executable GPLv3+](https://github.com/yt-dlp/yt-dlp#licensing) |
| [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) | 音声変換・動画フレーム抽出 | [GPLv3 build](https://github.com/yt-dlp/FFmpeg-Builds) · [license information](https://ffmpeg.org/legal.html) |
| [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json) | 任意の画面OCR | [MIT](https://github.com/hiroi-sora/RapidOCR-json/blob/main/LICENSE) |
| [7-Zip 7zr](https://github.com/ip7z/7zip/releases/tag/26.04) | OCRツールの展開 | [LGPL-2.1-or-later](https://www.7-zip.org/license.txt) · [source](https://github.com/ip7z/7zip/tree/26.04) |

Node.jsはZIPに同梱し、ライセンス原文は`runtime/LICENSE-Node.txt`に収録しています。他のツール・モデルは初回利用時に配布元から直接取得します。yt-dlpのソースのUnlicenseとWindows実行ファイルのGPLv3+を区別し、取得するFFmpegはGPLビルドです。追加ライブラリやOCRモデルには各自のライセンスが適用されます。出典・配布の詳細は[構成要素の告知](THIRD-PARTY-NOTICES.md)を確認してください。構成要素を再配布する際は、告知・ライセンス原文・必要な対応ソースの提供条件も確認してください。


---

## 简体中文

语音识别中的姓名、游戏术语出现少量拼写错误时，会从现有数据库检索相似名称和已登记别名，作为未经确认的翻译参考候选。在原有翻译请求中结合上下文与画面文字判断，不额外调用纠错API。候选并非已确认别名，也不会自动替换原文。候选排除未上线、禁止自动应用的条目，以及短表达和含数字的名称。保留识别原文、时间、举报对应的原文/译文和已完成翻译；继续任务时仅对未完成区间应用新指引。DeepL仍使用原有的名称精确保护方式。

将较长的语音字幕按短句或词组依次显示。适用于已完成任务、YouTube扩展、本地预览和SRT/VTT导出，无需重新翻译或额外API请求。显示时间按文字长度在原区间内分配，并非逐词与语音精确对齐。画面字幕和用于编辑、举报的原始区间保持不变。举报包含同一区间完整对应的原文和译文；打开举报窗口后若内容改变，将停止提交。

语音字幕与屏幕翻译重叠时，语音字幕将显示在前面。适用于YouTube扩展和本地视频预览。屏幕翻译文字在识别框内水平和垂直居中显示。识别框位置、内容和时间保持不变。

可在扩展设置和预览中分别开关语音字幕和屏幕字幕背景。这些观看设置不会改变下载文件的样式。

翻译自己的文件后，在**用本地视频预览字幕**选择同一个原始视频。推荐结合画面检查，点击字幕可删除或举报，在预览下方的输入框中修改文字。 [→ README](README-zh-CN.md#翻译并预览自己的视频文件)

将鼠标移到语音字幕附近，拖动出现的 **↕ 移动** 手柄可同时调整所有语音字幕的高度。点击字幕仍会打开举报和删除菜单。扩展设置和预览中的 **语音字幕高度 / 重置位置** 也可调整。高度会自动保存到已连接的任务中。VTT和项目JSON会保留调整的位置，SRT仅保存内容和时间。下载前也会保存文字修改。播放器控件显示时，屏幕字幕仅在重叠区域让点击穿透到播放控件，其余部分仍可点击。

[README](README-zh-CN.md)


### 播放与保存

推荐先申请[Google AI Studio 免费 API 密钥](https://aistudio.google.com/apikey)，并选择 **Gemini 3.1 Flash-Lite**（`gemini-3.1-flash-lite`）。[免费额度](https://ai.google.dev/gemini-api/docs/pricing)受账号、地区、RPM 与每日配额限制，并非无限使用。

默认整段视频翻译会先将语音片段合并为句子，再把全部语音、画面文字和完整术语表放入一次请求。包含所有术语的名称、别名、含义及翻译规则，不包含管理用来源和修改历史。较小模型可手动选择仅相关术语。DeepL在本地使用完整数据库保护术语。AI 仅返回字幕编号和译文，程序按原有时间与位置重新组合，生成 SRT/VTT。本地估算令牌数量，预计超过输出上限时会在发送前停止。长视频分批翻译需要手动选择，报错后不会自动重试。默认每分钟一次的请求间隔也适用于下个视频与继续任务。同一密钥被其他程序使用的请求及每日额度仍会另外计入。

**PC工作室**是运行`Start.cmd`后在浏览器中打开的**ZZZ字幕工作室**页面（`http://127.0.0.1:4318`）。

1. 在Chrome/Edge扩展管理中开启开发者模式，加载随附的`video-extension`文件夹。
2. 运行程序文件夹内的**Start.cmd**，切换到浏览器中打开的程序页面。
3. 点击**左侧菜单“API 与连接设置”**，向下滚动，在**“连接 YouTube 扩展程序”**卡片中点击**“复制本机连接码”**。
4. 打开YouTube视频，从浏览器右上角扩展图标打开**ZZZ字幕工作室**，粘贴到**“本机连接码”**栏并点击**“连接”**。此连接码与翻译API密钥不同。
5. 在**“已完成字幕”**中选择该视频的任务，点击**“应用所选字幕”**。使用期间保持`Start.cmd`窗口开启，所有处理在此电脑进行，无需另设视频处理服务器。

语音字幕与画面翻译可单独开关。程序会按照视频尺寸、黑边和全屏状态重新计算位置。本地视频可以在工作室预览。浏览器不支持的编码请用外部播放器。

- SRT / 普通 VTT：保存文字与时间，不包含画面位置。
- 含位置 VTT：保存画面位置，可交给视频作者上传为 YouTube CC。观众的字体、字号与背景设置会影响显示效果。
- 项目 JSON：保留原文、译文、时间与移动位置，可在扩展中直接导入，无需电脑连接。指定了其他视频 ID 的文件会被拒绝。

视频、音频输入以及 YouTube OCR 视频下载上限为64GiB（界面约显示64GB），SRT/VTT 为8MiB，扩展项目 JSON 为32MiB。支持一小时视频，以1秒间隔检测约3,600帧。可选0.5、1、2秒及检测起止范围，上限30,000帧。可能遗漏短暂出现的文字，时间精度取决于采样间隔。速度取决于电脑性能。请为原文件、中间音频、下载视频与模型预留磁盘空间。中断后继续可复用已完成识别和翻译批次。

支持 Intel/AMD CPU。语音 GPU 加速需要兼容 Vulkan 的 NVIDIA/AMD 设备及驱动。自动模式在 GPU 失败后切换到 CPU。OCR 在 CPU 上运行。无法保证所有 GPU 型号均可加速。

### 词库、举报与隐私

程序自带词库，可在设置中通过检查更新、更新词库从[GitHub](https://github.com/Odarom/zenless-translation-database)获取审核后的资料。运行期间每天检查一次为可选设置，安装仍需点击按钮。新词库用于新翻译，任务进行中禁止更新，失败保留原有词库。

完成页面可切换语音字幕、画面文字与全部内容，并按原文、译文、字幕编号或时间查找。每段上方的误译举报按钮会打开对应原文和译文。点击本地预览中正在显示的语音字幕或画面文字也能举报。

填写说明并发送举报，内容将私密提交至维护者服务器，无需 GitHub 登录。发送原文、译文、说明与可选的视频地址，不包含 API 密钥或本地路径。举报、随机安装标识和防滥用 IP 哈希最多保存90天。显示接收编号才表示提交成功。失败的举报会保留在本机，可重发或导出文件。维护者将视频和 Discord 举报统一审核，仅发布经确认的修正。

### 程序更新

首次从[GitHub Releases](https://github.com/Odarom/zenless-subtitle-studio/releases/latest)安装。0.4.0起可在设置中检查程序版本，安装并重启。程序验证文件大小和 SHA-256，任务处理期间禁止安装，保留密钥、模型和记录，安装失败时恢复原文件。备份保存在本机。需要新版运行环境时会提示完整安装。

0.3.0及更早版本需手动安装一次最新版，并重新登记新版 `video-extension` 文件夹。以后在原位置更新时也会替换扩展文件。请在 Chrome/Edge 扩展管理中重新加载，并刷新已打开的 YouTube 页面。

密钥在本机加密保存。请勿分享 `app/data`、`app/.secrets`、连接码或个人设置，应分享原始发行 ZIP。云端翻译会接收文本、上下文及默认的完整术语表；可能超过免费账户的每分钟输入token上限。这是同人制作工具，并非游戏官方产品。

0.2.0 中方括号路径导致的安装问题已从0.2.1起修复。支持方括号、韩文及空格路径。如有问题，请重新完整解压新版。重新准备工具可运行 `Setup.cmd`。

云翻译默认发送完整术语表，可能超出免费账户的每分钟Token（TPM）配额。

### 使用的开源组件与许可证

| 组件 | 用途 | 许可证与声明 |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 程序运行环境 | [MIT + third-party notices](https://github.com/nodejs/node/blob/main/LICENSE) |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | 语音转写 | [MIT](https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE) |
| [Whisper](https://github.com/openai/whisper) | 语音识别模型 | [MIT](https://github.com/openai/whisper/blob/main/LICENSE) |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | YouTube视频与字幕处理 | [Unlicense / Windows executable GPLv3+](https://github.com/yt-dlp/yt-dlp#licensing) |
| [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) | 音频转换与视频帧提取 | [GPLv3 build](https://github.com/yt-dlp/FFmpeg-Builds) · [license information](https://ffmpeg.org/legal.html) |
| [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json) | 可选屏幕文字识别 | [MIT](https://github.com/hiroi-sora/RapidOCR-json/blob/main/LICENSE) |
| [7-Zip 7zr](https://github.com/ip7z/7zip/releases/tag/26.04) | OCR工具解压 | [LGPL-2.1-or-later](https://www.7-zip.org/license.txt) · [source](https://github.com/ip7z/7zip/tree/26.04) |

ZIP包含Node.js，许可证原文位于`runtime/LICENSE-Node.txt`。其他工具和模型在首次使用时直接从发布方下载。yt-dlp源码的Unlicense与其Windows可执行文件的GPLv3+不同；下载的FFmpeg为GPL构建。额外库和OCR模型分别适用各自许可证。来源及分发说明见[第三方组件声明](THIRD-PARTY-NOTICES.md)。重新分发组件时，还需确认声明、许可证原文及相应源码提供要求。
