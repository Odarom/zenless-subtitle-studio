# 젠레스 자막 작업실 · 0.4.0

[한국어 사용 설명서](video/docs/README-ko.md) · [English](video/docs/README-en.md) · [日本語](video/docs/README-ja.md) · [简体中文](video/docs/README-zh-CN.md)

[GitHub 배포 페이지](https://github.com/Odarom/zenless-subtitle-studio/releases/latest)의 `zenless-subtitle-studio-0.4.0-win-x64.zip` 전체를 전달합니다. 사용자는 압축 해제 후 **Start.cmd**를 실행하고 각자 번역 서비스를 설정합니다. 영상 처리는 PC에서 실행하며 사용자가 서버를 구축할 필요는 없습니다. 프로그램과 Chrome/Edge 확장 모두 네 언어를 지원합니다.

0.4.0은 전체 음성·화면 텍스트와 관련 용어를 기본 한 요청에 번역합니다. AI는 구간 ID와 번역문을 반환하고 코드는 시간·위치와 재결합합니다. 로컬 문장 결합, 전송 전 크기 추정, 기본 RPM 1, 자동 분할·자동 재시도 방지, 선택형 긴 영상 분할을 적용했습니다. 음성/화면 검토 탭, 원문·번역·ID·시간 검색, 비공개 앱 신고, GitHub 프로그램 업데이트를 제공합니다. 추천 모델은 Google AI Studio 무료 API 키로 사용하는 Gemini 3.1 Flash-Lite입니다. 서비스 제공 여부와 무료 사용 한도는 계정마다 확인해야 합니다.

이번 배포에는 선택형 화면 OCR, 시간·위치 추적, 크기 변경에 맞춘 화면 번역, 음성/화면 표시 개별 전환, DeepL API Free/Pro와 무료 로컬 Ollama, 64GiB 영상 입력, 위치 포함 VTT 및 프로젝트 JSON 저장, GitHub 용어집 업데이트와 통합 오역 신고가 포함됩니다. OCR은 기본 꺼짐이며 CPU 도구를 처음 사용할 때 내려받습니다. 0.2.0의 대괄호 경로 문제는 수정되어 대괄호·한글·공백 경로를 지원합니다.

공용 용어집: <https://github.com/Odarom/zenless-translation-database>. API 키·개인 파일·신고 기록은 공개 배포에 포함하지 않습니다. 신고 수집·검토·배포 절차는 [REPORTS.md](REPORTS.md) 및 [AGENTS.md](AGENTS.md)를 따릅니다.

개발 소스 실행은 `video-run.cmd`, 도구 준비는 `video-setup.cmd`입니다. Node.js 24.17 이상이 필요합니다. 배포 ZIP에는 Node.js를 포함합니다. 작업실 기본 주소는 `http://127.0.0.1:4318`입니다.

```powershell
npm test
npm run video:test
node scripts/video-ocr-smoke.mjs
npm run video:package
node scripts/video-package-smoke.mjs
```

패키지 검사는 대괄호·한글·공백 경로에서 전역 PATH 없이 실제 도구 준비·CPU 음성 인식·OCR을 확인합니다. 유료 번역 API는 자동 검사에서 호출하지 않습니다. GPU 가속은 Vulkan 호환 NVIDIA/AMD를 대상으로 하며 실제 검증한 장치와 모든 지원 가능 장치는 구분합니다. 이 PC에서는 AMD CPU와 AMD Vulkan 음성 인식을 확인했습니다. Intel CPU·NVIDIA GPU 및 설치된 브라우저 확장의 실제 YouTube 표시는 추가 환경 검증이 필요합니다.

배포 생성은 필요한 모듈의 의존성을 추적하고 공개 허용 목록만 묶습니다. `.env`, `.secrets`, `data`, `reports`, Discord 운영 설정은 제외합니다. 도구와 모델은 공식 배포처의 체크섬을 확인합니다. 사용자 자료는 사용 후 `app/data/video`와 `app/.secrets`에 생성되므로 사용한 폴더 대신 원래 배포 ZIP을 공유하세요.
