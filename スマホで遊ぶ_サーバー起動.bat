@echo off
chcp 65001 > nul
title GCP CDL 3D合格クエスト - ローカルサーバー
pushd "%~dp0"

echo ====================================================
echo   GCP CDL 3D合格クエスト - ローカルサーバー
echo ====================================================
echo.

:: PCのローカルIPv4アドレスを取得
set LOCAL_IP=
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    if not defined LOCAL_IP (
        for /f "tokens=1" %%j in ("%%i") do set LOCAL_IP=%%j
    )
)

echo 【スマホのブラウザ（SafariやChrome）で開くURL】
echo.
if defined LOCAL_IP (
    echo    http://%LOCAL_IP%:8080/
) else (
    echo    http://localhost:8080/
)
echo.
echo 【PCブラウザで直接遊ぶ場合】
echo    http://localhost:8080/
echo.
echo ====================================================
echo ※この画面を開いたまま、スマホから上記URLを開いてください。
echo ※遊び終わったら、この画面を閉じる（Ctrl+C）で停止します。
echo ====================================================
echo.

where python >nul 2>&1
if %errorlevel% equ 0 (
    echo [起動] Python を使用してポート8080で起動します...
    python -m http.server 8080
    goto :FINISH
)

where py >nul 2>&1
if %errorlevel% equ 0 (
    echo [起動] py ランチャーを使用してポート8080で起動します...
    py -m http.server 8080
    goto :FINISH
)

echo [エラー] Python が見つかりませんでした。
echo Microsoft Store等から Python をインストールしてください。

:FINISH
pause
