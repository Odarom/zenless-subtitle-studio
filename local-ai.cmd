@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "ZZZ_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "ZZZ_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%ZZZ_NODE%" --env-file-if-exists=.env scripts/local-ai.js
pause
