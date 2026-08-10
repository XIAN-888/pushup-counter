@echo off
cd /d "%~dp0"

if not exist server.pid (
  echo 没有找到正在运行的服务（server.pid 不存在）。
  pause
  exit /b 0
)

set /p PID=<server.pid
taskkill /PID %PID% /F >nul 2>nul
del server.pid >nul 2>nul

echo 网页服务已停止。
pause
