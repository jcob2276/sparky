# Źródła danych i proces researchu rynku/konkurencji contentowej w PL z agentem AI

Uwaga metodologiczna: ~12 wyszukiwań (WebSearch). Wyniki to głównie blogi wtórne; strony producentów narzędzi i dokumentacje NIE były pobierane przez WebFetch. Ceny i limity trzeba zweryfikować na stronach producentów. Prompty i checklisty w sekcjach "Inferences" to propozycje autora notatek, nie fakty ze źródeł.

## 1. Najlepsze źródła (PL i EN) do badania popytu i konkurencji

### Takeaway
Do popytu: Google Trends + autouzupełnianie/PAA + fora i komentarze. Do konkurencji: Meta Ad Library (darmowa, obejmuje reklamy dostarczane w UE), TikTok Creative Center, Social Blade. Płatne Ahrefs/Semrush/Similarweb są drogie (od ok. 100+ USD/mies.); darmowe wersje są ograniczone. Reddit jest w PL mniej istotny i coraz trudniejszy do automatycznego pobierania.

### Cited Findings
- Meta Ad Library API: wg poradnika trzeciej strony dotyczy reklam polityczno-społecznych (7 lat) oraz wszystkich reklam dostarczonych w UE/UK (1 rok); dla reklam UE zwraca m.in. wybrane targetowanie, szacowany zasięg, beneficjenta i płatnika; wydatki/wyświetlenia tylko jako przedziały; wymaga konta deweloperskiego i potwierdzenia tożsamości — [adsuploader](https://adsuploader.com/blog/facebook-ad-library-api); oficjalny opis narzędzi: [Meta Transparency](https://transparency.meta.com/pl-pl/researchtools/ad-library-tools/). Brak potwierdzenia w oficjalnej dokumentacji Meta zmian na 2026.
- Google Trends API (alpha) ogłoszone 24.07.2025: dane skalowane spójnie między zapytaniami, do 1800 dni (5 lat), agregacje dzienne/tygodniowe/miesięczne/roczne, filtr regionu; dostęp na zgłoszenie; bez danych "Trending Now" — [Google Search Central](https://developers.google.com/search/blog/2025/07/trends-api), [Search Engine Journal](https://www.searchenginejournal.com/google-trends-api-alpha-launching-breaking-news/551935/). Nieoficjalny pytrends bywa wskazywany jako zarchiwizowany — [Scrapfly](https://scrapfly.io/blog/posts/google-trends-api-alternatives) (wtórne). Stan alfy w 2026 niezweryfikowany.
- Ahrefs Webmaster Tools jest darmowe, ale tylko dla zweryfikowanych własnych stron; Semrush ma darmowy plan (ok. 10 słów kluczowych wg jednego źródła) i 7-dniowy trial; Ahrefs bez triala — [Visionary Marketing](https://visionary-marketing.co.uk/blog/semrush-vs-ahrefs-2026), [Tlinky](https://tlinky.com/semrush-vs-ahrefs/). Ceny rozbieżne: Ahrefs Lite 129 USD/mies. (inne źródło: 108 przy rocznym rozliczeniu; wzmianka o planie Starter 29 USD od stycznia 2026), Semrush ok. 117–140 USD/mies. — te same źródła; sprawdzić u producentów.
- Similarweb free: wg TechRadar 5 wyników na metrykę, 3 miesiące danych webowych; opinie G2 wskazują niską dokładność dla małych stron; płatne plany od 129 USD — [TechRadar](https://www.techradar.com/reviews/similarweb-web-analytics-tool), [GamsGo](https://www.gamsgo.com/blog/similarweb-free). Dla niszowych polskich stron twórców dane najpewniej nieużyteczne (patrz Inferences).
- TikTok Creative Center: darmowe, Top Ads (filtry region/branża/cel) i Trend Overview (hashtagi, dźwięki, słowa kluczowe) — [TikTok Help](https://ads.tiktok.com/help/article/creative-center), [Segwise 2026](https://segwise.ai/blog/tiktok-creative-center-guide-advertisers.md). Dostępność Polski jako regionu nie potwierdzona w wynikach.
- Social Blade: darmowe statystyki publiczne YouTube/Instagram/TikTok/Twitch/Facebook: wzrost, subskrypcje, wyświetlenia, ranking; szacunki zarobków bardzo przybliżone — [Social Blade](https://socialblade.com/info), [IONOS](https://www.ionos.co.uk/digitalguide/online-marketing/web-analytics/all-about-socialblade/).
- Skala PL: 34,1 mln użytkowników internetu (89,8%) koniec 2025; 27,1 mln tożsamości w social media (71,3%) w październiku 2025 (rok wcześniej 29,0 mln) — [DataReportal Digital 2026 Poland](https://datareportal.com/reports/digital-2026-poland). NapoleonCat podaje ok. 23,6–24,8 mln użytkowników Facebooka w 2026 (niespójne między stronami) — [NapoleonCat](https://napoleoncat.com/stats/social-media-users-in-poland/).
- Reddit: źródła wtórne opisują zaostrzanie dostępu (brak nowych rejestracji od 31.10.2026, wyłączenie RSS 13.11.2026, 403 dla niezalogowanego .json od maja 2026); Data API Terms wymagają osobnej umowy do użycia komercyjnego i nie dają prawa do trenowania AI; User Agreement zabrania scrapingu — [DEV](https://dev.to/tonywangca/why-reddit-blocked-unauthenticated-json-in-2026-and-how-to-still-get-reddit-data-58b9), [Pillitteri](https://pasqualepillitteri.it/en/news/19942/reddit-shuts-down-rss-feeds-ai-scraping), [ScrapeBadger](https://scrapebadger.com/blog/reddit-api-vs-scraping-the-honest-2026-comparison). Źródła częściowo sprzeczne w szczegółach (limity zapytań), to blogi sprzedawców alternatyw.
- Raporty audio PL: Gemius opublikował w 2026 raport o rynku audio razem z KBR Total Audio 2025 — [Antyweb](https://antyweb.pl/radio-fm-w-polsce-2026); Gemius Mediapanel jako badanie cross-media — [Gemius](https://gemius.com/blog/internet-and-media-in-poland-december-report/). Brak danych podcastowych w pobranych fragmentach.

### Inferences
- (bez źródła, wiedza własna, do weryfikacji) Dodatkowe darmowe/tanie źródła do sprawdzenia: Google Search Console własnej strony, autouzupełnianie Google/YouTube, People Also Ask, Answer The Public / AlsoAsked (limity darmowe), Exploding Topics (wersja darmowa ograniczona), Spotify/Apple Podcasts charts PL, Podcast Index, Wykop (tagi, wyszukiwarka), publiczne grupy Facebook (ręczny przegląd), LinkedIn (wyszukiwanie postów po frazie), YouTube (sortowanie po popularności, transkrypcje), Udemy/Allegro/Sprzedajemy.pl, ceneo (ceny kursów/ebooków), Gumroad/Sellfy/Podia strony ofert, Kurs.pl-style platformy (Tutlo, Edu-platformy), raporty Interaktywnie.com/IAB Polska.
- Dla niszy "komeback contentowy dla przedsiębiorców" w PL kluczowe będą: YouTube + LinkedIn + Instagram + podcasty, więc Social Blade i ręczny przegląd są ważniejsze niż Similarweb.
- Reddit w PL ma mały wolumen; lepsze VoC to grupy FB, komentarze YT/IG, LinkedIn, Wykop, własne DM/ankiety. Ręczne zbieranie cytatów jest bezpieczniejsze prawnie niż scraping.
- Budżet minimalny: Google Trends, Meta Ad Library, TikTok CC, Social Blade, GSC, DataReportal = 0 zł; opcjonalnie 1 miesiąc Semrush/Ahrefs raz na kwartał jako "sprint".

### Gaps
- Brak potwierdzenia z dokumentacji: aktualne ceny/limity Ahrefs, Semrush, Exploding Topics, Answer The Public, AlsoAsked; stan Google Trends API w 2026; czy Creative Center ma Polskę.
- Brak znalezionych wiarygodnych danych o rozmiarze/podziale rynku podcastów w PL 2026 oraz o Wykopie.
- Meta Content Library (dla Instagrama/FB, dostęp badawczy) — nie sprawdzono.

## 2. Jak analizować konkurencję (top 20 twórców) i voice of customer

### Takeaway
Konkurencję analizuj jako tabelę 20 twórców x stałe wymiary (format, hooki, oferta, cena, częstotliwość, CTA, dowód społeczny), a VoC zbieraj z zachowań w przeszłości (Mom Test), nie z opinii o pomyśle.

### Cited Findings
- Mom Test: trzy reguły — pytaj o życie klienta, nie o swój pomysł; o konkretne zdarzenia z przeszłości, nie o hipotetyczną przyszłość; mów mniej, słuchaj więcej. Pytania typu "czy byś tego użył?" dają uprzejme, mylące odpowiedzi; zła rozmowa daje fałszywe pozytywy; rozmawiaj z wieloma osobami, by znaleźć wzorce — [mtlynch.io](https://mtlynch.io/book-reports/the-mom-test/), [Koji](https://www.koji.so/docs/mom-test-user-interviews), [SuperSummary](https://www.supersummary.com/the-mom-test/summary/) (streszczenia, nie książka).
- Social Blade pozwala porównać tempo wzrostu i ranking kont — [Social Blade](https://socialblade.com/info). Meta Ad Library pokazuje aktywne reklamy konkurentów (w UE także targetowanie) — [adsuploader](https://adsuploader.com/blog/facebook-ad-library-api).

### Inferences
- (propozycja) Wymiary tabeli konkurencji: platforma główna, liczba obserwujących i trend 90 dni (Social Blade), częstotliwość publikacji/tydz., top 10 postów z ostatnich 90 dni (format, długość, hook w pierwszych 3 s/1. linii), temat/filar, CTA i lead magnet, oferta (produkt, cena, model: kurs/mentoring/społeczność/usługa), dowody (case studies, liczby), reklamy w Meta Ad Library (liczba, kreacje, czas działania), ton, luka/okazja.
- (propozycja) Próbka 20: 5 liderów PL, 5 średnich (10–50 tys.), 5 rosnących mikro, 5 zagranicznych wzorców (EN) do importu formatów.
- (propozycja) Reklama aktywna >30–60 dni to heurystyka na opłacalność (nie dowód).
- (propozycja) JTBD do kodowania VoC: sytuacja wyzwalająca, "praca do wykonania", frustracje, obecne obejścia, bariery zakupu, słowa klientów dosłownie. Cytaty z komentarzy kodować w tabeli: źródło, cytat, motyw, intensywność, data.
- (propozycja) Wywiady: 8–12 rozmów po 20–30 min z przedsiębiorcami, pytania o ostatni raz gdy... (ostatnia próba contentu, co przerwało, ile czasu/pieniędzy wydali, co próbowali). Ankieta 5–7 pytań, w tym 1 otwarte; nie pytaj "czy kupiłbyś".

### Gaps
- Nie znaleziono źródeł na ramy JTBD (Christensen/Moesta/Ulwick) ani badań o benchmarkach cen kursów w PL.
- Brak zweryfikowanych danych o średnich cenach ofert twórców w PL.

## 3. Jak zlecić to agentowi AI (prompt, checklista, brief, weryfikacja, cykliczność) + gotowe prompty

### Takeaway
Dziel pracę na etapy (odkrywanie, weryfikacja, synteza, przegląd), wymagaj przypisania każdej tezy do źródła, rób kontr-prompt i ręcznie sprawdzaj kluczowe cytaty. Agent nie ma dostępu do panelów logowanych (Ahrefs, Similarweb), więc dane z nich wklejaj/eksportuj CSV.

### Cited Findings
- Dobre praktyki: rozdzielenie discovery/verification/synthesis/review; kontr-prompt prosi o argumenty przeciw pierwszej odpowiedzi; mapowanie tez do konkretnych źródeł z oznaczeniem braków; ręczne sprawdzanie, czy cytat faktycznie jest w źródle; krzyżowe sprawdzenie innym modelem — [Information Today (lipiec 2026)](https://infotoday.com/cilmag/jul26/Weiss--AI-Deep-Research-and-Why-the-Old-School-Has-Closed.shtml), [Suprmind](https://suprmind.ai/hub/insights/ai-research-tool-build-a-validation-first-workflow-that-catches/), [CustomGPT](https://customgpt.ai/ai-research-assistant). Wszystko to źródła wtórne/vendorowe.
- Ograniczenia danych dla agenta: Reddit zabrania scrapingu bez zgody i ogranicza API — [ScrapeBadger](https://scrapebadger.com/blog/reddit-api-vs-scraping-the-honest-2026-comparison); Meta Ad Library API wymaga konta deweloperskiego — [adsuploader](https://adsuploader.com/blog/facebook-ad-library-api).

### Inferences
(wszystko poniżej to propozycja autora notatek)

**Struktura promptu do deep research:** (1) Rola i cel decyzyjny (jaką decyzję ma wesprzeć), (2) kontekst (nisza, odbiorca, rynek PL, data), (3) pytania badawcze nr 1..N, (4) dozwolone źródła i priorytety (PL+EN, pierwotne > wtórne), (5) zakres czasowy, (6) format wyjścia (tabela + wnioski + luki), (7) zasady rzetelności: każda teza ze źródłem URL i datą; rozdziel fakt / szacunek / hipoteza; zakaz zmyślania liczb, "brak danych" zamiast zgadywania, (8) kryterium zakończenia, (9) kontr-prompt na końcu.

**Szablon briefu (do wypełnienia przez Jakuba):** Decyzja do podjęcia | Odbiorca (kto, branża, wielkość firmy) | Hipotezy do sprawdzenia (3) | Platformy | Konkurenci znani (lista) | Wykluczenia | Budżet narzędzi | Termin | Format raportu | Co już wiem.

**Checklista weryfikacji:** otwórz 5 losowych źródeł i sprawdź, czy cytat istnieje; sprawdź daty (<12 mies. dla trendów); liczby krzyżowo z drugim źródłem; oddziel dane z narzędzia (screenshot/CSV) od opinii; oznacz pewność H/M/L; losowo sprawdź 3 konta twórców ręcznie; zapisz, czego agent nie mógł zobaczyć.

**Cykliczność:** co miesiąc (60–90 min): Trends, nowe reklamy konkurentów, 5 topowych postów, nowe komentarze VoC; co kwartał (3–4 h): pełna tabela top 20, ceny/oferty, 1 miesiąc płatnego narzędzia, 3–5 wywiadów, aktualizacja luk. Trzymaj stały folder z datowanymi plikami (np. `research/2026-Q4/`), stały schemat tabel, diff względem poprzedniego okresu ("co się zmieniło"), plik `lekcje.md`.

**Prompt 1 — Mapa popytu (tematy i frazy):**
```
Jesteś analitykiem rynku contentowego w Polsce. Cel: zdecydować, jakie 5 filarów treści ma sens dla przedsiębiorców wracających do regularnego contentu (comeback contentowy) w 2026/27.
Zbadaj: (1) frazy i pytania, które Polacy wpisują w Google/YouTube na temat [TEMAT], w tym autouzupełnianie i "Podobne pytania"; (2) trendy z Google Trends dla geo=PL, 5 lat; (3) tematy z forów, grup, komentarzy.
Źródła: PL i EN, preferuj pierwotne. Każda teza: URL + data. Oddziel fakty od szacunków. Jeśli nie możesz sprawdzić (np. wymaga logowania), napisz "niezweryfikowane" i wskaż, jaki eksport mam Ci wkleić.
Wynik: tabela (fraza | intencja | sezonowość/trend | źródło | pewność H/M/L), potem 5 filarów z uzasadnieniem i 5 luk. Na końcu wypisz 3 argumenty PRZECIW swoim wnioskom.
```

**Prompt 2 — Top 20 twórców w niszy:**
```
Znajdź 20 polskich twórców/ekspertów publikujących dla przedsiębiorców o [NISZA] (5 dużych, 5 średnich, 5 rosnących, 5 mikro), plus 5 zagranicznych wzorców EN. Dla każdego: linki do profili, platforma główna, wielkość i trend (jeśli dane publiczne), częstotliwość publikacji, 3 powtarzalne formaty, typowy hook, oferta i cena (tylko z publicznych stron), CTA/lead magnet, dowody społeczne. Podawaj URL przy każdym polu; brak danych = "brak". Nie zgaduj cen ani liczb. Zwróć CSV + 10 wniosków o lukach pozycjonowania.
```

**Prompt 3 — Analiza hooków i formatów (na wklejonych danych):**
```
Poniżej wklejam 40 postów/transkryptów (tekst + metryki). Nie szukaj w sieci. Sklasyfikuj hook (pytanie, kontrowersja, liczba, historia, wynik...), format, długość, CTA. Policz, które kombinacje mają najlepszy stosunek reakcji do zasięgu/obserwujących. Wskaż 10 wzorców do przetestowania i 5 do uniknięcia. Zaznacz, gdzie próba jest za mała na wniosek.
[WKLEJ DANE]
```

**Prompt 4 — Reklamy i oferty konkurentów:**
```
Na podstawie listy konkurentów [LISTA] sprawdź publicznie dostępne informacje o ich ofertach i reklamach (strony sprzedażowe, Meta Ad Library dla UE jeśli dostępna). Dla każdego: produkt, cena, gwarancja, obietnica, grupa docelowa, argumenty sprzedażowe, czas działania reklam jeśli widoczny. Jeśli Ad Library nie jest dostępna dla agenta, wypisz kroki i filtry (kraj: Polska, wszystkie reklamy), które wykonam ręcznie, i format, w jakim mam wkleić wyniki. Na końcu: tabela porównawcza i 5 nisz cenowo-ofertowych bez konkurencji.
```

**Prompt 5 — Voice of customer z komentarzy/ankiet (JTBD):**
```
Wklejam komentarze, odpowiedzi z ankiet i notatki z rozmów [WKLEJ]. Zakoduj je wg JTBD: sytuacja wyzwalająca, cel, frustracja, obecne obejście, bariera, język klienta (cytaty dosłownie). Zlicz motywy i podaj 3 reprezentatywne cytaty na motyw. Zaznacz motywy poparte <3 wypowiedziami jako hipotezy. Zaproponuj 10 hooków i 5 tematów w języku klientów. Oznacz, które wypowiedzi to opinie o przyszłości (niska wartość) vs relacje o zdarzeniach z przeszłości (wysoka wartość, zasada Mom Test).
```

**Prompt 6 — Cykliczny przegląd (miesiąc/kwartał) i weryfikacja:**
```
Oto raport z poprzedniego okresu [WKLEJ/ŚCIEŻKA] i moje nowe dane [WKLEJ]. Zrób przegląd zmian: nowe tematy, nowi twórcy, zmiany w ofertach/cenach, spadki/wzrosty trendów, nowe pytania klientów. Zaktualizuj tabelę top 20 (zaznacz zmiany). Potem krytycznie zweryfikuj własny raport: wypisz tezy bez źródła, liczby bez daty, możliwe halucynacje, i listę 10 rzeczy do ręcznego sprawdzenia. Na końcu: 3 decyzje contentowe na następny okres z priorytetem i kosztem.
```

### Gaps
- Brak oficjalnej dokumentacji Anthropic/OpenAI o promptowaniu deep research; użyto tylko źródeł wtórnych.
- Nie zweryfikowano, jakie dokładnie dane agent może pobrać automatycznie z Meta Ad Library, TikTok CC, Social Blade (zależy od narzędzi agenta i ToS platform).
- Nie sprawdzono prawnych aspektów przetwarzania komentarzy/DM (RODO) przy wklejaniu do AI; zalecana anonimizacja (to uwaga ogólna, bez źródła).
