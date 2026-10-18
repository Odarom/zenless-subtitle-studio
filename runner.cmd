@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".env.runner" (
  copy ".env.runner.example" ".env.runner" >nul
  echo .env.runner 파일에 본인 API 키를 저장한 다음 다시 실행하세요.
  notepad ".env.runner"
  exit /b
)
if not exist "data\runner\connection.json" (
  node --env-file=.env.runner scripts/discord-runner.mjs pair
  if errorlevel 1 goto failed
)
node --env-file=.env.runner scripts/discord-runner.mjs start
:failed
pause
