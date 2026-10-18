# 통신 구조 · Data flow · 通信の流れ · 通信流程

[한국어](#한국어) · [English](#english) · [日本語](#日本語) · [简体中文](#简体中文)

## 한국어

### 기존 방식

~~~mermaid
flowchart TD
 D["Discord 언어 채널"] -->|"원문과 최근 문맥"| B["운영자 서버의 기존 봇"]
 K["사용자 API 키"] -->|"암호화 저장 · 운영자가 복호화 가능"| B
 G["GitHub 공용 용어집"] -->|"용어집 갱신"| B
 B -->|"원문 + 문맥 + 관련 용어 + 키"| A["선택한 번역 API"]
 A -->|"번역문"| B
 B -->|"번역 메시지"| D
 D -->|"안내 확인 후 신고 제출"| R["비공개 신고 DB"]
 R -->|"관리자 검토 · 확인된 수정"| G
~~~

### 현재 방식

~~~mermaid
flowchart TD
 D["Discord 언어 채널"] -->|"원문과 최근 문맥"| B["공용 중계 봇"]
 B -->|"원문 + 문맥 + 대상 언어"| P["본인 PC 또는 개인 서버"]
 G["GitHub 공용 용어집"] -->|"시작 시 · 6시간마다 검증 후 갱신"| P
 K["사용자 API 키"] -->|"본인 기기에만 보관"| P
 P -->|"원문 + 문맥 + 관련 용어 + 키"| A["선택한 번역 API"]
 A -->|"번역문"| P
 P -->|"번역 결과 · API 키 제외"| B
 B -->|"번역 메시지"| D
 D -->|"안내 확인 후 신고 제출"| R["비공개 신고 DB"]
 R -->|"관리자 검토 · 확인된 수정"| G
~~~

공용 봇은 원문과 번역문을 읽고 중계합니다. 다른 사용자의 API 키는 각자의 연결 프로그램에 보관합니다. 대화 내용을 운영자에게 숨기는 종단간 암호화는 아닙니다. 운영자 자신의 연결 프로그램은 같은 Oracle 서버의 별도 프로세스로 실행할 수 있습니다.

독립 설치 봇의 신고는 별도 미리보기·동의 후 프로젝트 관리자에게 공유합니다. 공용 봇의 신고와 영상 신고는 같은 비공개 검토 흐름으로 관리합니다. 신고만으로 DB를 자동 수정하지 않습니다.

### 영상 번역

~~~mermaid
flowchart TD
 V["유튜브 또는 로컬 영상"] --> L["본인 PC · 음성 인식과 선택형 OCR"]
 G["GitHub 공용 용어집"] --> L
 K["사용자 API 키"] --> L
 L -->|"전체 음성·화면 텍스트 + 기본 전체 용어집 + 본인 키"| A["선택한 번역 API"]
 A -->|"구간 ID와 번역문"| C["로컬 코드 · 원래 시간과 위치에 재결합"]
 C --> O["SRT · VTT · 프로젝트 JSON · 재생 표시"]
 O -->|"안내 확인 후 신고 제출"| R["비공개 신고 DB"]
 R -->|"관리자 검토 · 확인된 수정"| G
~~~

채팅은 관련 용어 후보 최대 30개를 같은 번역 요청에 보냅니다. 영상은 기본 전체 용어집을 보내며 관리용 출처·변경 이력은 제외합니다. 작은 모델은 관련 용어만 직접 선택할 수 있습니다. DeepL은 전체 DB를 로컬 용어 보호에 사용합니다. 모델 입력·출력 한도와 RPM·TPM·일일 한도는 계속 적용됩니다.

---

## English

### Before

~~~mermaid
flowchart TD
 D["Discord language channels"] -->|"Source and recent context"| B["Previous bot on operator server"]
 K["User API key"] -->|"Encrypted storage; operator can decrypt"| B
 G["Shared glossary on GitHub"] -->|"Glossary update"| B
 B -->|"Text + context + relevant terms + key"| A["Selected translation API"]
 A -->|"Translated text"| B
 B -->|"Translated message"| D
 D -->|"User report after notice"| R["Private report database"]
 R -->|"Maintainer review and verified correction"| G
~~~

### Current

~~~mermaid
flowchart TD
 D["Discord language channels"] -->|"Source and recent context"| B["Public broker bot"]
 B -->|"Text + context + target languages"| P["Own PC or personal server"]
 G["Shared glossary on GitHub"] -->|"Verified update at startup and every 6 hours"| P
 K["User API key"] -->|"Stored only on own device"| P
 P -->|"Text + context + relevant terms + key"| A["Selected translation API"]
 A -->|"Translated text"| P
 P -->|"Translation result; no provider key"| B
 B -->|"Translated message"| D
 D -->|"User report after notice"| R["Private report database"]
 R -->|"Maintainer review and verified correction"| G
~~~

The public broker reads and relays source text and results. Other users keep API keys on their own runners. This is not end-to-end encryption that hides conversations from the bot operator. The maintainer may run their own runner as a separate process on the same Oracle host.

Independently operated bots share reports with the project only after a separate preview and consent. Public-bot and video reports join the same private review process. Reporting never automatically changes the DB.

### Video translation

~~~mermaid
flowchart TD
 V["YouTube or local video"] --> L["Own PC: speech and optional OCR"]
 G["Shared glossary on GitHub"] --> L
 K["User API key"] --> L
 L -->|"Full speech/screen text + full glossary by default + own key"| A["Selected translation API"]
 A -->|"Cue IDs and translations"| C["Local code restores original timing and positions"]
 C --> O["SRT; VTT; project JSON; playback overlay"]
 O -->|"User report after notice"| R["Private report database"]
 R -->|"Maintainer review and verified correction"| G
~~~

Chat sends up to 30 relevant glossary candidates in the same translation call. Video sends the full glossary by default, omitting administrative provenance and change history. Smaller models can explicitly select relevant terms only. DeepL uses the complete DB locally for term protection. Model input/output limits and RPM, TPM and daily quotas still apply.

---

## 日本語

### 従来の方式

~~~mermaid
flowchart TD
 D["Discordの言語別チャンネル"] -->|"原文と直近の文脈"| B["運営サーバーの従来ボット"]
 K["利用者のAPIキー"] -->|"暗号化して保存・運営者は復号可能"| B
 G["GitHubの共通用語集"] -->|"用語集の更新"| B
 B -->|"原文・文脈・関連用語・キー"| A["選択した翻訳API"]
 A -->|"翻訳文"| B
 B -->|"翻訳メッセージ"| D
 D -->|"案内を確認して報告"| R["非公開の報告DB"]
 R -->|"管理者の確認・検証済み修正"| G
~~~

### 現在の方式

~~~mermaid
flowchart TD
 D["Discordの言語別チャンネル"] -->|"原文と直近の文脈"| B["公開中継ボット"]
 B -->|"原文・文脈・翻訳先言語"| P["自分のPCまたは個人サーバー"]
 G["GitHubの共通用語集"] -->|"起動時と6時間ごとに検証して更新"| P
 K["利用者のAPIキー"] -->|"自分の端末だけに保存"| P
 P -->|"原文・文脈・関連用語・キー"| A["選択した翻訳API"]
 A -->|"翻訳文"| P
 P -->|"翻訳結果・APIキーは含めない"| B
 B -->|"翻訳メッセージ"| D
 D -->|"案内を確認して報告"| R["非公開の報告DB"]
 R -->|"管理者の確認・検証済み修正"| G
~~~

公開ボットは原文と翻訳結果を読み、中継します。他の利用者のAPIキーは各自の接続プログラムに保存します。ボット運営者に会話を隠すエンドツーエンド暗号化ではありません。運営者自身の接続プログラムは、同じOracle上の別プロセスでも実行できます。

独立ボットからの報告共有には別途プレビューと同意が必要です。公開ボットと動画の報告は同じ非公開の確認手順で管理し、報告だけでDBを自動修正しません。

### 動画の翻訳

~~~mermaid
flowchart TD
 V["YouTubeまたはローカル動画"] --> L["自分のPC・音声認識と任意のOCR"]
 G["GitHubの共通用語集"] --> L
 K["利用者のAPIキー"] --> L
 L -->|"音声と画面の全文・標準で用語集全体・自分のキー"| A["選択した翻訳API"]
 A -->|"字幕IDと翻訳文"| C["ローカルコードで元の時間と位置に結合"]
 C --> O["SRT・VTT・プロジェクトJSON・再生表示"]
 O -->|"案内を確認して報告"| R["非公開の報告DB"]
 R -->|"管理者の確認・検証済み修正"| G
~~~

チャットでは関連候補を最大30件、同じ翻訳リクエストに含めます。動画は標準で用語集全体を送り、管理用の出典・変更履歴を除きます。小型モデルでは関連用語のみを手動選択できます。DeepLはDB全体をローカルの用語保護に使います。モデルの入力・出力上限、RPM・TPM・日次上限は適用されます。

---

## 简体中文

### 旧版方式

~~~mermaid
flowchart TD
 D["Discord多语言频道"] -->|"原文与近期上下文"| B["运营服务器上的旧版机器人"]
 K["用户API密钥"] -->|"加密保存；运营者能够解密"| B
 G["GitHub共享术语表"] -->|"术语表更新"| B
 B -->|"原文、上下文、相关术语与密钥"| A["所选翻译API"]
 A -->|"译文"| B
 B -->|"翻译消息"| D
 D -->|"阅读提示后提交举报"| R["私密举报数据库"]
 R -->|"维护者审核及验证后的修改"| G
~~~

### 当前方式

~~~mermaid
flowchart TD
 D["Discord多语言频道"] -->|"原文与近期上下文"| B["公开中转机器人"]
 B -->|"原文、上下文与目标语言"| P["自己的电脑或个人服务器"]
 G["GitHub共享术语表"] -->|"启动时及每6小时验证后更新"| P
 K["用户API密钥"] -->|"仅保存在自己的设备"| P
 P -->|"原文、上下文、相关术语与密钥"| A["所选翻译API"]
 A -->|"译文"| P
 P -->|"翻译结果；不含API密钥"| B
 B -->|"翻译消息"| D
 D -->|"阅读提示后提交举报"| R["私密举报数据库"]
 R -->|"维护者审核及验证后的修改"| G
~~~

公开机器人能够读取并中转原文和译文。其他用户的API密钥保留在各自的连接程序中。这不是向机器人运营者隐藏聊天内容的端到端加密。维护者自己的连接程序可以作为同一Oracle主机上的独立进程运行。

独立机器人只有经过单独预览和同意才向项目共享举报。公开机器人与视频举报纳入同一私密审核流程，不会仅因提交举报就自动修改数据库。

### 视频翻译

~~~mermaid
flowchart TD
 V["YouTube或本地视频"] --> L["自己的电脑：语音识别及可选OCR"]
 G["GitHub共享术语表"] --> L
 K["用户API密钥"] --> L
 L -->|"全部语音和画面文本、默认完整术语表与自己的密钥"| A["所选翻译API"]
 A -->|"字幕ID和译文"| C["本地代码恢复原有时间与位置"]
 C --> O["SRT、VTT、项目JSON、播放叠加"]
 O -->|"阅读提示后提交举报"| R["私密举报数据库"]
 R -->|"维护者审核及验证后的修改"| G
~~~

聊天在同一次翻译请求中发送最多30个相关术语候选。视频默认发送完整术语表，移除管理用来源和修改历史。小模型可手动选择仅相关术语。DeepL在本地使用完整数据库进行术语保护。模型输入、输出以及RPM、TPM和每日配额仍然适用。
