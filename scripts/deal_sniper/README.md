# 🎯 iPhone Deal Sniper (iPhone 15 Pro Max & iPhone 16 Pro)

Automatyczny bot przeszukujący **OLX** oraz **Allegro Lokalnie** w poszukiwaniu najlepszych ofert na rynku.

---

## ⚡ Główne funkcje
- **Bypass zabezpieczeń Cloudflare / bot-detection**: używa `curl_cffi` z fingerprintingiem Chrome 124, odpytując bezpośrednio oficjalne API OLX oraz oferty Allegro Lokalnie.
- **Filtry bezpieczeństwa ("dobre warunki")**:
  - Odsiewa śmieci, akcesoria i usługi: *etui, case, pudełka, zamienniki, atrapy dummy, wymiany szybki, części*.
  - Odsiewa ryzykowne telefony: *blokady iCloud, telefony zablokowane na raty operatorów (Plus, T-Mobile, Orange)*.
  - Odsiewa telefony uszkodzone: *zbity wyświetlacz, brak Face ID, pęknięte szkło*.
- **Inteligentna analiza baterii**: automatycznie wyciąga kondycję baterii (np. `92%`, `100%`) z tytułu oraz pełnego opisu ogłoszenia.
- **Weryfikacja bezpiecznej transakcji**:
  - Wykrywa status **Przesyłki OLX z Pakietem Ochronnym** oraz **Allegro Protect**.
  - Opcja wymuszenia wyłącznie bezpiecznych zakupów (`--safe-only`).
- **Powiadomienia**:
  - Kolorowy dashboard w konsoli z bezpośrednimi linkami.
  - Dźwięk systemowy Windows przy znalezieniu okazji.
  - **Telegram Bot** (wysyła natychmiastowe alerty na telefon z bezpośrednim linkiem).
  - **Discord Webhook** (opcjonalnie).
- **Tryb ciągły (Watch)**: bot działa w tle, zapamiętuje widziane oferty w `seen_deals.json` i powiadamia natychmiast, gdy ktoś wystawi nową okazję!

---

## 🚀 Jak uruchomić?

### Sposób 1: Przez menu `.bat` (Najprostszy)
Kliknij dwukrotnie w plik `run_sniper.bat` w głównym katalogu projektu.

### Sposób 2: Przez terminal (PowerShell / CMD)

1. **Szybki skan rynku (aktualne okazje):**
   ```bash
   python scripts/deal_sniper/sniper.py --once
   ```

2. **Szukaj tylko z bezpieczną przesyłką (Pakiet Ochronny):**
   ```bash
   python scripts/deal_sniper/sniper.py --once --safe-only
   ```

3. **Nasłuchiwanie na żywo w tle (alerty o nowych ofertach):**
   ```bash
   python scripts/deal_sniper/sniper.py --watch
   ```

4. **Filtrowanie konkretnego modelu:**
   ```bash
   # Tylko iPhone 15 Pro Max
   python scripts/deal_sniper/sniper.py --once --target 15pm

   # Tylko iPhone 16 Pro
   python scripts/deal_sniper/sniper.py --once --target 16p
   ```

5. **Własne parametry (np. bateria min. 85%, cena max 2700 zł):**
   ```bash
   python scripts/deal_sniper/sniper.py --once --target 15pm --min-bat 85 --max-price-15 2700
   ```

---

## ⚙️ Konfiguracja Telegrama (`config.json`)

Aby otrzymywać powiadomienia na telefon:
1. Otwórz plik `scripts/deal_sniper/config.json`.
2. W sekcji `"notifications" -> "telegram"`:
   ```json
   "telegram": {
     "enabled": true,
     "bot_token": "TWOJ_TELEGRAM_BOT_TOKEN",
     "chat_id": "TWOJ_CHAT_ID"
   }
   ```
3. Zapisz plik — przy każdej nowej okazji bot wyśle powiadomienie z linkiem!
