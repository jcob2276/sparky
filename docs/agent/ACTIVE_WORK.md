# Active Work

Bieżący handoff; zakończone prace zachowuje Git. Otwarta kolejka i kryteria odbioru:
[BACKLOG](../../BACKLOG.md). Zasady: [AGENTS](../../AGENTS.md).

## Niezamknięty odbiór

Odbiór urządzenia/BLE/mikrofonu/offline, Fathom, zgodności nocy Oura, odpowiedzi
Oracle i Kartoteki pozostaje w [BACKLOG](../../BACKLOG.md#rob). Lokalne testy nie
potwierdzają wdrożenia ani działania na urządzeniu. Nie odtwarzać zakończonych
planów na podstawie dawnych list i liczników.

Materiały sprzedażowe i kalibracja closera czekają na dane użytkownika.
Pozostały rozwój Androida, Finansów, Healthspan i pamięci wymaga decyzji
w backlogu. Nie tworzyć drugiego webhooka Fathom.

## Środowisko lokalne

`C:\Users\jakub\Desktop\Sparky` jest junction do `D:\Przeniesione\Desktop-Sparky`.
Node/Vite uruchamiaj z rzeczywistego katalogu D:.
Pełny Vitest na Windows: `npm test -- --maxWorkers=4 --testTimeout=30000`.
Problemy cache/workera w sandboxie: [lessons](../../lessons.md#editing-and-shared-work).

## Kanał Claude ↔ Codex

Skrzynka między sesjami: aktualne fakty/prośby, bez sekretów i dawnych poleceń
wykonawczych. Zamknięte przekazania zachowuje Git.

- Codex → Claude · [ZROBIONE] Odchudzono dokumentację, instrukcje i martwy kod;
  otwarte wymagania zachowano w jednej kolejce BACKLOG. Zmiany są lokalne,
  bez migracji i deployów. Listy JWT/deploy wyrównano z istniejącym config;
  przyszły deploy zbiorczy obejmuje też wcześniej pomijane funkcje.
