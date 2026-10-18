@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "ZZZ_VIDEO_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "ZZZ_VIDEO_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%ZZZ_VIDEO_NODE%" scripts\video-build.mjs
if errorlevel 1 goto finish
"%ZZZ_VIDEO_NODE%" scripts\video-launch.mjs
:finish
pause
