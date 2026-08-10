@echo off
cd /d "%~dp0"

net session >nul 2>nul
if %errorlevel% neq 0 (
  echo 需要管理员权限：请右键本文件，选择“以管理员身份运行”。
  pause
  exit /b 1
)

netsh advfirewall firewall add rule name="PushPulse 8899" dir=in action=allow protocol=TCP localport=8899
echo.
echo 防火墙规则已添加，现在同一 Wi-Fi 下的手机可以访问了。
pause
