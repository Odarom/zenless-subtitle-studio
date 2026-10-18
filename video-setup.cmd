@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "ZZZ_VIDEO_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "ZZZ_VIDEO_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
echo 유튜브 처리 도구, Vulkan 음성 인식 도구, 다국어 모델을 준비합니다.
echo 모델 다운로드에는 약 547MB의 공간과 인터넷 연결이 필요합니다.
"%ZZZ_VIDEO_NODE%" scripts\video-setup.mjs
pause
