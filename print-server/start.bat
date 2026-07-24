@echo off
title O'chel Foods Print Server
cd /d "%~dp0"
echo ================================================
echo       O'CHEL FOODS - PRINT SERVER
echo ================================================
echo.
echo Starting... (window will stay open if there is an error)
echo.
ochel-print-server.exe
echo.
echo ================================================
echo  The print server stopped. Read the error above.
echo  Take a photo and send it to your developer.
echo ================================================
pause
