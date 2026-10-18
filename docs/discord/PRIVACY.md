# 개인정보 처리방침 / Privacy Policy

시행일 / Effective date: 2026-10-19

## 한국어

**운영 및 개인정보 문의 담당:** [Odarom](https://github.com/Odarom). 이 방침은 운영자의 젠레스 Discord 번역 봇과 같은 검토 절차로 접수하는 영상 번역기 신고를 설명합니다. 공개 소스의 다른 설치본은 해당 운영자에게 문의해야 합니다.

### 처리 항목·목적·보관

| 항목 | 처리 목적과 보관 방식 |
|---|---|
| 연결된 메시지 본문, 답장·전달 내용과 최근 문맥 | 문장 번역 및 다른 언어 채널로 전달. 일반 대화 본문은 봇 상태 파일에 저장하지 않습니다. 최근 문맥은 메모리에서 15분 이내, 설정한 개수만 사용하며 재시작·연결 변경 시 정리합니다. |
| 닉네임·프로필 이미지 주소, Discord 서버·채널·메시지·사용자 식별자 | 작성자 표시, 연결 설정, 수정·삭제 반영과 권한 확인. 메시지 연결 기록은 서버별 최근 원문 1,000개로 제한합니다. 연결 설정·사용량·일부 식별 기록은 연결 운영 및 관리에 필요한 동안 보관하며 삭제 요청을 처리합니다. |
| 업로드 이미지·GIF와 첨부 주소 | 연결 채널에 공유합니다. 파일은 제한된 메모리에서 전달하고 봇의 영구 파일로 저장하지 않습니다. 공유본은 Discord에 남을 수 있습니다. |
| 관리자가 등록한 API 키·모델·한도 | 선택한 API 호출과 사용량 제한. 키는 별도 암호화 키를 사용하는 AES-256-GCM으로 보관하며 운영자가 호출을 위해 복호화할 수 있습니다. `/zzz api-delete` 또는 서버에서 봇 제거 시 저장된 서버별 설정을 정리합니다. |
| Discord 오역 신고 | 원문·번역문·설명·수정 제안·관련 메시지/서버/신고자 ID·모델/용어집 버전·처리 상태를 검토하기 위해 운영 서버에 최대 90일 보관합니다. |
| 영상 앱에서 직접 보낸 신고 | 선택한 구간의 원문·번역·설명·제안·시간·종류·모델/용어집 정보, 선택적으로 포함한 영상 URL을 운영 서버에 최대 90일 보관합니다. API 키·로컬 경로·영상 파일·화면 이미지는 신고에 포함하지 않습니다. 임의 설치 식별자와 접속 IP는 남용 방지용 키 해시로 최대 90일 보관합니다. 접속 과정에서 서버는 통신에 필요한 IP를 일시 처리합니다. |

현재 봇 및 영상 신고 접수 서버는 일본 도쿄의 Oracle Cloud에서 운영하고, 운영자는 별도 검토 환경에서 자료를 확인합니다. 신고 내보내기 자료와 복구용 비공개 백업은 검토·복구 목적에 필요한 동안만 보관하고 불필요해지면 삭제합니다. 삭제 요청을 받으면 운영자가 보유한 사본도 함께 확인합니다. 서버의 자동 정리만으로 Discord나 외부 제공자에 있는 사본까지 삭제되지는 않습니다.

### 전달 대상과 외부 AI

연결 채널의 글·이미지와 번역 결과는 같은 그룹의 다른 언어 채널 참여자에게 전달됩니다. Discord 자체의 처리에는 [Discord 개인정보 정책](https://discord.com/privacy)이 적용됩니다.

서버에서 Gemini 또는 OpenAI를 선택하면 번역할 글·설정된 문맥·관련 용어가 해당 제공자 API로 전송됩니다. 국외 처리가 발생할 수 있으며 처리 위치·보관·계정 유형별 조건은 제공자 정책을 따릅니다. 무료 Gemini는 입력·출력을 제품 개선 및 사람의 검토에 사용할 수 있으므로 개인정보·민감정보·기밀을 보내지 마세요. [Google API 약관](https://ai.google.dev/gemini-api/terms), [Google 개인정보 정책](https://policies.google.com/privacy), [OpenAI 개인정보 정책](https://openai.com/policies/privacy-policy/)을 참고하세요. Ollama를 선택한 경우 번역은 봇 운영 환경의 로컬 모델에서 수행합니다.

운영자는 오역 신고를 검토하기 위해 필요한 자료를 ChatGPT/Codex 등 AI 검토 서비스에 제공할 수 있습니다. 신고 내용은 판매하거나 광고 표적화에 사용하지 않습니다. 확인된 용어·번역 규칙은 공용 용어집에 반영할 수 있지만, 비공개 신고 원문과 신고자 식별자를 공개 GitHub에 게시하지 않습니다. 영상 앱의 일반 영상·음성 인식은 이용자 PC에서 수행하며 운영자는 신고로 직접 전송한 정보만 접수합니다.

이 정책 문서를 열거나 GitHub에 문의할 때는 [GitHub 개인정보 정책](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)도 적용됩니다. 운영자가 별도 광고 추적 도구를 이 봇에 넣지는 않습니다.

### 접근 보호와 이용자 권리

API 키는 암호화하고 실행 자료는 공개 저장소에서 제외합니다. 신고 목록·운영 도구는 운영자 접근으로 제한합니다. Discord 이용자는 본인 신고를 조회할 수 있고, 서버 관리자는 해당 서버의 신고 상태를 확인할 수 있습니다. 영상 신고에는 공개 목록 조회 기능이 없습니다.

이용자는 자신의 정보에 대한 열람·정정·삭제·처리 중지를 요청할 수 있습니다. 서버 관리자는 번역을 일시 중지하거나 채널을 해제하고 API 설정을 삭제할 수 있습니다. 운영자에게 요청하려면 [GitHub 문의 창구](https://github.com/Odarom/zenless-discord-translator/issues/new)에 **개인정보 없이 비공개 연락 방법을 먼저 요청**하세요. 비공개 채널을 정한 뒤 접수 번호 등 최소 정보로 본인 여부와 요청 범위를 확인합니다. 토큰·키·신분증·비공개 대화는 공개 이슈에 올리지 마세요. 제공자 계정의 키 폐기 및 Discord 메시지 삭제는 해당 서비스에서도 별도로 진행해야 할 수 있습니다.

방침 변경은 시행일과 저장소 변경 이력으로 안내합니다. 중요한 처리 목적·항목의 변경은 이용 전에 별도로 알립니다.

## English

**Operator and privacy contact:** [Odarom](https://github.com/Odarom). This policy covers the operator’s Discord bot and the related private video-feedback queue. Independently hosted copies have their own operators.

The bot processes linked message text, reply/forward context, display names, avatar URLs, Discord IDs, attachments, channel configuration and usage counters to translate, relay and synchronize messages. Normal conversation bodies are not saved in bot state files. Recent context is limited in memory to 15 minutes and the configured count; restart or connection changes clear it. Message mapping is limited to 1,000 recent source messages per server. Configuration, usage and relevant identifiers remain as needed for operation and are subject to deletion requests. Shared images pass through bounded memory rather than permanent bot files; copies may remain on Discord.

Per-server API keys are encrypted with AES-256-GCM and a separate key. The operator can decrypt them for API requests. `/zzz api-delete` or removing the bot clears the stored per-server settings.

Discord feedback stores submitted source/translation/explanation, suggestions, reporter/message/server IDs, model/glossary information and review status for up to 90 days. Video feedback stores the selected cue’s text, explanation, suggestion, timing/type, model/glossary information and optional video URL for up to 90 days. It excludes API keys, local paths, video files and frame images. Keyed hashes of random installation IDs and connection IPs support abuse prevention for up to 90 days; IPs are also processed transiently for network communication.

The bot and video-feedback receiver run on Oracle Cloud in Tokyo, Japan. The operator reviews material in a separate environment. Private review exports and recovery backups are kept only as needed and removed when no longer necessary. Deletion requests include checking operator-held copies. Automatic server cleanup does not delete copies held by Discord or external providers.

Linked messages and shared media are delivered to other language channels in the group. Gemini/OpenAI mode sends selected text, context and relevant terms to that API provider, potentially across borders. Provider retention/location conditions apply. Free Gemini may use inputs/outputs for improvement and human review; do not submit personal, sensitive or confidential information. Ollama mode processes translations locally in the bot operator’s environment.

The operator may submit report material to AI review services such as ChatGPT/Codex. Reports are not sold or used for targeted advertising. Verified terms/rules may enter the shared glossary; private reports and reporter identifiers are not published on GitHub. Normal video/speech recognition runs on the video-app user’s PC; the operator receives only explicitly submitted reports.

See [Discord](https://discord.com/privacy), [Google API terms](https://ai.google.dev/gemini-api/terms), [Google privacy](https://policies.google.com/privacy), [OpenAI privacy](https://openai.com/policies/privacy-policy/) and [GitHub privacy](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) for their processing. The bot has no operator-added advertising trackers.

Users may request access, correction, deletion or restriction. For privacy requests, first ask for a private contact method through [GitHub](https://github.com/Odarom/zenless-discord-translator/issues/new) **without posting personal information**. Confirm the private channel before supplying a receipt or other minimum verification details. Never post credentials, identity documents or private conversations publicly. Provider-key revocation and Discord message deletion may require separate action with those services.

Changes appear in this document’s effective date and repository history; material changes to processing will be communicated before use.
