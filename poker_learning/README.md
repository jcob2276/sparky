# ♠️ Poker Decision Lab & Learning Hub

Zestaw narzędzi stworzony do nauki **podejmowania decyzji w warunkach niepełnej informacji i losowości**, a nie hazardu czy bezmyślnego grania w karty.

---

## 🎯 Dwa narzędzia w tym katalogu

### 1. `Poker Decision Lab` (Dedykowany trenażer myślenia probabilistycznego)
* **Lokalizacja:** `decision_lab/index.html` (lub kliknij `Otworz_Poker_Decision_Lab.bat`)
* **Działa od ręki:** Bez instalacji, bez serwerów, natywnie w dowolnej przeglądarce.
* **Co trenuje:**
  1. **Trenażer Decyzji i Anti-Resulting:**
     * Dostajesz sytuację (karty, stół, pulę, zakład rywala).
     * Oceniasz Pot Odds i Equity.
     * Wybierasz: **FOLD**, **CALL** lub **ALL-IN**.
     * **Klucz:** System nie tylko pokazuje, czy wygrałeś to jedno rozdanie, ale natychmiast odpala **1,000 symulacji Monte Carlo równoległych światów** i analizuje decyzję w **Matrycy 2x2**:
       - *Zasłużona Nagroda* (Dobra decyzja + Wygrana)
       - *Pułapka Resultingu / Pech* (Dobra decyzja + Przegrana – uczy nie obwiniać się za wariancję!)
       - *Toksyczne Szczęście / Fuks* (Zła decyzja + Wygrana – najgroźniejsza pułapka w życiu i biznesie)
       - *Zasłużona Strata* (Zła decyzja + Przegrana)
  2. **Siłownia Szybkiej Matematyki (Mental Math Gym):**
     * Szybkie obliczanie Pot Odds (np. zakład 1/2 puli = 25% wymaganego equity).
     * Reguła 4 i 2 (szybkie szacowanie szans z outów).
  3. **Symulator Wariancji & Prawo Wielkich Liczb:**
     * Wizualizacja 5 graczy o identycznych umiejętnościach (+5% EV).
     * Pokazuje, jak w próbie 100-500 rozdań losowość potrafi zrobić z jednego gracza "geniusza", a z drugiego "nieudacznika", mimo że obaj podejmowali identyczne decyzje.
  4. **Kompendium Mental Models:**
     * Podsumowanie książek *Thinking in Bets* (Annie Duke) i koncepcji Charlie'ego Mungera.

---

### 2. `LibreGTO` (Otwarty trenażer teorii gier z GitHuba)
* **Lokalizacja:** `libregto/` (sklonowane oficjalne repo `rdpharr/libregto`, lub kliknij `Otworz_LibreGTO.bat`)
* **Dostępne również online:** [libregto.com](https://libregto.com)
* **Co trenuje:**
  * Sztywne tabele i zakresy preflop (Open or Fold).
  * Siłę pozycji przy stole (BTN, CO, UTG, Blinds).
  * Szacowanie siły układów.

---

## 💡 Główne pojęcia do zapamiętania

1. **Wartość Oczekiwana (EV - Expected Value):**
   $$EV = (P_{\text{wygrana}} \times \text{Zysk}) - (P_{\text{przegrana}} \times \text{Koszt})$$
   Jeśli $EV > 0$, zagranie jest opłacalne. Jeśli $EV < 0$, powtarzanie go w nieskończoność gwarantuje bankructwo.
2. **Resulting (Błąd poznawczy wyniku):**
   Tendencja do oceniania jakości decyzji wyłącznie po jej rezultacie. W pokerze i życiu możesz podjąć decyzję 10/10 i ponieść porażkę – to nie powód do zmiany dobrej strategii.
3. **Reguła 4 i 2:**
   * Po flopie (zostały 2 karty): $\text{Outy} \times 4 \approx \% \text{ szans}$
   * Po turnie (została 1 karta): $\text{Outy} \times 2 \approx \% \text{ szans}$
