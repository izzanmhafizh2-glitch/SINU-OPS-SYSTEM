@echo off
title SINU OPS - Server
echo ================================
echo   SINU OPS SYSTEM - Local Server
echo ================================
echo.
echo Server berjalan di: http://localhost:8000
echo.
echo Buka browser dan ketik: http://localhost:8000
echo.
echo Tekan Ctrl+C untuk menghentikan server.
echo.
cd /d "%~dp0"
python -m http.server 8000
pause
