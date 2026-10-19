# 구성 요소 · Third-party notices · 構成要素 · 第三方组件

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

## 한국어

| 구성 요소 | 용도 | 라이선스·고지 |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 프로그램 실행 | [MIT + third-party notices](https://github.com/nodejs/node/blob/main/LICENSE) |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | 음성 받아쓰기 | [MIT](https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE) |
| [Whisper](https://github.com/openai/whisper) | 음성 인식 모델 | [MIT](https://github.com/openai/whisper/blob/main/LICENSE) |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | 유튜브 영상·자막 처리 | [Unlicense / Windows executable GPLv3+](https://github.com/yt-dlp/yt-dlp#licensing) |
| [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) | 오디오 변환·영상 프레임 추출 | [GPLv3 build](https://github.com/yt-dlp/FFmpeg-Builds) · [license information](https://ffmpeg.org/legal.html) |
| [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json) | 선택형 화면 글자 인식 | [MIT](https://github.com/hiroi-sora/RapidOCR-json/blob/main/LICENSE) |

Node.js는 배포 ZIP에 포함되며, 라이선스 원문은 `runtime/LICENSE-Node.txt`에 들어 있습니다. 나머지 도구·모델은 처음 사용할 때 배포처에서 직접 내려받습니다. yt-dlp 소스의 Unlicense와 Windows 실행 파일의 GPLv3+를 구분하며, 설치하는 FFmpeg는 GPL 빌드입니다. 빌드에 포함된 추가 라이브러리와 OCR 모델에는 각각의 라이선스가 적용됩니다. 자세한 출처·배포·고지는 이 문서를 확인하세요. 구성 요소를 재배포할 때는 해당 배포물의 고지·라이선스 원문과 필요한 소스 제공 조건도 확인해야 합니다.

- [Node.js](https://nodejs.org/) — runtime/LICENSE-Node.txt
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) — https://github.com/SubtitleEdit/support-files
- [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) — https://ffmpeg.org/legal.html
- [Whisper model](https://huggingface.co/ggerganov/whisper.cpp) — https://github.com/openai/whisper
- [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json)

Node.js는 배포에 포함하며 정확한 버전·다운로드 주소·체크섬은 release-manifest.json에 기록합니다. Node와 포함 구성 요소의 라이선스 원문은 runtime/LICENSE-Node.txt입니다. 라이선스 원문은 번역하여 대체하지 않습니다.

yt-dlp, whisper.cpp CPU/Vulkan 배포본, FFmpeg와 음성 모델은 첫 실행에 공식 배포처에서 내려받으며 체크섬을 검증합니다. whisper.cpp Windows 실행 파일은 SubtitleEdit/support-files 배포본을 사용합니다. FFmpeg의 배포 라이선스·소스 정보도 확인하세요. RapidOCR-json은 OCR 선택 시 검증한 배포본과 언어 모델을 받습니다. 각 구성 요소의 라이선스는 해당 배포본과 연결한 원본 저장소를 따릅니다.

젠레스 용어 자료의 출처·검수·정식/미출시 구분은 app/glossary/README.md, app/glossary/sources.json과 각 항목을 확인하세요. [공용 DB](https://github.com/Odarom/zenless-translation-database)에는 팬 자료도 포함하며 게임 제작사의 공식·검수 프로그램으로 표시하지 않습니다.

---

## English

| Component | Purpose | License and notices |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | Application runtime | [MIT + third-party notices](https://github.com/nodejs/node/blob/main/LICENSE) |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | Speech transcription | [MIT](https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE) |
| [Whisper](https://github.com/openai/whisper) | Speech recognition model | [MIT](https://github.com/openai/whisper/blob/main/LICENSE) |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | YouTube media and captions | [Unlicense / Windows executable GPLv3+](https://github.com/yt-dlp/yt-dlp#licensing) |
| [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) | Audio conversion and frame extraction | [GPLv3 build](https://github.com/yt-dlp/FFmpeg-Builds) · [license information](https://ffmpeg.org/legal.html) |
| [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json) | Optional screen OCR | [MIT](https://github.com/hiroi-sora/RapidOCR-json/blob/main/LICENSE) |

Node.js is bundled in the ZIP with original notices in `runtime/LICENSE-Node.txt`. Other tools/models download directly from their distributors on first use. Distinguish the yt-dlp source Unlicense from its GPLv3+ Windows executable; the downloaded FFmpeg is a GPL build. Additional build libraries and OCR models retain their respective licenses. See this document for sources and distribution details. Redistributing components also requires checking their notices, original licenses and any corresponding-source obligations.

- [Node.js](https://nodejs.org/) — runtime/LICENSE-Node.txt
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) — https://github.com/SubtitleEdit/support-files
- [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) — https://ffmpeg.org/legal.html
- [Whisper model](https://huggingface.co/ggerganov/whisper.cpp) — https://github.com/openai/whisper
- [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json)

Node.js is bundled; release-manifest.json records its exact version, download URL and checksum. The original license text for Node and included components is in runtime/LICENSE-Node.txt. Translations of explanatory documentation do not replace original licenses.

yt-dlp, whisper.cpp CPU/Vulkan builds, FFmpeg and the speech model download from official distribution sources on first use with checksum checks. Windows whisper.cpp executables come from SubtitleEdit/support-files. Read the FFmpeg build's license and source information as well. Optional OCR downloads the verified RapidOCR-json build and language models. Each component remains subject to the license in its distribution and upstream repository.

For game-term provenance, review and released/prerelease status, see app/glossary/README.md, app/glossary/sources.json and individual entries. The [shared DB](https://github.com/Odarom/zenless-translation-database) includes fan sources and is not presented as official or publisher-reviewed software.

---

## 日本語

| 構成要素 | 用途 | ライセンス・告知 |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | アプリ実行 | [MIT + third-party notices](https://github.com/nodejs/node/blob/main/LICENSE) |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | 音声の書き起こし | [MIT](https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE) |
| [Whisper](https://github.com/openai/whisper) | 音声認識モデル | [MIT](https://github.com/openai/whisper/blob/main/LICENSE) |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | YouTube動画・字幕処理 | [Unlicense / Windows executable GPLv3+](https://github.com/yt-dlp/yt-dlp#licensing) |
| [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) | 音声変換・動画フレーム抽出 | [GPLv3 build](https://github.com/yt-dlp/FFmpeg-Builds) · [license information](https://ffmpeg.org/legal.html) |
| [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json) | 任意の画面OCR | [MIT](https://github.com/hiroi-sora/RapidOCR-json/blob/main/LICENSE) |

Node.jsはZIPに同梱し、ライセンス原文は`runtime/LICENSE-Node.txt`に収録しています。他のツール・モデルは初回利用時に配布元から直接取得します。yt-dlpのソースのUnlicenseとWindows実行ファイルのGPLv3+を区別し、取得するFFmpegはGPLビルドです。追加ライブラリやOCRモデルには各自のライセンスが適用されます。出典・配布の詳細はこの文書を確認してください。構成要素を再配布する際は、告知・ライセンス原文・必要な対応ソースの提供条件も確認してください。

- [Node.js](https://nodejs.org/) — runtime/LICENSE-Node.txt
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) — https://github.com/SubtitleEdit/support-files
- [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) — https://ffmpeg.org/legal.html
- [Whisper model](https://huggingface.co/ggerganov/whisper.cpp) — https://github.com/openai/whisper
- [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json)

Node.jsは同梱され、正確な版・取得URL・チェックサムはrelease-manifest.jsonに記録します。Nodeと同梱構成要素のライセンス原文はruntime/LICENSE-Node.txtです。説明文の翻訳でライセンス原文を置き換えません。

yt-dlp、whisper.cppのCPU/Vulkan配布版、FFmpeg、音声モデルは初回に公式配布元から取得し、チェックサムを検証します。Windows版whisper.cppの実行ファイルはSubtitleEdit/support-filesの配布を利用します。FFmpeg配布版のライセンス・ソース情報も確認してください。OCR選択時には検証済みRapidOCR-jsonと必要な言語モデルを取得します。各構成要素の配布物と元のリポジトリのライセンスが適用されます。

ゲーム用語の出典・確認状況・正式/未公開区分はapp/glossary/README.md、app/glossary/sources.jsonと各項目を確認してください。[共通DB](https://github.com/Odarom/zenless-translation-database)にはファン資料も含み、ゲーム制作会社の公式・監修済みソフトとは表示しません。

---

## 简体中文

| 组件 | 用途 | 许可证与声明 |
| --- | --- | --- |
| [Node.js](https://nodejs.org/) | 程序运行环境 | [MIT + third-party notices](https://github.com/nodejs/node/blob/main/LICENSE) |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | 语音转写 | [MIT](https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE) |
| [Whisper](https://github.com/openai/whisper) | 语音识别模型 | [MIT](https://github.com/openai/whisper/blob/main/LICENSE) |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | YouTube视频与字幕处理 | [Unlicense / Windows executable GPLv3+](https://github.com/yt-dlp/yt-dlp#licensing) |
| [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) | 音频转换与视频帧提取 | [GPLv3 build](https://github.com/yt-dlp/FFmpeg-Builds) · [license information](https://ffmpeg.org/legal.html) |
| [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json) | 可选屏幕文字识别 | [MIT](https://github.com/hiroi-sora/RapidOCR-json/blob/main/LICENSE) |

ZIP包含Node.js，许可证原文位于`runtime/LICENSE-Node.txt`。其他工具和模型在首次使用时直接从发布方下载。yt-dlp源码的Unlicense与其Windows可执行文件的GPLv3+不同；下载的FFmpeg为GPL构建。额外库和OCR模型分别适用各自许可证。来源及分发说明见本文件。重新分发组件时，还需确认声明、许可证原文及相应源码提供要求。

- [Node.js](https://nodejs.org/) — runtime/LICENSE-Node.txt
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) — https://github.com/SubtitleEdit/support-files
- [FFmpeg](https://github.com/yt-dlp/FFmpeg-Builds) — https://ffmpeg.org/legal.html
- [Whisper model](https://huggingface.co/ggerganov/whisper.cpp) — https://github.com/openai/whisper
- [RapidOCR-json](https://github.com/hiroi-sora/RapidOCR-json)

已包含Node.js，其准确版本、下载地址与校验值记录于release-manifest.json。Node及所含组件的许可证原文位于runtime/LICENSE-Node.txt。说明文档的翻译不会替代许可证原文。

yt-dlp、whisper.cpp的CPU/Vulkan版本、FFmpeg和语音模型在首次使用时从官方发布渠道下载并校验。Windows版whisper.cpp使用SubtitleEdit/support-files的可执行文件。也请查看FFmpeg发布包的许可与源码信息。可选OCR会下载已校验的RapidOCR-json及语言模型。各组件遵循其发布包和上游仓库中的许可证。

游戏术语的来源、审核和正式/未发布状态见app/glossary/README.md、app/glossary/sources.json及具体条目。[共享DB](https://github.com/Odarom/zenless-translation-database)也包含粉丝资料，不声称为游戏制作方官方或官方审核的软件。
