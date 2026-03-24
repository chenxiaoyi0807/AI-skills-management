@echo off
chcp 65001 >nul
title AI Skills Manager - 启动中...
cls
echo.
echo  ╔══════════════════════════════════════╗
echo  ║      ✦  AI Skills Manager            ║
echo  ║      正在启动开发环境，请稍候...      ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: 检查 node_modules 是否存在，没有则先安装依赖
if not exist "node_modules\" (
    echo  [提示] 首次启动，正在安装依赖包，请耐心等候...
    echo.
    npm install
    echo.
)

echo  [启动] 正在配置桌面快捷方式...
call make-shortcut.bat >nul 2>&1

echo  [启动] 正在启动 Electron 应用...
echo  [提示] 关闭此窗口将退出应用
echo.
npm run dev

pause
