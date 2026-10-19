# ZZZ Discord Translator

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

## 한국어

### 설정 화면 다시 열기 · 키 변경

PC에서는 압축을 풀었던 폴더의 **Start.cmd**를 다시 실행하면 설정 화면이 열립니다. 이미 실행 중이면 같은 프로그램의 화면만 다시 엽니다. 브라우저 창을 닫아도 실행 창은 켜 두어야 번역됩니다.

개인 서버에서 돌린다면 PC용 Start.cmd 대신 [HOSTING.md의 SSH 관리 화면](HOSTING.md#several-servers-and-private-management-ui)을 사용합니다. 관리할 때마다 SSH 연결을 열고 서버의 현재 개인 관리 링크를 여세요. 주소의 127.0.0.1은 지금 쓰는 PC를 뜻하므로 서버용 주소만 북마크하면 다른 PC에서는 열리지 않습니다.

키 변경: **서버 프로필 선택 → API 키 입력칸 옆 [설정 변경을 위해 중지] → 키 입력 → [API 키·설정 저장] → [번역 연결 시작]**. 키를 비워 두면 기존 키를 유지합니다. 다른 서버 프로필은 계속 실행됩니다. **지금 갱신 확인**은 번역 API 호출 없이 DB만 확인하며, 바로 아래에 확인 중·최신 여부·실패 결과를 표시합니다.

[봇 설치](https://discord.com/oauth2/authorize?client_id=1557261995215028254) · [한국어 사용법](README-ko.md) · [PC 프로그램](https://github.com/Odarom/zenless-discord-translator/releases/latest)

개인 PC·서버에 API 키를 보관하는 Discord 채널 번역기입니다. 여러 서버의 프로필과 공용 용어집, 비공개 신고를 지원합니다. [서버 설치](HOSTING.md#한국어) · [통신 구조](ARCHITECTURE.md#한국어) · [이용약관](TERMS.md#한국어) · [개인정보](PRIVACY.md#한국어).

---

## English

### Reopen settings and change your key

On PC, run **Start.cmd** again from the extracted folder. If the program is already running, it reopens that instance’s settings. Keep its process window running to translate, even after closing the browser.

For a personal server, use the [private SSH management UI](HOSTING.md#several-servers-and-private-management-ui) instead of starting a second PC runner. Each time you manage it, establish the SSH tunnel and open the server’s current private management link. 127.0.0.1 refers to the PC you are using; bookmarking that address alone does not provide access from another PC.

To change a key: **select the server profile → Stop to change settings beside the key field → enter the key → Save API key and settings → Start translation**. Leave the key blank to keep it. Other profiles keep running. **Check for updates** checks only the DB, makes no translation API call, and shows progress, current/update status or failure directly below the button.

[Install bot](https://discord.com/oauth2/authorize?client_id=1557261995215028254) · [English guide](README-en.md) · [PC runner](https://github.com/Odarom/zenless-discord-translator/releases/latest)

Translate linked Discord channels while keeping your API key on your own PC/server. Supports multiple server profiles, the shared glossary and private reports. [Hosting](HOSTING.md#english) · [Data flow](ARCHITECTURE.md#english) · [Terms](TERMS.md#english) · [Privacy](PRIVACY.md#english).

---

## 日本語

### 設定画面を開き直す・キー変更

PCでは展開先の**Start.cmd**をもう一度実行します。起動済みの場合は同じプログラムの設定画面を再表示します。ブラウザを閉じても翻訳には実行ウィンドウを開いたままにしてください。

個人サーバーの場合はPC版を別起動せず、[SSH管理画面](HOSTING.md#several-servers-and-private-management-ui)を使います。管理のたびにSSH接続を開き、サーバーの現在の個人管理リンクを開いてください。127.0.0.1は操作中のPCを指すため、URLのブックマークだけでは別のPCから接続できません。

キー変更：**サーバープロファイル選択 → キー欄付近の［設定変更のため停止］→キー入力→［APIキー・設定を保存］→［翻訳接続を開始］**。空欄なら保存済みキーを保持し、他のプロファイルは動き続けます。**今すぐ更新を確認**は翻訳APIを呼び出さずDBだけを確認し、直下に確認中・最新・更新完了・失敗を表示します。

[ボットを導入](https://discord.com/oauth2/authorize?client_id=1557261995215028254) · [日本語の使い方](README-ja.md) · [PCプログラム](https://github.com/Odarom/zenless-discord-translator/releases/latest)

APIキーを自分のPC・サーバーに保存してDiscordの接続チャンネルを翻訳します。複数サーバーのプロファイル、共通用語集、非公開の報告に対応します。[サーバー導入](HOSTING.md#日本語) · [通信の流れ](ARCHITECTURE.md#日本語) · [利用規約](TERMS.md#日本語) · [プライバシー](PRIVACY.md#日本語)。

---

## 简体中文

### 重新打开设置及更换密钥

PC用户从解压目录再次运行**Start.cmd**即可打开设置；若程序已运行，则重新打开同一实例的设置页面。关闭浏览器后，翻译仍需保持程序窗口运行。

个人服务器用户应使用[SSH私有管理界面](HOSTING.md#several-servers-and-private-management-ui)，不要另行启动PC连接程序。每次管理时建立SSH隧道并打开服务器当前的私人管理链接。127.0.0.1指当前使用的PC，仅收藏该地址无法从另一台PC访问服务器。

更换密钥：**选择服务器配置 → 密钥输入框旁“停止以修改设置” → 输入密钥 → 保存API密钥及设置 → 启动翻译连接**。密钥留空则保留原密钥，其他配置继续运行。**立即检查更新**仅检查数据库，不调用翻译API；按钮下方显示检查中、已是最新、更新完成或失败。

[安装机器人](https://discord.com/oauth2/authorize?client_id=1557261995215028254) · [简体中文指南](README-zh-CN.md) · [PC程序](https://github.com/Odarom/zenless-discord-translator/releases/latest)

API密钥保存在自己的电脑或服务器，机器人翻译关联的Discord频道。支持多个服务器配置、共享术语表及私密举报。[服务器安装](HOSTING.md#简体中文) · [通信流程](ARCHITECTURE.md#简体中文) · [使用条款](TERMS.md#简体中文) · [隐私政策](PRIVACY.md#简体中文)。


## 2026-10-19 · 13 languages

### 한국어

번역 언어는 한국어·영어·일본어·중국어 간체/번체·독일어·프랑스어·스페인어·포르투갈어·러시아어·태국어·베트남어·인도네시아어 13개입니다. 화면 표시와 설명서는 기존 4개 언어를 유지합니다. 기존 항목 1,868개에 추가 9개 언어의 이름 16,802개를 연결했습니다. 테스트 표시가 있는 10개 값은 제외했으며, 없는 이름은 만들어 채우지 않습니다. 신규·미출시 용어는 라이브 적용 확인 후 검토합니다. 프로그램을 이번 버전으로 업데이트한 뒤에는 같은 13개 언어의 이름 추가·수정을 DB 업데이트로 받을 수 있습니다. 새 언어 코드 자체를 추가할 때는 프로그램 업데이트도 필요합니다.

### English

Translation supports 13 languages: Korean, English, Japanese, Simplified/Traditional Chinese, German, French, Spanish, Portuguese, Russian, Thai, Vietnamese and Indonesian. Interface text and guides remain in four languages. Another 16,802 localized names extend 1,868 existing concepts across nine additional languages. Ten placeholder values are excluded; missing names are not invented. New/unreleased terms require confirmed live availability before review. After installing this program update, additions and corrections within these 13 languages can arrive through DB updates. Adding a new language code still requires a program update.

### 日本語

翻訳は韓国語・英語・日本語・簡体字/繁体字中国語・ドイツ語・フランス語・スペイン語・ポルトガル語・ロシア語・タイ語・ベトナム語・インドネシア語の13言語に対応します。画面表示と説明書は従来の4言語です。既存1,868概念に追加9言語の名称16,802件を対応付け、テスト用の値10件を除外しました。不明な名称は補作しません。新規・未公開用語は正式実装を確認してから検討します。このプログラム更新後、同じ13言語内の名称追加・修正はDB更新で受け取れます。新しい言語コード自体の追加にはプログラム更新も必要です。

### 简体中文

翻译支持韩语、英语、日语、简体/繁体中文、德语、法语、西班牙语、葡萄牙语、俄语、泰语、越南语和印尼语，共13种语言。界面及说明保留原有4种语言。为1,868个既有概念关联额外9种语言的16,802个名称，排除10个测试占位值，不编造缺失名称。新增及未发布术语须确认正式实装后再审核。安装本次程序更新后，同一13种语言内的名称补充和修正可通过DB更新接收；增加新语言代码仍需程序更新。
