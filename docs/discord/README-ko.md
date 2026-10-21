# ZZZ Discord 번역기

[한국어](README-ko.md) · [English](README-en.md) · [日本語](README-ja.md) · [简体中文](README-zh-CN.md)

언어별 Discord 채널의 새 메시지를 번역합니다. 각자 PC 또는 개인 서버에서 연결 프로그램을 실행하고 본인 API 키를 사용합니다.

**[① Discord 서버에 봇 설치](https://discord.com/oauth2/authorize?client_id=1557261995215028254) · [② PC 연결 프로그램 다운로드 · Windows x64](https://github.com/Odarom/zenless-discord-translator/releases/download/v0.3.3/zenless-discord-runner-0.3.3-win-x64.zip)**

## PC에서 사용하기

1. 위 링크로 봇을 설치합니다. Discord의 **서버 관리 권한**이 필요합니다.
2. 받은 ZIP을 **모두 압축 해제**하고 **Start.cmd**를 실행합니다. Node.js는 포함되어 있습니다. 배포 페이지에서 고를 때는 **Assets의 실행용 ZIP**을 받으세요.
3. 브라우저에 열린 **개인 번역 연결** 설정 화면에서 서비스·모델·본인 API 키를 입력하고 **API 키·설정 저장**을 누릅니다.
4. Discord에서 **/zzz connect**를 실행합니다. 받은 코드를 설정 화면에 입력하고 **봇과 연결 → 번역 연결 시작**을 누릅니다. 연결 코드는 10분간 한 번만 쓸 수 있으며 API 키와 다릅니다.
5. 아래처럼 번역할 언어 채널을 **같은 그룹**에 연결한 뒤 새 메시지를 보내보세요. 두 채널부터 사용할 수 있습니다.

~~~text
/zzz link group:friends channel:#한국어 language:한국어
/zzz link group:friends channel:#english language:English
~~~

번역하는 동안 PC 연결 프로그램을 켜 두세요. 과거 글은 소급 번역하지 않습니다.

## 오역 신고로 번역 품질 개선하기

게임 용어·약어·번역 오류를 알려주세요. 신고를 검토해 젠레스 게임 용어 DB와 번역 품질을 개선합니다.

1. 번역 메시지에 **!신고** 또는 **!report**로 답장하고 **신고 시작**을 누릅니다. 메시지 메뉴의 **앱 → 오역 신고**로도 열 수 있습니다.
2. 원문을 확인하고 **신고 작성**에서 잘못된 부분과 설명을 적어 제출합니다. 올바른 번역을 몰라도 괜찮습니다.
3. 전송 미리보기에서 내용을 확인하고 **동의하고 보내기**를 누르면 **프로젝트 관리자에게 바로 접수**됩니다. 별도의 봇 운영자 접수·공유 단계는 없습니다. 취소하면 전송하지 않으며, 프로젝트 **접수번호**로 전송 완료를 확인합니다.

프로그램을 사용하지 않아도 [공식 명칭·약어를 직접 신고](https://github.com/Odarom/zenless-translation-database/issues/new/choose)할 수 있습니다. 이 GitHub 신고는 계정이 필요하며 내용이 공개됩니다.

## 설정 화면 다시 열기 · 키 변경

- **화면 다시 열기:** 압축을 풀었던 폴더의 **Start.cmd**를 다시 실행합니다.
- **키 변경:** 서버 프로필 선택 → **설정 변경을 위해 중지** → 새 키 입력 → **API 키·설정 저장** → **번역 연결 시작**.
- **여러 서버:** **서버 프로필 → 새 서버 추가**에서 서버마다 연결 코드를 등록합니다. 키·모델·한도를 따로 관리하며 한 프로필을 중지해도 다른 프로필은 계속 실행됩니다.

키는 본인 PC·서버에 보관하며 공용 봇에 보내지 않습니다. 해당 기기의 관리자는 키에 접근할 수 있으므로 본인이 관리하는 기기에서 자기 키를 사용하세요.

## 개인 서버에서 24시간 사용하기

PC 대신 Oracle·VPS·집 서버에 설치할 수 있습니다. **[서버 설치와 자동 실행](HOSTING.md#한국어)**을 따라 준비하세요. 설치 후에는 PC용 Start.cmd 대신 **[서버의 비공개 관리 화면](HOSTING.md#여러-서버와-비공개-관리-화면)**에서 키를 변경합니다. 서버가 켜져 있으면 PC는 꺼도 됩니다.

## API 선택

**2026-10-19 한국시간 작성 기준 무료 API 추천:** [Google AI Studio에서 키 발급](https://aistudio.google.com/apikey) 후 **Gemini 3.1 Flash-Lite**(<code>gemini-3.1-flash-lite</code>)를 사용할 수 있습니다. 계정·프로젝트의 [무료 제공 조건과 한도](https://ai.google.dev/gemini-api/docs/pricing)를 확인하세요. OpenAI API와 별도 설치한 Ollama 로컬 모델도 지원합니다.

## DB 업데이트와 오역 신고

- **DB:** 실행 시와 6시간마다 자동 갱신합니다. 설정 화면의 **지금 갱신 확인**으로도 확인할 수 있습니다. [용어집 둘러보기](https://github.com/Odarom/zenless-translation-database/blob/main/catalog/BROWSE.md).
- **신고:** 번역 메시지에 **!신고** 또는 **!report**로 답장 → **신고 시작**. 메시지 메뉴의 **앱 → 오역 신고**도 사용할 수 있습니다. GitHub 로그인 없이 비공개로 접수됩니다.
- **연결 상태:** **/zzz api-status**. 신고 내역은 **/zzz-report mine**에서 확인합니다.

## 자세한 안내

[기능·지원 언어·운영 상세](https://github.com/Odarom/zenless-discord-translator/blob/main/FEATURES.md#한국어) · [서버 설치](HOSTING.md#한국어) · [통신 구조](ARCHITECTURE.md#한국어) · [업데이트 내역](https://github.com/Odarom/zenless-discord-translator/releases) · [이용약관](TERMS.md#한국어) · [개인정보 처리방침](PRIVACY.md#한국어)

번역은 13개 언어, 화면과 설명서는 4개 언어를 지원합니다. [영상 번역기](https://github.com/Odarom/zenless-subtitle-studio)는 별도 프로그램입니다. 팬 제작 도구이며 게임 제작사의 공식 서비스가 아닙니다.

<!-- Existing documentation links -->
<a id="처음-사용하기--개인-연결-프로그램-다운로드"></a>
<a id="현시점-무료-api-추천"></a>
<a id="공용-db와-오역-신고"></a>
<a id="보관과-업데이트"></a>
<a id="지원-언어"></a>
