# 개인정보 처리방침 · Privacy Policy · プライバシー · 隐私政策

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

## 한국어

시행·최종 수정: 2026-10-19 한국시간 / Effective and updated: 2026-10-19 KST

## 운영 구분

공개 봇·프로젝트 신고 접수 운영자: [Odarom](https://github.com/Odarom/zenless-discord-translator/issues). 공용 중계·비공개 신고 서버는 Oracle Cloud 일본 도쿄 리전을 사용합니다. 각 개인 번역 연결 프로그램과 독립 설치본은 해당 사용자가 관리합니다. 이용자는 PC 또는 본인이 관리하는 외부 서버를 선택합니다.

## API 키

공개 봇(API_MODE=runner)은 번역 API 키를 입력받는 창을 열지 않으며 키를 서버로 전송·보관하는 기능을 사용하지 않습니다. PC UI는 키를 해당 PC에서 AES-256-GCM으로 암호화하고 복호화용 키도 해당 PC에 보관합니다. 개인 서버의 화면 없는 설치는 .env.runner를 사용합니다. **그 개인 기기·서버의 관리자는 키에 접근할 수 있습니다.** 이 구조는 공용 봇 운영 서버로 키를 보내지 않는 방식이며, 기기 관리자도 복호화할 수 없는 암호화를 뜻하지 않습니다. 번역 API 요청에는 사용자가 선택한 제공사로 인증 키가 직접 전달됩니다.

프로젝트 운영자 자신의 API 키는 운영자 개인 연결 프로그램에서 사용할 수 있으며 다른 이용자의 키와는 별개입니다. 개인 설치용 기존 직접 API 모드(API_MODE=server)를 사용하면 그 설치 운영자가 키를 복호화할 수 있습니다. 본인 운영·본인 키의 개인 용도로만 사용하세요.

## 번역 처리와 저장

Discord 메시지는 공용 봇이 읽고 연결된 개인 프로그램으로 전달합니다. 원문, 대상 언어, 설정된 최근 문맥·답장 텍스트가 포함됩니다. 개인 프로그램은 공용 용어집을 내려받고 관련 후보를 골라 원문·문맥과 함께 선택한 API 제공사로 전송합니다. 결과는 공용 봇을 거쳐 연결 채널에 표시됩니다. 공용 봇이 번역할 텍스트를 전혀 볼 수 없는 종단간 암호화 서비스는 아닙니다.

공용 서버는 채널 연결·Discord 서버/채널/메시지 ID, 연결 인증 토큰의 해시, 모델·사용 한도 설정과 번역 버전 해시 등을 보관합니다. 연결 인증 토큰은 번역 API 키와 별개이며 /zzz disconnect 또는 봇 탈퇴로 해제할 수 있습니다. 일반 번역 작업 본문은 메모리에서 처리하고 완료·취소·시간 초과 후 제거합니다. 최근 원문 문맥은 최대 15분 동안 제한적으로 메모리에서 유지하고, 메시지 수정·삭제 추적 ID는 서버당 최대 1,000개를 저장합니다. 개인 프로그램은 사용량과 연결 설정을 보관하며 일반 대화 본문을 로그에 출력하지 않습니다.

API 제공사의 저장·학습·인적 검토·국외 처리 조건은 각 서비스에 따릅니다. Google 무료 구간 등은 입력·출력을 제품 개선에 사용할 수 있으므로 제공사 약관과 계정 설정을 확인하세요. 프로젝트가 별도 모델 학습 기능을 제공하지 않는 것과 제공사의 데이터 처리는 서로 다릅니다.

## 오역 신고

사용자가 안내를 확인하고 제출한 원문·번역문·언어·오류 설명·수정 제안, 모델·용어집/번역 규칙 버전 해시를 최대 90일 보관합니다. 공개 봇에 제출한 신고에는 본인 조회·스팸 제한을 위한 Discord 서버·신고자·메시지 식별자가 포함되며 프로젝트 운영자만 검토합니다. 독립 설치본에서 프로젝트 공유를 선택하면 별도 미리보기와 동의를 받은 뒤 Discord 사용자/서버/채널 ID 및 API 키 설정을 제외한 사본을 HTTPS 접수 서버에 보냅니다. 임의 설치 식별자와 접속 IP의 HMAC 해시를 중복·남용 방지에 사용하며 일반 공개 목록은 제공하지 않습니다. 본문에 직접 쓴 개인정보는 자동으로 모두 제거할 수 없으므로 제출하지 마세요.

보고서는 비공개로 검토하고 필요 시 AI에 대조시킬 수 있습니다. 검토된 일반 용어와 번역 규칙만 공개 DB에 반영하며, 신고 원문·식별자는 공개하지 않습니다. 신고자가 볼 수 있는 상태는 해당 봇의 로컬 검토 상태입니다. 별도 공유 접수번호는 프로젝트 관리자에게 문의할 때 사용할 수 있습니다. 영상 앱의 비공개 신고도 같은 관리자 검토 흐름으로 관리합니다.

## 삭제·보안·문의

신고의 90일 보관 기간이 지나면 정리합니다. 봇이 서버에서 제거되면 해당 서버의 연결·로컬 신고 등을 삭제합니다. 개인 기기의 API 키 삭제·프로그램 제거는 해당 사용자가 수행하며 API 제공사에서의 키 폐기는 별도입니다. 프로젝트에 공유된 신고의 삭제 요청은 접수번호만 넣어 문의하고 원문이나 키를 공개 이슈에 쓰지 마세요. 운영 중단·법령상 의무·사고 대응에 따른 별도 보관이 필요한 경우 적용 근거와 범위를 확인합니다. 접근 권한과 파일 권한을 제한하고 통신에 HTTPS를 사용하지만 보안의 절대적 보장은 하지 않습니다.

---

## English

Effective and updated: 2026-10-19 KST.

Maintainer of the public broker and project report intake: [Odarom](https://github.com/Odarom/zenless-discord-translator/issues). Shared services run on Oracle Cloud in Tokyo, Japan. Personal runners and independent installations are managed by their respective users.

The public runner-mode bot does not open API-key forms or receive/store translation API keys. PC UI keys use local AES-256-GCM encryption with the decryption key kept on that PC. Headless servers use a private .env.runner file. The administrator of that personal device/server can access its keys. Keys go directly from the runner to the selected API provider; this is not encryption that hides a key from its own device administrator. The maintainer may use their own key in their own runner on the same host. Legacy private server mode allows its operator to decrypt submitted keys and is intended only for personal use with their own key.

The broker still reads and relays translation text. It sends the original, target languages and configured recent context/reply to the paired runner. The runner downloads the shared glossary and sends relevant terms plus text/context to the provider, returning results through the bot. This is not end-to-end encrypted messaging. Shared storage includes channel/message/guild identifiers, hashed runner authentication tokens, model/limit metadata and version hashes. Runner tokens are distinct from provider API keys. Revoke them with /zzz disconnect or bot removal. Pending text lives in memory until completion/cancellation/timeout. Recent context is kept in memory for at most 15 minutes; up to 1,000 message tracking IDs per guild are persisted. Personal runners keep settings and usage but do not log ordinary conversation text.

Provider retention, training, human review and cross-border processing depend on the chosen service. Google free-tier inputs/outputs may be used for product improvement; consult provider terms. The project's lack of a model-training feature does not override provider data use.

User-submitted reports include source/translation, language, issue, suggestion and model/glossary/prompt metadata for up to 90 days. Reports submitted to the public bot include Discord identifiers for ownership and abuse prevention and are privately reviewed. Independent bots forward a separate copy only after an explicit preview and consent, omitting Discord user/guild/channel IDs and API-key settings. The HTTPS receiver uses a random installation ID and HMAC-hashed peer/installation values for deduplication and abuse prevention; no public report listing exists. Personal information typed into report text cannot be comprehensively removed automatically. Reports may be compared with AI; only reviewed general terms/rules without personal details reach the public DB. Video reports join the same private review process. Local status commands show the originating bot's review status; a shared receipt identifies a project submission.

Expired reports are pruned after 90 days. Bot removal deletes the guild's local pairing and reports. Users manage local key deletion and provider-side revocation. To request deletion of a shared report, contact the maintainer with its receipt ID; never post the report text or credentials publicly. Any legally required exceptional retention must have its basis and scope identified. Permissions and HTTPS reduce risk but do not guarantee absolute security.

---

## 日本語

施行・最終更新：2026-10-19（韓国時間）。

### 運営の区分

公開中継ボットとプロジェクトの報告受付管理者は[Odarom](https://github.com/Odarom/zenless-discord-translator/issues)です。共通中継・非公開報告サービスはOracle Cloudの日本・東京リージョンで実行します。個人接続プログラムと独立インストールは各ユーザーが管理し、自分のPCまたは自分で管理する外部サーバーを選びます。

### APIキー

公開ボット（API_MODE=runner）はAPIキー入力フォームを開かず、翻訳APIキーを受信・保存する機能を使いません。PC UIは端末内でAES-256-GCMにより暗号化し、復号鍵もそのPCに保存します。画面なしの個人サーバーは.env.runnerを使用します。**その個人端末・サーバーの管理者はキーにアクセスできます。** これは共通ボットにキーを送らない構造であり、端末管理者でも復号できない暗号化ではありません。認証キーは個人プログラムから選択したAPI提供元へ直接渡します。

プロジェクト管理者自身のキーは自分の接続プログラムで使用でき、他の利用者のキーとは別です。従来のAPI_MODE=serverでは、その独立インストールの運営者がキーを復号できます。自分の設置環境で自分のキーを使う個人用途に限定してください。

### 翻訳の処理と保存

公開ボットはDiscordメッセージを読み、原文・翻訳先言語・設定された直近の文脈と返信文を、接続された個人プログラムへ渡します。個人プログラムは共通用語集から関連候補を選び、原文・文脈とともに提供元へ送信します。結果は公開ボットを経由してチャンネルに表示します。ボットが本文を見られないエンドツーエンド暗号化ではありません。

共通サーバーはチャンネル接続、Discordサーバー・チャンネル・メッセージID、接続認証トークンのハッシュ、モデル・使用上限・版のハッシュなどを保存します。接続トークンはAPIキーと別で、/zzz disconnectまたはボット削除により解除できます。通常の翻訳本文はメモリ上で扱い、完了・取消・時間切れ後に取り除きます。直近の原文文脈は最大15分間メモリに保持し、編集・削除追跡用のメッセージIDをサーバーごとに最大1,000件保存します。個人プログラムは設定と使用量を保存し、通常会話の本文をログに出しません。

API提供元の保存・学習・人による確認・国外処理条件は選択したサービスによります。Google無料枠などでは入力・出力を製品改善に使う場合があるため、提供元の規約とアカウント設定を確認してください。このプロジェクトに独自学習機能がないことと、提供元のデータ処理は別です。

### 誤訳報告

案内を確認して投稿した原文・訳文・言語・問題説明・修正案・モデル・用語集/翻訳規則の版ハッシュを最大90日保存します。公開ボットへの報告には、本人照会と不正防止用のDiscordサーバー・報告者・メッセージ識別子が含まれ、プロジェクト管理者が非公開で確認します。独立インストールから共有する場合は別途プレビューと同意を行い、Discordユーザー・サーバー・チャンネルIDとAPIキー設定を除いたコピーをHTTPS受付へ送信します。ランダムなインストールID、および接続IPとインストール値のHMACハッシュを重複・不正防止に利用し、一般公開一覧は提供しません。本文へ直接入力した個人情報はすべて自動除去できないため、記入しないでください。

報告は非公開で確認し、必要に応じてAIで照合することがあります。確認済みの一般用語・翻訳ルールのみ公開DBへ反映し、報告原文や識別子は公開しません。状態コマンドは投稿先ボットのローカル確認状態を表示します。共有受付番号はプロジェクト管理者への問い合わせに使えます。動画アプリの非公開報告も同じ確認の流れで管理します。

### 削除・安全対策・問い合わせ

90日を超えた報告は整理します。ボットがサーバーから削除されると、そのサーバーの接続・ローカル報告を削除します。個人端末のキー削除やアプリ削除はユーザーが行い、提供元でのキー失効は別途必要です。共有報告の削除依頼は受付番号を添えて問い合わせ、原文やキーを公開Issueに書かないでください。法令・事故対応・運営終了などで例外的な保管が必要な場合は根拠と範囲を確認します。アクセス権・ファイル権限とHTTPSでリスクを抑えますが、絶対の安全は保証しません。

---

## 简体中文

生效及最后更新：2026-10-19（韩国时间）。

### 运营范围

公开中转机器人及项目举报接收服务的维护者是[Odarom](https://github.com/Odarom/zenless-discord-translator/issues)。共享中转与私密举报服务运行于Oracle Cloud日本东京区域。个人连接程序和独立安装由各用户管理，用户可选择自己的电脑或自行管理的外部服务器。

### API密钥

公开机器人（API_MODE=runner）不打开API密钥输入表单，也不使用接收或保存翻译API密钥的功能。PC UI在本机使用AES-256-GCM加密，解密密钥也保存在该电脑。个人服务器的无界面安装使用.env.runner。**该个人设备或服务器的管理员可以访问密钥。** 这是避免把密钥传给共享机器人的结构，并不代表设备管理员也无法解密。认证密钥从个人程序直接发送给用户选定的API提供商。

项目维护者可在自己的连接程序中使用自己的密钥，与其他用户的密钥无关。旧版API_MODE=server允许运营该独立安装的人解密保存的密钥，仅限自己运营并使用自己密钥的个人用途。

### 翻译处理与存储

共享机器人读取Discord消息，将原文、目标语言、配置的近期上下文与回复文字交给已配对的个人程序。个人程序下载共享术语表并筛选相关候选，与原文及上下文一并提交给提供商。结果通过共享机器人显示到关联频道。这不是让机器人完全看不到翻译本文的端到端加密服务。

共享服务器保存频道连接、Discord服务器/频道/消息ID、连接认证令牌的哈希、模型及用量上限和版本哈希等。连接令牌不同于翻译API密钥，可用/zzz disconnect或移除机器人解除。普通翻译任务本文仅在内存中处理，完成、取消或超时后清除。近期原文上下文最多在内存中保留15分钟，每个Discord服务器最多持久保存1,000条用于编辑/删除跟踪的消息ID。个人程序保存设置与用量，不把普通聊天本文写入日志。

API提供商的存储、训练、人工审查和跨境处理取决于所选服务。Google免费层等可能将输入、输出用于产品改进，请核对提供商条款及账户设置。本项目没有另设模型训练功能，不等于能替代提供商的数据使用规则。

### 误译举报

用户阅读提示后提交的原文、译文、语言、问题说明、修改建议及模型、术语表/翻译规则版本哈希最多保存90天。提交给公开机器人的举报包含用于本人查询和防滥用的Discord服务器、举报者、消息标识，由项目维护者私下审核。独立安装选择项目共享时，另行预览和同意后才通过HTTPS发送副本，移除Discord用户/服务器/频道ID与API密钥设置。接收端用随机安装ID以及连接IP、安装值的HMAC哈希进行去重及防滥用，不提供公开列表。用户直接写在本文中的个人信息无法全部自动删除，请勿填写。

举报私下审核，必要时可能使用AI辅助比对。只有经审核的一般术语与翻译规则进入公开数据库，不公开举报原文或标识。状态命令显示提交目标机器人的本地审核状态；共享接收编号可用于向项目维护者查询。视频程序的私密举报也纳入同一审核流程。

### 删除、安全与联系

超过90天的举报会清理。机器人被移出Discord服务器后，删除该服务器的连接与本地举报。个人设备上的密钥及程序由用户自行删除，提供商侧撤销密钥需另外操作。申请删除已共享举报时，请仅提供接收编号联系维护者，不要在公开Issue贴原文或密钥。如法律义务、事故响应或停运需要例外保留，应确认依据与范围。限制访问及文件权限并使用HTTPS可以降低风险，但不保证绝对安全。
