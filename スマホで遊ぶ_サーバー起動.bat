@echo off
chcp 65001 > nul
title GCP CDL 3D - Local Server
pushd "%~dp0"

echo ====================================================
echo   GCP CDL 3D Local Server
echo ====================================================
echo.

set LOCAL_IP=
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    if not defined LOCAL_IP (
        for /f "tokens=1" %%j in ("%%i") do set LOCAL_IP=%%j
    )
)

echo [URL for Mobile Browser]
if defined LOCAL_IP (
    echo    http://%LOCAL_IP%:8080/
) else (
    echo    http://localhost:8080/
)
echo.
echo [URL for PC Browser]
echo    http://localhost:8080/
echo.
echo ====================================================
echo Close this window or press Ctrl+C to stop server.
echo ====================================================
echo.

where python >nul 2>&1
if %errorlevel% equ 0 (
    echo [Starting] python -m http.server 8080 ...
    python -m http.server 8080
    goto :FINISH
)

where py >nul 2>&1
if %errorlevel% equ 0 (
    echo [Starting] py -m http.server 8080 ...
    py -m http.server 8080
    goto :FINISH
)

echo [Error] Python not found. Please install Python.

:FINISH
pause
