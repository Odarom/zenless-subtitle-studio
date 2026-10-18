# 젠레스 Discord 번역 봇

[English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

[이용약관](TERMS.md) · [개인정보 처리방침](PRIVACY.md)

한국어·영어·일본어·중국어 간체 채널을 연결하고 새 메시지를 젠레스 존 제로 용어집과 함께 번역합니다. 두 채널만 연결해도 됩니다. 작성자 닉네임·프로필과 번역 표시를 사용하고, 한 메시지의 대상 언어를 한 AI 요청으로 처리합니다.

이 저장소는 직접 운영할 수 있는 봇 소스입니다. 각 운영자가 본인의 Discord 앱과 토큰으로 실행합니다. Node.js **24.17 이상**과 인터넷 연결이 필요하며, 실행하는 PC나 서버가 켜져 있어야 합니다. 기존 운영 중인 봇은 이 저장소를 공개해도 그대로 실행됩니다.

## 1. 다운로드와 봇 준비

1. GitHub의 **Code → Download ZIP**으로 받아 전체 압축을 풉니다. [Node.js](https://nodejs.org/en/download)를 설치합니다.
2. [Discord Developer Portal](https://discord.com/developers/applications)에서 앱을 만들고 **Application ID**와 **Bot Token**을 준비합니다.
3. Bot 설정에서 **Message Content Intent**를 켭니다.
4. Installation에서 **Guild Install**을 선택하고 `bot`, `applications.commands` 범위를 사용합니다. **채널 보기 / 메시지 보내기 / 메시지 기록 보기 / 웹훅 관리** 권한으로 본인 서버에 초대합니다. 전체 관리자 권한은 필요 없습니다.
5. `.env.example`을 복사해 `.env`로 저장하고 `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID`를 입력합니다. 서버별 API 등록을 쓴다면 번역 API 키와 `DISCORD_GUILD_ID`는 비워 둬도 됩니다. 기존 `.env`를 덮어쓰지 마세요.

## 2. 실행

압축을 푼 폴더에서 실행합니다.

```sh
npm ci --ignore-scripts
npm run check
npm run register
npm start
```

`register`는 최초 설치 또는 명령 변경 때 실행하며 서버 초대 링크도 표시합니다. 이후에는 `npm start`로 켭니다. Windows는 `run.cmd`의 **1번 명령 등록**, **2번 봇 실행**을 사용할 수 있습니다. 종료는 `Ctrl+C`이며 같은 봇을 두 군데에서 동시에 실행하지 마세요. 종료 중 메시지는 나중에 자동 번역되지 않습니다.

## 3. API와 채널 연결

서버 관리자가 `/zzz api-set`에서 Gemini 또는 OpenAI를 고르고 모델·키·하루 요청 한도를 저장합니다. 처음에는 [Google AI Studio 무료 키](https://aistudio.google.com/apikey)와 **Gemini 3.1 Flash-Lite**(`gemini-3.1-flash-lite`)를 추천합니다. 무료 제공 여부·사용량·요금은 API 계정의 [공식 요금표](https://ai.google.dev/gemini-api/docs/pricing)를 확인하세요. 저장만으로 실제 키나 무료 사용 가능 여부를 검증하지는 않습니다.

API 키 입력 창은 실행한 사람에게만 보이지만 입력 글자는 가려지지 않습니다. 키는 봇 PC에서 암호화해 저장하며 운영자는 호출을 위해 복호화할 수 있습니다. 본인이 신뢰하는 운영자에게만 키를 등록하세요. 같은 서비스에서 모델만 바꿀 때 키를 비워 두면 기존 키를 유지합니다.

서버 관리 권한으로 서로 다른 텍스트 채널을 같은 그룹에 연결합니다.

```text
/zzz link group:friends channel:#한국어 language:한국어
/zzz link group:friends channel:#english language:English
```

같은 `group`에 언어별 한 채널씩 추가합니다. 두 번째 채널을 연결한 뒤 새 글부터 번역됩니다. `/zzz status`로 확인하고 `/zzz pause group:friends`, `/zzz resume group:friends`로 중지·재개합니다. `/zzz unlink`는 연결만 해제합니다. API 설정·연결 명령은 서버 관리 권한이 필요합니다.

## 4. 사용과 신고

- 원문을 수정·삭제하면 기록이 남아 있는 연결 번역도 갱신·삭제합니다. 수정에는 추가 번역 요청이 듭니다.
- Discord 전달 메시지의 텍스트도 처리합니다. 이미지·GIF·이모지만 있으면 AI 호출 없이 공유하고, 글이 함께 있으면 글만 번역합니다. 봇에는 이미지 속 글자 번역이 없습니다.
- `/zzz usage`, `/zzz api-status`, `/zzz api-delete`로 요청 수·설정·키 삭제를 관리합니다. 하루 한도는 금액 한도가 아니며 실패 요청도 포함합니다. 한도 오류는 자동 재요청하지 않습니다. Gemini의 일시적 서버 오류는 한 번 재시도할 수 있으며 이 요청도 계산합니다.
- 번역 메시지에 **답장으로 `!신고` 또는 `!report`** → **신고 시작**을 누르세요. 또는 메시지 메뉴 **앱 → 오역 신고**, `/zzz-report submit message:메시지링크`를 사용합니다. 누구나 신고할 수 있습니다.
- `/zzz-report mine`, `/zzz-report status id:접수번호`로 본인의 신고를 확인합니다. 신고 UI는 Discord 언어에 따라 한국어·영어·일본어·중국어로 표시됩니다. 신고는 AI를 호출하거나 용어집을 자동 수정하지 않습니다.

## 로컬 번역과 운영 자료

Ollama도 지원합니다. 별도로 설치하고 `ollama pull qwen3:8b`로 모델을 준비합니다. `.env`에 `TRANSLATION_PROVIDER=ollama`, `DISCORD_GUILD_ID=본인서버ID`, `OLLAMA_MODEL=qwen3:8b`를 지정하고 Ollama와 봇을 함께 실행합니다. 이 기본 설정은 지정 서버에만 적용하며, 해당 서버에서 Discord로 등록한 API 설정이 우선합니다. `/zzz api-delete` 후에는 로컬 설정으로 자동 복귀하지 않습니다. 번역 품질은 선택 모델에 따라 달라집니다.

`glossary/zzz.json`에 4개 언어 용어집을 포함합니다. [공용 데이터베이스](https://github.com/Odarom/zenless-translation-database)와 [갱신 절차](https://github.com/Odarom/zenless-discord-translator/blob/main/glossary/LIFECYCLE.md)를 참고하세요. 용어집 게시만으로 다른 사람이 실행 중인 봇이 자동 갱신되지는 않습니다.

설정·사용량은 `data/`, 암호화 키는 `.secrets/`에 생성됩니다. 업데이트 전 봇을 종료하고 `.env`, `data`, `.secrets`를 비공개로 함께 백업하세요. 코드만 교체한 뒤 라이브러리를 준비하고 재시작합니다. 이 폴더와 실제 신고·토큰을 공개 GitHub에 올리지 마세요. 운영자는 `node scripts/reports-cli.mjs export --status pending`으로 이 설치본의 신고를 내보낼 수 있습니다. 프로젝트 운영자는 영상 신고와 함께 검토하지만, 다른 사람의 별도 설치본 신고가 프로젝트 서버로 자동 전송되지는 않습니다.

연결 채널의 글과 설정한 문맥은 다른 언어 채널로 전달되며, Gemini/OpenAI 사용 시 외부 API가 처리합니다. 원문 대화의 최근 문맥은 메모리에서 제한적으로 사용하고, 오역 신고에는 사용자가 제출한 원문·번역·설명이 최대 90일 저장됩니다. 일반 텍스트 채널을 대상으로 하며 DM·스레드·포럼·음성 번역은 제공하지 않습니다.

명령이 안 보이면 서버의 **애플리케이션 명령어 사용** 권한과 봇 설치를 확인하세요. 번역이 안 되면 봇 실행 상태, Message Content Intent, 네 가지 채널 권한, `/zzz api-status`, `/zzz status` 순서로 확인합니다. [Discord 공식 설정 안내](https://docs.discord.com/developers/quick-start/getting-started), [메시지 접근](https://docs.discord.com/developers/events/gateway#privileged-intents), [권한](https://docs.discord.com/developers/topics/permissions)을 참고하세요.

검사: `npm test`. [영상 자막 작업실](https://github.com/Odarom/zenless-subtitle-studio)은 별도 프로그램입니다. 팬 제작 도구이며 게임 제작사의 공식 봇이 아닙니다.
