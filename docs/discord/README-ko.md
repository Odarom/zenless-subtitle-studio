# 젠레스 Discord 번역기

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

## [➕ 내 Discord 서버에 번역기 추가](https://discord.com/oauth2/authorize?client_id=1557261995215028254&scope=bot%20applications.commands&permissions=536939520&integration_type=0)

Odarom이 운영하는 **zzz translator**를 초대해 사용하세요. 프로그램 설치나 별도 서버 운영 없이 Discord에서 설정하면 됩니다. 한국어·영어·일본어·중국어 간체 채널의 새 메시지를 젠레스 존 제로 용어집과 함께 번역합니다.

[이용약관](TERMS.md) · [개인정보 처리방침](PRIVACY.md)

## 시작하기

1. 위 **번역기 추가**를 누르고 관리하는 서버를 선택합니다. 채널 보기·메시지 보내기·메시지 기록 보기·웹훅 관리 권한을 허용합니다.
2. 서버 관리자가 `/zzz api-set`으로 **자기 서버에서 사용할 번역 API 키·모델·하루 요청 한도**를 등록합니다. Gemini 또는 OpenAI를 지원합니다.
3. 언어별 텍스트 채널 두 개 이상을 같은 그룹으로 연결합니다.

```text
/zzz link group:friends channel:#한국어 language:한국어
/zzz link group:friends channel:#english language:English
```

두 번째 채널을 연결한 뒤 새 메시지부터 번역됩니다. 같은 그룹에는 언어별 한 채널씩 연결할 수 있습니다. API·채널 설정에는 **서버 관리** 권한이 필요합니다.

## 무료 API 추천 — 2026년 10월 19일(한국 시간) 기준

**현시점에서 무료로 사용할 수 있는 번역 API로 Gemini 3.1 Flash-Lite를 추천합니다.** [Google AI Studio에서 무료 API 키를 발급](https://aistudio.google.com/apikey)받고 모델을 `gemini-3.1-flash-lite`로 설정하세요. **무료 등급 한도 안에서 사용하면 번역기를 무료로 이용할 수 있습니다.** 무료 등급에도 요청 수·토큰 사용량 한도가 있으며, 이후 제공 정책은 바뀔 수 있습니다. 최신 조건은 [Google 공식 무료 한도·요금 안내](https://ai.google.dev/gemini-api/docs/pricing)를 확인하세요. 유료 서비스를 선택한 경우 해당 서버가 등록한 키의 계정에 요금이 발생합니다.

**API 키는 운영 서버에 암호화해 저장하며 API 호출을 위해 복호화될 수 있습니다. 서버 접근 권한이 있는 운영자는 키에 접근할 수 있습니다.** 입력 창은 실행자에게만 보이며 입력 문자는 가려지지 않습니다. 자세한 처리 방식은 개인정보 처리방침을 확인하세요.

## 명령과 사용법

| 명령 | 기능 |
|---|---|
| `/zzz status` | 채널 연결 확인 |
| `/zzz pause group:friends` · `/zzz resume group:friends` | 번역 중지·재개 |
| `/zzz unlink` | 선택한 채널 연결 해제 |
| `/zzz usage` · `/zzz api-status` | API 사용량·설정 확인 |
| `/zzz api-delete` | 서버의 저장된 API 설정 삭제·사용 중지 |

한 메시지의 대상 언어를 한 AI 요청으로 번역합니다. 기록이 남아 있는 원문을 수정·삭제하면 연결된 번역에도 반영하며 수정은 추가 요청을 사용합니다. 이미지·GIF·이모지만 있으면 AI 호출 없이 공유합니다. 이미지 속 글자, DM·스레드·포럼·음성은 번역하지 않습니다.

요청 한도 오류는 자동 재요청하지 않습니다. 일시적인 Gemini 서버 오류는 한 번 재시도할 수 있습니다. 실패·재시도도 요청 수에 포함되며 하루 요청 한도는 결제 금액 상한이 아닙니다.

## 오역 신고

번역 메시지에 **답장으로 `!신고` 또는 `!report`**를 보내고 **신고 시작**을 누르세요. 메시지 메뉴 **앱 → 오역 신고**, `/zzz-report submit message:메시지링크`도 사용할 수 있습니다.

`/zzz-report mine`과 `/zzz-report status id:접수번호`에서 본인의 신고를 확인할 수 있습니다. GitHub에 글을 쓸 필요가 없습니다. 신고는 운영자에게 비공개로 접수되고 영상 번역기 신고와 함께 검토합니다. **검토한 수정만 [공용 번역 데이터베이스](https://github.com/Odarom/zenless-translation-database)에 반영합니다.** 일반 대화 전체를 데이터베이스에 자동 수집하지 않습니다. 신고는 최대 90일 보관합니다.

## 업데이트와 문제 해결

운영자가 봇과 용어집을 갱신하므로 이용자는 파일을 내려받거나 서버를 재시작할 필요가 없습니다. 연결된 채널 참여자에게 다른 채널로 글이 전달되고 외부 AI가 처리한다는 점을 먼저 알려주세요. 무료 Gemini 이용 시 입력·출력의 제품 개선 사용 여부와 성인 이용 조건은 제공자의 약관을 확인하세요.

명령이 보이지 않으면 **애플리케이션 명령어 사용** 권한과 서버 설치를 확인하고, 번역이 안 되면 네 가지 채널 권한·`/zzz api-status`·`/zzz status`를 확인하세요. 사용 중단은 채널 연결 해제 또는 서버에서 봇 내보내기로 가능합니다. API 제공자 측 키 폐기는 별도로 해야 합니다.

[문의](https://github.com/Odarom/zenless-discord-translator/issues/new)에는 API 키·비공개 대화·개인정보를 올리지 마세요. [영상 자막 작업실](https://github.com/Odarom/zenless-subtitle-studio/releases/latest)은 별도 PC 프로그램입니다. 팬 제작 서비스이며 게임 제작사의 공식 봇이 아닙니다.
