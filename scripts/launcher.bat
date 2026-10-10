@echo off
chcp 65001 >nul
title Doomsday Harem

echo.
echo   ========================================
echo     Doomsday Harem
echo   ========================================
echo.

cd /d "%~dp0"

if not exist "DoomsdayHarem.exe" (
  echo   [错误] 找不到 DoomsdayHarem.exe
  echo   请确认本文件与游戏程序在同一目录。
  echo.
  pause
  exit /b 1
)

echo   数据目录: %~dp0data
echo   启动中...
echo.

start "" "DoomsdayHarem.exe"
