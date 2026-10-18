# ZZZ Discord 번역기

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

[봇 설치](https://discord.com/oauth2/authorize?client_id=1557261995215028254) · [PC 프로그램 다운로드](https://github.com/Odarom/zenless-discord-translator/releases/latest) · [이용약관](TERMS.md) · [개인정보 처리방침](PRIVACY.md)

젠레스 존 제로 공용 번역 DB를 사용하는 채널 번역 봇입니다. 봇은 원문·문맥과 번역 결과를 중계하고, **각 Discord 서버에 연결한 개인 PC 또는 개인 서버가 번역 API를 직접 호출**합니다. API 키는 본인 기기에만 저장하며 공용 봇에 제출하지 않습니다. 연결 프로그램이 꺼져 있는 동안에는 번역되지 않습니다.

## PC에서 사용하기

1. 위 링크로 봇을 본인 Discord 서버에 설치합니다. 서버 관리 권한이 필요합니다.
2. Windows x64 ZIP 전체를 풀고 **Start.cmd**를 실행합니다. 실행 도구가 포함되어 있어 Node.js를 따로 설치하지 않아도 됩니다. 웹브라우저에 본인 PC의 설정 화면이 열립니다.
3. 번역 서비스·모델·본인 API 키·하루 요청 한도를 입력하고 **이 기기에 저장**을 누릅니다. UI는 한국어·영어·일본어·중국어 간체를 지원합니다.
4. Discord에서 **/zzz connect**를 실행하고 받은 일회용 연결 코드를 PC 화면에 입력합니다. 코드는 10분간 한 번만 쓸 수 있습니다.
5. **봇과 연결 → 번역 연결 시작**을 누릅니다. API 키를 채팅이나 봇 입력 창에 보내지 마세요.
6. Discord에서 아래처럼 언어 채널을 같은 그룹에 연결합니다. 두 채널만 있어도 됩니다.

~~~text
/zzz link group:friends channel:#한국어 language:한국어
/zzz link group:friends channel:#english language:English
~~~

기존 글은 소급 번역하지 않습니다. 새 글을 번역하며, 기록이 있는 원문을 수정·삭제하면 연결 번역에도 반영합니다. 사진·GIF·이모지만 있으면 AI 호출 없이 공유합니다. 이 봇은 이미지 속 글자 OCR이나 음성 번역을 하지 않습니다. [영상 자막 작업실](https://github.com/Odarom/zenless-subtitle-studio)은 별도 프로그램입니다.

한 프로그램에서 여러 Discord 서버를 사용하려면 **서버 프로필 → 새 서버 추가**로 이름을 만들고 서버마다 /zzz connect 코드를 연결하세요. 각 프로필의 키·모델·한도·사용량은 독립적으로 관리합니다. 같은 키를 공유하거나 서로 다른 키를 사용할 수 있습니다. 키 변경은 해당 프로필만 중지 → 저장 → 시작하며 다른 서버는 계속 실행됩니다. Gemini는 키가 달라도 같은 프로젝트이면 API 한도를 공유합니다. 개인 서버의 관리 UI는 [SSH 연결 안내](HOSTING.md#several-servers-and-private-management-ui)를 참고하세요. [통신 구조](ARCHITECTURE.md)에서 원문·번역·DB·신고 이동 경로를 볼 수 있습니다.

## 현시점 무료 API 추천

**2026-10-19 한국시간 기준**, [Google AI Studio에서 무료 키 발급](https://aistudio.google.com/apikey) 후 **Gemini 3.1 Flash-Lite** / **gemini-3.1-flash-lite**를 추천합니다. [공식 요금표](https://ai.google.dev/gemini-api/docs/pricing)에 무료 구간이 있으며 해당 계정·프로젝트의 제공 조건과 RPM·TPM·일일 한도 안에서 무료로 사용할 수 있습니다. 모델 접근 권한·결제 설정·데이터 처리 조건은 [공식 약관](https://ai.google.dev/gemini-api/terms)과 계정 화면을 확인하세요. 무료가 무제한이나 영구 제공을 뜻하지는 않습니다. OpenAI API 또는 본인 기기의 Ollama 로컬 모델도 선택할 수 있습니다.

## 개인 서버에서 24시간 사용하기

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

## 공용 DB와 오역 신고

- PC와 개인 서버 모두 실행 시와 **6시간마다** [공용 번역 DB](https://github.com/Odarom/zenless-translation-database)를 자동 갱신합니다. 해시·크기·형식 확인 후 교체하며, 실패하면 마지막 정상 DB를 유지합니다. DB 갱신과 프로그램 코드 업데이트는 별도입니다.
- 채팅은 본문·답장·최근 문맥에서 명칭과 별칭을 검색해 관련 후보 최대 30개를 같은 번역 요청에 넣습니다. 후보 검색에 별도 LLM 요청을 쓰지 않습니다. 긴 표기·약어·동음이의어의 구분 규칙도 함께 제공합니다.
- 번역 메시지에 답장으로 **!신고** 또는 **!report** → **신고 시작**, 또는 메시지의 **앱 → 오역 신고**를 선택합니다. 신고 전 안내를 확인하고 원문·번역·설명을 제출하면 프로젝트 관리자가 비공개로 검토합니다. GitHub 로그인은 필요 없습니다.
- 본인 신고: **/zzz-report mine**, **/zzz-report status id:접수번호**. 별도로 자기 봇을 설치한 경우에는 로컬 접수 후 **프로젝트 관리자에게도 공유**를 선택하고 전송 미리보기에 동의해야 공용 프로젝트로 전달됩니다.
- 신고에 개인정보·키·일반 대화 전체를 넣지 마세요. 보관 기간은 최대 90일이며, 관리자 검토 후 공용 DB를 수정합니다. 제출만으로 자동 수정하거나 AI를 자동 호출하지 않습니다.

연결 확인은 /zzz api-status, 해제는 /zzz disconnect, 그룹 일시 정지는 /zzz pause 및 /zzz resume을 사용합니다. 사용량은 PC 화면이나 개인 서버의 node --env-file=.env.runner scripts/discord-runner.mjs usage로 확인합니다. 실패한 API 요청도 사용량에 포함됩니다. 중계 연결이 끊겨도 이미 시작된 번역을 자동 재호출하지 않습니다.

## 보관과 업데이트

PC UI는 키를 본인 PC에서 암호화해 보관합니다. 해당 PC의 관리자는 복호화할 수 있습니다. 화면 없는 서버 설치는 .env.runner 파일을 사용하므로 파일 권한을 제한하세요. 설정·연결은 data/ 아래에 저장합니다. .env 파일, data/, .secrets/를 공개하거나 다른 사람에게 전달하지 마세요. 키를 바꿀 때는 먼저 연결을 중지하세요. 프로그램을 교체할 때는 실행을 중지하고 개인 설정 폴더를 보존합니다.

직접 Discord 봇도 운영하려면 [HOSTING.md](HOSTING.md)를 읽으세요. 개인 설치용 API_MODE=server는 운영자가 등록 키를 복호화할 수 있는 기존 직접 호출 방식입니다. **본인이 운영하며 자기 키만 쓰는 개인 용도**로 한정해 사용하세요. 공개 중계 봇은 API_MODE=runner를 사용합니다. 팬 제작 도구이며 게임 제작사의 공식 봇이 아닙니다.
