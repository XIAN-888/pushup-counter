@echo off
cd /d "%~dp0"

set "NODE=node"
where node >nul 2>nul
if errorlevel 1 set "NODE=C:\Users\neuro\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not exist "%NODE%" (
  echo 未找到 Node.js，请先安装 Node.js 或直接用浏览器打开 index.html。
  pause
  exit /b 1
)

start "" http://localhost:8899
"%NODE%" server.js
