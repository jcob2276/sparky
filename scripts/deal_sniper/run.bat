@echo off
chcp 65001 >nul
title iPhone Deal Sniper (15 Pro Max & 16 Pro)
color 0B

:menu
cls
echo ========================================================
echo       🎯 iPHONE DEAL SNIPER - WYSZUKIWARKA OKAZJI
echo ========================================================
echo  Modele: iPhone 15 Pro Max  ^|  iPhone 16 Pro
echo  Portale: OLX (API + Pakiet Ochronny) ^& Allegro Lokalnie
echo ========================================================
echo.
echo  1. Pokaz aktualne najlepsze okazje (Szybki skan)
echo  2. Uruchom ciagly nasluch w czasie rzeczywistym (Watch)
echo  3. Szukaj TYLKO ofert z Bezpieczna Przesylka (Pakiet Ochronny)
echo  4. Szukaj tylko iPhone 15 Pro Max
echo  5. Szukaj tylko iPhone 16 Pro
echo  6. Edytuj ustawienia (ceny, Telegram, filtry - config.json)
echo  0. Wyjdz
echo.
echo ========================================================
set /p choice="Wybierz opcje [1-6, 0]: "

if "%choice%"=="1" (
    cls
    python scripts/deal_sniper/sniper.py --once
    pause
    goto menu
)
if "%choice%"=="2" (
    cls
    python scripts/deal_sniper/sniper.py --watch
    pause
    goto menu
)
if "%choice%"=="3" (
    cls
    python scripts/deal_sniper/sniper.py --once --safe-only
    pause
    goto menu
)
if "%choice%"=="4" (
    cls
    python scripts/deal_sniper/sniper.py --once --target 15pm
    pause
    goto menu
)
if "%choice%"=="5" (
    cls
    python scripts/deal_sniper/sniper.py --once --target 16p
    pause
    goto menu
)
if "%choice%"=="6" (
    notepad scripts\deal_sniper\config.json
    goto menu
)
if "%choice%"=="0" exit /b

goto menu
