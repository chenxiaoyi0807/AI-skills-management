@echo off
chcp 65001 >nul
title AI Skills Manager - 重新构建
cls
echo.
echo  ╔══════════════════════════════════════╗
echo  ║      ✦  AI Skills Manager            ║
echo  ║      正在重新编译，请稍候...          ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo  [构建] 编译中...
npx electron-vite build

echo.
echo  [完成] 构建完成！下次双击"启动.vbs"即可秒速启动。
echo.
pause
