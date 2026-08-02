# SPARKY — Functional iOS Design System

> **Cel tego pliku:** jedno miejsce które agent (AI lub człowiek) czyta PRZED dotknięciem kodu UI.
> Zawiera twarde reguły, kompletną listę tokenów i komponentów z propami.
>
> **Visual preview:** `/dev/design-system` — żywa galeria wszystkich wariantów (uruchom dev server).

---

## 0. Twarde reguły (agent + reviewer)

**Nigdy nie pisz:** `<button className="bg-primary text-white ...">`
**Zawsze używaj:** `<Button variant="primary">`

**Egzekucja:** ESLint `no-restricted-syntax` blokuje:
- **Każdy `<button>` poza `ui/`** → `<Button variant="...">` (guard strukturalny)
- `bg-rose-500`, `text-blue-400` itd. (hardkodowane kolory palety) → tokeny `bg-danger`, `text-info`
- `rgba(99,102,241,...)` / `rgba(79,70,229,...)` w className → tokeny `--primary-N` lub `color-mix()`
- `shadow-primary` na dowolnym elemencie → `<Button variant="primary">`
- `bg-primary + text-white + px/py` → `<Button variant="primary">`

**Wyjątki (NO_BUTTON_GUARD_EXCEPTIONS):** pliki gdzie `<button>` jest jedynym sensownym wyborem — drag handle, przełącznik zakładek, złożony widget interaktywny. Każde wyłączenie musi być uzasadnione w komentarzu i trafia do listy w `eslint.config.js`.

| ❌ Nie rób tego | ✅ Zamiast tego |
|---|---|
| `<button className="bg-rose-500 ...">` | `<Button variant="danger">` |
| `<div className="rounded-2xl border ... shadow">` (karta) | `<Card variant="surface">` lub `<Card variant="grouped">` |
| `<div className="fixed inset-0 z-50 ...">` (modal) | `<Modal isOpen={...} onClose={...}>` |
| `<div className="animate-spin rounded-full ...">` | `<Spinner size="md" />` |
| `<div className="animate-pulse ...">` (ładowanie) | `<Skeleton variant="text" />` |
| `bg-blue-500`, `text-rose-400`, `border-emerald-200` w className | Tokeny: `bg-danger`, `text-success`, `bg-surface-2` |
| `<span className="inline-flex items-center ... badge">` | `<Badge variant="count" count={5} />` |

**Dlaczego:** komponenty zapewniają spójne rozmiary, animacje, dark mode, accessibility. Raw HTML powoduje regresje (brak scale-on-active, brak a11y, brak dark mode).

---

## 1. Filozofia

- **Functional iOS jako baza:** SPARKY ma wyglądać jak aplikacja systemowa iOS,
  której Apple nie stworzyło — neutralny canvas, czyste powierzchnie, typografia
  systemowa i precyzyjna geometria.
- **Jedna nasycona powierzchnia prowadząca:** widok może mieć najwyżej jedną kartę
  `hero`, która pokazuje najważniejszy bieżący kontekst lub następny ruch.
- **Grouped list zamiast stosu kart:** elementy jednej domeny współdzielą powierzchnię
  i są rozdzielone cienkim separatorem. Nie tworzymy kart wewnątrz kart.
- **Kolor oznacza rolę:** niebieski to akcja, pomarańczowy kierunek, zielony wykonanie,
  fioletowy skupienie, czerwony błąd/destrukcja/stan krytyczny.
- **Zero dekoracji dla dekoracji:** materiał, cień, kolor i ruch muszą wyjaśniać
  hierarchię albo stan.

### 1.1 Zasady projektowania komponentów

Siedem reguł, które decydują „jak wygląda dobry komponent w SPARKY” — niezależnie
kto go pisze. Nowy komponent w `ui/` sprawdzany jest względem tej listy, nie tylko
względem tego, czy działa.

1. **Materialna uczciwość.** Afordancja klikalności przez kolor/kontrast/typografię, nie przez fałszywą głębię. Karty różnicują się przez `border` + przesunięcie tła (`--surface-2/3`), nie przez `box-shadow` na każdej z osobna. Cień/blur (`--shadow-float`, `.ios-glass-*`) zarezerwowany **tylko** dla naprawdę pływających warstw (modal, FAB, toast, sheet, sticky nav) — nigdy dla zwykłej karty w liście.
2. **Kształt jest funkcją roli, nie wyborem.** Grouped list ma 14px, hero 22px,
   sheet 28px. Pill jest tylko przełącznikiem, filtrem, statusem lub krótką akcją.
3. **Dyscyplina stanu.** Każdy interaktywny element ma stany zdefiniowane raz na
   poziomie prymitywu (`ControlPrimitives`/`Button`): default, hover, pressed
   (`scale(0.96)`, 0ms opóźnienia), focus, selected, loading, disabled i error.
4. **Treść jest bohaterem, chrome jest tłem.** Komponent wyświetlający dane (liczba, status, wykres) maksymalizuje wizualny ciężar danych i minimalizuje ozdobniki wokół nich — patrz `.stat-hero-number` / `ui/StatHero`. Dotyczy nie tylko statystyk: też np. jak `Badge` pokazuje status, jak `Card` pokazuje nagłówek.
5. **Ikony jako jeden system.** Jedna grubość obrysu w `lucide-react`, jeden rozmiar powiązany ze skalą tekstu obok (nie `size={13}` w jednym miejscu i `size={16}` dla tej samej hierarchii gdzie indziej), nigdy filled+outline zmieszane na tym samym poziomie hierarchii.
6. **Ruch ma znaczenie, nie dekorację.** Przed dodaniem animacji: *jak często użytkownik to zobaczy?* Element używany dziesiątki razy dziennie (checkbox w Todo, tab switch) — animacja prawie niewidoczna (100–150ms) albo żadna. Element rzadki (onboarding, pierwsza konfiguracja, pusty stan) — może mieć charakter. Nie każdy nowy komponent dostaje "fajną" animację niezależnie od kontekstu użycia.
7. **Zero komponentu bez tokenów.** Nowy komponent nigdy nie zaczyna się od "jaki kolor" — zaczyna się od "który semantyczny token pasuje" (`--primary`, `--color-danger`, `--surface-tonal`). Wybór koloru to wybór *roli*, nie wartości. Egzekwowane przez ESLint guard (§0), ale to jest źródłowa zasada, guard to tylko siatka bezpieczeństwa.

---

## 2. Tokeny (`src/index.css`)

Źródło prawdy: `src/index.css` → `:root`, `.dark`, `@theme`. Nie twórz nowych tokenów bez uzasadnienia.

### 2.1 Semantic color roles

Tailwind klasy: `bg-success`, `text-danger`, `border-warning`, `bg-info` itd.

| Token (light) | Wartość | Rola |
|---|---|---|
| `--primary` | `#007AFF` | Interakcja, link, focus, główna akcja |
| `--direction` / `--color-warning` | `#FF9500` | Aktualny kierunek, najbliższy ruch, ostrzeżenie |
| `--color-success` | `#34C759` | Wykonanie, sukces, pozytywne potwierdzenie |
| `--attention` | `#5856D6` | Skupienie i tryb uwagi |
| `--color-danger` | `#FF3B30` | Błąd, destrukcja albo stan krytyczny |
| `--color-info` | `var(--primary)` | Informacja i neutralny akcent interaktywny |

Dark mode używa dynamicznych odpowiedników iOS: blue `#0A84FF`, orange `#FF9F0A`,
green `#30D158`, purple `#5E5CE6`, red `#FF453A`.

### 2.2 Surface tokens

| Token (light) | Wartość | Kiedy używać |
|---|---|---|
| `--background` | `#F2F2F7` | Systemowy canvas aplikacji |
| `--surface-1` | `#FFFFFF` | Grouped list, karta i podstawowa powierzchnia |
| `--surface-2` | `#F2F2F7` | Inset i spokojne tło sekcji |
| `--surface-3` | `#E5E5EA` | Selected, kontrolka drugorzędna, separatorowa głębia |
| `--surface-tonal` | jasny niebieski | Tonalna powierzchnia akcji |
| `--material-floating` | translucent surface | Wyłącznie modal, sheet, popover, toolbar i tab bar |
| `--separator` | `rgb(60 60 67 / 29%)` | Separator wierszy i subtelna granica |

Dark mode: canvas `#000000`, powierzchnia `#1C1C1E`, podniesiona powierzchnia
`#2C2C2E`. Nie odwracamy mechanicznie jasnego motywu.

Tailwind: `bg-surface-1`, `bg-surface-2`, `bg-surface-3`.

### 2.3 Text tokens

| Token | Wartość | Kiedy używać |
|---|---|---|
| `--text-primary` | light: `#000000`, dark: `#FFFFFF` | Główny tekst, nagłówki |
| `--text-secondary` | system label secondary | Opisy i wtórne informacje |
| `--text-muted` | system label tertiary | Metadata, hinty, timestampy |
| `--text-tertiary` | `#99A1AF` | Najbardziej wyblakły tekst |

Tailwind: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-text-tertiary`.

### 2.4 Radius tokens

| Token | Wartość | Do czego |
|---|---|---|
| `--radius-sm` | `8px` | Tagi, chipy, badge |
| `--radius-md` | `12px` | Przyciski, inputy |
| `--radius-grouped` / `--radius-lg` | `14px` | Grouped list, zwykła powierzchnia |
| `--radius-hero` | `22px` | Pojedyncza nasycona karta prowadząca |
| `--radius-sheet` / `--radius-xl` | `28px` | Modale, sheety i duże warstwy pływające |
| `--radius-full` | `9999px` | Pill shape |

### 2.5 Shadow tokens

| Token | Do czego |
|---|---|
| `--shadow-card` | `none` — zwykłe powierzchnie nie udają unoszenia |
| `--shadow-card-hover` | Subtelny feedback tylko dla rzeczywiście interaktywnej powierzchni |
| `--shadow-card-accent` | Akcentowany cień karty |
| `--shadow-event-card` | Karty wydarzeń |
| `--shadow-float` | Unoszące się elementy (modale, FAB) |
| `--shadow-nav` | Nawigacja (sticky headers) |
| `--shadow-back-btn` | Przycisk wstecz |
| `--shadow-focus` | Focus ring na inputach (0 0 0 3px primary) |
| `--shadow-glow-primary` | Legacy; nie używać do nowego CTA ani aktywnej zakładki |
| `--shadow-accent-active` | Cień aktywnego panelu/strefy |

### 2.6 Motion tokens

| Token | Wartość | Kiedy |
|---|---|---|
| `--spring` | `cubic-bezier(0.2, 0, 0, 1)` | Spokojny ruch bez dekoracyjnego overshootu |
| `--ease-out` | `cubic-bezier(0, 0, 0, 1)` | Press, hover i krótkie wyjścia |
| `--motion-fast` | `120ms` | Press i hover |
| `--motion-medium` | `200ms` | Tab, karta, search |
| `--motion-slow` | `300ms` | Modal i większa zmiana powierzchni |

### 2.7 Font stack

| Token | Font | Do czego |
|---|---|---|
| `--font-sans` | `-apple-system`, BlinkMacSystemFont, SF Pro, system-ui | Body i UI |
| `--font-display` | ten sam stos systemowy | Nagłówki; hierarchię buduje rozmiar i waga |
| `--font-mono` | Geist Mono, JetBrains Mono | Dane liczbowe, timery |

### 2.8 Typography scale

Nigdy nie pisz `text-[10px]` — używaj tokenu. Tracking i leading zależą od rozmiaru:
duże tytuły są ciaśniejsze, body pozostaje blisko `0`.

| Token | Size | Kiedy używać |
|---|---|---|
| `text-3xs` | 9px | Wyłącznie skrajnie ograniczone statusy techniczne |
| `text-2xs` | 11px | Badge i metadata drugiego poziomu |
| `text-xs` | 13px | Labels i secondary metadata |
| `text-sm` | 15px | Form inputs, descriptions, body text |
| `text-base` | 17px | Primary body i wiersze list |
| `text-lg` | 20px | Nagłówki sekcji i kart |
| `text-xl` | 22px | Duże nagłówki |
| `text-2xl` | 28px | Display i hero text |
| `text-3xl` / `--text-screen-title` | 34px | Duży tytuł ekranu, waga 700, tracking `-0.022em` |
| `text-4xl` | 36px | Hero large |
| `text-5xl` | 48px | Splash |
| `text-6xl` | 56px | Splash large |

**Zasada:** body i wiersze mają czytać się jak systemowy iOS. Uppercase i mikroetykieta
nie mogą zastępować prawdziwej hierarchii.

### 2.9 Floating material

Szkło jest materiałem funkcjonalnym, nie stylem całej aplikacji.

| Powierzchnia | Materiał | Do czego |
|---|---|---|
| Zwykła / grouped | nieprzezroczysta `--surface-1` | Karty, listy, wiersze, formularze |
| Floating | `--material-floating` + blur + `--shadow-float` | Modal, sheet, popover, toolbar, tab bar |

Nie używaj szkła na karcie w przepływie treści, panelu formularza ani powierzchni,
która nie unosi się nad contentem. `prefers-reduced-transparency` i
`prefers-contrast: more` zawsze zamieniają materiał na pełne `--surface-solid`.

---

## 3. Komponenty `src/components/ui/`

### Central control contract

Globalne pokrÄ™tĹ‚a w `src/index.css` obejmujÄ… teraz:

- `--space-*` â€” gÄ™stoĹ›Ä‡ i rytm odstÄ™pĂłw,
- `--control-*`, `--touch-target` â€” wysokoĹ›ci kontrolek,
- `--sidebar-width`, `--content-*`, `--toolbar-height` â€” geometria aplikacji,
- `--blur-*`, `--opacity-*`, `--z-*` â€” materiaĹ‚ i warstwy,
- `--motion-*`, `--ease-*`, `--spring` â€” ruch oraz reakcja na input.

ObowiÄ…zkowe prymitywy: `Input`, `Select`, `Button`, `IconButton`, `Chip`, `Dialog`,
`Sheet`, `Card`, `DataCard`. ObowiÄ…zkowa kompozycja: `PageShell`, `PageToolbar`,
`ContentContainer`, `Section` oraz jeden z `ListPageTemplate`, `GridPageTemplate`,
`DashboardPageTemplate`, `TimelinePageTemplate`.

`npm run ratchet:frontend` mierzy zastany dĹ‚ug surowych kontrolek, arbitralnych wartoĹ›ci
i lokalnych deklaracji CSS. Liczniki nie mogÄ… rosnÄ…Ä‡; po osiÄ…gniÄ™ciu zera ratchet staje
siÄ™ bezwzglÄ™dnym guardem.

### Button

```tsx
import Button from '../ui/Button';

<Button variant="primary" size="md" icon={<Icon />} loading={false}>
  Tekst
</Button>
```

| Prop | Typ | Default | Opcje |
|---|---|---|---|
| `variant` | string | `'primary'` | `primary`, `secondary`, `outline`, `ghost`, `danger`, `tonal` |
| `size` | string | `'md'` | `sm`, `md`, `lg` |
| `loading` | boolean | `false` | Pokazuje spinner, disable |
| `icon` | ReactNode | — | Ikona obok tekstu |
| `iconPosition` | string | `'left'` | `left`, `right` |
| `disabled` | boolean | — | Native button attr |

**Kiedy哪.variant:**
- `primary` — główna akcja na ekranie (1 na ekran)
- `secondary` — drugorzędna akcja
- `outline` — alternatywa, mniej wizualna
- `ghost` — text-only, icon buttons, anulowanie
- `danger` — usuwanie, niszczące akcje
- `tonal` — delikatny fill z kolorowym tłem (empty state actions, tagi)

### Card

```tsx
import { Card } from '../ui/Card';

<Card variant="surface" padding="1rem" onClick={() => {}}>
  {children}
</Card>
```

| Prop | Typ | Default | Opcje |
|---|---|---|---|
| `variant` | CardVariant | `'surface'` | `surface`, `glass`, `immersive`, `canvas`, `receipt`, `outline`, `notice`, `danger`, `accent` |
| `padding` | string | `'1rem'` | Dowolny CSS padding |
| `onClick` | function | — | Dodaje `cursor-pointer` + `active:scale-[0.98]` |
| `as` | ElementType | `'div'` | Polimorficzny rendering |

**Variant guide:**
- `surface` — domyślna karta, bg-surface + border + shadow (bez blur)
- `glass` — frosted glass karta z backdrop-blur (glass-elevated level)
- `immersive` — ciemne tło (#0A0A0A), float shadow
- `canvas` — kropkowane tło (dot-grid)
- `receipt` — subtelna ramka, bez shadow
- `outline` — tylko border, transparent bg
- `notice` — amber tint + border (ostrzeżenia)
- `danger` — rose tint + border (błędy, krytyczne)
- `accent` — primary tint + border (wyróżnione)

### Badge

```tsx
import Badge from '../ui/Badge';

<Badge variant="count" count={5} />
<Badge variant="dot" color="#10B981" />
<Badge variant="tag">Pilne</Badge>
```

| Prop | Typ | Default | Opcje |
|---|---|---|---|
| `variant` | string | `'count'` | `count`, `dot`, `tag` |
| `count` | number | — | Liczba (count variant), >99 → "99+" |
| `color` | string | — | Override koloru (hex) |
| `children` | ReactNode | — | Tekst (tag variant) |

### Tabs

```tsx
import Tabs from '../ui/Tabs';

<Tabs tabs={[{ key: 'a', label: 'Tab A' }]} active={active} onChange={setActive} />
```

| Prop | Typ | Default |
|---|---|---|
| `tabs` | `{ key: string; label: string; icon?: ReactNode }[]` | — |
| `active` | string | — |
| `onChange` | `(key: string) => void` | — |

### Modal

```tsx
import Modal from '../ui/Modal';

<Modal isOpen={show} onClose={() => setShow(false)} title="Tytuł" size="md">
  {children}
</Modal>
```

| Prop | Typ | Default | Opcje |
|---|---|---|---|
| `isOpen` | boolean | — | |
| `onClose` | function | — | |
| `title` | ReactNode | — | |
| `subtitle` | ReactNode | — | Pixel-label nad tytułem |
| `size` | string | `'md'` | `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `full` |
| `showCloseButton` | boolean | `true` | |
| `closeOnBackdropClick` | boolean | `true` | |
| `padding` | string | `'p-5'` | |

### Spinner

```tsx
import Spinner from '../ui/Spinner';

<Spinner size="md" />
```

| Prop | Rozmiar | Wymiary |
|---|---|---|
| `sm` | 16×16px | border-2 |
| `md` | 32×32px | border-2 |
| `lg` | 48×48px | border-3 |

### Skeleton

```tsx
import Skeleton from '../ui/Skeleton';

<Skeleton variant="text" lines={3} />
<Skeleton variant="avatar" />
<Skeleton variant="card" lines={4} />
```

| Prop | Default | Opcje |
|---|---|---|
| `variant` | `'text'` | `text`, `avatar`, `card` |
| `lines` | `3` | Liczba linii |

### EmptyState

```tsx
import EmptyState from '../ui/EmptyState';

<EmptyState icon="📭" label="Brak danych" action={{ label: 'Dodaj', onClick: () => {} }} />
```

### Input

```tsx
import Input from '../ui/Input';

<Input placeholder="Tytuł..." size="md" icon={<Search size={14} />} error="Wymagane" />
```

| Prop | Typ | Default | Opcje |
|---|---|---|---|
| `size` | string | `'md'` | `sm`, `md`, `lg` |
| `icon` | ReactNode | — | Ikona po lewej stronie |
| `error` | string | — | Komunikat błędu pod inputem |
| `disabled` | boolean | — | Native input attr |

### Fab (Floating Action Button)

```tsx
import Fab from '../ui/Fab';

<Fab onClick={handleAdd} size="md" position="bottom-right">
  <Plus size={20} />
</Fab>
```

| Prop | Default | Opcje |
|---|---|---|
| `size` | `'md'` | `sm`, `md`, `lg` |
| `position` | `'bottom-right'` | `bottom-right`, `bottom-center`, `custom` |

### CharacterAvatar

```tsx
import { CharacterAvatar } from '../ui/CharacterAvatar';

<CharacterAvatar seed="Jakub" size={36} />
```

### BrandTitle

```tsx
import { BrandTitle } from '../ui/BrandTitle';

<BrandTitle className="text-[15px]" />
```

### Workspace shell

Widoki `todo`, `keep`, `links` i `kalendarz` muszą składać wspólny szkielet z:

- `shared/WorkspaceSidebar` — stała szerokość i zachowanie responsive/collapse,
- `shared/WorkspaceNavigation` — kanoniczna kolejność czterech domen i mobile bar,
- `shared/WorkspaceHeader` — wspólna wysokość, tytuł, back oraz slot akcji,
- `shared/WorkspaceSearch` — jeden kontrakt wyszukiwania,
- `ui/Tabs` — taby widoku i filtrów bez lokalnych kopii stylu.

Komponenty domenowe dostarczają wyłącznie zawartość, stan i akcje. Nie odtwarzają
lokalnie sidebara, searcha, headera ani tabów.

---

## 4. CSS Classes (niekomponentowe)

Te klasy CSS z `index.css` są używane bezpośrednio w JSX (nie przez `ui/` komponenty):

| Klasa | Zastosowanie |
|---|---|
| `.card` | Prosty bordered container z hover-lift (21 konsumentów) |
| `.surface-card` | Dwuwarstwowy cień + hover-lift |
| `.glass-structural` | Glass level 1 — sidebar, bottom-nav (blur 24px, 85% bg) |
| `.glass-elevated` | Glass level 2 — header, toolbar, sticky (blur 16px, 75% bg) |
| `.glass-floating` | Glass level 3 — modal, sheet, popover (blur 12px, 65% bg) |
| `.pixel-tile` | Ikona w zaokrąglonym kwadracie (tonal bg) |
| `.pixel-label` | Uppercase metadata (9px, bold, tracked) |
| `.nav-pill-active` | Aktywna pozycja nawigacji |
| `.btn-primary` | CSS button (legacy — preferuj `<Button>`) |
| `.btn-outline` | CSS button outline (legacy) |

---

## 5. Motion

| Interakcja | Czas | Easing |
|---|---|---|
| Press/tap feedback | 100-160ms | `scale(0.97)` na `:active` |
| Dropdown/picker | 150-250ms | `var(--ease-out)` |
| Modal/sheet — otwarcie | 200-400ms | `var(--spring)` |
| Modal/sheet — zamknięcie | ~60-70% otwarcia | `var(--ease-out)` |
| Toast | ~300-400ms | `ease` |

**Twarde zasady:**
1. Animować tylko `transform`/`opacity`.
2. Nigdy `scale(0)` — start od `scale(0.95)`.
3. CSS transitions (nie `@keyframes`) dla przerywalnego.
4. `prefers-reduced-motion` → crossfade.

---

## 6. Accessibility

- **Kontrast**: 4.5:1 normalny tekst, 3:1 duży (WCAG AA).
- **Touch targets**: min. 44×44px, min. 8px odstęp.
- **Focus**: widoczny ring 2-4px.
- **`aria-label`** na przyciskach ikonowych.
- **Escape**: każdy modal ma cancel/back.

---

## 7. Zasady dla agentów AI

Przed napisaniem/edytowaniem kodu UI:

1. **Sprawdź czy komponent istnieje** w `src/components/ui/` zanim napiszesz nowy.
2. **Używaj tokenów** (`bg-danger`, `text-success`, `bg-surface-2`) zamiast hardkodowanych kolorów (`bg-rose-500`, `text-emerald-400`).
3. **Nigdy nie pisz `rgba(99,102,241,...)` — użyj `var(--primary-N)` lub `color-mix(in srgb, var(--primary) N%, transparent)`. To samo w inline styles i SVG attrs.
4. **Variant > boolean** — jeśli komponent ma warianty, używaj `variant="danger"` zamiast `isDanger={true}`.
5. **Preview przed commit:** uruchom `/dev/design-system` żeby zobaczyć czy nowy wariant pasuje wizualnie.
6. **Dark mode:** tokeny automatycznie się przełączają. Nie pisz `dark:bg-...` ręcznie — użyj tokena.

---

*Powiązane: [`FRONTEND_GUIDE.md`](FRONTEND_GUIDE.md) (organizacja kodu, ESLint, domeny), galeria: `/dev/design-system`*
