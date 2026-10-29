# Sparky — design system

Wartości i aliasy tokenów są w [src/index.css](../src/index.css), propsy w
[src/components/ui/](../src/components/ui/), struktura frontendu w [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md).
Czytaj implementację przed użyciem; nie utrzymuj drugiej tabeli wartości/propsów w dokumentacji.

## Zasady kompozycji

- Functional iOS: neutralny canvas, systemowa typografia, grouped lists, wyraźna hierarchia.
- Najwyżej jedna nasycona powierzchnia `hero` prowadzi widok. Elementy jednej domeny
  współdzielą powierzchnię i separator; unikaj kart w kartach.
- Zwykła karta różnicuje treść przez border/tło. Blur i cień unoszenia należą do rzeczywiście
  pływających warstw: modal, sheet, popover, FAB, toast, sticky navigation.
- Kolor oznacza rolę, treść ma większy ciężar niż chrome. Liczba/status nie potrzebują ozdobnej ramki.
- Kształt wynika z roli: grouped, hero, sheet; pill służy filtrom, przełącznikom, statusom i krótkim akcjom.
- Kontrolki definiują raz default/hover/pressed/focus/selected/loading/disabled/error.
- Ikony `lucide-react` mają spójny obrys i rozmiar odpowiedni do tekstu; nie mieszaj filled/outline na jednym poziomie.
- Używaj `variant`, zamiast mnożyć booleany opisujące wygląd.

## Tokeny według roli

| Rola | Tokeny / klasy |
|---|---|
| Akcja, link, focus | `--primary`, `bg-primary`, `text-primary` |
| Kierunek / ostrzeżenie | `--direction`, `--color-warning`, `text-warning` |
| Wykonanie / sukces | `--color-success`, `text-success` |
| Skupienie | `--attention` |
| Błąd / destrukcja / stan krytyczny | `--color-danger`, `text-danger` |
| Informacja | `--color-info`, `text-info` |
| Canvas / powierzchnie / selected | `--background`, `--surface-1/2/3`, `--surface-tonal` |
| Floating / separatory | `--material-floating`, `--surface-solid`, `--separator` |
| Hierarchia tekstu | `--text-primary/secondary/muted/tertiary` |
| Geometria | `--radius-*`, `--space-*`, `--control-*`, `--touch-target`, `--content-*`, `--sidebar-width`, `--toolbar-height` |
| Warstwy i materiał | `--shadow-*`, `--blur-*`, `--opacity-*`, `--z-*` |
| Typografia i ruch | `--font-*`, skala `text-*`, `--motion-*`, `--ease-*`, `--spring` |

Nie hardkoduj palety (`bg-rose-500`), hex/RGBA w JSX/SVG ani rozmiarów typografii
`text-[10px]`. Użyj tokenu roli, a dla przezroczystości `color-mix()` / istniejącego aliasu.
Dark mode wynika z tokenów, nie lokalnych kopii `dark:bg-*`.
Systemowy font obsługuje body/nagłówki; mono liczby i timery. Duży tytuł jest ciaśniejszy,
body ma neutralny tracking. Mikroetykieta uppercase nie zastępuje hierarchii.
`--radius-2xl/3xl` są aliasami hero/sheet. `--shadow-glow-primary` jest legacy, nie nowym CTA.
Przy reduced transparency lub zwiększonym kontraście materiał floating staje się pełną powierzchnią.

## Prymitywy i shell

| Potrzeba | Użyj |
|---|---|
| Akcja | `Button`; primary główna, secondary/outline alternatywna, ghost dyskretna, danger destrukcyjna, tonal delikatna |
| Akcja ikonowa | `IconButton` z etykietą |
| Formularz / filtr | `Input`, `ControlSelect` z `ControlPrimitives`, `ToggleChip`, `Tabs` |
| Karta | `Card` (`surface`, `grouped`, `hero`, `floating` wg roli) |
| Modal / sheet / potwierdzenie | `Modal`, `Sheet`, `confirmDialog()` z `lib/notify.ts` |
| Status / feedback | `Badge`, `Spinner`, `Skeleton`, `EmptyState`, `ToastHost` |
| Ładowanie trasy / sesji | `ShellSkeleton` |
| Sekcja / tytuł ekranu | `SectionTitle`, `shared/PageHeader` |
| Szkielet ekranu | `PageTemplateBoundary`, `PageToolbar`, `ContentContainer` |

`SectionTitle` używa sentence case; `PageHeader` zapewnia duży tytuł zwijany do paska.
`EmptyState` dostaje ikonę Lucide, krótki opis i opcjonalną akcję.
Nie twórz własnego buttona, spinnera, badge, overlaya ani placeholdera ładowania.
Lista wyjątków dla raw button w `eslint.config.js` dopuszcza uzasadnione drag handles
lub złożone widgety; nie jest wzorcem dla zwykłych akcji.

Workspace `todo`, `keep`, `links`, `kalendarz` składa wspólne
`WorkspaceSidebar`, `WorkspaceNavigation`, `WorkspaceHeader` i `ui/Tabs`; szukaj istniejącego kontraktu wyszukiwania w domenie.
Domena dostarcza treść/stan/akcje, nie lokalną kopię sidebara lub wyszukiwarki.
Galerii `/dev/design-system` nie ma; wariant odbieraj na prawdziwym ekranie.

## Motion i dostępność

- Ruch wyjaśnia zmianę/stany. Częsty checkbox/tab ma ledwo zauważalny feedback lub żaden;
  rzadka konfiguracja może mieć więcej charakteru.
- Używaj istniejących tokenów i prymitywów; press reaguje natychmiast, zamknięcie jest krótsze niż otwarcie.
- Animuj transform/opacity; nie startuj popupu od `scale(0)` (subtelny start około `0.95`).
  Ruch przerywalny obsługuj transitions; nie dodawaj inline animacji w JSX.
- `prefers-reduced-motion` usuwa ruch przestrzenny, pozostawia co najwyżej crossfade.
- Kontrast co najmniej 4.5:1 dla tekstu i 3:1 dla dużego tekstu; widoczny focus ring.
- Touch target co najmniej 44×44px, odstęp co najmniej 8px; ikonowy przycisk ma `aria-label`.
- Modal/sheet ma Escape i drogę cancel/back. Sprawdź klawiaturę, mobile oraz oba motywy.

ESLint i `npm run ratchet:frontend` pilnują raw controls, kolorów i lokalnych wartości;
liczniki długu nie mogą rosnąć. Obecność guarda nie zastępuje odbioru wizualnego.


## Wyjątek powierzchni Oura

`/oura` celowo izoluje motyw przez `.dark`, centruje treść w `max-w-3xl` i używa
wtórnych kart kontekstu. Nie pokazuj nazw tabel ani kolumn w widocznym UI.
Kontrakty danych i odbiór biometrii: [BIOMETRICS.md](surface-contracts/BIOMETRICS.md).
