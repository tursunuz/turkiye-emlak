@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Turkiye Emlak - Oyun Sunucusu
set "EMLAK_NODE=%~dp0runtime\node.exe"
if not exist "%EMLAK_NODE%" set "EMLAK_NODE=node.exe"
"%EMLAK_NODE%" --version >nul 2>&1
if errorlevel 1 (
  echo Node.js 24+ is required. Download the Windows ZIP or install Node.js.
  pause
  exit /b 1
)
if not defined PORT set "PORT=3000"
set "OPEN_BROWSER=1"
echo Turkiye Emlak baslatiliyor. Bu pencere oyun boyunca acik kalmali.
"%EMLAK_NODE%" server.mjs
echo.
echo Sunucu durdu. Kayitli maclar sonraki acilista devam eder.
pause
