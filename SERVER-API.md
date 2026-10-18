# 개인용 직접 API 설정 · Private API mode · 個人API設定 · 个人API设置

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

## 한국어

> **개인 설치용 기존 방식(API_MODE=server)에만 해당합니다.** 운영자가 등록 키를 복호화할 수 있으므로 본인이 운영하는 설치에서 자기 키만 사용하세요. 공개 중계 봇(API_MODE=runner)은 키 입력 창을 제공하지 않습니다. 공개 봇에서는 `/zzz connect`로 개인 PC·서버의 연결 프로그램을 연결하고 그 프로그램의 서버 프로필에서 키를 관리합니다. [새 사용 안내](https://github.com/Odarom/zenless-discord-translator)와 [여러 서버·SSH 관리 UI](https://github.com/Odarom/zenless-discord-translator/blob/main/HOSTING.md)를 참고하세요.

서버 관리자가 `/zzz api-set`을 실행하고 Gemini 또는 OpenAI를 선택합니다. 입력 창에서 모델, API 키, 하루 요청 한도를 정하면 **그 서버에만** 적용됩니다. 키가 없어도 봇은 실행되며 기존 채널 연결은 유지됩니다.

1. **모델 선택:** 목록에서 모델을 고릅니다. Gemini는 3.1 Flash-Lite, 3.5 Flash-Lite, 3 Flash (Preview), OpenAI는 GPT-4.1 mini와 GPT-4.1을 제공합니다.
2. **직접 입력:** 목록에 없는 모델은 모델 선택에서 「직접 입력」을 고른 뒤 아래 모델 이름 칸에 정확한 API 모델 ID를 입력합니다. 목록의 모델을 선택한 경우 직접 입력 칸은 사용하지 않습니다.
3. **API 키:** 처음 등록하거나 서비스를 바꿀 때 입력합니다. 같은 서비스의 모델만 변경할 때는 비워 두면 이 서버의 저장된 키를 유지합니다. 키를 다시 표시하거나 입력 칸에 미리 채우지는 않습니다.
4. **하루 최대 요청 횟수:** 기존 값이 있으면 유지하며 필요한 경우 변경합니다. 0은 번역 중지입니다.

같은 서비스를 다시 설정할 때 현재 모델을 기본 선택으로 표시합니다. 목록 밖의 모델도 「직접 입력」에 현재 이름을 채워 유지합니다. 새 Gemini 등록의 기본 선택은 `gemini-3.1-flash-lite`, OpenAI는 `gpt-4.1-mini`입니다. 업데이트만으로 기존 서버의 모델이나 키가 변경되지는 않습니다. 이름 확인 날짜는 2026-10-08이며, 프리셋을 선택해도 API 계정의 접근 권한·무료 사용 여부가 보장되지는 않습니다. Live·음성·이미지 전용 모델은 현재 텍스트 번역 프리셋에 포함하지 않습니다.

| 명령 | 동작 |
|---|---|
| `/zzz api-set` | 키·서비스·모델·하루 요청 한도 등록 또는 교체 |
| `/zzz api-status` | 해당 서버의 설정 확인. 키는 표시하지 않음 |
| `/zzz api-delete` | 해당 서버의 키 삭제와 번역 중지 |
| `/zzz usage` | 해당 서버만의 오늘 요청·토큰 수 확인 |

명령은 **서버 관리** 권한이 있는 사람만 사용할 수 있습니다. 입력 창과 결과 응답은 실행한 사람에게만 표시되고 일반 채팅에 키를 남기지 않습니다. **입력 중인 키 글자는 가려지지 않으므로 화면 공유 중에는 주의하세요.** 창은 10분 뒤 만료되고 봇 재시작 시 다시 열어야 합니다.

저장 후 다음 번역부터 사용합니다. 해당 서버에 진행 중인 번역이 있으면 끝난 다음 변경·삭제가 적용될 수 있습니다. 키 등록 자체로 API를 호출하거나 유효성·무료 한도를 검증하지는 않습니다. 무료 여부와 요금은 API 제공사의 프로젝트 설정에 따릅니다. 하루 요청 한도는 금액 한도가 아닙니다.

서버마다 키·모델·한도·사용량·대기열·대화 문맥을 분리합니다. 키가 없거나 오류가 나도 다른 서버나 운영자의 키로 대신 호출하지 않습니다. 같은 API 프로젝트의 키를 여러 서버에 넣으면 제공사 측 한도·요금은 그 프로젝트에 합산될 수 있습니다.

Gemini의 일시적인 서버 오류(HTTP 500·502·503·504)는 약 1초 뒤 같은 키·모델로 한 번만 재시도합니다. 재시도 역시 하루 요청 한도에 포함됩니다. 시간 초과·사용 한도 초과·잘못된 키·모델 오류는 자동 재시도하지 않습니다. 다른 서비스나 모델로 자동 전환하지 않습니다.

## 키 보관 방식

키는 `data/guild-api.json`에 AES-256-GCM으로 암호화해 저장합니다. 서버 ID를 암호화에 묶어 다른 서버 항목으로 옮긴 암호문은 복호화하지 못합니다. 암호화 키는 `.secrets/api-vault.key`에 별도 보관하고 두 경로 모두 Git에서 제외합니다. 상태 응답과 로그에는 API 키를 표시하지 않습니다.

**봇 운영 컴퓨터는 API 호출을 위해 키를 복호화할 수 있습니다. 운영자에게 키를 맡기는 구조이며 운영자에게까지 숨겨지지는 않습니다.** 입력은 Discord를 거쳐 봇으로 전달됩니다. 봇 전용 키를 쓰고 필요하면 API 제공사에서 폐기하세요. `/zzz api-delete`는 봇의 저장된 키를 지우는 기능이며, 제공사 측 키 폐기나 외부 백업 삭제까지 수행하지는 않습니다.

운영자는 저장 파일과 암호화 키를 접근 제한된 곳에 함께 백업해야 합니다. 암호화 키가 없으면 기존 파일을 새 키로 덮어쓰지 않고 시작에 실패합니다. Windows에서는 파일의 NTFS 접근 권한도 운영자 계정으로 제한하세요. 서버에서 봇을 내보내면 저장된 서버 키와 채널 연결을 정리합니다.

## 운영자의 기존 설정과 여러 서버

`.env`의 `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID`는 봇을 실행하는 운영자만 입력합니다. 이 기존 직접 호출 방식에서 다른 이용자의 API 키를 수집하지 마세요. 공개 사용자는 개인 연결 프로그램에 자기 키를 저장합니다.

`DISCORD_GUILD_ID`는 선택 사항이며 `.env`의 기존 API/로컬 설정을 허용할 운영자 서버를 지정합니다. 이 기본값은 다른 서버에 공유되지 않습니다. Discord에서 등록한 서버 설정이 우선하며 `/zzz api-delete` 후 `.env` 키나 로컬 AI로 자동 복귀하지 않습니다. 운영자가 로컬 기본값을 다시 쓰려면 서버별 설정을 명시적으로 초기화해야 합니다.

`run.cmd`의 **1번**은 전역 `/zzz`와 지정한 테스트 서버의 기존 명령을 갱신합니다. 출력되는 초대 링크로 다른 서버에도 봇을 설치할 수 있습니다. **2번**은 봇 실행이며, 이제 `.env`에 번역 API 키가 없어도 실행할 수 있습니다. 각 서버의 관리자가 API 등록 후 채널을 연결하면 됩니다.

실제 API 키의 유효성·번역 품질과 무료 사용 가능 여부는 해당 계정에서 확인해야 합니다. 저장 성공은 과금 없는 사용 가능 확인을 뜻하지 않습니다.

프리셋 모델 ID는 [Gemini 공식 모델 목록](https://ai.google.dev/gemini-api/docs/models)과 OpenAI Docs의 [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1)에서 확인했습니다.

---

## English

**This page applies only to the legacy personal-installation mode API_MODE=server.** Its operator can decrypt saved keys. Use only your own keys on infrastructure you control. The public broker, API_MODE=runner, does not offer an API-key form: use /zzz connect and manage keys in your personal runner's server profiles. See [current setup](https://github.com/Odarom/zenless-discord-translator) and [multiple profiles/SSH management](https://github.com/Odarom/zenless-discord-translator/blob/main/HOSTING.md#english).

### Register or change a personal setting

A server administrator runs /zzz api-set and chooses Gemini or OpenAI. The provider, model, key and daily limit apply only to that guild. The bot can start without an API key and preserves existing linked channels.

1. Choose a model preset or the custom-model option. For a custom model, enter the exact API model ID; otherwise that field is ignored.
2. Enter a key on first registration or when changing providers. Leave it blank when changing a model with the same provider to retain that guild's saved key. Saved keys are never redisplayed or prefilled.
3. Keep or change the daily request limit; zero stops translation. This is not a spending cap.

The current model is preselected, including custom names. New Gemini settings default to gemini-3.1-flash-lite; OpenAI to gpt-4.1-mini. Updating the app does not automatically change existing keys/models. Preset labels were checked on 2026-10-08 and do not guarantee model access or free use. Live/audio/image-only models are not text presets. Check the [Gemini model list](https://ai.google.dev/gemini-api/docs/models), [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) and [GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1).

| Command | Action |
|---|---|
| /zzz api-set | Save or replace provider, key, model and daily limit |
| /zzz api-status | Show that guild's settings without the key |
| /zzz api-delete | Disable its saved key and stop translation |
| /zzz usage | Show its requests and token usage |

Manage Server permission is required. Forms and replies are visible only to the invoking user, but **characters typed in the Discord modal are not masked**. Avoid screen sharing. Forms expire after 10 minutes and must be reopened after a bot restart. Changes apply to the next translation; an ongoing request may finish first. Saving a key does not call the API, test validity or establish free-tier eligibility. Provider billing/project rules still apply.

Each guild has separate keys, models, local usage, queues and context. Errors never borrow another guild's or operator's key. Different keys from the same provider project may share quotas and billing. Gemini temporary HTTP 500/502/503/504 errors retry once after about one second with the same key/model, counting toward the local limit. Timeouts, quota/authentication/model errors are not automatically retried, and there is no automatic provider/model switch.

### Storage and personal hosting

Keys are AES-256-GCM encrypted in data/guild-api.json, bound to the guild ID. Moving ciphertext to another guild does not make it decryptable there. The decryption key is stored separately in .secrets/api-vault.key; both are excluded from Git. Status and logs omit keys. **The bot host can decrypt them to call providers, so the operator can access them.** Input also passes through Discord. Use a dedicated key and revoke it at the provider when necessary. /zzz api-delete does not revoke it at the provider or erase external backups.

Back up the vault and encryption key privately together. A missing encryption key causes startup to fail without overwriting the vault. Restrict file access, including NTFS permissions on Windows. Removing the bot from a guild cleans its saved key and channel links.

Only the operator configures DISCORD_TOKEN and DISCORD_APPLICATION_ID in .env. Do not collect other users' keys in legacy mode. DISCORD_GUILD_ID optionally selects the operator guild allowed to use .env API/local defaults; these are not shared with other guilds. A Discord setting takes precedence. Deleting it leaves translation disabled instead of falling back to .env or local AI. Explicitly reset the guild setting to restore a private default.

run.cmd option 1 registers global commands and removes matching old test-guild copies; it prints an invitation link. Option 2 starts the bot without requiring an .env translation key. In legacy personal mode, configure your own key before linking channels. Successful storage does not certify API validity, translation quality or free access.

---

## 日本語

**API_MODE=serverという従来の個人導入方式のみの説明です。** 運営者は保存キーを復号できるため、自分が管理する機器で自分のキーだけを使ってください。公開中継のAPI_MODE=runnerはキー入力フォームを提供しません。/zzz connectで個人接続プログラムを接続し、サーバープロファイルでキーを管理します。[現在の使い方](https://github.com/Odarom/zenless-discord-translator)と[複数プロファイル・SSH管理](https://github.com/Odarom/zenless-discord-translator/blob/main/HOSTING.md#日本語)を参照してください。

### 個人設定の登録・変更

サーバー管理者が/zzz api-setからGeminiまたはOpenAIを選びます。サービス・モデル・キー・日次上限はそのDiscordサーバーだけに適用します。キーなしでもボットは起動し、既存の接続チャンネルを維持します。

1. プリセットまたはモデル名の直接入力を選びます。直接入力では正確なAPIモデルIDを指定し、プリセット選択時は直接入力欄を使用しません。
2. 初回登録やサービス変更時にキーを入力します。同じサービスのモデル変更では空欄にすると保存キーを維持します。保存キーの再表示や事前入力はしません。
3. 日次リクエスト上限を維持・変更します。0は翻訳停止であり、金額上限ではありません。

現在のモデルを選択済みで表示し、独自名も保持します。新規Gemini設定の標準はgemini-3.1-flash-lite、OpenAIはgpt-4.1-miniです。更新だけで既存のキーやモデルを変更しません。プリセット名称は2026-10-08確認時点であり、モデル利用権や無料利用を保証しません。Live・音声・画像専用モデルはテキスト翻訳プリセットに含めません。[Geminiモデル一覧](https://ai.google.dev/gemini-api/docs/models)、[GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini)、[GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1)を確認してください。

| コマンド | 動作 |
|---|---|
| /zzz api-set | キー・サービス・モデル・日次上限を登録・置換 |
| /zzz api-status | キーを除いた当該サーバーの設定 |
| /zzz api-delete | 保存キーを無効化し翻訳停止 |
| /zzz usage | そのサーバーの要求数とトークン使用量 |

サーバー管理権限が必要です。フォームと結果は実行者だけに表示されますが、**Discord入力欄のキー文字は伏字ではありません**。画面共有に注意してください。フォームは10分で失効し、ボット再起動後は開き直します。変更は次の翻訳から適用し、進行中の処理は先に完了する場合があります。キー保存だけではAPI呼び出し・有効性・無料枠を確認しません。提供元の課金・プロジェクト条件が適用されます。

キー・モデル・ローカル使用量・待機列・文脈はサーバーごとに分離し、エラー時に別サーバーや運営者のキーで代替しません。同じAPIプロジェクトの別キーは提供元の上限・課金を共有する場合があります。Geminiの一時的なHTTP 500/502/503/504だけ約1秒後に同じキー・モデルで1回再試行し、日次上限に含めます。時間切れ・上限・認証・モデルのエラーは自動再試行せず、サービスやモデルも自動変更しません。

### 保存と個人運営

data/guild-api.jsonにAES-256-GCMで暗号化し、サーバーIDに結び付けます。別サーバーへ移した暗号文はそこで復号できません。復号鍵は.secrets/api-vault.keyに別保存し、両方ともGit対象外です。状態とログにキーを表示しません。**API呼び出しのためボットのホストは復号でき、運営者もアクセスできます。** 入力はDiscordを経由します。専用キーを使用し、必要なら提供元で失効させてください。/zzz api-deleteは提供元での失効や外部バックアップの削除までは行いません。

保存ファイルと暗号鍵は両方を非公開でバックアップします。暗号鍵がないと既存ファイルを上書きせず起動に失敗します。WindowsのNTFS権限も制限してください。ボットがサーバーから削除されるとキーとチャンネル接続を整理します。

.envのDISCORD_TOKENとDISCORD_APPLICATION_IDは運営者だけが設定します。従来方式で他人のキーを集めないでください。任意のDISCORD_GUILD_IDは.envのAPI・ローカル既定値を利用できる運営者サーバーを指定し、他サーバーには共有しません。Discord登録設定が優先です。削除後に.envやローカルAIへ自動復帰せず、既定値の再利用には明示的な初期化が必要です。

run.cmdの1番は全体コマンドを登録し同名の旧テスト登録を整理し、招待リンクを表示します。2番は.envの翻訳キーなしでボットを起動します。個人用の従来方式では自分のキーを設定してチャンネルを接続します。保存成功はキーの有効性・品質・無料利用の確認ではありません。

---

## 简体中文

**本页仅适用于旧版个人安装模式API_MODE=server。** 运营者能够解密保存的密钥，因此只在自己控制的设备使用自己的密钥。公开中转API_MODE=runner不提供API密钥输入表单：请用/zzz connect连接个人程序，在服务器配置中管理密钥。参见[当前指南](https://github.com/Odarom/zenless-discord-translator)及[多配置和SSH管理](https://github.com/Odarom/zenless-discord-translator/blob/main/HOSTING.md#简体中文)。

### 注册或更改个人设置

服务器管理员运行/zzz api-set选择Gemini或OpenAI。服务、模型、密钥和每日上限仅应用于该Discord服务器。没有密钥时机器人仍可启动，并保留已有频道关联。

1. 选择预设模型或手动输入模型。手动输入时填写准确API模型ID；选择预设时不使用手动字段。
2. 初次注册或更换服务时输入密钥。同一服务只更换模型时留空即可保留该服务器的密钥，不会重新显示或预填已存密钥。
3. 保留或修改每日请求次数上限。0表示停止翻译，不是消费金额上限。

当前模型会预先选中，也保留自定义名称。新Gemini设置默认gemini-3.1-flash-lite，OpenAI默认gpt-4.1-mini。程序更新不会自动替换已有密钥或模型。预设名称核对日期为2026-10-08，不保证账户具备模型权限或免费资格；不列入Live、语音或图片专用模型。请查看[Gemini模型列表](https://ai.google.dev/gemini-api/docs/models)、[GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini)和[GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1)。

| 命令 | 功能 |
|---|---|
| /zzz api-set | 注册或替换密钥、服务、模型及每日上限 |
| /zzz api-status | 查看该服务器设置，不显示密钥 |
| /zzz api-delete | 禁用保存密钥并停止翻译 |
| /zzz usage | 查看该服务器的请求数与Token用量 |

需要管理服务器权限。表单与结果仅对执行者显示，但**Discord输入表单中的密钥字符不会遮蔽**，请注意屏幕共享。表单10分钟后失效，机器人重启后需重新打开。新设置从下一次翻译生效，正在执行的请求可能先完成。保存密钥不调用API，也不验证有效性或免费额度；提供商的账户计费和项目规则仍适用。

各服务器分别管理密钥、模型、本地用量、队列与上下文。出错时不借用其他服务器或运营者的密钥。同一API项目的不同密钥可能共享配额与费用。仅Gemini临时HTTP 500/502/503/504错误会在约1秒后用同一密钥和模型重试一次，也计入每日上限。超时、配额、认证、模型错误不自动重试，不自动切换服务或模型。

### 保存方式与个人运营

密钥使用AES-256-GCM加密存于data/guild-api.json，并绑定服务器ID；把密文移到其他服务器条目不能在那里解密。解密密钥单独保存在.secrets/api-vault.key，两者均排除在Git之外。状态和日志不显示密钥。**机器人主机为调用API必须能够解密，因此运营者也能访问。** 输入还会经过Discord。建议用专用密钥，需要时在提供商处撤销。/zzz api-delete不会撤销提供商的密钥或删除外部备份。

请将存储文件与加密密钥一同私下备份。缺少加密密钥时会停止启动，不覆盖原保存文件。限制文件权限，Windows也需限制NTFS权限。机器人被移出服务器时会清理相应密钥与频道关联。

仅运营者在.env中填写DISCORD_TOKEN和DISCORD_APPLICATION_ID，不要用旧模式收集他人密钥。可选DISCORD_GUILD_ID指定允许运营者.env API或本地默认设置的服务器，默认值不共享给其他服务器。Discord注册设置优先；删除后不自动退回.env或本地AI，恢复个人默认设置需明确初始化。

run.cmd选项1注册全局命令并清理同名旧测试服务器命令，显示邀请链接；选项2无需.env翻译密钥即可启动机器人。在旧版个人模式下请先配置自己的密钥再关联频道。保存成功不代表密钥有效、翻译质量或免费资格已验证。
