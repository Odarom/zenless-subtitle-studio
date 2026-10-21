# 상세 안내 · Detailed guide · 詳細ガイド · 详细指南

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

## 한국어

[README](README-ko.md)

### 현시점 무료 API 추천

**2026-10-19 한국시간 기준**, [Google AI Studio에서 무료 키 발급](https://aistudio.google.com/apikey) 후 **Gemini 3.1 Flash-Lite** / **gemini-3.1-flash-lite**를 추천합니다. [공식 요금표](https://ai.google.dev/gemini-api/docs/pricing)에 무료 구간이 있으며 해당 계정·프로젝트의 제공 조건과 RPM·TPM·일일 한도 안에서 무료로 사용할 수 있습니다. 모델 접근 권한·결제 설정·데이터 처리 조건은 [공식 약관](https://ai.google.dev/gemini-api/terms)과 계정 화면을 확인하세요. 무료가 무제한이나 영구 제공을 뜻하지는 않습니다. OpenAI API 또는 본인 기기의 Ollama 로컬 모델도 선택할 수 있습니다.

### 개인 서버에서 24시간 사용하기

PC 대신 본인이 관리하는 Oracle·VPS·집 서버에서 같은 연결 프로그램을 실행할 수 있습니다. 이 경우 PC를 꺼도 서버가 실행 중이면 번역됩니다. 본인 서버 운영자는 저장된 키에 접근할 수 있으므로 본인이 관리하는 개인 용도로 사용하세요. 다른 이용자의 키를 수집하는 용도로 쓰지 마세요.

GitHub 소스를 받고 Node.js 24.17 이상을 설치합니다. 봇 연결 프로그램만 실행할 때는 Discord 라이브러리 설치가 필요하지 않습니다.

~~~sh
cp .env.runner.example .env.runner
chmod 600 .env.runner
# .env.runner에 본인 서비스·모델·키·한도를 저장한 뒤:
node --env-file=.env.runner scripts/discord-runner.mjs pair
node --env-file=.env.runner scripts/discord-runner.mjs start
~~~

pair에서 Discord의 /zzz connect 코드를 입력합니다. [HOSTING.md](HOSTING.md)에 재부팅 후 자동 실행용 systemd 예제가 있습니다. 연결 프로그램은 바깥으로 HTTPS 접속하므로 본인 PC·서버의 인바운드 웹 포트를 열 필요가 없습니다. 같은 연결을 두 기기에서 동시에 실행하지 마세요.

### 공용 DB와 오역 신고

- PC와 개인 서버 모두 실행 시와 **6시간마다** [공용 번역 DB](https://github.com/Odarom/zenless-translation-database)를 자동 갱신합니다. 해시·크기·형식 확인 후 교체하며, 실패하면 마지막 정상 DB를 유지합니다. DB 갱신과 프로그램 코드 업데이트는 별도입니다.
- 채팅은 본문·답장·최근 문맥에서 명칭과 별칭을 검색해 관련 후보 최대 30개를 같은 번역 요청에 넣습니다. 후보 검색에 별도 LLM 요청을 쓰지 않습니다. 긴 표기·약어·동음이의어의 구분 규칙도 함께 제공합니다.
- 번역 메시지에 답장으로 **!신고** 또는 **!report** → **신고 시작**, 또는 메시지의 **앱 → 오역 신고**를 선택합니다. 신고 전 안내를 확인하고 원문·번역·설명을 제출하면 프로젝트 관리자가 비공개로 검토합니다. GitHub 로그인은 필요 없습니다.
- 본인 신고: **/zzz-report mine**, **/zzz-report status id:접수번호**. 별도로 자기 봇을 설치한 경우에는 로컬 접수 후 **프로젝트 관리자에게도 공유**를 선택하고 전송 미리보기에 동의해야 공용 프로젝트로 전달됩니다.
- 신고에 개인정보·키·일반 대화 전체를 넣지 마세요. 보관 기간은 최대 90일이며, 관리자 검토 후 공용 DB를 수정합니다. 제출만으로 자동 수정하거나 AI를 자동 호출하지 않습니다.

연결 확인은 /zzz api-status, 해제는 /zzz disconnect, 그룹 일시 정지는 /zzz pause 및 /zzz resume을 사용합니다. 사용량은 PC 화면이나 개인 서버의 node --env-file=.env.runner scripts/discord-runner.mjs usage로 확인합니다. 실패한 API 요청도 사용량에 포함됩니다. 중계 연결이 끊겨도 이미 시작된 번역을 자동 재호출하지 않습니다.

### 보관과 업데이트

PC UI는 키를 본인 PC에서 암호화해 보관합니다. 해당 PC의 관리자는 복호화할 수 있습니다. 화면 없는 서버 설치는 .env.runner 파일을 사용하므로 파일 권한을 제한하세요. 설정·연결은 data/ 아래에 저장합니다. .env 파일, data/, .secrets/를 공개하거나 다른 사람에게 전달하지 마세요. 키를 바꿀 때는 먼저 연결을 중지하세요. 프로그램을 교체할 때는 실행을 중지하고 개인 설정 폴더를 보존합니다.

직접 Discord 봇도 운영하려면 [HOSTING.md](HOSTING.md)를 읽으세요. 개인 설치용 API_MODE=server는 운영자가 등록 키를 복호화할 수 있는 기존 직접 호출 방식입니다. **본인이 운영하며 자기 키만 쓰는 개인 용도**로 한정해 사용하세요. 공개 중계 봇은 API_MODE=runner를 사용합니다. 팬 제작 도구이며 게임 제작사의 공식 봇이 아닙니다.

### 설정 화면 다시 열기 · 키 변경

PC에서는 압축을 풀었던 폴더의 **Start.cmd**를 다시 실행하면 설정 화면이 열립니다. 이미 실행 중이면 같은 프로그램의 화면만 다시 엽니다. 브라우저 창을 닫아도 실행 창은 켜 두어야 번역됩니다.

개인 서버에서 돌린다면 PC용 Start.cmd 대신 [HOSTING.md의 SSH 관리 화면](HOSTING.md#여러-서버와-비공개-관리-화면)을 사용합니다. 관리할 때마다 SSH 연결을 열고 서버의 현재 개인 관리 링크를 여세요. 주소의 127.0.0.1은 지금 쓰는 PC를 뜻하므로 서버용 주소만 북마크하면 다른 PC에서는 열리지 않습니다.

키 변경: **서버 프로필 선택 → API 키 입력칸 옆 [설정 변경을 위해 중지] → 키 입력 → [API 키·설정 저장] → [번역 연결 시작]**. 키를 비워 두면 기존 키를 유지합니다. 다른 서버 프로필은 계속 실행됩니다. **지금 갱신 확인**은 번역 API 호출 없이 DB만 확인하며, 바로 아래에 확인 중·최신 여부·실패 결과를 표시합니다.


### 지원 언어

번역 언어는 한국어·영어·일본어·중국어 간체/번체·독일어·프랑스어·스페인어·포르투갈어·러시아어·태국어·베트남어·인도네시아어 13개입니다. 화면 표시와 설명서는 기존 4개 언어를 유지합니다. 기존 항목 1,868개에 추가 9개 언어의 이름 16,802개를 연결했습니다. 테스트 표시가 있는 10개 값은 제외했으며, 없는 이름은 만들어 채우지 않습니다. 신규·미출시 용어는 라이브 적용 확인 후 검토합니다. 프로그램을 이번 버전으로 업데이트한 뒤에는 같은 13개 언어의 이름 추가·수정을 DB 업데이트로 받을 수 있습니다. 새 언어 코드 자체를 추가할 때는 프로그램 업데이트도 필요합니다.

---

## English

[README](README-en.md)

### Current free API recommendation

**As of 2026-10-19 KST**, get a [Google AI Studio API key](https://aistudio.google.com/apikey) and use **Gemini 3.1 Flash-Lite (gemini-3.1-flash-lite)**. The [official pricing page](https://ai.google.dev/gemini-api/docs/pricing) lists a free tier. Use can be free within your account/project eligibility and RPM, TPM and daily quotas. Check billing, model access and [data-use terms](https://ai.google.dev/gemini-api/terms); free does not mean unlimited or permanent. OpenAI API and locally installed Ollama models are alternatives.

### Personal server

The same runner works on your own Oracle/VPS/home server without a UI. Your PC may be off while that server stays online. Its administrator can access saved keys: use your own server and your own key for personal use, rather than collecting other people's credentials.

Download the source and install Node.js 24.17+. The runner needs no Discord dependency installation.

~~~sh
cp .env.runner.example .env.runner
chmod 600 .env.runner
# Set your provider/model/key/limit in .env.runner, then:
node --env-file=.env.runner scripts/discord-runner.mjs pair
node --env-file=.env.runner scripts/discord-runner.mjs start
~~~

Enter the code from /zzz connect when pairing. [HOSTING.md](HOSTING.md) includes a systemd example for startup after reboot. The runner makes outbound HTTPS connections; no inbound web port is needed on your device. Do not run one pairing on two devices simultaneously.

### Database and feedback

- Both PC and server check the [shared database](https://github.com/Odarom/zenless-translation-database) at startup and every **6 hours**, verifying hash/size/format before replacing the cache. Failures retain the last working version. Database updates are separate from program-code updates.
- Chat uses deterministic name/alias matching on the message, reply and recent context, with up to 30 relevant candidates in the same translation call. No separate LLM call selects terms.
- Reply to a translated message with **!report**, then **Start report**, or use its **Apps → Report translation** menu. Read the notice before submitting. The project maintainer privately reviews submitted source, translation and explanation. No GitHub login is needed.
- View local reports with **/zzz-report mine** and **/zzz-report status**. Independently self-hosted bots offer a separate **Share with project maintainer** preview and confirmation before forwarding.
- Exclude credentials, personal information and unrelated conversation. Reports are kept up to 90 days. Only reviewed corrections reach the shared DB; reporting does not call AI or change translations automatically.

Use /zzz api-status to check pairing, /zzz disconnect to revoke it, and /zzz pause or resume for channel groups. Usage is shown in the PC app or with node --env-file=.env.runner scripts/discord-runner.mjs usage. Failed API calls count. A lost broker connection never automatically repeats an already-started translation.

PC UI keys are encrypted locally; the device administrator can decrypt them. Headless installations use a private .env.runner file. Never publish .env files, data/ or .secrets/. Stop before changing settings or replacing program files; preserve private data when updating. To operate your own Discord bot, see [HOSTING.md](HOSTING.md). Legacy API_MODE=server lets the operator decrypt submitted keys: restrict it to personal installations using only your own key. Public brokers use API_MODE=runner.

[Subtitle Studio](https://github.com/Odarom/zenless-subtitle-studio) is separate. This is a fan tool, not an official game service.

### Reopen settings and change your key

On PC, run **Start.cmd** again from the extracted folder. If the program is already running, it reopens that instance’s settings. Keep its process window running to translate, even after closing the browser.

For a personal server, use the [private SSH management UI](HOSTING.md#several-servers-and-private-management-ui) instead of starting a second PC runner. Each time you manage it, establish the SSH tunnel and open the server’s current private management link. 127.0.0.1 refers to the PC you are using; bookmarking that address alone does not provide access from another PC.

To change a key: **select the server profile → Stop to change settings beside the key field → enter the key → Save API key and settings → Start translation**. Leave the key blank to keep it. Other profiles keep running. **Check for updates** checks only the DB, makes no translation API call, and shows progress, current/update status or failure directly below the button.


### Supported languages

Translation supports 13 languages: Korean, English, Japanese, Simplified/Traditional Chinese, German, French, Spanish, Portuguese, Russian, Thai, Vietnamese and Indonesian. Interface text and guides remain in four languages. Another 16,802 localized names extend 1,868 existing concepts across nine additional languages. Ten placeholder values are excluded; missing names are not invented. New/unreleased terms require confirmed live availability before review. After installing this program update, additions and corrections within these 13 languages can arrive through DB updates. Adding a new language code still requires a program update.

---

## 日本語

[README](README-ja.md)

### 現時点の無料APIの推奨

**2026-10-19韓国時間時点**では、[Google AI Studioでキーを発行](https://aistudio.google.com/apikey)し、**Gemini 3.1 Flash-Lite (gemini-3.1-flash-lite)**を推奨します。[公式料金表](https://ai.google.dev/gemini-api/docs/pricing)に無料枠があります。アカウント・プロジェクトの条件とRPM・TPM・日次上限内なら無料利用できます。[データ処理条件](https://ai.google.dev/gemini-api/terms)・課金設定・モデルの利用権限を確認してください。無制限・永続的な無料提供ではありません。OpenAI APIや自分の端末のOllamaも選べます。

### 個人サーバー

自分で管理するOracle・VPS・自宅サーバーで、同じ接続プログラムを画面なしで実行できます。サーバーが動いていればPCを終了しても翻訳できます。サーバー管理者はキーにアクセスできるため、自分のサーバーで自分のキーを使う個人用途とし、他人のキーを収集しないでください。

ソースを取得しNode.js 24.17以上を用意します。接続プログラムだけならDiscordライブラリの導入は不要です。

~~~sh
cp .env.runner.example .env.runner
chmod 600 .env.runner
# .env.runnerに自分のサービス・モデル・キー・上限を設定してから:
node --env-file=.env.runner scripts/discord-runner.mjs pair
node --env-file=.env.runner scripts/discord-runner.mjs start
~~~

pairでは/zzz connectのコードを入力します。再起動後の自動実行は[HOSTING.md](HOSTING.md)のsystemd例を参照してください。外向きHTTPS接続のみで、自分の端末の受信Webポートを開く必要はありません。同じ接続を2台で同時実行しないでください。

### 用語DBと誤訳報告

- PC・サーバーとも、起動時と**6時間ごと**に[共通DB](https://github.com/Odarom/zenless-translation-database)を更新します。サイズ・ハッシュ・形式を確認してから置換し、失敗時は最後の正常なDBを維持します。プログラム本体の更新とは別です。
- チャットでは本文・返信・直近の文脈から名称・別名を検索し、最大30候補を同じ翻訳リクエストに含めます。検索用の追加LLMリクエストはありません。
- 訳文に**!report**と返信し**報告を開始**、または**アプリ → 誤訳を報告**を選択します。案内を確認して送信すると、原文・訳文・説明をプロジェクト管理者が非公開で確認します。GitHubログインは不要です。
- 自分の報告は**/zzz-report mine**と**/zzz-report status**で確認します。独立した自己ホスト版では、ローカル受付後に**プロジェクト管理者にも共有**を選択し、プレビューに同意した場合のみ転送します。
- キー・個人情報・無関係な会話を含めないでください。報告は最大90日保存し、管理者確認後にDBへ反映します。報告だけで自動修正・AI呼び出しはしません。

接続確認は/zzz api-status、解除は/zzz disconnect、グループ停止・再開は/zzz pause・resumeです。使用量はPC画面かnode --env-file=.env.runner scripts/discord-runner.mjs usageで確認します。失敗したAPI呼び出しも含みます。中継接続が切れても開始済みの翻訳を自動で繰り返しません。

PC UIはキーを端末内で暗号化しますが、その端末の管理者は復号できます。画面なしの導入は非公開の.env.runnerを使います。.envファイル・data/・.secrets/を公開しないでください。設定変更・ファイル更新前には停止し、個人設定を保存してください。自分のDiscordボットを運営する場合は[HOSTING.md](HOSTING.md)を参照してください。従来のAPI_MODE=serverは運営者がキーを復号できるため、自分のキーだけを使う個人用途に限ってください。公開中継ボットはAPI_MODE=runnerを使います。

[動画字幕スタジオ](https://github.com/Odarom/zenless-subtitle-studio)は別のプログラムです。ゲーム公式サービスではないファンツールです。

### 設定画面を開き直す・キー変更

PCでは展開先の**Start.cmd**をもう一度実行します。起動済みの場合は同じプログラムの設定画面を再表示します。ブラウザを閉じても翻訳には実行ウィンドウを開いたままにしてください。

個人サーバーの場合はPC版を別起動せず、[SSH管理画面](HOSTING.md#複数サーバーと非公開の管理画面)を使います。管理のたびにSSH接続を開き、サーバーの現在の個人管理リンクを開いてください。127.0.0.1は操作中のPCを指すため、URLのブックマークだけでは別のPCから接続できません。

キー変更：**サーバープロファイル選択 → キー欄付近の［設定変更のため停止］→キー入力→［APIキー・設定を保存］→［翻訳接続を開始］**。空欄なら保存済みキーを保持し、他のプロファイルは動き続けます。**今すぐ更新を確認**は翻訳APIを呼び出さずDBだけを確認し、直下に確認中・最新・更新完了・失敗を表示します。


### 対応言語

翻訳は韓国語・英語・日本語・簡体字/繁体字中国語・ドイツ語・フランス語・スペイン語・ポルトガル語・ロシア語・タイ語・ベトナム語・インドネシア語の13言語に対応します。画面表示と説明書は従来の4言語です。既存1,868概念に追加9言語の名称16,802件を対応付け、テスト用の値10件を除外しました。不明な名称は補作しません。新規・未公開用語は正式実装を確認してから検討します。このプログラム更新後、同じ13言語内の名称追加・修正はDB更新で受け取れます。新しい言語コード自体の追加にはプログラム更新も必要です。

---

## 简体中文

[README](README-zh-CN.md)

### 当前可免费使用的API推荐

**截至韩国时间2026-10-19**，推荐在[Google AI Studio申请密钥](https://aistudio.google.com/apikey)并使用**Gemini 3.1 Flash-Lite (gemini-3.1-flash-lite)**。[官方价格表](https://ai.google.dev/gemini-api/docs/pricing)列有免费层。在账户、项目的适用条件及RPM、TPM、每日配额内可以免费使用。请确认模型权限、结算设置和[数据处理条款](https://ai.google.dev/gemini-api/terms)，免费不等于无限或永久。也可选择OpenAI API或自己设备上的Ollama本地模型。

### 个人服务器

同一连接程序也可在自己管理的Oracle、VPS或家用服务器上无界面运行。服务器保持运行时，个人电脑可以关闭。服务器管理员能够访问保存的密钥，因此请在自己的服务器上仅使用自己的密钥，不用于收集他人密钥。

下载源码并准备Node.js 24.17以上版本。仅运行连接程序时无需安装Discord依赖库。

~~~sh
cp .env.runner.example .env.runner
chmod 600 .env.runner
# 在.env.runner中保存自己的服务、模型、密钥及上限后:
node --env-file=.env.runner scripts/discord-runner.mjs pair
node --env-file=.env.runner scripts/discord-runner.mjs start
~~~

pair时输入/zzz connect的连接码。重启后自动运行请参见[HOSTING.md](HOSTING.md)的systemd示例。程序仅向外建立HTTPS连接，无需为个人电脑或服务器开放入站Web端口。请勿同时在两台设备上使用同一连接。

### 共享数据库与误译举报

- 电脑和服务器均在启动时及**每6小时**自动更新[共享数据库](https://github.com/Odarom/zenless-translation-database)。校验哈希、大小和格式后才替换缓存，失败时保留上次可用版本。数据库更新与程序代码更新不同。
- 聊天通过规则匹配正文、回复和近期上下文中的名称及别名，在同一次翻译请求中附带最多30个相关候选。检索术语不会额外调用LLM。
- 回复译文并发送**!report**，点击**开始举报**，或选择消息菜单的**应用 → 举报误译**。阅读提示后提交原文、译文及说明，由项目维护者私下审核，无需GitHub登录。
- 使用**/zzz-report mine**和**/zzz-report status**查看自己的举报。独立自托管版本会先本地保存，只有选择**也分享给项目维护者**并同意预览后才转发。
- 请勿提交密钥、个人信息或无关完整对话。最多保留90天，经维护者审核后更新共享数据库，不会因举报而自动修改译文或调用AI。

使用/zzz api-status确认连接、/zzz disconnect断开、/zzz pause及resume暂停或恢复分组。用量可在PC界面或运行node --env-file=.env.runner scripts/discord-runner.mjs usage查看，包含失败的API请求。中转连接中断后不会自动重复已启动的翻译。

PC UI会在本机加密保存密钥，但该设备管理员可以解密。无界面部署使用私有.env.runner文件，请限制权限。不要公开.env文件、data/或.secrets/。更改设置或程序文件前请停止运行，并保留个人设置。若想自行运营Discord机器人，请参见[HOSTING.md](HOSTING.md)。旧版API_MODE=server允许运营者解密提交的密钥，仅供自己运营且使用自己密钥的个人用途。公开中转机器人使用API_MODE=runner。

[视频字幕工作室](https://github.com/Odarom/zenless-subtitle-studio)是独立程序。本工具由爱好者制作，并非游戏官方服务。

### 重新打开设置及更换密钥

PC用户从解压目录再次运行**Start.cmd**即可打开设置；若程序已运行，则重新打开同一实例的设置页面。关闭浏览器后，翻译仍需保持程序窗口运行。

个人服务器用户应使用[SSH私有管理界面](HOSTING.md#多个服务器与私有管理界面)，不要另行启动PC连接程序。每次管理时建立SSH隧道并打开服务器当前的私人管理链接。127.0.0.1指当前使用的PC，仅收藏该地址无法从另一台PC访问服务器。

更换密钥：**选择服务器配置 → 密钥输入框旁“停止以修改设置” → 输入密钥 → 保存API密钥及设置 → 启动翻译连接**。密钥留空则保留原密钥，其他配置继续运行。**立即检查更新**仅检查数据库，不调用翻译API；按钮下方显示检查中、已是最新、更新完成或失败。


### 支持的语言

翻译支持韩语、英语、日语、简体/繁体中文、德语、法语、西班牙语、葡萄牙语、俄语、泰语、越南语和印尼语，共13种语言。界面及说明保留原有4种语言。为1,868个既有概念关联额外9种语言的16,802个名称，排除10个测试占位值，不编造缺失名称。新增及未发布术语须确认正式实装后再审核。安装本次程序更新后，同一13种语言内的名称补充和修正可通过DB更新接收；增加新语言代码仍需程序更新。
