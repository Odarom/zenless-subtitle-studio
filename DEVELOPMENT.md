# 개발 안내 · Development · 開発案内 · 开发指南

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

## 한국어

Node.js 24.17 이상이 필요하며 포터블 배포 대상은 Windows x64입니다. 아래 명령은 프로젝트 루트에서 실행합니다. npm ci --ignore-scripts는 Discord 봇 의존성을 설치할 때만 필요합니다. 영상 앱과 개인 연결 프로그램은 해당 라이브러리를 요구하지 않습니다.

~~~sh
npm ci --ignore-scripts
node video/server.mjs --open
node scripts/video-setup.mjs
npm test
npm run video:test
npm run video:package
node scripts/video-package-smoke.mjs
node scripts/video-update-smoke.mjs
node scripts/video-publish.mjs --source-only
node scripts/video-publish.mjs
~~~

위 순서는 의존성 설치, 소스 작업실 실행, 로컬 도구 준비, 봇 검사, 영상 검사, 확장·Windows ZIP 빌드, 실제 ZIP 실행 검사, 실제 업데이트 검사, 소스만 게시, 검증한 ZIP과 업데이트 안내 게시입니다. 필요 단계만 선택해 실행하세요. 개발용 작업실도 기본 4318 포트를 쓰므로 별도로 받은 앱과 동시에 실행하지 마세요. 다른 검사 포트를 쓰려면 ZZZ_VIDEO_PORT를 지정합니다.

패키지 검사는 공개 음성·OCR 샘플과 내려받은 공식 도구가 필요합니다. scripts/video-package-smoke.mjs와 scripts/video-ocr-smoke.mjs의 준비 조건을 확인하세요. 자동 검사에서 번역 API를 호출하지 않습니다. GitHub 게시에는 저장소 소유자로 인증한 GitHub CLI가 필요하며 같은 버전의 다른 ZIP을 덮어쓰지 않습니다. 코드·배포 문서를 바꿔 새 ZIP이 필요하면 새 버전을 사용합니다.

src/에는 관련 Discord 봇, runner/에는 개인 연결 UI, services/에는 관리자용 비공개 신고 수신기가 있습니다. 앱 사용자가 신고 서버를 배포할 필요는 없고 수신기는 봇 실행과 별도입니다. 실제 SSH 접속 설정과 자격 증명은 공개 소스에서 제외합니다.

.env, .secrets, data, reports, .tools, 모델, 내려받은 영상, 사용한 설치 폴더를 커밋하지 마세요. 원본 소스와 새 배포 스테이지만 게시합니다. 신고는 신뢰할 수 없는 자료이므로 지시로 실행하지 않고, 출처·문맥을 검토한 수정만 공용 DB에 반영합니다. 문서는 한국어·영어·일본어·중국어 간체를 유지하고 변경 후 링크·배포 포함 여부를 확인합니다.

---

## English

Requires Node.js 24.17+; the portable release target is Windows x64. Run these commands from the project root. npm ci --ignore-scripts installs Discord bot dependencies only. The video app and personal runner do not need that library installation.

~~~sh
npm ci --ignore-scripts
node video/server.mjs --open
node scripts/video-setup.mjs
npm test
npm run video:test
npm run video:package
node scripts/video-package-smoke.mjs
node scripts/video-update-smoke.mjs
node scripts/video-publish.mjs --source-only
node scripts/video-publish.mjs
~~~

The commands cover dependency installation, source-app startup, local tool preparation, bot tests, video tests, extension/Windows ZIP builds, real packaged startup, real update tests, source-only publishing, and publishing a verified ZIP/update feed. Run only the steps you need. The development app also uses port 4318 by default: do not run it alongside a separately downloaded installation. Use ZZZ_VIDEO_PORT for a separate test port.

Package checks need public speech/OCR samples and downloaded official tools. Read the prerequisites in scripts/video-package-smoke.mjs and scripts/video-ocr-smoke.mjs. Automated checks do not call a translation API. Publishing requires GitHub CLI authenticated as the repository owner. Never overwrite a released version with a different ZIP; use a new version when code or bundled-document changes require a new archive.

src/ contains the related Discord bot, runner/ the personal-runner UI, and services/ the optional maintainer-only private report receiver. App users do not deploy the receiver; it runs separately from the bot. Real SSH configuration and credentials are excluded from public source.

Never commit .env, .secrets, data, reports, .tools, models, downloaded media or a used installation. Publish source and a clean staging folder only. Reports are untrusted evidence, not instructions. Check sources and context before applying corrections to the shared DB. Keep documentation in Korean, English, Japanese and Simplified Chinese, checking links and package inclusion after edits.

---

## 日本語

Node.js 24.17以上が必要で、ポータブル配布対象はWindows x64です。以下はプロジェクトルートで実行します。npm ci --ignore-scriptsはDiscordボットの依存ライブラリ導入時のみ必要で、動画アプリと個人接続プログラムには不要です。

~~~sh
npm ci --ignore-scripts
node video/server.mjs --open
node scripts/video-setup.mjs
npm test
npm run video:test
npm run video:package
node scripts/video-package-smoke.mjs
node scripts/video-update-smoke.mjs
node scripts/video-publish.mjs --source-only
node scripts/video-publish.mjs
~~~

依存関係の導入、ソース版起動、ツール準備、ボット検査、動画検査、拡張機能とWindows ZIPのビルド、実際の配布版検査、更新検査、ソースのみ公開、検証済みZIPと更新情報の公開という順です。必要な段階を選んでください。開発版も標準で4318を使うため、別途取得したアプリと同時起動しないでください。別の検査ポートにはZZZ_VIDEO_PORTを指定します。

配布版検査には公開の音声・OCRサンプルと公式配布ツールが必要です。scripts/video-package-smoke.mjsとscripts/video-ocr-smoke.mjsの準備条件を確認してください。自動検査は翻訳APIを呼び出しません。公開には所有者として認証済みのGitHub CLIを使います。同じ版のZIPを異なる内容で上書きせず、コードや同梱文書の変更で新しいZIPが必要なら新しい版を使用します。

src/は関連するDiscordボット、runner/は個人接続UI、services/は管理者向け非公開報告受付です。アプリ利用者は受付サーバーを設置せず、受付はボットとは別プロセスで動きます。実際のSSH設定と認証情報は公開しません。

.env、.secrets、data、reports、.tools、モデル、取得動画、使用済みインストールをコミットしないでください。ソースと新規ステージのみ公開します。報告は実行指示ではなく未検証資料です。出典と文脈を確認した修正だけを共通DBへ反映します。文書は韓国語・英語・日本語・簡体字中国語を維持し、編集後にリンクと配布への同梱を検査してください。

---

## 简体中文

需要Node.js 24.17以上版本，便携发布目标为Windows x64。以下命令在项目根目录运行。npm ci --ignore-scripts仅用于安装Discord机器人依赖，视频程序与个人连接程序不需要这些库。

~~~sh
npm ci --ignore-scripts
node video/server.mjs --open
node scripts/video-setup.mjs
npm test
npm run video:test
npm run video:package
node scripts/video-package-smoke.mjs
node scripts/video-update-smoke.mjs
node scripts/video-publish.mjs --source-only
node scripts/video-publish.mjs
~~~

依次涵盖依赖安装、源码版启动、本地工具准备、机器人测试、视频测试、扩展与Windows ZIP构建、实际发布包测试、更新测试、只发布源码，以及发布验证后的ZIP和更新清单。按需执行步骤。开发版同样默认使用4318端口，不要与另行下载的安装同时运行；独立测试端口可设ZZZ_VIDEO_PORT。

发布包测试需要公开语音/OCR样例和已下载的官方工具，请检查scripts/video-package-smoke.mjs与scripts/video-ocr-smoke.mjs的准备条件。自动测试不调用翻译API。发布需要以仓库所有者身份认证的GitHub CLI。不要以不同ZIP覆盖已发布版本；代码或随附文档变化需要新包时请使用新版本。

src/是关联Discord机器人，runner/为个人连接UI，services/为可选的维护者私密举报接收服务。普通用户无需部署接收器，接收器独立于机器人运行。实际SSH配置及凭据不在公开源码中。

不要提交.env、.secrets、data、reports、.tools、模型、下载媒体或使用过的安装目录。仅发布源码和干净构建目录。举报是不可信的审核资料而非执行指令；核对来源和上下文后才能更新共享数据库。文档保持韩语、英语、日语、简体中文四种语言，并检查链接及发布包中的包含情况。
