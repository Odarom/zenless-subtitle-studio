@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "ZZZ_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "ZZZ_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
echo 1. 내 PC에서 실행 - Ollama, API 요금 없음
echo 2. Google Gemini API - 무료 구간 또는 유료, 계정 설정에 따름
echo 3. OpenAI API - 유료
echo 4. 변경하지 않고 종료
choice /c 1234 /n /m "번호 선택: "
if errorlevel 4 exit /b 0
if errorlevel 3 goto openai
if errorlevel 2 goto gemini
"%ZZZ_NODE%" scripts/set-provider.js ollama
goto done
:gemini
"%ZZZ_NODE%" scripts/set-provider.js gemini
goto done
:openai
"%ZZZ_NODE%" scripts/set-provider.js openai
:done
pause
