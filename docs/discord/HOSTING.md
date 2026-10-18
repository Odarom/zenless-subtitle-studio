# 개인 서버 설치 · Personal hosting · 個人サーバー · 个人服务器

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

## 한국어

공용 봇과 개인 번역 연결 프로그램은 별도 프로세스입니다. 일반 사용자는 공용 봇을 설치하고 **개인 연결 프로그램만** 자신의 PC 또는 서버에서 실행합니다. API 키는 그 기기에 저장합니다. 용어집은 시작 시와 6시간마다 갱신하고, 프로그램 코드 갱신은 별도 설치로 수행합니다.

### 개인 서버에서 실행

Node.js 24.17 이상과 프로젝트 소스를 준비합니다. 연결 프로그램 자체에는 Discord 토큰이나 Discord 라이브러리 설치가 필요 없습니다. 아래 복사 명령을 실행한 다음 **pair/start 전에** .env.runner에 본인의 제공사·모델·키·하루 한도를 입력합니다. pair에서 Discord /zzz connect로 받은 코드를 입력하세요.

~~~sh
cp .env.runner.example .env.runner
chmod 600 .env.runner
node --env-file=.env.runner scripts/discord-runner.mjs pair
node --env-file=.env.runner scripts/discord-runner.mjs start
~~~

24시간 실행은 프로세스 관리자를 사용합니다. 다음 systemd 예제에서 사용자, 프로젝트 위치, Node의 절대 경로를 실제 설치에 맞추세요. Node 위치는 command -v node로 확인합니다. 같은 연결을 여러 프로세스에서 동시에 실행하지 마세요. 외부로 HTTPS 접속하므로 개인 기기의 인바운드 웹 포트를 열 필요가 없습니다.

~~~ini
[Unit]
Description=Personal ZZZ translator
After=network-online.target
Wants=network-online.target
[Service]
User=CHANGE_TO_YOUR_USER
WorkingDirectory=/srv/zenless-discord-translator
ExecStart=/usr/bin/node --env-file=/srv/zenless-discord-translator/.env.runner /srv/zenless-discord-translator/scripts/discord-runner.mjs start
Restart=on-failure
RestartSec=10
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
[Install]
WantedBy=multi-user.target
~~~

### 여러 서버와 비공개 관리 화면

PC 화면에서 서버 프로필을 추가하면 연결·제공사·모델·키·하루 한도·사용량이 각각 분리됩니다. 같은 키나 다른 키를 쓸 수 있지만 같은 API 프로젝트의 제공사 한도는 공유될 수 있습니다. 키를 변경할 프로필만 중지 → 저장 → 시작하며 다른 프로필은 계속 실행합니다.

개인 서버에서도 같은 관리 화면을 브라우저 자동 실행 없이 구동할 수 있습니다.

~~~sh
node scripts/runner-ui.mjs --no-open
~~~

프로필 관리자를 쓰려면 systemd 예제의 ExecStart를 이 명령의 절대 경로로 바꾸세요. 마지막에 실행 중으로 저장한 프로필은 관리자가 시작될 때 다시 실행됩니다. **127.0.0.1:4323에만** 연결을 받습니다. 이 포트를 공개하거나 개인 세션 링크를 공개 페이지에 올리지 마세요.

PC에서 SSH 보안 연결을 엽니다.

~~~sh
ssh -N -L 127.0.0.1:14323:127.0.0.1:4323 YOUR_USER@YOUR_SERVER
~~~

별도의 SSH 창에서 개인 설치 폴더의 data/runner-ui/window.json을 읽습니다. 링크에는 API 키와 별개인 관리용 세션 토큰이 있습니다. 링크의 포트 4323을 14323으로 바꿔 PC 브라우저에서 열고, 관리하는 동안 SSH 연결을 유지하세요. 브라우저는 SSH를 통해 본인 서버에 접속하며 API 키는 그 서버에만 저장됩니다. 관리 API는 임의 세션 토큰과 Host/Origin을 검사합니다.

PC UI는 키를 해당 기기에서 암호화합니다. 개인 서버 관리자는 그 설정을 복호화할 수 있으므로 본인이 통제하는 기기에서 사용하세요. Discord나 프로젝트 관리자에게 키를 보내지 마세요. 화면 없는 설치의 .env.runner는 비공개 파일입니다. 코드 교체 시 프로세스를 중지하고 .env.runner·data/·암호화 키를 보존한 뒤 다시 시작합니다. runner.lock과 bot.lock을 다른 기기로 복사하지 마세요.

### 독립 Discord 중계 봇 운영

[Discord Developer Portal](https://discord.com/developers/applications)에서 본인 앱을 만들고 Message Content Intent를 켭니다. Guild Install에 bot·applications.commands 범위와 채널 보기·메시지 보내기·메시지 기록 보기·웹후크 관리 권한을 사용합니다. 전체 관리자 권한은 필요하지 않습니다.

.env.example을 .env로 복사하고 Discord 토큰·Application ID, API_MODE=runner, 본인 HTTPS 주소인 RUNNER_PUBLIC_URL을 설정합니다. npm ci --ignore-scripts → npm run check → npm run register → npm start 순으로 실행합니다. 등록 결과에 본인 앱의 설치 링크가 표시됩니다. 토큰은 비공개로 관리하세요.

중계 봇은 루프백 4322 포트를 사용합니다. HTTPS 역방향 프록시에서 /api/runner/*를 127.0.0.1:4322로 전달합니다. 연결 정보·원문 작업·결과만 중계하고 제공사 키는 각 개인 프로그램에 둡니다. Discord 서버마다 연결 프로그램 하나를 연결합니다. 독립 운영자는 자신의 개인정보 처리방침을 게시하고 Discord·API 업체의 조건을 확인해야 합니다.

PROJECT_REPORT_SHARING=on은 작성자가 별도 미리보기·동의 후 최소화한 신고를 프로젝트 관리자에게 공유하게 합니다. 프로젝트 관리자가 운영하는 공용 봇은 로컬 신고가 이미 관리자에게 도착하므로 off를 사용합니다. 신고는 공개 목록에 표시되거나 자동 반영되지 않습니다.

기존 API_MODE=server는 키를 운영자가 복호화하여 직접 API를 호출합니다. **본인 설치에서 자기 키만 쓰는 개인 용도**로 한정하고 다른 사용자의 키 수집에 사용하지 마세요.

---

## English

The public bot and the personal translator are separate processes. Most users install the public bot and run **only a personal translator**. Provider keys belong on their own PC/server. Glossary updates run at startup and every six hours on either platform; code updates are a separate installation step.

## Personal translator on a server

Install Node.js 24.17+ and download the source. No Discord token or library installation is required for the translator itself. Configure `.env.runner` from `.env.runner.example` with your own provider/key/model, then pair using the code from Discord `/zzz connect`:

~~~sh
chmod 600 .env.runner
node --env-file=.env.runner scripts/discord-runner.mjs pair
node --env-file=.env.runner scripts/discord-runner.mjs start
~~~

Keep it online with a process manager. Example fields must be adapted to your service user, project path and absolute Node executable path (`command -v node`). Never run the same connection in multiple processes. The runner connects outward using HTTPS; it does not need an inbound web port.

~~~ini
[Unit]
Description=Personal ZZZ translator
After=network-online.target
Wants=network-online.target
[Service]
User=CHANGE_TO_YOUR_USER
WorkingDirectory=/srv/zenless-discord-translator
ExecStart=/usr/bin/node --env-file=/srv/zenless-discord-translator/.env.runner /srv/zenless-discord-translator/scripts/discord-runner.mjs start
Restart=on-failure
RestartSec=10
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
[Install]
WantedBy=multi-user.target
~~~

## Several servers and private management UI

The PC UI supports **multiple server profiles**. Each profile has its own pairing, model, provider key, daily quota and usage file. The same key or different keys can be used; provider project quotas may still be shared even across different keys. Stop only the selected profile before replacing its key; other profiles keep running.

The same UI can run on your personal server without launching a browser:

~~~sh
node scripts/runner-ui.mjs --no-open
~~~

Use this command instead of the single-runner command in the service example if you want the profile manager. Profiles last marked running resume when the manager starts. The manager listens **only on 127.0.0.1:4323**. Do not expose that port publicly or put its private session link in a public page.

Open an SSH tunnel from your PC:

~~~sh
ssh -N -L 127.0.0.1:14323:127.0.0.1:4323 YOUR_USER@YOUR_SERVER
~~~

In a separate SSH session, read `data/runner-ui/window.json` in your private installation. Its link contains a local management session token, **not a provider API key**. Replace port 4323 in that link with 14323 and open it on your PC. Keep the SSH tunnel open while managing. The browser talks through SSH to your own server; keys are saved only there. Local UI API access requires a random session token and checks Host/Origin.

PC UI settings are encrypted locally. The private server's administrator can decrypt its own settings, so use it only on infrastructure you control. Do not submit keys to Discord or to the project maintainer. Headless `.env.runner` is a private file and must not be committed. During an update, stop processes, replace code, preserve `.env.runner`, `data/` and local encryption keys, and restart. Do not copy `runner.lock` or `bot.lock` between machines.

## Operate your own Discord broker (advanced)

Create your own application at the [Discord Developer Portal](https://discord.com/developers/applications), enable **Message Content Intent**, and use Guild Install scopes `bot` and `applications.commands` with View Channel, Send Messages, Read Message History and Manage Webhooks. A full Administrator permission is unnecessary.

Copy `.env.example` to `.env`, enter your own Discord token and Application ID, set `API_MODE=runner`, and change `RUNNER_PUBLIC_URL` to your own HTTPS origin. Install Discord dependencies with `npm ci --ignore-scripts`, then run `npm run check`, `npm run register` and `npm start`. Registration prints the installation link for your application. Keep your token private.

The broker listens on loopback port 4322. Configure your HTTPS reverse proxy to send `/api/runner/*` to `127.0.0.1:4322`. The public bot accepts pairing metadata, chat work and results; provider keys stay on personal runners. Connect one runner per guild. Independent operators must publish their own privacy policy and comply with Discord/provider terms.

`PROJECT_REPORT_SHARING=on` offers report authors a separate consent/preview before forwarding a minimized report to the project maintainer. A broker already operated by the project maintainer uses `PROJECT_REPORT_SHARING=off`, since its local reports already reach that maintainer. Reports are not publicly listed or automatically applied.

Legacy `API_MODE=server` directly calls providers and lets the host decrypt submitted keys. Restrict it to a personal installation using **only your own keys**. Do not use it to collect other users' credentials.

---

## 日本語

公開ボットと個人翻訳プログラムは別のプロセスです。通常は公開ボットを導入し、**個人接続プログラムだけ**を自分のPCまたはサーバーで実行します。APIキーはその端末に保存します。用語集は起動時と6時間ごとに更新し、コードの更新は別途行います。

### 個人サーバーでの実行

Node.js 24.17以上とソースを用意します。接続プログラム自体にはDiscordトークンやDiscordライブラリの導入は不要です。下のコピー操作後、**pair/startの前に**.env.runnerに自分のサービス・モデル・キー・日次上限を設定してください。pairではDiscordの/zzz connectで発行したコードを入力します。

~~~sh
cp .env.runner.example .env.runner
chmod 600 .env.runner
node --env-file=.env.runner scripts/discord-runner.mjs pair
node --env-file=.env.runner scripts/discord-runner.mjs start
~~~

常時運転にはプロセス管理ツールを使います。次のsystemd例のユーザー、プロジェクトの場所、Nodeの絶対パスを変更してください。Nodeの場所はcommand -v nodeで確認できます。同じ接続を複数プロセスで同時実行しないでください。外向きHTTPS接続なので、個人端末の受信Webポートを開く必要はありません。

~~~ini
[Unit]
Description=Personal ZZZ translator
After=network-online.target
Wants=network-online.target
[Service]
User=CHANGE_TO_YOUR_USER
WorkingDirectory=/srv/zenless-discord-translator
ExecStart=/usr/bin/node --env-file=/srv/zenless-discord-translator/.env.runner /srv/zenless-discord-translator/scripts/discord-runner.mjs start
Restart=on-failure
RestartSec=10
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
[Install]
WantedBy=multi-user.target
~~~

### 複数サーバーと非公開の管理画面

PC画面のサーバープロファイルごとに、接続・サービス・モデル・キー・日次上限・使用量を分離します。同じキーも別のキーも利用できますが、同じAPIプロジェクトの上限は共有される場合があります。キーを変えるプロファイルだけを停止・保存・開始し、他の接続は維持します。

個人サーバーでもブラウザーを自動起動せず同じ管理画面を実行できます。

~~~sh
node scripts/runner-ui.mjs --no-open
~~~

プロファイル管理を使う場合は、systemd例のExecStartをこのコマンドの絶対パスに置き換えます。実行中として保存されたプロファイルは管理プロセスの起動時に再開します。待受先は**127.0.0.1:4323のみ**です。ポートや個人セッションリンクを公開しないでください。

PCからSSHトンネルを開きます。

~~~sh
ssh -N -L 127.0.0.1:14323:127.0.0.1:4323 YOUR_USER@YOUR_SERVER
~~~

別のSSHセッションで個人インストールのdata/runner-ui/window.jsonを読みます。リンクにはAPIキーとは別の管理セッショントークンがあります。ポート4323を14323に変更し、PCのブラウザーで開きます。管理中はSSH接続を維持してください。キーは自分のサーバーにのみ保存されます。管理APIはランダムなセッショントークンとHost/Originを検査します。

PC UIは端末内でキーを暗号化します。その個人サーバーの管理者は設定を復号できるため、自分が管理する機器で使ってください。Discordやプロジェクト管理者にキーを送らないでください。画面なし導入の.env.runnerも非公開にします。更新時は停止し、コードを置換して.env.runner・data/・暗号鍵を保持し、再起動します。runner.lockやbot.lockを別の機器へコピーしないでください。

### 独立したDiscord中継ボットの運営

[Discord Developer Portal](https://discord.com/developers/applications)で自分のアプリを作成し、Message Content Intentを有効にします。Guild Installではbotとapplications.commandsのスコープ、チャンネル閲覧・送信・履歴閲覧・Webhook管理権限を使用します。Administrator権限は不要です。

.env.exampleを.envへコピーし、自分のDiscordトークン・Application ID、API_MODE=runner、自分のHTTPSオリジンのRUNNER_PUBLIC_URLを設定します。npm ci --ignore-scripts、npm run check、npm run register、npm startの順に実行します。登録時に自分のアプリの導入リンクが表示されます。トークンは非公開で管理してください。

中継ボットはループバック4322で待ち受けます。HTTPSリバースプロキシで/api/runner/*を127.0.0.1:4322へ転送します。接続情報・チャット処理・結果を扱い、提供元のキーは個人プログラムに残します。Discordサーバーごとに1接続を使用してください。独立運営者は自分のプライバシーポリシーを公開し、DiscordとAPI提供元の条件を確認してください。

PROJECT_REPORT_SHARING=onでは、投稿者が別途プレビューと同意を行った場合に限り、必要最小限の報告をプロジェクト管理者へ転送します。プロジェクト管理者自身の公開ボットはローカル報告が直接届くのでoffにします。報告の公開一覧や自動反映はありません。

従来のAPI_MODE=serverは運営者がキーを復号してAPIを直接呼び出します。**自分の設置環境で自分のキーを使う個人用途**に限定し、他人のキーを収集しないでください。

---

## 简体中文

公开机器人与个人翻译程序是独立进程。通常只需安装公开机器人，并在自己的电脑或服务器上运行**个人连接程序**。API密钥保存在该设备上。术语表在启动时及每6小时自动更新，程序代码更新则需另行安装。

### 在个人服务器运行

准备Node.js 24.17以上版本与项目源码。连接程序本身不需要Discord令牌或安装Discord库。执行下方复制操作后，**在pair/start之前**在.env.runner填入自己的服务、模型、密钥与每日上限。pair时输入Discord中/zzz connect生成的代码。

~~~sh
cp .env.runner.example .env.runner
chmod 600 .env.runner
node --env-file=.env.runner scripts/discord-runner.mjs pair
node --env-file=.env.runner scripts/discord-runner.mjs start
~~~

24小时运行请使用进程管理器。请修改以下systemd示例的用户、项目路径和Node绝对路径，后者可用command -v node查询。不要在多个进程中同时使用同一个连接。程序向外建立HTTPS连接，无需开放个人设备的入站Web端口。

~~~ini
[Unit]
Description=Personal ZZZ translator
After=network-online.target
Wants=network-online.target
[Service]
User=CHANGE_TO_YOUR_USER
WorkingDirectory=/srv/zenless-discord-translator
ExecStart=/usr/bin/node --env-file=/srv/zenless-discord-translator/.env.runner /srv/zenless-discord-translator/scripts/discord-runner.mjs start
Restart=on-failure
RestartSec=10
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
[Install]
WantedBy=multi-user.target
~~~

### 多个服务器与私有管理界面

PC界面的每个服务器配置分别保存连接、服务、模型、密钥、每日上限和用量。可使用相同或不同密钥，但同一API项目的提供商配额可能共享。更换密钥时只停止、保存、启动对应配置，其他配置继续运行。

个人服务器也可在不自动打开浏览器的情况下运行同一管理界面。

~~~sh
node scripts/runner-ui.mjs --no-open
~~~

使用配置管理器时，请将systemd示例的ExecStart替换为上述命令的绝对路径。上次保存为运行状态的配置会随管理器启动恢复。仅监听**127.0.0.1:4323**。不要公开该端口或私人会话链接。

从PC建立SSH隧道。

~~~sh
ssh -N -L 127.0.0.1:14323:127.0.0.1:4323 YOUR_USER@YOUR_SERVER
~~~

在另一个SSH会话中读取个人安装目录的data/runner-ui/window.json。链接包含管理会话令牌，与API密钥不同。将端口4323改为14323后在PC浏览器打开，管理期间保持SSH连接。API密钥仅保存在自己的服务器。管理API要求随机会话令牌并检查Host/Origin。

PC UI在设备内加密保存密钥；该个人服务器的管理员能够解密设置，因此只在自己控制的设备上使用。不要把密钥发送给Discord或项目维护者。无界面部署的.env.runner是私密文件，不可提交到仓库。更新时停止进程、替换代码、保留.env.runner、data/和加密密钥，再启动。不要跨设备复制runner.lock或bot.lock。

### 独立运营Discord中转机器人

在[Discord Developer Portal](https://discord.com/developers/applications)创建自己的应用，开启Message Content Intent。Guild Install使用bot与applications.commands范围，以及查看频道、发送消息、读取消息历史、管理Webhook权限，无需完整Administrator权限。

将.env.example复制为.env，填入自己的Discord令牌、Application ID，设API_MODE=runner，并将RUNNER_PUBLIC_URL改为自己的HTTPS源地址。依次运行npm ci --ignore-scripts、npm run check、npm run register和npm start。注册时会显示自己应用的安装链接，请妥善保密令牌。

中转程序监听回环4322端口。配置HTTPS反向代理，将/api/runner/*转发至127.0.0.1:4322。机器人中转连接信息、聊天任务与结果，提供商密钥保留在个人程序。每个Discord服务器配对一个连接程序。独立运营者应发布自己的隐私政策并核对Discord及API服务条款。

PROJECT_REPORT_SHARING=on仅在作者另行预览并同意后，将最小化举报转交项目维护者。项目维护者自己的公开机器人使用off，因为本地举报已直接到达维护者。举报不公开列出，也不会自动应用。

旧版API_MODE=server由运营者解密密钥并直接调用API。仅限**自己部署并使用自己密钥的个人用途**，不要用于收集其他人的密钥。
