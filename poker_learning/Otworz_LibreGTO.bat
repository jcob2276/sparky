@echo off
echo Uruchamianie LibreGTO (lokalny serwer)...
cd /d "%~dp0libregto"
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    start http://localhost:8080
    python -m http.server 8080
) else (
    where npx >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        npx serve . -l 8080
    ) else (
        start "" "%~dp0libregto\index.html"
    )
)
