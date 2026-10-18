@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "ZZZ_NODE=node"
where node >nul 2>nul
if errorlevel 1 (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    set "ZZZ_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  ) else (
    echo Node.js 24.17 이상을 설치한 뒤 다시 실행하세요. https://nodejs.org/
    pause
    exit /b 1
  )
)
if not exist .env (
  copy /y .env.example .env >nul
  echo .env 파일을 만들었습니다. 메모장으로 열고 Discord 연결 정보 3개를 입력하세요.
  echo choose-ai.cmd에서 번역 방식을 선택하세요. 토큰과 키는 공유하지 마세요.
  pause
  exit /b 1
)
if not exist node_modules\discord.js\package.json (
  echo 필요한 라이브러리를 설치합니다.
  if exist .tools\package\bin\npm-cli.js (
    "%ZZZ_NODE%" .tools\package\bin\npm-cli.js ci --ignore-scripts --cache .tools/npm-cache
  ) else (
    call npm.cmd ci --ignore-scripts
  )
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
"%ZZZ_NODE%" --env-file=.env scripts/check.js
if errorlevel 1 (
  pause
  exit /b 1
)
echo.
echo 1. 명령 등록과 초대 링크 확인 - 처음 한 번
echo 2. 번역 봇 실행
echo 3. 설정 확인 후 종료
choice /c 123 /n /m "번호 선택: "
if errorlevel 3 exit /b 0
if errorlevel 2 goto startbot
"%ZZZ_NODE%" --env-file=.env src/register.js
pause
exit /b
:startbot
"%ZZZ_NODE%" --env-file=.env src/index.js
pause
