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
    echo Node.js를 찾지 못했습니다. https://nodejs.org/
    pause
    exit /b 1
  )
)
"%ZZZ_NODE%" scripts/sync-glossary.mjs sync
pause
