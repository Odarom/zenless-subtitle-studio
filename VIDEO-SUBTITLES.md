# ZZZ Subtitle Studio · 영상 안내 · 動画案内 · 视频指南

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

## 한국어

[한국어 사용법](video/docs/README-ko.md) · [최신 배포](https://github.com/Odarom/zenless-subtitle-studio/releases/latest).

ZIP 전체를 공유하고 사용자는 압축을 풀어 Start.cmd를 실행합니다. Node.js가 포함되고 처리는 PC에서 이루어집니다. 각자 API 키를 사용하며 별도 처리 서버 구축은 필요 없습니다. 프로그램·확장은 한국어·영어·일본어·중국어 간체를 지원합니다.

전체 음성·화면 텍스트와 기본 전체 용어집을 한 요청에 보내고 AI는 ID와 번역문을 반환합니다. 코드는 원래 시간·위치에 결합합니다. 문장 결합·전송 전 크기 확인·기본 RPM 1·자동 분할/재요청 방지·선택형 분할을 사용합니다. 작은 모델은 관련 용어만 직접 선택하세요. 제공사 입력·출력·TPM·일일 한도는 별도입니다.

선택형 CPU OCR(기본 꺼짐), 시간·위치 추적, 화면 크기 적응, 음성/화면 표시 분리, DeepL API Free/Pro·로컬 Ollama, 최대 64 GiB 영상, 위치 VTT와 프로젝트 JSON, DB 갱신·비공개 신고·프로그램 갱신을 지원합니다. 검토 탭과 원문·번역·구간 ID·시간 검색을 이용하세요. 테스트 예제 실행 버튼은 제거했습니다.

개인 자료는 배포하지 않습니다. 사용 후 해당 설치의app/data/video와app/.secrets에 생성됩니다. 업데이트는 이 위치를 보존하며, 설치 폴더 전체를 삭제하면 기록·키가 자동 복구되지 않습니다. 사용한 폴더 대신 원본ZIP을 공유하세요. 개발용소스의data/video와.secrets는 다운로드본과 별도입니다. 기본4318포트를 두 설치가 동시에 사용하지 않게 하세요.

소스 실행은 video-run.cmd, 도구 준비는 video-setup.cmd이며 Node.js 24.17 이상이 필요합니다. [개발 안내](https://github.com/Odarom/zenless-subtitle-studio/blob/main/DEVELOPMENT.md)와 [신고 검토](REPORTS.md)를 확인하세요.

~~~sh
npm test
npm run video:test
node scripts/video-ocr-smoke.mjs
npm run video:package
node scripts/video-package-smoke.mjs
node scripts/video-update-smoke.mjs
~~~

ZIP 검사는 한글·공백·대괄호 경로와 PATH 없는 환경에서 CPU 음성·선택형 OCR·업데이트 보존을 확인하며 번역 API를 호출하지 않습니다. Vulkan GPU 가속은 드라이버와 장치에 따라 다릅니다. AMD 장치의 로컬 검증이 모든 Intel/NVIDIA/AMD 장치와 실제 YouTube 확장 환경 검증을 뜻하지는 않습니다. 공개 허용 목록만 배포하고 .env·키·data·reports·Discord 운영 설정은 제외합니다.

---

## English

[English guide](video/docs/README-en.md) · [Latest release](https://github.com/Odarom/zenless-subtitle-studio/releases/latest).

Distribute the whole ZIP. Users extract it and run Start.cmd with bundled Node.js. Processing runs on each PC with its own API key; no processing server setup is needed. App and extension support Korean, English, Japanese and Simplified Chinese.

By default, send the full speech/screen transcript and complete glossary in one request. AI returns IDs and translations; local code restores timing/position. Sentence joining, preflight size estimates, default RPM 1, no automatic splitting/retries, and optional manual batching are supported. Small models may explicitly use relevant terms only. Provider input/output, TPM and daily quotas remain separate.

Features include optional CPU OCR (off by default), timing/position tracking, responsive overlays, separate speech/screen toggles, DeepL API Free/Pro and local Ollama, up to 64 GiB video input, positioned VTT/project JSON, glossary updates, private reports and program updates. Review tabs and source/translation/ID/time search help locate cues. The built-in test-example action was removed.

Personal data is not distributed. After use it lives in that installation's app/data/video and app/.secrets. Updates preserve those locations; deleting the entire installation does not automatically restore history/keys. Share the original ZIP, never a used installation. A development checkout's data/video and .secrets are separate from downloaded installations. Do not run both on the same default 4318 port.

Source launch: video-run.cmd; tools: video-setup.cmd; Node.js 24.17+. See [development](https://github.com/Odarom/zenless-subtitle-studio/blob/main/DEVELOPMENT.md) and [report review](REPORTS.md).

~~~sh
npm test
npm run video:test
node scripts/video-ocr-smoke.mjs
npm run video:package
node scripts/video-package-smoke.mjs
node scripts/video-update-smoke.mjs
~~~

Package checks exercise CPU speech, optionalOCR and preserved update data in Korean/space/bracket paths without PATH, with no translationAPI calls. VulkanGPU support depends on device/drivers. Local AMD checks do not establish coverage of every Intel/NVIDIA/AMD device or liveYouTube browser environment. Only allowlisted public files are packaged; .env,keys,data,reports and Discord operating settings are excluded.

---

## 日本語

[日本語ガイド](video/docs/README-ja.md) · [最新版](https://github.com/Odarom/zenless-subtitle-studio/releases/latest)。

ZIP全体を配布し、利用者は展開してStart.cmdを実行します。Node.js同梱で自分のPC・APIキーを使用し、処理サーバー設置は不要です。アプリと拡張は韓国語・英語・日本語・簡体字中国語に対応します。

音声・画面の全文と標準で用語集全体を1要求で送り、AIはIDと訳文だけを返します。時間・位置はローカルコードで復元します。文の結合、事前サイズ確認、標準RPM1、自動分割/再送なし、任意の分割を備えます。小型モデルは関連用語のみを手動選択し、提供元の入力・出力・TPM・日次上限は別途適用されます。

任意CPUOCR（初期無効）、時間・位置追跡、画面サイズ適応、音声/画面の別表示、DeepL APIFree/Pro・ローカルOllama、最大64GiB入力、位置VTT・プロジェクトJSON、DB更新・非公開報告・プログラム更新に対応します。確認タブと原文・訳文・ID・時刻検索を利用できます。内蔵テストサンプルの実行機能は削除済みです。

個人資料は配布に含めません。使用後の保存先はその設置内のapp/data/videoとapp/.secretsです。更新では保持しますが、フォルダー全体を削除すると履歴・キーは自動復元しません。使用済み設置ではなく元ZIPを共有してください。開発ソースのdata/videoと.secretsは別の場所です。両方を同じ標準4318ポートで起動しないでください。

ソース実行はvideo-run.cmd、準備はvideo-setup.cmd、Node.js24.17以上です。[開発案内](https://github.com/Odarom/zenless-subtitle-studio/blob/main/DEVELOPMENT.md#日本語)と[報告確認](REPORTS.md#日本語)を参照してください。

~~~sh
npm test
npm run video:test
node scripts/video-ocr-smoke.mjs
npm run video:package
node scripts/video-package-smoke.mjs
node scripts/video-update-smoke.mjs
~~~

ZIP検査はPATHなしの韓国語・空白・括弧パスでCPU音声・任意OCR・更新後の保存維持を確認し、翻訳APIは呼び出しません。VulkanGPU対応は機器とドライバーによります。AMD機器の確認は全Intel/NVIDIA/AMD機器や実YouTube拡張環境の検証ではありません。公開許可リストだけを配布し、.env・キー・data・reports・Discord運用設定を除きます。

---

## 简体中文

[简体中文指南](video/docs/README-zh-CN.md) · [最新版](https://github.com/Odarom/zenless-subtitle-studio/releases/latest)。

分享完整ZIP，用户解压并运行Start.cmd。包含Node.js，处理在各自PC进行并使用自己的API密钥，无需搭建处理服务器。程序和扩展支持韩语、英语、日语及简体中文。

默认一次发送全部语音、画面文本和完整术语表，AI返回ID及译文，本地代码恢复时间与位置。支持语句合并、发送前大小检查、默认RPM1、不自动拆分/重试及可选手动分批。小模型可明确选择仅相关术语；提供商输入、输出、TPM与每日配额另行适用。

包括可选CPUOCR（默认关闭）、时间/位置跟踪、自适应叠加、语音/画面独立显示、DeepL APIFree/Pro和本地Ollama、最高64GiB视频、带位置VTT和项目JSON、DB更新、私密举报与程序更新。审核标签及原文/译文/ID/时间搜索便于查找。内置测试样例执行功能已移除。

发布包不包含个人资料。使用后存储在该安装目录的app/data/video和app/.secrets。更新会保留这些位置；删除整个安装目录后，历史与密钥不会自动恢复。分享原始ZIP，不要分享使用过的安装目录。开发源码的data/video和.secrets是另一个位置，不要让两套程序同时占用默认4318端口。

源码启动为video-run.cmd，工具准备为video-setup.cmd，需要Node.js24.17以上。参见[开发指南](https://github.com/Odarom/zenless-subtitle-studio/blob/main/DEVELOPMENT.md#简体中文)与[举报审核](REPORTS.md#简体中文)。

~~~sh
npm test
npm run video:test
node scripts/video-ocr-smoke.mjs
npm run video:package
node scripts/video-package-smoke.mjs
node scripts/video-update-smoke.mjs
~~~

ZIP测试在无PATH及韩文/空格/括号路径检查CPU语音、可选OCR与更新保存，不调用翻译API。VulkanGPU依赖设备和驱动。本地AMD验证不代表覆盖全部Intel/NVIDIA/AMD设备或实际YouTube扩展环境。仅发布允许列表文件，排除.env、密钥、data、reports及Discord运营配置。
