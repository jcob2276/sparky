# Active Work

## Priorytet: Notatki — Apple Notes organization pack

### Cel

Rozwinąć istniejące Notatki bez budowania osobnego pakietu biurowego. Użytkownik ma
otrzymać naturalną organizację według czasu, przewidywalne sortowanie, prawdziwą
hierarchię folderów, mobilne gesty, zapisane Smart Folders, pełniejsze wyszukiwanie
oraz eksport i udostępnianie kopii. Wszystkie operacje muszą korzystać z jednego
modelu danych na PWA i APK.

### Zatwierdzony model produktu

1. **Grupowanie i sortowanie**
   - Przypięte pozostają osobną grupą nad pozostałymi notatkami.
   - Pozostałe notatki są domyślnie grupowane według pola wybranego do sortowania:
     `Dzisiaj`, `Wczoraj`, `Poprzednie 7 dni`, `Poprzednie 30 dni`, a następnie
     pełne nazwy miesięcy z rokiem, jeśli rok różni się od bieżącego.
   - Użytkownik wybiera `Data edycji`, `Data utworzenia` albo `Tytuł` oraz kierunek.
     Grupowanie dat jest dostępne tylko dla sortowania datą; tytuł wyłącza grupy dat.
   - Ustawienia widoku są zapisywane per użytkownik i folder, z fallbackiem:
     lista, data edycji, najnowsze najpierw, grupowanie włączone.

2. **Foldery**
   - Folder ma opcjonalnego rodzica i stabilną pozycję wśród rodzeństwa.
   - Można utworzyć folder główny lub podfolder, zmienić nazwę, przenieść go do
     innego folderu albo na poziom główny oraz zmienić kolejność.
   - Cykl rodzicielski jest blokowany w domenie i bazie; folder nie może zostać
     własnym przodkiem.
   - Usunięcie folderu nie usuwa notatek. Notatki trafiają do folderu nadrzędnego,
     a przy braku rodzica do `Bez folderu`; podfoldery przesuwają się o poziom wyżej.
   - Notatkę można przenieść z menu, edytora oraz mobilnej akcji swipe.

3. **Gesty mobilne**
   - Swipe w prawo ujawnia jedną akcję `Przypnij`/`Odepnij`; przekroczenie progu
     zatwierdza akcję po puszczeniu.
   - Swipe w lewo ujawnia `Przenieś` i `Usuń`; gest sam nie usuwa notatki.
   - Ruch śledzi palec 1:1 po przekroczeniu progu kierunku, daje się przerwać i ma
     ograniczony rubber-band. Scroll pionowy wygrywa, jeśli pierwszy ruch jest pionowy.
   - Te same operacje pozostają dostępne przez menu i klawiaturę. Reduced motion
     usuwa sprężynę, ale zachowuje natychmiastowy feedback.

4. **Tagi i Smart Folders**
   - Tag można dodać, usunąć i zmienić jego nazwę we wszystkich notatkach.
   - Przeglądarka tagów obsługuje wiele tagów w trybie `wszystkie` lub `dowolny`.
   - Smart Folder jest zapisaną regułą, nie kontenerem. Pierwsza wersja obsługuje:
     tagi, folder bazowy z opcjonalnymi potomkami, obecność załączników, stan blokady
     oraz zakres aktualizacji.
   - Smart Folder można utworzyć, edytować, zmienić nazwę i usunąć. Nie można ręcznie
     przenieść do niego notatki; UI wyjaśnia, która reguła dopasowała notatkę.

5. **Wyszukiwanie**
   - Jeden indeks obejmuje tytuł, treść, tagi, nazwy załączników, OCR i transkrypcje.
   - Zablokowana notatka udostępnia wyszukiwarce tylko tytuł.
   - Wyszukiwanie działa we wszystkich notatkach albo w aktywnym folderze/Smart Folderze
     i nie zmienia reguł sortowania.

6. **Eksport i udostępnianie**
   - Pojedynczą notatkę można wyeksportować jako Markdown lub PDF.
   - Markdown zawiera tytuł, treść, tagi, folder i odnośniki do dołączonych plików.
   - PDF jest czytelnym, statycznym wydrukiem notatki; zakres nie obejmuje edycji PDF.
   - `Udostępnij kopię` używa Web Share API z plikiem, jeśli platforma to wspiera,
     następnie Web Share z tekstem, a ostatecznie pobiera plik.
   - Eksport całego archiwum nadal tworzy ZIP i zostaje rozszerzony o Markdown.

7. **Rysowanie i pismo odręczne**
   - Edytor otwiera pełnoekranowy arkusz Markup z paska załączników i zapisuje
     edytowalny dokument wektorowy, a nie wyłącznie spłaszczony obraz.
   - Narzędzia obejmują pióro, ołówek, pióro wieczne, marker, zakreślacz, gumkę
     punktową i obiektową, lasso, paletę, grubość, krycie, linijkę oraz cofanie/ponawianie.
   - Lasso pozwala przesuwać, skalować, obracać, duplikować i usuwać zaznaczone kreski.
     Pinch-to-zoom i przesuwanie działają niezależnie od aktywnego narzędzia.
   - Przytrzymanie po narysowaniu rozpoznawalnej linii, strzałki, prostokąta, elipsy
     lub wielokąta proponuje geometrycznie wyrównany kształt bez niszczenia oryginału.
   - APK używa natywnego strumienia Android `MotionEvent`: typ wskaźnika, nacisk,
     pochylenie, orientacja, przycisk i gumka rysika oraz punkty historyczne. Dłoń jest
     odrzucana, gdy aktywny jest rysik. PWA używa Pointer Events i współdzielonego silnika.
   - OCR działa na wybranym obszarze lub całym rysunku. Wynik zasila wyszukiwanie;
     użytkownik może skopiować tekst albo zastąpić zaznaczone pismo blokiem tekstowym.
   - Zapis tworzy wersjonowany dokument JSON oraz PNG podglądu. Ponowne otwarcie
     przywraca kreski, warstwy, viewport i historię potrzebną do dalszej edycji.
   - Eksport rysunku obsługuje PNG i PDF; eksport notatki osadza podgląd w Markdown/PDF.

### Architektura i dane

- `src/components/notes/noteOrganization.ts` jest czystą warstwą grupowania,
  sortowania i filtrowania; nie zależy od Reacta ani Supabase.
- `src/components/notes/NoteCollectionSections.tsx` renderuje te same grupy w liście
  i galerii, bez duplikowania reguł dat.
- `src/components/notes/NoteViewOptions.tsx` kontroluje sortowanie, kierunek i grupowanie.
- `src/components/notes/SwipeableNoteRow.tsx` izoluje Pointer Events i udostępnia
  semantyczne akcje; `NoteRow` pozostaje prezentacją notatki.
- `src/lib/noteFoldersApi.ts` pozostaje jedyną ścieżką zapisu folderów. Tabela
  `note_folders` otrzymuje `parent_id` i `position` oraz constraint przeciw self-parent.
- Nowa tabela `note_smart_folders` przechowuje nazwę, pozycję i wersjonowaną regułę JSON.
  Reguła jest walidowana w `src/lib/noteSmartFolders.ts` przed zapisem i odczytem.
- `note_attachments.transcript` zostaje dołączone do kanonicznego zapytania notatek
  i mapowane do pola `attachment_text` razem z OCR.
- Preferencje kolekcji są zapisywane w istniejących ustawieniach użytkownika; komponenty
  nie zapisują bezpośrednio do Supabase.
- `src/lib/notesExport.ts` pozostaje jedyną warstwą eksportu i udostępniania.
- `src/components/notes/drawing/drawingModel.ts` definiuje wersjonowany dokument,
  kreski, kształty, grupy, warstwy, transformacje oraz migracje schematu bez Reacta.
- `src/components/notes/drawing/drawingEngine.ts` obsługuje wygładzanie punktów,
  nacisk, gumkę, hit-testing, lasso, historię i rozpoznawanie prostych kształtów.
- Małe komponenty `DrawingEditor`, `DrawingCanvas`, `DrawingToolbar`, `DrawingInspector`
  i `DrawingOcrActions` składają UI; żaden plik nie łączy zapisu danych z renderowaniem.
- Tabela `note_drawings` przechowuje `schema_version`, dokument JSON, ścieżkę PNG,
  tekst OCR, rozmiar logiczny i właściciela. Podgląd używa istniejącego prywatnego bucketu
  załączników i signed URL; RLS ogranicza każdy rekord do właściciela notatki.
- `android/app/src/main/java/app/vanguard/os/StylusInputPlugin.java` oraz
  `src/lib/native/stylusInputPlugin.ts` tworzą wąski most Capacitor. `MainActivity`
  przekazuje wyłącznie zdarzenia rysika z punktami historycznymi; cały model i rendering
  pozostają wspólne w TypeScript.

### Obsługa błędów i bezpieczeństwo

- Nieudany zapis ustawień nie blokuje widoku; UI zachowuje bieżący wybór i pokazuje toast.
- Nieudane przeniesienie folderu lub notatki przywraca poprzedni stan optymistyczny.
- Destrukcyjny swipe tylko ujawnia przycisk; usunięcie notatki nadal używa istniejącego
  potwierdzenia i przenosi do Kosza.
- Usunięcie folderu wymaga potwierdzenia z opisem miejsca docelowego notatek i podfolderów.
- Wadliwa reguła Smart Foldera jest odrzucana i nie może rozszerzyć zapytania poza dane
  właściciela. RLS obowiązuje dla folderów, Smart Folders, notatek i załączników.
- Eksport zablokowanej notatki jest dostępny dopiero po jej odblokowaniu.
- Niedostępny nacisk lub pochylenie nie blokują rysowania; silnik stosuje jawny profil
  fallback. Przerwanie aplikacji zachowuje lokalny szkic rysunku i proponuje odzyskanie.
- OCR nigdy nie zastępuje kresek automatycznie. Zamiana pisma na tekst wymaga akcji
  użytkownika i pokazuje wynik przed zatwierdzeniem.
- Dokument rysunku ma limit rozmiaru, okresowe checkpointy i kompaktowanie historii,
  aby duże płótno nie blokowało WebView ani synchronizacji.

### Testy akceptacyjne

- Granice czasu w strefie Europe/Warsaw przypisują notatkę dokładnie do jednej grupy,
  także na przełomie miesiąca, roku i zmiany czasu.
- Każda kombinacja pola sortowania i kierunku jest deterministyczna; remisem jest `id`.
- Przełączenie na tytuł wyłącza grupowanie dat, a powrót do daty przywraca wybór użytkownika.
- Folderu nie da się przenieść do siebie ani potomka; po usunięciu żadna notatka i żaden
  podfolder nie zostają osierocone.
- Swipe pionowy nie uruchamia akcji, swipe poziomy jest odwracalny, a usunięcie wymaga tapnięcia.
- Reguły Smart Folderów poprawnie łączą tagi `all`/`any`, potomków folderu, załączniki,
  blokadę i czas.
- Wyszukanie słowa występującego wyłącznie w transkrypcji zwraca notatkę, ale zablokowana
  notatka nie ujawnia treści transkrypcji.
- Eksport Markdown i PDF zachowuje polskie znaki; system share i fallback pobrania
  dostarczają tę samą treść.
- Widoki 390 × 844 i 1440 × 900 nie mają poziomego overflow, akcje mają minimum 44 px,
  a lista, galeria, menu oraz edytor zachowują poprawne przejścia.
- Ten sam dokument rysunku renderuje identyczne położenie kresek w PWA i APK przy
  różnych DPR; eksport PNG/PDF zachowuje kolory, krycie i polskie znaki OCR.
- Testy silnika obejmują nacisk, punkty historyczne, wygładzenie, gumkę, lasso,
  transformacje, undo/redo, migrację schematu i deterministyczne rozpoznanie kształtów.
- Test Android potwierdza mapowanie `MotionEvent` rysika, gumki i dłoni; test integracyjny
  potwierdza, że natywny strumień oraz Pointer Events tworzą ten sam format punktów.
- Utrata sieci lub ubicie APK podczas rysowania nie usuwa szkicu; po zapisie rysunek
  otwiera się ponownie jako edytowalny i jego OCR jest dostępny w wyszukiwaniu.

### Kolejność implementacji

1. Czysty model grupowania, sortowania i preferencji oraz UI opcji widoku.
2. Migracja i API hierarchii folderów, następnie drzewo i operacje UI.
3. Swipe actions korzystające z istniejących mutacji notatki.
4. Wielokrotne tagi i wersjonowane Smart Folders.
5. Transkrypcje w zapytaniu i wyszukiwaniu.
6. Markdown, PDF i systemowe udostępnianie.
7. Wektorowy model i silnik Markup, następnie UI płótna i zapis szkiców.
8. Natywny strumień rysika APK, palm rejection i zgodność z fallbackiem PWA.
9. OCR pisma, zamiana na tekst oraz eksport PNG/PDF.
10. Pełna weryfikacja testów, RLS, mobile/desktop, APK i stanów błędu.

### Kryterium ukończenia

Pakiet jest gotowy dopiero wtedy, gdy wszystkie części celu działają na wspólnych
danych w PWA i APK, każda operacja ma alternatywę bez gestu, migracje zachowują istniejące
notatki i foldery, a testy oraz ręczna walidacja potwierdzają pełny przepływ od organizacji
do eksportu. Rysunek musi pozostać edytowalny, odporny na przerwanie i korzystać z pełnych
danych rysika w APK. Sam wygląd, płaski PNG lub lokalny stan bez synchronizacji nie
spełniają kryterium.

# Notes Organization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dostarczyć grupy dat, zapamiętane sortowanie, hierarchię folderów, wielokrotne tagi, Smart Folders i bezpieczne gesty mobilne.

**Architecture:** Sortowanie i filtrowanie są czystą domeną, a komponenty renderują wynik i wywołują wyłącznie API z `src/lib`. Jedna migracja rozszerza foldery i dodaje Smart Folders; swipe ponownie wykorzystuje istniejące mutacje notatek.

**Tech Stack:** React 19, TypeScript 6, TanStack Query, Supabase/Postgres, Vitest, Testing Library, Pointer Events.

## Global Constraints

- Nowe pliki frontendowe mają mniej niż 300 linii i jedną odpowiedzialność.
- Komponenty nie wywołują Supabase, `window.confirm()` ani `window.alert()`.
- Lista i galeria korzystają z jednego modelu organizacji; każda akcja gestowa ma odpowiednik w menu i klawiaturze.
- Migracja zachowuje istniejące dane, RLS ogranicza dane do właściciela, a każdy etap zaczyna się testem, który najpierw ponosi oczekiwaną porażkę.

---

### Task 1: Model organizacji kolekcji

**Files:**
- Create: `src/components/notes/noteOrganization.ts`
- Test: `src/components/notes/noteOrganization.test.ts`
- Modify: `src/components/notes/keepUtils.ts`

**Interfaces:**
- Consumes: `Note` oraz funkcje strefy Europe/Warsaw z `src/lib/date.ts`.
- Produces: `NoteSortField`, `NoteSortDirection`, `NoteCollectionPreferences`, `NoteSection`, `sortAndGroupNotes(notes, preferences, now)` i `filterNotesByTags(notes, tags, mode)`.

- [ ] **Step 1: Napisz failing test granic dat, pinów, polskiego tytułu i remisu po `id`.**
```ts
expect(sortAndGroupNotes(notes, defaults, now).map(s => s.key)).toEqual(['pinned','today','yesterday','previous-7-days','previous-30-days','2026-06']);
expect(sortAndGroupNotes(tied, defaults, now)[0].notes.map(n => n.id)).toEqual(['a','b']);
```
- [ ] **Step 2: Uruchom `npm test -- src/components/notes/noteOrganization.test.ts`; oczekuj FAIL z braku modułu.**
- [ ] **Step 3: Zaimplementuj rozłączne przedziały, `localeCompare('pl')`, wyłączenie grup przy tytule oraz filtry tagów `all`/`any`.**
```ts
export function sortAndGroupNotes(notes: Note[], preferences: NoteCollectionPreferences, now: Date): NoteSection[];
export function filterNotesByTags(notes: Note[], tags: string[], mode: 'all' | 'any'): Note[];
```
- [ ] **Step 4: Uruchom test modułu i `keepUtils.test.ts`; oczekuj PASS.**
- [ ] **Step 5: Commit `feat(notes): add collection organization model` tylko z plikami tego zadania.**

### Task 2: Sekcje i opcje widoku

**Files:**
- Create/Test: `src/components/notes/NoteCollectionSections.tsx`, `src/components/notes/NoteCollectionSections.test.tsx`
- Create/Test: `src/components/notes/NoteViewOptions.tsx`, `src/components/notes/NoteViewOptions.test.tsx`
- Modify: `src/components/notes/SplitNotesView.tsx`, `src/components/notes/KeepHeader.tsx`, `src/components/notes/KeepHeader.test.tsx`, `src/components/notes/notes.css`

**Interfaces:** Consumes `NoteSection[]`; produces `NoteCollectionSections` wspólne dla listy/galerii i `NoteViewOptions({ value, onChange })`.

- [ ] **Step 1: Napisz failing tests nagłówków sekcji i menu radiowego.**
```tsx
expect(screen.getByRole('heading', { name: 'Dzisiaj' })).toBeVisible();
await user.click(screen.getByRole('menuitemradio', { name: 'Tytuł' }));
expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sortField: 'title', groupByDate: false }));
```
- [ ] **Step 2: Uruchom oba nowe testy; oczekuj FAIL z brakujących komponentów.**
- [ ] **Step 3: Zbuduj semantyczne sekcje i menu zamykane przez Escape/klik poza; zastąp ręczne grupy w `SplitNotesView`.**
- [ ] **Step 4: Uruchom nowe testy, `KeepHeader.test.tsx`, `SplitNotesView.test.tsx` i `npm run typecheck:ui`; oczekuj PASS.**
- [ ] **Step 5: Commit `feat(notes): add grouped collection views`.**

### Task 3: Preferencje per użytkownik i folder

**Files:**
- Create: `supabase/migrations/20260801130000_notes_view_preferences.sql`
- Create/Test: `src/lib/noteViewPreferences.ts`, `src/lib/noteViewPreferences.test.ts`
- Modify: `src/lib/database.types.ts`, `supabase/functions/_shared/database.types.ts`
- Modify: `src/lib/userSettingsApi.ts`, `src/components/notes/hooks/useKeepView.ts`, `src/components/notes/Keep.tsx`

**Interfaces:** Produces `getCollectionPreferenceKey(folderId)`, `parseNoteViewPreferences(value)`, `fetchNoteViewPreferences(userId)` i `saveNoteViewPreferences(userId, map)`.

- [ ] **Step 1: Napisz failing test fallbacku i kluczy `all`/`folder:<id>`.**
```ts
expect(parseNoteViewPreferences({ sortField: 'broken' })).toEqual(DEFAULT_NOTE_COLLECTION_PREFERENCES);
expect(getCollectionPreferenceKey('f1')).toBe('folder:f1');
```
- [ ] **Step 2: Dodaj kolumnę `notes_view_preferences jsonb not null default '{}'::jsonb` do `user_settings`, uruchom `npm run db:update-types`, a potem zaimplementuj walidowany zapis bez kasowania innych pól.**
- [ ] **Step 3: Podłącz optymistyczny wybór; błąd pokazuje `notify('Nie udało się zapisać ustawień widoku', 'error')`.**
- [ ] **Step 4: Uruchom test, `npm run typecheck:ui` i `npm run db:check-drift`; oczekuj PASS lub jawnej informacji o niewdrożonej lokalnej migracji.**
- [ ] **Step 5: Commit `feat(notes): persist collection preferences`.**

### Task 4: Hierarchia folderów i migracja Smart Folders

**Files:**
- Create: `supabase/migrations/20260801131000_notes_organization.sql`
- Modify: `src/lib/database.types.ts`, `supabase/functions/_shared/database.types.ts`, `src/lib/noteFoldersApi.ts`
- Test: `src/lib/noteFoldersApi.test.ts`

**Interfaces:** Produces `createNoteFolder(userId,name,parentId?)`, `renameNoteFolder`, `moveNoteFolder`, `deleteNoteFolder`, `buildFolderTree` oraz tabelę `note_smart_folders` z wersjonowaną regułą JSON.

- [ ] **Step 1: Napisz failing test drzewa i blokady przeniesienia rodzica do potomka.**
```ts
expect(buildFolderTree(folders)[0].children[0].id).toBe('child');
expect(() => assertValidFolderMove(folders, 'root', 'child')).toThrow();
```
- [ ] **Step 2: Dodaj `parent_id`, `position`, indeks, constraint self-parent, trigger antycykliczny, RLS i transakcyjne RPC usunięcia przenoszące notatki/dzieci poziom wyżej.**
- [ ] **Step 3: Dodaj `note_smart_folders(id,user_id,name,position,rule,created_at,updated_at)` z RLS oraz walidacją właściciela folderu bazowego.**
- [ ] **Step 4: Uruchom `npm run db:update-types`, zaimplementuj API, następnie test i `npm run db:check-drift`; różnicy schematu nie ignoruj.**
- [ ] **Step 5: Commit `feat(notes): add hierarchical folders and smart folder storage`.**

### Task 5: Drzewo folderów w UI

**Files:**
- Create/Test: `src/components/notes/NoteFolderTree.tsx`, `src/components/notes/NoteFolderTree.test.tsx`
- Create: `src/components/notes/NoteFolderMenu.tsx`
- Modify: `src/components/notes/KeepSidebar.tsx`, `src/components/notes/Keep.tsx`, `src/components/notes/InlineEditor.tsx`, `src/components/notes/notes.css`

- [ ] **Step 1: Napisz failing test `role=tree/treeitem`, rozwijania, zmiany nazwy i tekstu potwierdzenia usunięcia.**
```tsx
expect(screen.getByRole('treeitem', { name: 'Praca' })).toHaveAttribute('aria-expanded','true');
await user.click(screen.getByRole('menuitem', { name: 'Zmień nazwę' }));
```
- [ ] **Step 2: Zbuduj drzewo i menu `Nowy podfolder/Zmień nazwę/Przenieś/Usuń` z `confirmDialog()`, przywracaniem stanu po błędzie i pickerem folderu w edytorze.**
- [ ] **Step 3: Uruchom test, `InlineEditor.mobile-layout.test.tsx`, typecheck i `npm run ratchet:frontend`; oczekuj PASS.**
- [ ] **Step 4: Commit `feat(notes): add folder tree actions`.**

### Task 6: Multi-tagi i Smart Folders

**Files:**
- Create/Test: `src/lib/noteSmartFolders.ts`, `src/lib/noteSmartFolders.test.ts`
- Create/Test: `src/components/notes/SmartFolderEditor.tsx`, `src/components/notes/SmartFolderEditor.test.tsx`
- Create: `src/components/notes/TagFilterControl.tsx`
- Modify: `src/components/notes/KeepSidebar.tsx`, `src/components/notes/hooks/useKeepView.ts`, `src/components/notes/hooks/useNotesMutations.ts`, `src/components/notes/Keep.tsx`

**Interfaces:** Produces `SmartFolderRuleV1`, `parseSmartFolderRule`, `matchesSmartFolder`, CRUD `useNoteSmartFolders` i filtr `{ tags, mode: 'all'|'any' }`.

- [ ] **Step 1: Napisz failing test wersji reguły oraz predykatów tag/folder/potomkowie/załącznik/blokada/czas.**
```ts
expect(matchesSmartFolder(note, rule, descendants)).toBe(true);
expect(() => parseSmartFolderRule({ version: 2 })).toThrow('Nieobsługiwana wersja Smart Folderu.');
```
- [ ] **Step 2: Zaimplementuj parser i CRUD w `src/lib`; Smart Folder nie jest celem przeniesienia notatki.**
- [ ] **Step 3: Napisz failing test multi-tagów, zbuduj kontrolkę i formularz; globalna zmiana nazwy podmienia dokładne tagi i usuwa duplikaty.**
- [ ] **Step 4: Uruchom testy, typecheck oraz `rg "supabase\.from|supabase\.functions|window\.confirm|window\.alert" src/components/notes`; oczekuj zero zakazanych wywołań.**
- [ ] **Step 5: Commit `feat(notes): add smart folders and tag filters`.**

### Task 7: Gesty mobilne i walidacja pakietu

**Files:**
- Create/Test: `src/components/notes/SwipeableNoteRow.tsx`, `src/components/notes/SwipeableNoteRow.test.tsx`
- Modify: `src/components/notes/NoteCollectionSections.tsx`, `src/components/notes/NoteQuickActions.tsx`, `src/components/notes/notes.css`

**Interfaces:** Produces swipe z progiem 72 px i maksymalnym odsunięciem 152 px; prawo przypina, lewo tylko odsłania `Przenieś` i `Usuń`.

- [ ] **Step 1: Napisz failing test blokady osi, anulowania i braku automatycznego usunięcia.**
```tsx
fireEvent.pointerMove(row,{pointerId:1,clientX:90,clientY:104});
fireEvent.pointerUp(row,{pointerId:1,clientX:90,clientY:104});
expect(onDelete).not.toHaveBeenCalled();
expect(screen.getByRole('button',{name:'Usuń'})).toBeVisible();
```
- [ ] **Step 2: Zaimplementuj Pointer Events, rubber-band, Escape, reduced motion i odpowiedniki w `NoteQuickActions`.**
- [ ] **Step 3: Uruchom `npm test -- src/components/notes src/lib/noteFoldersApi.test.ts src/lib/noteSmartFolders.test.ts src/lib/noteViewPreferences.test.ts`; oczekuj PASS.**
- [ ] **Step 4: Uruchom `npm run typecheck:ui && npm run lint && npm run build && npm run ratchet:frontend`; oczekuj PASS.**
- [ ] **Step 5: Ręcznie sprawdź 390×844 i 1440×900: overflow, sekcje, trwałość opcji, klawiaturę, swipe, foldery i Smart Folders.**
- [ ] **Step 6: Commit `feat(notes): add mobile collection gestures`.**

## Następne samodzielne plany

Po walidacji tego działającego pionu dopisujemy tutaj dwa równie szczegółowe plany: **Notes Search, Export & Share** (transkrypcje, Markdown, PDF, ZIP, system share) oraz **Notes Markup & Android Stylus** (wektorowy dokument, autosave, płótno, natywny rysik, OCR i eksport rysunków).

## Priorytet: Healthspan v2 — metodologia, tempo, Garmin i trajektoria

### Cel

Zastąpić dekoracyjnie precyzyjny „Pace of Aging” transparentnym `Tempem Healthspan`,
które mierzy zmianę kondycji funkcjonalnej na podstawie porównywalnych danych
podłużnych. Użytkownik ma widzieć historię wyniku, zakres niepewności, pokrycie danych,
źródła oraz czynniki wpływu. Produkt pozostaje narzędziem wellness i samoobserwacji,
nie klinicznym zegarem biologicznym.

### Zatwierdzony model produktu

1. **Nazewnictwo i granice twierdzeń**
   - UI używa nazw `Wiek funkcjonalny` oraz `Tempo Healthspan`.
   - System nie nazywa wyniku laboratoryjnym lub biologicznym `Pace of Aging`.
   - Liczba `×` jest pokazywana wyłącznie po spełnieniu progów jakości; wcześniej
     widoczny jest stan `Kalibracja` z brakującymi sygnałami.
   - Każdy wynik pokazuje zakres dat, źródła, N, wersję modelu oraz confidence.

2. **Metodologia evidence-informed**
   - Każdy contributor ma wersjonowany wpis metodologii: jednostkę, benchmark,
     funkcję punktacji, maksymalny wpływ, wymagane N, limit świeżości i źródła.
   - Ruch i siła odwołują się do WHO: 150–300 minut umiarkowanej aktywności
     tygodniowo lub ekwiwalent oraz trening siłowy co najmniej dwa razy w tygodniu.
   - Sen odwołuje się do konsensusu AASM/SRS: regularnie co najmniej siedem godzin
     dla zdrowych dorosłych, bez arbitralnego karania dłuższego snu bez kontekstu.
   - VO₂ max jest interpretowane według wieku, płci i jakości źródła; dane z zegarka
     są estymatą urządzenia, nie wynikiem CPET.
   - Wagi nie udają wyliczonego ryzyka śmierci ani lat życia. Wiek funkcjonalny jest
     ograniczoną transformacją wyniku wellness z jawnym przedziałem niepewności.

3. **Tempo Healthspan**
   - Wejściem są niezmienne dzienne snapshoty tej samej wersji modelu.
   - Okno ostatnie obejmuje 28 dni, a baseline poprzednie 56–84 dni.
   - Porównanie używa przecięcia contributorów obecnych w obu oknach; zmiana pokrycia
     danych nie może sama wygenerować poprawy lub pogorszenia.
   - Trend używa median tygodniowych i odpornego nachylenia zamiast jednej różnicy
     średnich. Minimalny próg to cztery tygodnie danych ostatnich i osiem tygodni
     baseline oraz co najmniej trzy wspólne domeny.
   - Choroba, podróż, alkohol i nietypowy trening są kontekstem obniżającym confidence.
     Nie są automatycznie interpretowane jako przyczyna zmiany.
   - Wynik zwraca kierunek, wielkość zmiany, confidence, N, zakres dat, wspólne domeny
     i przyczyny kalibracji. `multiplier` jest opcjonalny.

4. **Garmin jako źródło kanoniczne**
   - Adapter Garmin mapuje VO₂ max, strefy HR, czas aktywności, intensywność,
     Training Effect i dostępne obciążenie do wspólnego modelu dowodów.
   - Deduplikacja grupuje tę samą aktywność Garmin/Strava po zewnętrznym ID, czasie,
     typie i zbliżonym czasie trwania.
   - Dla VO₂ max i szczegółów treningu wygrywa najświeższy Garmin o wystarczającej
     jakości; Strava uzupełnia aktywności, których Garmin nie dostarczył.
   - Każdy contributor zachowuje `source`, `measuredAt`, `sampleCount`, `quality`
     oraz identyfikatory wejściowych rekordów.

5. **Historia i trajektoria**
   - Widok Healthspan zawiera wykres 12 tygodni, 6 miesięcy i roku.
   - Pokazuje Healthspan Score, przedział wieku funkcjonalnego, Tempo Healthspan,
     confidence oraz pokrycie danych.
   - Szczegół punktu pokazuje contributorów, źródła i kontekst tego dnia.
   - Zmiana wersji modelu nie przelicza starych snapshotów po cichu; wykres oznacza
     granicę wersji i nie łączy różnych wersji jedną linią trendu.
   - Brak historii, luki i błędy źródeł pozostają widocznymi stanami.

### Architektura

- `packages/domain/src/healthspanMethodology.ts` jest wersjonowanym rejestrem
  metodologii bez zależności od Reacta i Supabase.
- `packages/domain/src/healthspanTrend.ts` oblicza trend wyłącznie z gotowych
  snapshotów i zwraca jawny stan kalibracji.
- `src/lib/healthspanGarminProjection.ts` odpowiada za mapowanie i deduplikację Garmin.
- `src/lib/healthspanApi.ts` składa dane i zapisuje snapshot, ale nie zawiera wzorów.
- `src/lib/healthspanHistoryApi.ts` pobiera historię i buduje model wykresu.
- PWA i APK uruchamiają ten sam czysty silnik TypeScript na urządzeniu; APK może
  przeliczyć profil po synchronizacji i offline, bez równoległej implementacji Kotlin.
- `HealthspanExperienceContainer` pozostaje kontenerem danych; wykres i metodologia
  są czystymi komponentami prezentacyjnymi.
- Istniejące tabele `healthspan_snapshots`, `healthspan_checkins` i
  `healthspan_levers` są rozszerzane, nie duplikowane.

### Źródła metodologiczne

- WHO, *Guidelines on physical activity and sedentary behaviour*:
  https://www.who.int/publications/i/item/9789240014886
- AASM/SRS, *Recommended Amount of Sleep for a Healthy Adult*:
  https://aasm.org/resources/pdf/pressroom/adult-sleep-duration-consensus.pdf
- JACC, *Cardiorespiratory Fitness and Mortality in Healthy Men and Women*:
  https://www.jacc.org/doi/10.1016/j.jacc.2018.08.2166
- eLife, *DunedinPACE, a DNA methylation biomarker of the pace of aging*:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC8853656/

### Obsługa błędów i guardraile

- Brak odpowiedniego N zwraca `calibrating`, nigdy sztuczne `1.00×`.
- Błąd jednego źródła nie usuwa pozostałych danych, ale obniża coverage i jest widoczny.
- Dane ręczne nie nadpisują świeżych danych urządzenia; uzupełniają brak.
- Snapshot zapisuje wejściowe podsumowanie i wersję metodologii potrzebne do audytu.
- Dźwignie wynikają z contributorów, ale ich wykonanie nie jest dowodem przyczynowości.
- Komponenty nie wykonują bezpośrednich zapytań Supabase.

### Plan implementacji

#### Zadanie 1: wersjonowana metodologia

**Pliki:** utworzyć `packages/domain/src/healthspanMethodology.ts` i test; zmienić
`packages/domain/src/healthspan.ts` oraz eksport pakietu.

- [x] Test-first zdefiniować `HEALTHSPAN_MODEL_VERSION = 'healthspan-v2'`,
  `ContributorMethodology` oraz rejestr wszystkich domen.
- [x] W testach wymusić jawne źródło, benchmark, minimalne N, świeżość, wagę,
  maksymalny wpływ i klasę dowodu każdego contributora.
- [x] Przenieść funkcje punktacji z `healthspan.ts` do rejestru i usunąć duplikaty.
- [x] Dodać testy graniczne WHO dla aerobów/siły, AASM dla snu oraz wieku/płci dla VO₂.

#### Zadanie 2: odporny trend snapshotów

**Pliki:** utworzyć `packages/domain/src/healthspanTrend.ts` i test; zmienić typ
`HealthspanPace` w `packages/domain/src/healthspan.ts`.

- [x] Test-first zbudować `computeHealthspanTrend(snapshots, context)`.
- [ ] Wymusić stan kalibracji dla zbyt krótkiej historii, mniej niż trzech wspólnych
  domen, mieszanych wersji i zbyt dużych luk.
- [x] Liczyć mediany tygodniowe, wspólne domeny, odporne nachylenie i confidence
  zależne od N, coverage, jakości oraz confounderów.
- [x] Usunąć fallback tworzący pozornie prawidłowe tempo z bieżącego profilu.

#### Zadanie 3: Garmin i deduplikacja

**Pliki:** utworzyć `src/lib/healthspanGarminProjection.ts` i test; zmienić
`src/lib/healthspanProjection.ts` oraz `src/lib/healthspanApi.ts`.

- [x] Test-first zmapować pola Garmin na kanoniczne dowody wraz z provenance.
- [x] Test-first rozpoznać duplikat Garmin/Strava i zachować jeden trening.
- [x] Wymusić priorytet świeżego Garmin dla VO₂/stref oraz bezpieczne fallbacki.
- [ ] Pokazywać brak obsługiwanego pola zamiast tworzyć wartość zastępczą.

#### Zadanie 4: historia i migracja snapshotów

**Pliki:** utworzyć migrację rozszerzającą `healthspan_snapshots`; utworzyć
`src/lib/healthspanHistoryApi.ts` i test; zmienić lokalne typy bazy.

- [ ] Dodać `methodology_version`, `coverage`, `evidence_summary` i indeks historii,
  zachowując RLS ograniczone do właściciela.
- [x] Czytać snapshoty według zakresu i rozdzielać serie na granicach wersji modelu.
- [x] Zapisywać snapshot dopiero po policzeniu profilu i trendu z historycznych danych.
- [ ] Zweryfikować migrację zapytaniem, RLS oraz advisorami Supabase.

#### Zadanie 5: widok trajektorii i metodologia

**Pliki:** utworzyć małe komponenty w `src/components/biometrics/healthspan/`;
zmienić `HealthspanExperienceContainer.tsx` i `HealthspanProfilePanel.tsx`.

- [x] Test-first dodać przełącznik 12 tygodni / 6 miesięcy / rok.
- [x] Pokazać linię score, zakres wieku, confidence i coverage bez łączenia wersji.
- [ ] Dodać szczegół punktu: zakres dat, N, źródła, contributory i confoundery.
- [x] Dodać ekran metodologii z cytowanym źródłem i klasą dowodu każdej domeny.
- [x] W stanie kalibracji pokazać konkretnie, jakich danych i czasu brakuje.

#### Zadanie 6: integracja i weryfikacja

- [ ] Uruchomić wszystkie testy Healthspan, typecheck, focused lint i build.
- [ ] Sprawdzić frontendowe ratchety i brak raw Supabase w komponentach.
- [ ] Zweryfikować prawdziwy profil z Garmin/Oura oraz scenariusz bez wearables.
- [ ] Sprawdzić mobile i desktop: historię, luki, zmianę wersji, błąd źródła i kalibrację.
- [ ] Upewnić się, że Oracle używa nowych nazw i nie przedstawia wyniku jako diagnozy.

### Kryterium ukończenia

Healthspan v2 jest gotowy, gdy trend nie istnieje bez wystarczających i porównywalnych
danych, Garmin nie dubluje Stravy, historia pokazuje źródła i granice wersji, a każda
liczba ma N, zakres dat, confidence oraz metodologię. Testy nie mogą dowodzić walidacji
klinicznej; dowodzą deterministyczności, jawności i zgodności implementacji z opisanym
modelem evidence-informed.

## Priorytet: Kartoteka — osobista ciągłość zdrowia

### Cel

Przebudować `/badania` z ekranu skupionego na laboratorium w osobistą Kartotekę.
Rdzeniem jest historia faktycznych zdarzeń medycznych, a warstwą pomocniczą —
przejrzyste propozycje profilaktyczne wynikające z profilu, historii i zaleceń.
System nie diagnozuje i nie przedstawia ogólnych reguł jako indywidualnych nakazów.

### Zatwierdzony model produktu

1. **Oś zdrowia**
   - główny ekran pokazuje chronologicznie wizyty, badania, zabiegi, szczepienia
     i inne istotne zdarzenia;
   - odbyte zdarzenie jest faktem, a propozycja pozostaje osobnym bytem i nigdy
     automatycznie nie trafia do historii;
   - szczegół wpisu pokazuje tylko dane przydatne później: specjalistę, datę, powód,
     ustalenia, zalecenia, termin kontroli i powiązane dokumenty.
2. **Szybki zapis**
   - domyślną ścieżką jest krótki wpis naturalnym językiem;
   - Sparky proponuje strukturę, ale użytkownik zatwierdza ją przed zapisem;
   - prosty formularz ręczny pozostaje dostępny bez AI.
3. **Profilaktyka**
   - sekcja „Do rozważenia” eksponuje małą liczbę najważniejszych luk, np. brak
     kontroli dentystycznej, zaległe badanie lub kontrolę zaleconą podczas wizyty;
   - każda propozycja zawiera powód, dane wejściowe, źródło, termin, poziom pewności
     oraz akcje: „Zrobione”, „Przypomnij później”, „Nie dotyczy”;
   - reguły są wersjonowane i oparte przede wszystkim na aktualnych polskich
     źródłach publicznych; rekomendacje zależne od ryzyka wymagają odpowiednich
     danych albo konsultacji z personelem medycznym;
   - brak danych jest komunikowany jawnie, bez zgadywania.
4. **Istniejące moduły**
   - wyniki laboratoryjne, trendy, dokumenty, recepty, wzrok i skład ciała pozostają
     dostępne jako sekcje szczegółowe Kartoteki;
   - obecny import wyników zostaje zachowany, lecz zapis przenosi się z komponentu
     do kanonicznej warstwy `src/lib`;
   - nazwy UI „Badania” i „Dokumentacja medyczna” zmieniają się na „Kartoteka”.

### Architektura i dane

- Nowa tabela zdarzeń przechowuje wspólny rdzeń wpisu: typ, data, tytuł, specjalność,
  placówkę/specjalistę, powód, podsumowanie, zalecenia i kontrolę.
- Powiązania łączą zdarzenie z istniejącymi `medical_documents` i panelami
  `medical_lab_results`, bez kopiowania wyników.
- Osobna tabela przechowuje stan propozycji profilaktycznych, ich podstawę,
  wersję reguły, źródło i decyzję użytkownika.
- Reguły profilaktyczne są czystymi, testowalnymi funkcjami w `src/lib/health`;
  komponenty otrzymują gotowy model widoku i nie pytają bezpośrednio Supabase.
- Kontener odpowiada za zapytania i mutacje, a komponenty osi, propozycji i szczegółu
  wyłącznie za prezentację.
- Pierwsza wersja używa deterministycznego parsera szybkiego wpisu i ręcznego
  zatwierdzenia. Integracja modelu językowego może rozszerzyć parser później,
  bez tworzenia drugiej ścieżki zapisu.

### Interfejs

- Na górze: „Kartoteka”, szybkie „Dodaj wpis” oraz dyskretny stan kompletności.
- Następnie: maksymalnie kilka kart „Do rozważenia”, posortowanych według znaczenia
  i terminu, bez czerwonych alarmów dla zwykłej profilaktyki.
- Główna część: filtrowalna oś zdrowia grupowana latami i miesiącami.
- Laboratorium i pozostałe narzędzia są dostępne z nawigacji drugiego poziomu.
- Animacja służy wyłącznie orientacji: krótki ease-out dla panelu szczegółu,
  natychmiastowy feedback przycisków i respektowanie reduced motion.
- Widok mobilny zachowuje cele dotykowe minimum 44 px i pojedynczą kolumnę.

### Bezpieczeństwo i obsługa błędów

- Treści mają charakter organizacyjny i edukacyjny, nie diagnostyczny.
- Propozycja medyczna zawsze pokazuje źródło i datę jego weryfikacji.
- Wynik poza zakresem nie prowadzi automatycznie do rozpoznania ani leczenia.
- Nieudany zapis zachowuje lokalny szkic; historia nie pokazuje wpisu przed
  potwierdzonym zapisem.
- Usuwanie wpisu korzysta z bezpiecznego potwierdzenia przez istniejący wrapper dialogu.

### Testy akceptacyjne

- Można zapisać poniedziałkową wizytę u logopedy i odnaleźć ją na osi.
- Wpis może zawierać zalecenie kontroli, z którego powstaje jawna propozycja,
  ale nie fikcyjna przyszła wizyta.
- Wyniki laboratoryjne i dokumenty pozostają dostępne oraz powiązane z historią.
- Propozycję można wykonać, odroczyć albo odrzucić, a decyzja przetrwa odświeżenie.
- Reguła nie uruchamia się bez wymaganych danych i zawsze wskazuje źródło.
- Komponenty medyczne nie wykonują bezpośrednich zapytań Supabase.
- Testy domeny, testy UI, typecheck, lint, frontend ratchet i build są zielone.

### Plan techniczny

#### Zadanie 1: kontrakt danych Kartoteki

- [ ] Dodać migrację `medical_events` i `medical_prevention_actions` z RLS,
  indeksami, ograniczeniami wartości oraz grantami dla roli `authenticated`.
- [ ] Rozszerzyć lokalne typy bazy i wystawić pojedynczą warstwę
  `src/lib/health/medicalRecordsApi.ts` dla odczytu oraz mutacji.
- [ ] Zacząć od testów mapowania rekordów i zachowania stanów propozycji.

#### Zadanie 2: logika osi i profilaktyki

- [ ] Test-first zbudować parser szybkiego wpisu, który rozpoznaje datę względną,
  typ wizyty i specjalność, ale zawsze zwraca szkic do zatwierdzenia.
- [ ] Test-first połączyć zdarzenia, dokumenty i panele laboratoryjne w jeden,
  stabilnie sortowany model osi.
- [ ] Test-first zbudować mały katalog źródłowych reguł: kontrola stomatologiczna,
  bilans „Moje Zdrowie” oraz kontrole zapisane w zdarzeniach.

#### Zadanie 3: ekran i zapis

- [ ] Rozdzielić `MedicalRecordsContainer` od czystego `MedicalRecordsView`.
- [ ] Dodać lekkie komponenty: nagłówek, „Do rozważenia”, oś zdrowia oraz panel
  zatwierdzania szybkiego wpisu; każdy nowy plik pozostaje poniżej 300 linii.
- [ ] Zachować istniejące laboratorium i narzędzia jako widok drugiego poziomu.
- [ ] Przenieść import wyników z komponentu do warstwy `src/lib`.

#### Zadanie 4: integracja i jakość

- [ ] Zmienić nazwy nawigacji i teasera na „Kartoteka”.
- [ ] Dodać test przepływu: wpis logopedy → zapis → wpis na osi.
- [ ] Sprawdzić brak surowego Supabase i natywnych dialogów w komponentach.
- [ ] Uruchomić testy medyczne, typecheck UI, focused lint, ratchet i build;
  odróżnić nowe regresje od istniejących problemów repo.

### Poza zakresem pierwszego wdrożenia

- Automatyczne diagnozy, dobieranie leczenia i autonomiczne oznaczanie zaleceń jako
  obowiązkowych.
- Synchronizacja pełnej dokumentacji z IKP lub placówkami bez oficjalnego interfejsu.
- Rozbudowany model szpitalny, rozliczenia, ubezpieczenia i dane wielu pacjentów.
- Przyszłe wizyty jako część historii; mogą istnieć wyłącznie jako propozycje
  lub przypomnienia.

## Priorytet: pełna migracja marki Vanguard → SPARKY

### Cel i definicja ukończenia

Usunąć aktywną nazwę `Vanguard` z produktu, kodu, danych i infrastruktury.
Kanoniczna nazwa produktu to `SPARKY`; identyfikatory techniczne używają form
`sparky-*`, `sparky_*`, `SPARKY_*`, a pakiet Androida to `app.sparky.os`.

Migracja jest ukończona, gdy:

- aplikacja webowa/PWA i Android pokazują wyłącznie nazwę SPARKY;
- kod, funkcje Edge, SQL, skrypty, testy, dokumentacja i konfiguracja używają
  identyfikatorów SPARKY;
- dane użytkownika, webhooki, crony i integracje działają bez utraty ciągłości;
- GitHub, Supabase, Telegram oraz lokalny folder projektu mają nazwę SPARKY;
- końcowy skan nie znajduje aktywnych wystąpień `Vanguard`, z wyjątkiem historii Git
  oraz niezmienialnych identyfikatorów nadanych przez zewnętrzne usługi.

### Strategia migracji

Zmiana przebiega kontrolowanie, a nie przez ślepą globalną zamianę:

1. Sporządzić inwentarz wystąpień i sklasyfikować je jako branding, kod,
   identyfikatory danych, sekrety, infrastrukturę albo historię.
2. Dodać migracje zachowujące istniejące dane oraz krótkotrwałe mosty zgodności
   wszędzie, gdzie jednoczesne przełączenie producenta i konsumenta nie jest możliwe.
3. Przepiąć aplikację, funkcje, skrypty, webhooki, crony i integracje na SPARKY.
4. Wdrożyć i zweryfikować pełną ścieżkę użytkownika.
5. Usunąć aliasy, stare funkcje, sekrety i mosty zawierające nazwę Vanguard.
6. Zmienić nazwy zasobów zewnętrznych i lokalnego folderu na końcu, po przejściu
   testów oraz zapisaniu mapy rollbacku.

### Zakres

- Branding: UI, manifest PWA, metadata, powiadomienia, treści Telegrama, ikony i
  nazwy aplikacji.
- Kod: symbole, typy, pliki, katalogi, testy, skrypty, konfiguracja i dokumentacja.
- Supabase: funkcje `vanguard-*`, współdzielone moduły, wywołania, crony, webhooki,
  polityki, funkcje SQL, tabele/widoki/kolumny z prefiksem oraz sekrety.
- Android: application ID, namespace, pakiety Java/Kotlin, manifest, deep linki,
  skróty i konfiguracja Capacitor.
- Integracje: Telegram, GitHub, Supabase Dashboard, automatyzacje i środowiska
  lokalne/produkcyjne.
- System plików: folder repozytorium `Vanguard` → `Sparky` po zamknięciu operacji
  zależnych od bieżącej ścieżki.

### Zasady bezpieczeństwa i rollback

- Nie przepisywać historii Git; stara nazwa w dawnych commitach jest dozwolona.
- Nie usuwać ani nie odtwarzać danych tylko po to, by zmienić nazwę.
- Każda zmiana nazwy tabeli, funkcji SQL lub endpointu otrzymuje odwracalną migrację
  albo udokumentowany alias na czas przepięcia konsumentów.
- Sekrety są kopiowane pod nowe klucze, konsumenci są przełączani, a stare klucze
  usuwane dopiero po potwierdzeniu działania.
- Stare funkcje Edge pozostają chwilowo dostępne tylko wtedy, gdy chroni to aktywny
  webhook lub cron; nie mogą pozostać po końcowym czyszczeniu.
- Istniejące niezacommitowane zmiany użytkownika nie są cofane ani nadpisywane.

### Weryfikacja

- Testy obszarów, typecheck, lint, ratchety, build PWA i build Androida.
- `npm run smoke` oraz logi Edge bez błędów autoryzacji po wdrożeniu.
- Test webhooka Telegram, harmonogramów, Oracle, klasyfikacji, planowania,
  synchronizacji i powiadomień.
- Kontrola migracji na istniejących danych oraz sprawdzenie rollbacku przed
  usunięciem aliasów.
- Końcowe wyszukiwanie bez rozróżniania wielkości liter w repozytorium, sekretach,
  cronach i nazwach wdrożonych zasobów.

### Poza zakresem

- Przepisywanie historii commitów, tagów i już opublikowanych artefaktów.
- Zmiana stabilnych, nieedytowalnych identyfikatorów dostawców, jeśli ich wartość
  nie jest widoczna jako marka i nie zawiera nazwy Vanguard.
- Refaktory niezwiązane bezpośrednio z migracją nazwy.

## Priorytet: wieczorne domknięcie i swobodne planowanie dnia

### Cel

Wieczorny przepływ ma pozwalać użytkownikowi rozliczyć faktyczne wykonanie dnia,
zapisać krótką refleksję i bez dodatkowego ekranu przejść do samodzielnego
zaplanowania jutra. Todo jest źródłem opcjonalnych sugestii, a nie obowiązkowym
wsadem planu.

### Zatwierdzone zachowanie

1. Po 20:00 otwiera się pojedynczy panel „Domknięcie dnia”.
2. Zadania Power List są interaktywnymi checkboxami. Zmiany pozostają lokalne
   do kliknięcia „Zatwierdź zamknięcie”.
3. Panel zawiera jedno pole tekstowe: „Co realnie poszło inaczej i dlaczego?”.
   Pole dodatkowych notatek z wykonania zostaje usunięte.
4. Z ocen pozostają „Wynik dnia” i „Samopoczucie”. RPE znika z formularza,
   zapisu wieczornego i wpisu `daily_shutdown` w strumieniu.
5. Zatwierdzenie atomowo zapisuje stany wykonania Power List, refleksję i dwie
   oceny. Błąd pozostawia panel otwarty wraz z lokalnymi zmianami.
6. Po udanym zapisie nie ma ekranu „Dzień zamknięty”. Automatycznie otwiera się
   planowanie jutra.
7. Plan jutra zaczyna się od pięciu pustych, edytowalnych miejsc. Użytkownik
   może wpisać dowolne działania. Zadania Todo są pokazane wyłącznie jako
   opcjonalne sugestie, które można świadomie dodać.

### Architektura

- `DailyShutdownModal` pozostaje pojedynczym panelem formularza bez drugiego kroku.
- `useShutdownData` odpowiada za lokalny draft i jeden zapis po zatwierdzeniu.
- `MorningPlanModal` oraz jego hook rozdzielają własne pozycje planu od sugestii Todo.
- Istniejące mutacje i tabele pozostają kanoniczną ścieżką zapisu; nie powstaje
  równoległy model planowania.

### Obsługa błędów i testy

- Nieudany zapis nie otwiera planowania i nie gubi zaznaczeń ani refleksji.
- Testy obejmują zaznaczanie i odznaczanie przed zatwierdzeniem, brak zapisu RPE,
  automatyczne przejście po sukcesie oraz pusty plan bez automatycznego Todo.
- Końcowa brama: testy obszaru, typecheck UI, lint i frontend ratchet.

### Plan wykonawczy

- [x] Dodać test payloadu zamknięcia dnia: `done_1…done_5`, bez `daily_rpe`.
- [x] Wydzielić czystą funkcję budującą zapis i podłączyć ją do `useShutdownData`.
- [x] Dodać interaktywne checkboxy oraz usunąć drugie pole tekstowe, RPE i ekran sukcesu.
- [x] Po udanym zapisie przełączyć modal bezpośrednio na planowanie jutra.
- [x] Dodać test pustych własnych slotów planu i jawnego dodawania sugestii Todo.
- [x] Rozszerzyć model slotu o własne wpisy bez `todo_id` i zachować atomowy RPC.
- [x] Uruchomić testy obszaru, typecheck, focused lint oraz produkcyjny build.

## Priorytet: ciągłość dwóch ocen dnia

### Problem

Wieczorne „Domknięcie dnia” zapisuje `day_score` (Wynik dnia 1–10) oraz
`mood_score` (Samopoczucie 1–5). Jeżeli użytkownik nie wykona wieczornego
domknięcia, poranny przepływ „Podsumuj i zaplanuj dzień” wymaga tylko komentarza
do wczoraj. Powstaje wtedy luka w obu szeregach ocen.

### Zatwierdzone zachowanie

1. Nie powstaje osobny poranny ekran ani dodatkowy rytuał.
2. Istniejący wspólny komponent dwóch suwaków jest wyświetlany także w porannej
   karcie refleksji o wczoraj, bezpośrednio przy polu komentarza.
3. Suwaki i komentarz w tej karcie zawsze dotyczą `yesterdayWin.date`; planowane
   poniżej zadania dotyczą bieżącego dnia.
4. Jeżeli oceny zapisano wieczorem, poranny formularz ładuje te wartości i nie
   tworzy drugiego rekordu.
5. Jeżeli ocen brakuje, użytkownik uzupełnia je rano. „Zacznij dzień” zapisuje
   komentarz, `day_score` i `mood_score` przed utworzeniem planu na dziś.
6. Poranny zapis korzysta z tych samych tabel, pól i funkcji warstwy `src/lib`
   co wieczorne domknięcie. Nie powstaje równoległa ścieżka danych.
7. System nie wpisuje ocen domyślnych jako danych użytkownika. Wartość początkowa
   suwaka jest wyłącznie stanem formularza do chwili świadomego zatwierdzenia.

### Architektura

- `ShutdownScoreSliders` staje się współdzielonym prezentacyjnym komponentem obu
  przepływów.
- Dane porannej karty zostają rozszerzone o wczorajsze `day_score` i `mood_score`.
- Zapis ocen zostaje wystawiony przez kanoniczną warstwę API; komponenty nie
  wykonują bezpośrednich operacji Supabase.
- Operacja „Zacznij dzień” najpierw zapisuje brakującą refleksję i oceny dla
  wczoraj, a dopiero po sukcesie tworzy dzisiejszy plan.
- Błąd zapisu wczorajszego podsumowania nie tworzy dzisiejszego planu i zachowuje
  lokalne wartości formularza.

### Testy akceptacyjne

- Wieczorne domknięcie nadal zapisuje obie oceny bez regresji.
- Poranny formularz pokazuje zapisane wcześniej oceny wczorajszego dnia.
- Przy braku wieczornego domknięcia poranny zapis uzupełnia obie oceny właściwej daty.
- Ponowne otwarcie nie duplikuje rekordu i odczytuje zapisane wartości.
- Błąd zapisu ocen zatrzymuje utworzenie dzisiejszego planu.
- Typecheck UI, testy obszaru, focused lint i frontend ratchet pozostają zielone.

## Priorytet: zielone bramy jakości

### Cel

Doprowadzić bieżący stan aplikacji do zielonego lintowania, frontendowych i
backendowych ratchetów oraz kompilacji Edge Functions bez zmiany eksperymentalnego
zachowania BLE.

### Plan techniczny

- [ ] Naprawić kontrakt `analyze-physique` zgodnie z kanonicznym `serveJson`.
- [ ] Usunąć pliki i eksporty wskazane przez Knip jako martwe.
- [ ] Zastąpić surowe kontrolki, kolory i wartości Tailwind istniejącymi
  prymitywami oraz tokenami design systemu.
- [ ] Rozdzielić komponenty przekraczające limity odpowiedzialności i długości.
- [ ] Rozdzielić nowe pliki Edge Functions przekraczające 300 linii.
- [ ] Usunąć nowe `any` bez rozszerzania baseline’ów.
- [ ] Zweryfikować lint, ratchety, Knip, typy, testy, Edge Functions i build.

### Ograniczenia

- Bez zmian zachowania eksperymentalnego BLE.
- Bez podnoszenia baseline’ów długu.
- Bez tworzenia równoległych ścieżek danych lub nowych dokumentów planistycznych.

## Priorytet: SPARKY — Functional iOS jako kontrakt wizualny komponentów

### Cel i zatwierdzone odczucie

SPARKY ma wyglądać jak aplikacja systemowa iOS, której Apple po prostu nie stworzyło:
spokojna, neutralna i precyzyjna baza systemowa oraz pojedynczy, mocno nasycony akcent
prowadzący użytkownika do najważniejszego działania. Jakość ma wynikać z hierarchii,
geometrii, typografii, materiałów i stanów komponentów, a nie z dekoracyjności.

Ten kontrakt dotyczy w pierwszej kolejności wyglądu komponentów. Nie zmienia logiki
biznesowej, danych, architektury informacji ani zatwierdzonych przepływów produktu.
Pierwszym ekranem referencyjnym jest rytuał refleksji i planowania dnia; po jego
walidacji te same prymitywy mają obsłużyć pozostałe powierzchnie aplikacji.

### Zasady języka Functional iOS

1. **Neutralna baza**
   - płótno w jasnym motywie używa systemowego `#F2F2F7`, a główne powierzchnie
     czystej bieli `#FFFFFF`;
   - w ciemnym motywie płótno używa `#000000`, podstawowa powierzchnia `#1C1C1E`,
     a podniesiona `#2C2C2E`; nie jest to mechaniczne odwrócenie jasnego motywu;
   - globalne kremowe tła, dekoracyjne gradienty, ciężkie cienie i stale widoczne
     szkło znikają z kanonicznych prymitywów;
   - głębia wynika najpierw z różnicy powierzchni i separatora, dopiero później
     z bardzo subtelnego cienia.

2. **Jedna nasycona powierzchnia prowadząca**
   - widok może mieć najwyżej jedną mocno nasyconą kartę `hero`;
   - `hero` reprezentuje najważniejszy bieżący kontekst lub następny ruch, nigdy
     ogólną dekorację, statystykę drugorzędną ani reklamę funkcji;
   - pozostała część widoku pozostaje spokojna, żeby karta miała realną hierarchię.

3. **Grouped list zamiast stosu kart**
   - elementy należące do jednej domeny tworzą białą, wspólną powierzchnię z wierszami;
   - wiersze rozdzielają separatory `0.5–1 px`, a nie osobne obramowania i cienie;
   - kolorowy, zaokrąglony kwadrat może nieść ikonę i znaczenie, lecz sam wiersz
     pozostaje neutralny;
   - nie tworzymy kart wewnątrz kart, jeśli tę samą relację pokaże sekcja lub wiersz.

4. **Kolor ma jedną rolę**
   - niebieski `#007AFF`: interakcja, link, fokus i główna akcja;
   - pomarańczowy `#FF9500`: aktualny kierunek, najbliższy ruch i aktywny kontekst;
   - zielony `#34C759`: sukces, wykonanie i pozytywne potwierdzenie;
   - fioletowy `#5856D6`: skupienie, tryb uwagi i treść wymagająca koncentracji;
   - czerwony: błąd, zagrożenie, destrukcja albo jednoznacznie krytyczny stan;
   - jeden komponent nie używa dwóch kolorów do opisania tego samego znaczenia.

5. **Geometria wynika z roli**
   - grouped list: promień około `13–14 px`;
   - karta `hero`: około `18–22 px`;
   - sheet i duża warstwa pływająca: około `28 px`;
   - kapsuła jest zarezerwowana dla przełącznika, filtra, statusu lub krótkiej akcji;
     zwykłe pola, karty i długie przyciski nie stają się automatycznie pigułkami.

6. **Typografia systemowa, nie brandingowa**
   - duży, ciężki tytuł ekranu buduje wejście w widok;
   - tekst używa platformowego stosu systemowego, rozmiarowego trackingu i zwartej,
     czytelnej interlinii;
   - ograniczamy uppercase, mikroetykiety i nadmiar różnych wag; hierarchię budują
     rozmiar, pozycja i kontrast, nie głośność każdego podpisu.

### Kontrakt komponentów

- **Przycisk:** wariant główny jest wypełniony i jednoznaczny, drugorzędny korzysta
  z koloru akcji bez konkurowania z głównym, a destrukcyjny używa czerwieni. Każdy
  pokazuje stany default, pressed, focused, loading i disabled bez zmiany geometrii.
- **Pole i textarea:** spokojna powierzchnia, subtelna granica lub separator oraz
  systemowy niebieski fokus. Placeholder nie udaje etykiety. Błąd jest opisany
  tekstem, nie wyłącznie kolorem.
- **Wybór 1–10:** jawne przyciski wyboru zamiast suwaka. Zakresy otrzymują krótkie
  znaczenie: `1–3 Trudny`, `4–6 Nierówny`, `7–8 Dobry`, `9–10 Wyjątkowy`; tonalna
  skala przechodzi od czerwieni przez pomarańczowy i niebieski do zieleni.
- **Samopoczucie 1–5:** jawne przyciski z nazwami `Ciężko`, `Słabo`, `Neutralnie`,
  `Dobrze`, `Świetnie`; kolor wspiera znaczenie, ale etykieta pozostaje zawsze widoczna.
- **Karta `hero`:** jeden komunikat, jeden kontekst pomocniczy i najwyżej jedna
  główna akcja. Nie zawiera mini-dashboardu ani kolejnej karty.
- **Grouped list:** wiersz ma opcjonalną ikonę, tytuł, drugą linię, wartość końcową
  i chevron tylko wtedy, gdy naprawdę prowadzi dalej. Cały wiersz jest celem dotyku.
- **Sheet, tab bar, toolbar i popover:** szkło oraz rozmycie są dozwolone wyłącznie
  na warstwach faktycznie unoszących się nad treścią; przy wyłączonej przezroczystości
  otrzymują pełne, nieprzezroczyste tło.
- **Badge i status:** są małe i semantyczne. Nie zastępują nagłówków ani zwykłego tekstu.

### Ruch, platforma i dostępność

- Obecna fizyka z `src/lib/motion/iosMotion.ts` pozostaje kanoniczna: natychmiastowy
  pressed state, spokojna sprężyna bez dekoracyjnego odbicia i przerywalne gesty.
- Ruch służy potwierdzeniu działania, zmianie hierarchii lub zachowaniu orientacji;
  element statyczny nie animuje się tylko po to, by wyglądać efektownie.
- Cele dotykowe mają minimum `44 × 44 px`, fokus klawiatury jest zawsze widoczny,
  a treść i stany przechodzą wymagany kontrast.
- `prefers-reduced-motion`, zmniejszona przezroczystość, klawiatura i czytnik ekranu
  zachowują tę samą informację i kolejność działań.
- PWA, Windows i Android/Capacitor używają jednego kontraktu wizualnego; Apple jest
  wzorcem jakości i zachowania, nie zależnością platformową.

### Granice implementacji

- `src/index.css` pozostaje jedynym źródłem tokenów wizualnych.
- Kanoniczne prymitywy `Button`, `Card`, `Tabs`, `Modal`, `Sheet` oraz
  `ControlPrimitives` są zmieniane przed ekranami funkcjonalnymi; nie powstaje
  równoległy zestaw komponentów „iOS”.
- Dotychczasowy język Pixel/Material w `docs/DESIGN_SYSTEM.md` zostaje zastąpiony
  przez Functional iOS podczas wdrożenia. Dokumentacja i kod muszą zostać
  uzgodnione w tym samym etapie, bez dwóch konkurujących systemów.
- Migracja ekranów odbywa się przez wspólne prymitywy i tokeny. Lokalny wyjątek
  wymaga znaczenia produktowego, a nie samej potrzeby dopasowania zrzutu.
- Funkcjonalność oraz treść pozostają źródłem prawdy; wygląd nie może ukrywać błędu,
  stanu pustego, ładowania ani konsekwencji akcji.

### Kryteria akceptacji pierwszego wdrożenia

- Rytuał refleksji i planowania zachowuje obecną logikę, ale wizualnie korzysta
  z neutralnego płótna, jednej karty prowadzącej i grouped list.
- Wszystkie użyte prymitywy mają spójne stany default, hover, pressed, focused,
  selected, loading, disabled i error.
- Na widoku nie występują stosy niezależnych, mocno zaokrąglonych kart ani szkło
  na warstwie, która nie unosi się nad treścią.
- Oceny dnia i samopoczucia są wybierane przyciskami, mają widoczne znaczenie zakresu
  i nie wymagają wpisywania wartości ani przesuwania suwaka.
- Widok jest sprawdzony na wąskim ekranie mobilnym i desktopie, z klawiaturą,
  reduced motion oraz zmniejszoną przezroczystością.
- Typecheck UI, testy komponentów, focused lint, frontend ratchet i build są zielone;
  nie powstają surowe zapytania Supabase ani natywne dialogi w komponentach.

### Functional iOS Faza 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wdrożyć kanoniczne tokeny i prymitywy Functional iOS oraz użyć ich na
pełnym ekranie `Dzisiaj` z rytuałem refleksji i planowania, bez zmiany jego logiki.

**Architecture:** `src/index.css` pozostaje jedynym źródłem wartości wizualnych,
a komponenty `src/components/ui/` wystawiają semantyczne API i stany. Ekran pilotażowy
składa te prymitywy w jedną kartę `hero`, grouped lists i pływającą nawigację. Obecna
fizyka gestów, hooki danych i mutacje pozostają bez zmian.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, CSS custom properties,
Framer Motion, Vitest, Testing Library, Vite, Capacitor.

#### Global Constraints

- Jasny canvas: `#F2F2F7`; jasna powierzchnia: `#FFFFFF`.
- Ciemny canvas: `#000000`; powierzchnie: `#1C1C1E` i `#2C2C2E`.
- Role jasnego motywu: blue `#007AFF`, orange `#FF9500`, green `#34C759`,
  purple `#5856D6`; red wyłącznie dla błędu, destrukcji lub stanu krytycznego.
- Maksymalnie jedna nasycona karta `hero` na widok; grouped list jest domyślną
  kompozycją elementów należących do jednej domeny.
- Promienie roli: grouped list `14px`, hero `22px`, sheet `28px`; pill tylko dla
  przełącznika, filtra, statusu albo krótkiej akcji.
- Typografia używa wyłącznie stosu systemowego; tytuł ekranu ma `34px`, wagę `700`
  i tracking `-0.022em`, bez globalnego uppercase i brandingowego kroju display.
- Szkło tylko na faktycznie pływających warstwach; wymagany pełny fallback dla
  `prefers-reduced-transparency` i `prefers-contrast: more`.
- `src/index.css` jest SSOT; nie powstaje lokalny plik CSS ani zestaw `Ios*` obok
  istniejących prymitywów.
- `src/lib/motion/iosMotion.ts` pozostaje SSOT ruchu; nie dodawać nowych krzywych
  ani dekoracyjnego bounce w JSX.
- Cele dotykowe mają minimum `44 × 44px`; stany nie mogą być komunikowane wyłącznie
  kolorem; klawiatura, screen reader i reduced motion zachowują pełną funkcję.
- Nowe pliki UI mają mniej niż 300 linii. Komponenty nie pytają bezpośrednio
  Supabase i nie używają natywnych dialogów.
- Faza 1 nie zmienia zapisu refleksji, ocen, zadań, powiązań Todo ani przejścia
  do planu. Kolejne ekrany będą osobnymi, testowalnymi migracjami po akceptacji pilota.
- Worktree zawiera istniejące zmiany użytkownika. Przed każdą edycją sprawdzić diff
  danego pliku i nie cofać obcych hunks. Kroki commitów wykonać tylko w izolowanej
  gałęzi z jednoznacznym stagingiem; przy pracy inline pozostawić zmiany bez commita.

---

#### Task 1: Kanoniczne tokeny Functional iOS i dokumentacja

**Files:**
- Create: `src/components/ui/functionalIosTokens.test.ts`
- Modify: `src/index.css:498-646`
- Modify: `src/index.css:953-997`
- Modify: `src/index.css:1098-1118`
- Modify: `src/index.css:1522-1680`
- Modify: `src/index.css:1844-1914`
- Modify: `docs/DESIGN_SYSTEM.md:1-190`

**Interfaces:**
- Consumes: istniejące nazwy semantyczne `--background`, `--surface-*`, `--primary`,
  `--color-*`, `--radius-*`, `--shadow-*`, żeby nie łamać konsumentów.
- Produces: tokeny `--separator`, `--direction`, `--attention`, `--radius-grouped`,
  `--radius-hero`, `--radius-sheet`, `--material-floating`, `--text-screen-title`,
  używane od Task 2.

- [ ] **Step 1: Sprawdzić istniejące zmiany w plikach**

Run:

```powershell
git diff -- src/index.css docs/DESIGN_SYSTEM.md
git diff --cached -- src/index.css docs/DESIGN_SYSTEM.md
```

Expected: znane są wszystkie istniejące hunks; plan nie usuwa zmian niezwiązanych
z Functional iOS.

- [ ] **Step 2: Napisać test, który najpierw wykrywa stary kontrakt**

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');

function contractBlock(marker: string) {
  const start = css.indexOf(marker);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
}

describe('Functional iOS token contract', () => {
  it('uses system canvases and semantic colours', () => {
    const light = contractBlock('/* Functional iOS light */');
    const dark = contractBlock('/* Functional iOS dark */');
    expect(light).toContain('--background: #F2F2F7;');
    expect(light).toContain('--primary: #007AFF;');
    expect(light).toContain('--direction: #FF9500;');
    expect(light).toContain('--color-success: #34C759;');
    expect(dark).toContain('--background: #000000;');
    expect(dark).toContain('--surface: #1C1C1E;');
  });

  it('does not paint a decorative gradient on the application canvas', () => {
    const body = contractBlock('html, body');
    expect(body).not.toContain('radial-gradient');
  });
});
```

- [ ] **Step 3: Uruchomić test i potwierdzić właściwą porażkę**

Run: `npx vitest run src/components/ui/functionalIosTokens.test.ts`

Expected: FAIL, ponieważ markery i systemowe wartości jeszcze nie istnieją.

- [ ] **Step 4: Zastąpić rdzeń tokenów i usunąć dublujące się override’y**

```css
/* Functional iOS light */
:root {
  --background: #F2F2F7;
  --surface: #FFFFFF;
  --surface-solid: #FFFFFF;
  --surface-1: #FFFFFF;
  --surface-2: #F2F2F7;
  --surface-3: #E5E5EA;
  --surface-tonal: #EAF3FF;
  --border: rgb(60 60 67 / 22%);
  --separator: rgb(60 60 67 / 29%);
  --text-primary: #000000;
  --text-secondary: rgb(60 60 67);
  --text-muted: rgb(60 60 67 / 60%);
  --primary: #007AFF;
  --primary-hover: #006EE6;
  --direction: #FF9500;
  --attention: #5856D6;
  --color-accent-purple: var(--attention);
  --color-success: #34C759;
  --color-warning: var(--direction);
  --color-danger: #FF3B30;
  --color-info: var(--primary);
  --radius-grouped: 14px;
  --radius-hero: 22px;
  --radius-sheet: 28px;
  --text-screen-title: 34px;
  --tracking-screen-title: -0.022em;
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  --font-display: var(--font-sans);
  --material-floating: color-mix(in srgb, var(--surface) 72%, transparent);
  --shadow-card: none;
  --shadow-float: 0 18px 50px rgb(0 0 0 / 16%);
}

/* Functional iOS dark */
.dark {
  --background: #000000;
  --surface: #1C1C1E;
  --surface-solid: #1C1C1E;
  --surface-1: #1C1C1E;
  --surface-2: #1C1C1E;
  --surface-3: #2C2C2E;
  --border: rgb(84 84 88 / 65%);
  --separator: rgb(84 84 88 / 65%);
  --text-primary: #FFFFFF;
  --text-secondary: rgb(235 235 245 / 60%);
  --text-muted: rgb(235 235 245 / 40%);
  --primary: #0A84FF;
  --direction: #FF9F0A;
  --attention: #5E5CE6;
  --color-accent-purple: var(--attention);
  --color-success: #30D158;
  --color-danger: #FF453A;
  --material-floating: color-mix(in srgb, var(--surface) 78%, transparent);
}
```

Usunąć `background-image` z `html, body`, zmapować istniejące `--radius-*` na role,
zachować feature-specific tokeny (np. paletę Notatek), a końcowy blok
`Apple HIG & iOS Material Utilities` scalić z kontraktem zamiast pozostawiać drugi
zestaw promieni, sprężyn i kart.

- [ ] **Step 5: Uzgodnić dokumentację z nowym SSOT**

W `docs/DESIGN_SYSTEM.md` zmienić tytuł na SPARKY, zastąpić filozofię Pixel/Material
przez Functional iOS, opisać dokładne role koloru, grouped list, jedną kartę `hero`,
role promieni oraz szkło wyłącznie dla warstw pływających. Zachować aktualne reguły
techniczne i dostępnościowe, które nie są sprzeczne z kontraktem.

- [ ] **Step 6: Uruchomić bramy zadania**

Run:

```powershell
npx vitest run src/components/ui/functionalIosTokens.test.ts
npm run ratchet:frontend
```

Expected: PASS; brak nowych twardych kolorów poza `src/index.css`.

- [ ] **Step 7: Warunkowy commit**

```powershell
git add src/index.css src/components/ui/functionalIosTokens.test.ts docs/DESIGN_SYSTEM.md
git commit -m "feat(ui): establish Functional iOS tokens"
```

Pominąć, jeśli staging nie może jednoznacznie wykluczyć istniejących zmian użytkownika.

#### Task 2: Przyciski, pola i tabs jako semantyczne kontrolki

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Button.test.tsx`
- Modify: `src/components/ui/Input.tsx`
- Modify: `src/components/ui/Input.test.tsx`
- Modify: `src/components/ui/ControlPrimitives.tsx`
- Create: `src/components/ui/ControlPrimitives.test.tsx`
- Modify: `src/components/ui/Tabs.tsx`
- Modify: `src/components/ui/Tabs.test.tsx`
- Modify: `src/components/ui/IconButton.tsx`
- Modify: `src/components/ui/Badge.tsx`
- Modify: `src/components/ui/Badge.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: tokeny Task 1 i niezmienione publiczne warianty `Button`.
- Produces: `data-ui`, `data-variant`, `data-size`, `aria-busy`, `aria-invalid`,
  role `tablist/tab` i klasy `.ui-button`, `.ui-control`, `.ui-tabs`, `.ui-badge`.

- [ ] **Step 1: Rozszerzyć testy o stany i semantykę**

```tsx
it('exposes stable semantic state without changing geometry', () => {
  render(<Button variant="primary" size="sm" loading>Kontynuuj</Button>);
  const button = screen.getByRole('button');
  expect(button).toHaveAttribute('data-ui', 'button');
  expect(button).toHaveAttribute('data-variant', 'primary');
  expect(button).toHaveAttribute('data-size', 'sm');
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(button).toBeDisabled();
});

it('connects the error copy to the input', () => {
  render(<Input label="Nazwa" error="Wymagane" />);
  const input = screen.getByRole('textbox', { name: 'Nazwa' });
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription('Wymagane');
});

it('marks low-level controls with the shared contract', () => {
  render(<ControlTextarea aria-label="Refleksja" />);
  expect(screen.getByRole('textbox', { name: 'Refleksja' })).toHaveAttribute('data-ui', 'control-textarea');
});
```

Dodać do `Tabs.test.tsx` asercje:

```tsx
expect(screen.getByRole('tablist')).toBeInTheDocument();
expect(screen.getByRole('tab', { name: 'Tab B' })).toHaveAttribute('aria-selected', 'true');
```

- [ ] **Step 2: Uruchomić testy i potwierdzić porażkę**

Run:

```powershell
npx vitest run src/components/ui/Button.test.tsx src/components/ui/Input.test.tsx src/components/ui/ControlPrimitives.test.tsx src/components/ui/Tabs.test.tsx src/components/ui/Badge.test.tsx
```

Expected: FAIL na brakujących atrybutach i pliku testowym.

- [ ] **Step 3: Przenieść wygląd kontrolek do kanonicznych klas**

```tsx
<button
  ref={ref}
  type={type}
  data-ui="button"
  data-variant={variant}
  data-size={size}
  aria-busy={loading || undefined}
  disabled={disabled || loading}
  className={`ui-button ui-button--${variant} ui-button--${size} ${className}`}
  {...props}
>
```

```css
.ui-button {
  min-height: var(--touch-target);
  border-radius: var(--radius-md);
  transition: transform var(--motion-fast) var(--ease-out),
    background-color var(--motion-fast) var(--ease-out),
    color var(--motion-fast) var(--ease-out), opacity var(--motion-fast) var(--ease-out);
}
.ui-button:active:not(:disabled) { transform: scale(var(--ios-press-scale)); }
.ui-button--primary { background: var(--primary); color: var(--on-accent); }
.ui-button--secondary { background: var(--surface-3); color: var(--primary); }
.ui-button--outline { background: transparent; border: 1px solid var(--separator); color: var(--primary); }
.ui-button--ghost { background: transparent; color: var(--primary); }
.ui-button--danger { background: var(--color-danger); color: var(--on-accent); }
.ui-button--tonal { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }
.ui-button:focus-visible, .ui-control:focus-visible { box-shadow: var(--shadow-focus); }
```

`Input` ma generować stabilne ID dla opisu błędu, `aria-invalid` oraz
`aria-describedby`. `ControlInput`, `ControlSelect` i `ControlTextarea` używają
`.ui-control`; `Tabs` używa `.ui-tabs/.ui-tab`. `IconButton` zachowuje widoczny kształt
mały, ale hit area minimum `44px`. `Badge` pozostaje małym statusem i nie dostaje
globalnego cienia.

```tsx
const generatedId = useId();
const inputId = props.id ?? `input-${generatedId}`;
const errorId = error ? `${inputId}-error` : undefined;

<label htmlFor={inputId}>{label}</label>
<input
  id={inputId}
  aria-invalid={error ? 'true' : undefined}
  aria-describedby={errorId}
  className={`ui-control ${className}`}
/>
{error ? <p id={errorId}>{error}</p> : null}
```

- [ ] **Step 4: Uruchomić testy kontrolek**

Run: komenda ze Step 2.

Expected: PASS; click/loading/disabled nadal działają, a tabs są dostępne semantycznie.

- [ ] **Step 5: Warunkowy commit**

```powershell
git add src/index.css src/components/ui/Button.tsx src/components/ui/Button.test.tsx src/components/ui/Input.tsx src/components/ui/Input.test.tsx src/components/ui/ControlPrimitives.tsx src/components/ui/ControlPrimitives.test.tsx src/components/ui/Tabs.tsx src/components/ui/Tabs.test.tsx src/components/ui/IconButton.tsx src/components/ui/Badge.tsx src/components/ui/Badge.test.tsx
git commit -m "feat(ui): align controls with Functional iOS"
```

#### Task 3: Powierzchnie `hero`, grouped list i floating

**Files:**
- Modify: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Card.test.tsx`
- Create: `src/components/ui/GroupedList.tsx`
- Create: `src/components/ui/GroupedList.test.tsx`
- Create: `src/components/ui/IconTile.tsx`
- Create: `src/components/ui/IconTile.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: tokeny Task 1 i `Pressable` z Task 2.
- Produces:
  - `CardVariant` rozszerzony o `'grouped' | 'hero' | 'floating'` bez usuwania
    istniejących wariantów w Fazie 1;
  - `GroupedList(props: HTMLAttributes<HTMLDivElement>)`;
  - `GroupedListRow(props: HTMLAttributes<HTMLDivElement> & { inset?: boolean })`;
  - `IconTile(props: { icon: ReactNode; tone: 'action' | 'direction' | 'success' |
    'attention'; label?: string })`.

- [ ] **Step 1: Napisać testy ról powierzchni**

```tsx
it('marks hero as the saturated leading surface', () => {
  render(<Card variant="hero">Najbliższy ruch</Card>);
  expect(screen.getByText('Najbliższy ruch').closest('[data-ui="card"]')).toHaveAttribute('data-variant', 'hero');
});

it('renders one grouped surface with semantic rows', () => {
  render(
    <GroupedList aria-label="Plan dnia">
      <GroupedListRow>Pierwsze zadanie</GroupedListRow>
      <GroupedListRow>Drugie zadanie</GroupedListRow>
    </GroupedList>,
  );
  expect(screen.getByRole('list', { name: 'Plan dnia' })).toHaveAttribute('data-ui', 'grouped-list');
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

it('uses a semantic colour role for the icon tile', () => {
  render(<IconTile tone="direction" icon={<Sunrise />} label="Kierunek" />);
  expect(screen.getByRole('img', { name: 'Kierunek' })).toHaveAttribute('data-tone', 'direction');
});
```

- [ ] **Step 2: Uruchomić testy i zobaczyć porażkę**

Run: `npx vitest run src/components/ui/Card.test.tsx src/components/ui/GroupedList.test.tsx src/components/ui/IconTile.test.tsx`

Expected: FAIL, bo wariant i komponent jeszcze nie istnieją.

- [ ] **Step 3: Wdrożyć małe prymitywy bez wiedzy domenowej**

```tsx
export function GroupedList({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} role="list" data-ui="grouped-list" className={`ui-grouped-list ${className}`} />;
}

export function GroupedListRow({ inset = true, className = '', ...props }: GroupedListRowProps) {
  return (
    <div
      {...props}
      role="listitem"
      data-ui="grouped-list-row"
      data-inset={inset || undefined}
      className={`ui-grouped-list-row ${className}`}
    />
  );
}

export default function IconTile({ icon, tone, label }: IconTileProps) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-ui="icon-tile"
      data-tone={tone}
      className="ui-icon-tile"
    >
      {icon}
    </span>
  );
}
```

`Card` ma przekazywać pozostałe DOM props, wystawiać `data-ui="card"` i
`data-variant`, a mapowanie wariantów ma używać klas `.ui-card--*` zamiast lokalnych
wartości wizualnych. `IconTile` mapuje cztery role koloru i pozostaje dekoracyjne,
chyba że otrzyma własne `label`.

```css
.ui-card { overflow: hidden; background: var(--surface-1); }
.ui-card--surface { border-radius: var(--radius-grouped); border: 0.5px solid var(--separator); }
.ui-card--grouped, .ui-grouped-list { border-radius: var(--radius-grouped); background: var(--surface-1); overflow: hidden; }
.ui-card--hero { border-radius: var(--radius-hero); background: var(--direction); color: var(--on-accent); }
.ui-card--floating { border-radius: var(--radius-sheet); background: var(--material-floating); box-shadow: var(--shadow-float); }
.ui-grouped-list-row { position: relative; min-height: var(--touch-target); padding: 0 var(--space-4); }
.ui-grouped-list-row[data-inset] { --row-separator-inset: var(--space-4); }
.ui-grouped-list-row + .ui-grouped-list-row::before {
  content: '';
  position: absolute;
  inset: 0 0 auto var(--row-separator-inset, 0);
  border-top: 0.5px solid var(--separator);
}
.ui-icon-tile[data-tone='action'] { background: var(--primary); }
.ui-icon-tile[data-tone='direction'] { background: var(--direction); }
.ui-icon-tile[data-tone='success'] { background: var(--color-success); }
.ui-icon-tile[data-tone='attention'] { background: var(--attention); }
```

- [ ] **Step 4: Uruchomić testy powierzchni i kontrolę typów**

Run:

```powershell
npx vitest run src/components/ui/Card.test.tsx src/components/ui/GroupedList.test.tsx src/components/ui/IconTile.test.tsx
npm run typecheck:ui
```

Expected: PASS; istniejący konsumenci wariantów Card nadal się kompilują.

- [ ] **Step 5: Warunkowy commit**

```powershell
git add src/index.css src/components/ui/Card.tsx src/components/ui/Card.test.tsx src/components/ui/GroupedList.tsx src/components/ui/GroupedList.test.tsx src/components/ui/IconTile.tsx src/components/ui/IconTile.test.tsx
git commit -m "feat(ui): add hero and grouped surfaces"
```

#### Task 4: Pływające warstwy i nawigacja

**Files:**
- Modify: `src/components/ui/Modal.tsx`
- Modify: `src/components/ui/Modal.ios.test.tsx`
- Modify: `src/components/ui/Sheet.tsx`
- Modify: `src/components/ui/Sheet.test.tsx`
- Modify: `src/components/core/DashboardNavBar.tsx`
- Create: `src/components/core/DashboardNavBar.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `.ui-card--floating`, `IOS_SPRING`, `shouldCommitGesture`, `useHaptics`.
- Produces: `data-material="floating"` dla Modal/Sheet/nav oraz `aria-current="page"`
  dla aktywnej pozycji nawigacji.

- [ ] **Step 1: Rozszerzyć testy bez zmiany fizyki**

```tsx
expect(screen.getByRole('dialog')).toHaveAttribute('data-material', 'floating');

vi.mock('../../hooks/useHaptics', () => ({
  useHaptics: () => ({ selection: vi.fn() }),
}));

render(
  <DashboardNavBar
    view="dzis"
    navigateTo={vi.fn()}
    urgentTodoCount={0}
    tabOrder={['dzis', 'plan']}
    navItems={[{ id: 'dzis', label: 'Dzisiaj', icon: Circle }, { id: 'plan', label: 'Plan', icon: Square }]}
  />,
);
expect(screen.getByRole('navigation').querySelector('[aria-current="page"]')).toHaveTextContent('Dzisiaj');
```

Zachować istniejące testy focus trap, restore focus, Escape i uchwytu Sheet.

- [ ] **Step 2: Uruchomić testy i potwierdzić brak semantyki materiału**

Run:

```powershell
npx vitest run src/components/ui/Modal.ios.test.tsx src/components/ui/Sheet.test.tsx src/components/core/DashboardNavBar.test.tsx
```

Expected: FAIL tylko na nowych atrybutach/teście nawigacji.

- [ ] **Step 3: Podmienić wyłącznie warstwę wizualną**

Modal i Sheet zachowują cały kod fokusu, drag, velocity, haptics i reduced motion.
Ich kontenery dostają `.ui-floating-layer` oraz `data-material="floating"`; backdrop
używa tokenu scrim bez stałego blur. `DashboardNavBar` używa tego samego materiału,
aktywna pozycja ma niebieską ikonę i etykietę, a nie osobny świecący pill.

```css
.ui-floating-layer {
  background: var(--material-floating);
  border: 0.5px solid var(--separator);
  box-shadow: var(--shadow-float);
  backdrop-filter: blur(20px) saturate(180%);
}
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .ui-floating-layer { background: var(--surface-solid); backdrop-filter: none; }
}
```

- [ ] **Step 4: Uruchomić testy warstw**

Run: komenda ze Step 2.

Expected: PASS; fokus, Escape, drag i aktywna nawigacja nie mają regresji.

- [ ] **Step 5: Warunkowy commit**

```powershell
git add src/index.css src/components/ui/Modal.tsx src/components/ui/Modal.ios.test.tsx src/components/ui/Sheet.tsx src/components/ui/Sheet.test.tsx src/components/core/DashboardNavBar.tsx src/components/core/DashboardNavBar.test.tsx
git commit -m "feat(ui): refine floating iOS layers"
```

#### Task 5: Dostępny, dyskretny wybór ocen zamiast suwaka

**Files:**
- Create: `src/components/ui/DiscreteRating.tsx`
- Create: `src/components/ui/DiscreteRating.test.tsx`
- Move: `src/components/core/shutdown/ShutdownScoreSliders.tsx` → `src/components/shared/DailyScorePicker.tsx`
- Move: `src/components/core/shutdown/ShutdownScoreSliders.test.tsx` → `src/components/shared/DailyScorePicker.test.tsx`
- Modify: `src/components/core/DailyShutdownModal.tsx`
- Modify: `src/components/lifestyle/powerList/PowerListSetupCards.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Produces:

```ts
export type RatingTone = 'critical' | 'warning' | 'neutral' | 'info' | 'success';
export interface RatingOption {
  value: number;
  label: string;
  tone: RatingTone;
}
export interface DiscreteRatingProps {
  label: string;
  value: number;
  max: number;
  options: readonly RatingOption[];
  onChange: (value: number) => void;
  description?: string;
}
```

- Consumes: `Pressable`, `useHaptics`, semantyczne tony Task 1.

- [ ] **Step 1: Napisać test zachowania radiogroup i klawiatury**

```tsx
it('selects directly and moves with arrow keys', () => {
  const onChange = vi.fn();
  render(<DiscreteRating label="Wynik dnia" value={7} max={10} options={options} onChange={onChange} />);
  const seven = screen.getByRole('radio', { name: /7 z 10/ });
  fireEvent.keyDown(seven, { key: 'ArrowRight' });
  expect(onChange).toHaveBeenCalledWith(8);
  fireEvent.click(screen.getByRole('radio', { name: /10 z 10/ }));
  expect(onChange).toHaveBeenCalledWith(10);
});
```

Test `DailyScorePicker` ma oczekiwać dokładnie zakresów `1–3 Trudny`,
`4–6 Nierówny`, `7–8 Dobry`, `9–10 Wyjątkowy` oraz pięciu zawsze widocznych etykiet
samopoczucia.

- [ ] **Step 2: Uruchomić testy i potwierdzić porażkę**

Run:

```powershell
npx vitest run src/components/ui/DiscreteRating.test.tsx src/components/shared/DailyScorePicker.test.tsx
```

Expected: FAIL, bo komponenty pod nowymi nazwami nie istnieją.

- [ ] **Step 3: Wdrożyć wspólny picker i uprościć wizualną hierarchię**

`DiscreteRating` renderuje `role="radiogroup"`, każdy przycisk ma `role="radio"`,
`aria-checked`, roving `tabIndex`, widoczny focus i obsługę Arrow/Home/End. Haptic
uruchamia się tylko przy realnej zmianie wartości. `DailyScorePicker` składa dwa
pickery i pokazuje jedno krótkie wyjaśnienie bieżącego zakresu jako zwykły tekst,
bez dodatkowej karty w karcie.

```ts
function nextRatingIndex(key: string, current: number, length: number) {
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  if (key === 'ArrowRight' || key === 'ArrowDown') return Math.min(current + 1, length - 1);
  if (key === 'ArrowLeft' || key === 'ArrowUp') return Math.max(current - 1, 0);
  return current;
}

const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
  const next = nextRatingIndex(event.key, index, options.length);
  if (next === index) return;
  event.preventDefault();
  selection();
  onChange(options[next].value);
  optionRefs.current[next]?.focus();
};
```

```ts
const DAY_BANDS = [
  { min: 1, max: 3, label: 'Trudny', tone: 'critical' },
  { min: 4, max: 6, label: 'Nierówny', tone: 'warning' },
  { min: 7, max: 8, label: 'Dobry', tone: 'info' },
  { min: 9, max: 10, label: 'Wyjątkowy', tone: 'success' },
] as const;

const MOOD_OPTIONS = [
  { value: 1, label: 'Ciężko', tone: 'critical' },
  { value: 2, label: 'Słabo', tone: 'warning' },
  { value: 3, label: 'Neutralnie', tone: 'neutral' },
  { value: 4, label: 'Dobrze', tone: 'info' },
  { value: 5, label: 'Świetnie', tone: 'success' },
] as const;
```

```css
.ui-rating-option { min-width: var(--touch-target); min-height: var(--touch-target); }
.ui-rating-option[data-tone='critical'] { --rating-tone: var(--color-danger); }
.ui-rating-option[data-tone='warning'] { --rating-tone: var(--direction); }
.ui-rating-option[data-tone='neutral'] { --rating-tone: var(--text-secondary); }
.ui-rating-option[data-tone='info'] { --rating-tone: var(--primary); }
.ui-rating-option[data-tone='success'] { --rating-tone: var(--color-success); }
.ui-rating-option[aria-checked='true'] { background: var(--rating-tone); color: var(--on-accent); }
```

Usunąć stare pliki po aktualizacji obu importów i sprawdzić brak starej nazwy:
`rg "ShutdownScoreSliders" src` ma zwrócić zero wyników.

- [ ] **Step 4: Uruchomić testy ocen i ich obu konsumentów**

Run:

```powershell
npx vitest run src/components/ui/DiscreteRating.test.tsx src/components/shared/DailyScorePicker.test.tsx src/components/lifestyle/powerList/PowerListSetupCards.test.tsx
npm run typecheck:ui
```

Expected: PASS; wieczorne domknięcie i poranna refleksja używają tego samego komponentu.

- [ ] **Step 5: Warunkowy commit**

```powershell
git add src/index.css src/components/ui/DiscreteRating.tsx src/components/ui/DiscreteRating.test.tsx src/components/shared/DailyScorePicker.tsx src/components/shared/DailyScorePicker.test.tsx src/components/core/shutdown/ShutdownScoreSliders.tsx src/components/core/shutdown/ShutdownScoreSliders.test.tsx src/components/core/DailyShutdownModal.tsx src/components/lifestyle/powerList/PowerListSetupCards.tsx
git commit -m "feat(ui): add discrete daily rating picker"
```

#### Task 6: Ekran referencyjny Dzisiaj i rytuał startu

**Files:**
- Modify: `src/components/lifestyle/powerList/PowerListSetupHeader.tsx`
- Modify: `src/components/lifestyle/powerList/PowerListSetupCards.tsx`
- Modify: `src/components/lifestyle/powerList/PowerListSetupCards.test.tsx`
- Modify: `src/components/lifestyle/powerList/PowerListSetup.tsx`
- Modify: `src/components/lifestyle/powerList/TodoPicker.tsx`
- Modify: `src/components/lifestyle/powerList/TodoPicker.test.tsx`
- Modify: `src/components/lifestyle/PowerList.tsx`
- Modify: `src/components/core/HorizonHeader.tsx`
- Modify: `src/components/core/TodayStatusStrip.tsx`
- Modify: `src/components/core/DashboardDzisTab.tsx`

**Interfaces:**
- Consumes: `Card variant="hero"`, `GroupedList`, `GroupedListRow`, `Button`,
  `ControlTextarea`, `DailyScorePicker` i istniejące props/hooki bez zmian.
- Produces: jeden referencyjny ekran, na którym można zaakceptować cały język
  wizualny przed migracją kolejnych domen.

- [ ] **Step 1: Rozszerzyć test pilota o strukturę, nie screenshot klas**

```tsx
expect(screen.getByText('Najbliższy ruch').closest('[data-variant="hero"]')).toBeInTheDocument();
expect(screen.getByRole('list', { name: 'Zadania z wczoraj' })).toHaveAttribute('data-ui', 'grouped-list');
expect(screen.getByRole('list', { name: 'Plan dnia' })).toHaveAttribute('data-ui', 'grouped-list');
expect(screen.getByRole('button', { name: 'Oznacz jako wykonane: Sauna' })).toBeEnabled();
expect(screen.getByText('Pięć dzisiejszych zwycięstw')).toBeInTheDocument();
expect(screen.queryByText('Pytania pomocnicze')).not.toBeInTheDocument();
```

W `TodoPicker.test.tsx` zachować grupowanie dat i dodać:

```tsx
it('links the chosen Todo without changing its date', () => {
  const item = todo('today', 'Na dziś', getTodayWarsaw());
  const onSelect = vi.fn();
  const onClose = vi.fn();
  render(<TodoPicker items={[item]} onSelect={onSelect} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: /Na dziś/ }));
  expect(onSelect).toHaveBeenCalledWith(item);
  expect(onClose).toHaveBeenCalledOnce();
  expect(item.due_date).toBe(getTodayWarsaw());
});
```

- [ ] **Step 2: Uruchomić testy i potwierdzić brak nowej struktury**

Run:

```powershell
npx vitest run src/components/lifestyle/powerList/PowerListSetupCards.test.tsx src/components/lifestyle/powerList/TodoPicker.test.tsx
```

Expected: FAIL na brakującym hero/grouped list, a istniejące testy logiki pozostają zielone.

- [ ] **Step 3: Zbudować jedną hierarchię bez kart w kartach**

`PowerListSetupHeader` staje się pomarańczową kartą `hero`:

```tsx
<Card variant="hero" padding="1.5rem" data-ui="ritual-hero">
  <p className="text-sm font-semibold">Najbliższy ruch</p>
  <h2>{reflectionReady ? 'Ułóż plan dnia' : 'Domknij wczoraj'}</h2>
  <p>{reflectionReady ? `${filledCount} z 5 zwycięstw` : 'Jedna krótka refleksja'}</p>
</Card>
```

`YesterdayRecap` ma jedną grouped surface: zadania są wierszami z interaktywnym
checkiem, textarea jest kolejną sekcją, a oceny ostatnią. `PowerListSetup` przestaje
być `Card variant="glass"`; pięć slotów tworzy jeden `GroupedList`, a każdy slot jeden
wiersz. CTA jest zwykłym `Button` pod listą bez otaczającej karty.

`TodoPicker` pozostaje popoverem, lecz jego wyniki są grouped rows. Tekst zachowuje
zatwierdzony kontrakt: wybór tylko łączy zadanie z planem; data i pozycja Todo nie
zmieniają się. `HorizonHeader` używa dużego systemowego tytułu bez uppercase,
`TodayStatusStrip` staje się spokojną grouped surface z semantycznymi `IconTile`,
a `DashboardDzisTab` zachowuje neutralny canvas i istniejącą kolejność danych.

- [ ] **Step 4: Uruchomić testy pilota i sprawdzić brak martwego kodu**

Run:

```powershell
npx vitest run src/components/lifestyle/powerList/PowerListSetupCards.test.tsx src/components/lifestyle/powerList/TodoPicker.test.tsx
rg "PowerListSetupHeader|YesterdayRecap|TodoPicker" src/components
npm run typecheck:ui
```

Expected: PASS; każde przeniesienie ma realnego konsumenta, brak starego panelu glass
i brak zmiany sygnatur hooków danych.

- [ ] **Step 5: Warunkowy commit**

```powershell
git add src/components/lifestyle/powerList src/components/lifestyle/PowerList.tsx src/components/core/HorizonHeader.tsx src/components/core/TodayStatusStrip.tsx src/components/core/DashboardDzisTab.tsx
git commit -m "feat(today): apply Functional iOS ritual layout"
```

#### Task 7: Brama końcowa i wizualna akceptacja

**Files:**
- Modify: `docs/agent/ACTIVE_WORK.md`
- No production files until a failed check identifies a scoped regression.

**Interfaces:**
- Consumes: kompletny pion Tasks 1–6.
- Produces: zweryfikowany wzorzec dla następnych migracji komponentów.

- [ ] **Step 1: Uruchomić cały zestaw testów zmienionego pionu**

```powershell
npx vitest run src/components/ui/functionalIosTokens.test.ts src/components/ui/Button.test.tsx src/components/ui/Input.test.tsx src/components/ui/ControlPrimitives.test.tsx src/components/ui/Tabs.test.tsx src/components/ui/Badge.test.tsx src/components/ui/Card.test.tsx src/components/ui/GroupedList.test.tsx src/components/ui/IconTile.test.tsx src/components/ui/Modal.ios.test.tsx src/components/ui/Sheet.test.tsx src/components/ui/DiscreteRating.test.tsx src/components/shared/DailyScorePicker.test.tsx src/components/core/DashboardNavBar.test.tsx src/components/lifestyle/powerList/PowerListSetupCards.test.tsx src/components/lifestyle/powerList/TodoPicker.test.tsx
```

Expected: wszystkie testy PASS.

- [ ] **Step 2: Uruchomić bramy repozytorium**

```powershell
npm run typecheck:ui
npx eslint src/components/ui src/components/shared/DailyScorePicker.tsx src/components/core/DashboardNavBar.tsx src/components/core/DashboardDzisTab.tsx src/components/core/HorizonHeader.tsx src/components/core/TodayStatusStrip.tsx src/components/core/DailyShutdownModal.tsx src/components/lifestyle/PowerList.tsx src/components/lifestyle/powerList
npm run ratchet:frontend
npm run build
npm run mobile:build
```

Expected: zero nowych błędów; jeśli repo ma istniejącą porażkę niezwiązaną ze zmianą,
zapisać dokładny dowód i nie rozszerzać baseline’u.

- [ ] **Step 3: Zweryfikować prawdziwy ekran, nie galerię komponentów**

Uruchomić aplikację i sprawdzić `Dzisiaj` w light/dark przy viewportach `390 × 844`
oraz `1440 × 900`. Przejść stany: refleksja wymagana, zadanie z wczoraj wykonane
i cofnięte, każda grupa oceny, otwarty Todo picker, 0/5, 5/5, zapis w toku, disabled,
focus klawiatury, reduced motion i reduced transparency.

Expected: jeden pomarańczowy hero, brak kremowego canvasu i dekoracyjnych gradientów,
jedna grouped surface na powiązaną grupę, żadnych kart w kartach, czytelna hierarchia
oraz brak zmian w danych po samym otwarciu pickera.

- [ ] **Step 4: Zaktualizować stan pracy**

W tej sekcji oznaczyć ukończone zadania, dopisać wynik testów i wizualnej walidacji.
Otwarte migracje kolejnych ekranów przenieść do istniejącego `BACKLOG.md`, bez nowego
dokumentu planistycznego.

- [ ] **Step 5: Warunkowy commit końcowy**

```powershell
git add docs/agent/ACTIVE_WORK.md
git commit -m "docs(ui): record Functional iOS pilot verification"
```

Pominąć w bieżącym brudnym worktree, jeśli plik zawiera cudze staged/unstaged hunks.

## Priorytet: Vanguard — system interakcji inspirowany iOS

### Cel

Vanguard na Windows/PWA i Androidzie ma wyglądać i zachowywać się jak aplikacja
zaprojektowana zgodnie z zasadami Apple:
czytelna typografia systemowa, semantyczne materiały, cele dotykowe minimum 44 px,
natychmiastowy feedback, przerywalne sprężyny, gesty śledzące palec 1:1, natywna
haptyka i pełna obsługa ustawień dostępności.

### Zatwierdzony model

- `src/index.css` pozostaje jedynym źródłem tokenów wizualnych.
- `src/lib/motion/iosMotion.ts` jest jedynym źródłem parametrów fizyki i projekcji gestu.
- `ui/Button`, `ui/Modal` i `ui/Sheet` są kanonicznymi prymitywami.
- Wycofujemy język Pixel/neon z prymitywów na rzecz hierarchii iOS.
- PWA i Capacitor korzystają z tego samego UI; natywna haptyka działa przez
  Capacitor, a web ma bezpieczny fallback.
- Obsługiwane platformy to Windows/PWA i Android. Apple jest wzorcem projektowym,
  nie platformą docelową; projekt nie zawiera zależności ani katalogu iOS.

### Plan techniczny

1. Test-first: projekcja momentum, rubber-band i wybór snap point.
2. Centralne tokeny: Dynamic Type, cele 44 px, tracking, materiały i dostępność.
3. Button, Modal i Sheet: feedback, focus, inert, drag, velocity i snap points.
4. Nawigacja: fizyczny wskaźnik i swipe śledzący palec 1:1.
5. Haptyka: Capacitor za guardem platformy i web fallback.
6. Platforma: Android/Capacitor, status bar, safe areas i Windows/PWA.
7. Migracja konsumentów starych klas prymitywów.
8. Testy, typecheck, lint, ratchety, buildy i wizualna weryfikacja mobile.

### Bramy jakości

- Każda nowa funkcja zachowania zaczyna od testu, który najpierw nie przechodzi.
- Nowe pliki UI mają mniej niż 300 linii.
- Decyzje wizualne pozostają w `src/index.css`.
- Każdy prymityw dotykowy ma aktywny obszar minimum 44 × 44 px.
- Ruch dotykowy jest przerywalny; reduced motion zachowuje informację bez przesuwania.
- Modal i Sheet przechodzą testy klawiatury, fokusu, zamykania i ARIA.

### Stan

- [x] Fizyka i testy
- [x] Centralne tokeny
- [x] Button / Modal / Sheet
- [x] Nawigacja i swipe
- [x] Haptyka
- [x] Windows/PWA i Android/Capacitor (bez iOS)
- [x] Migracja starych wzorców
- [x] Weryfikacja (typecheck, lint, 301 testów, build PWA, frontend ratchet,
  wizualnie Windows + viewport Android, sync Android)
- [x] Natywny debug APK (Gradle/Java 21, zweryfikowany podpis v2 i zawartość assetów)

---

## Priorytet: Notatki — model Apple Notes 1:1

### Cel

Odtworzyć model pracy Apple Notes na webie: natychmiastowe przejście od znalezienia
notatki do pisania, jeden dokument bez osobnych pól tytułu i tagów, niezawodny zapis,
sesyjne odblokowanie oraz skanowanie dokumentów. Priorytetem jest jeden użytkownik,
więc prostota i szybkość mają pierwszeństwo przed skalowaniem i abstrakcjami.

### Zatwierdzony model produktu

1. **Układ**
   - desktop: foldery → lista notatek → edytor;
   - mobile: osobne ekrany folderów, notatek i edytora;
   - lista może zostać przełączona na Galerię; nie istnieje osobny tryb „Podział”.
2. **Dokument**
   - pierwsza linia treści jest tytułem; nie ma osobnego pola tytułu;
   - `#tag` wpisany w treści staje się tagiem po spacji lub Enter;
   - utworzenie tagu nigdy nie tworzy pomocniczej notatki;
   - porzucona, całkowicie pusta nowa notatka trafia do kosza bez komunikatu.
3. **Zapis**
   - autosave ma najwyżej jeden zapis w locie i scala zmiany powstałe w jego trakcie;
   - ostatni szkic zawsze wygrywa, także przy zmianie notatki i zamknięciu;
   - offline oznacza lokalny szkic awaryjny oraz jawne „Nie zapisano w chmurze”;
     nie używamy kolejki udającej poprawną synchronizację.
4. **Blokada**
   - treść i tagi pozostają zaszyfrowane w bazie przez cały czas;
   - tytuł pozostaje widoczny na liście jak w Apple Notes;
   - odblokowanie działa tylko w pamięci bieżącej sesji, wspólnie dla zablokowanych
     notatek, przez kilka minut;
   - „Zablokuj teraz”, wyjście z aplikacji lub wygaśnięcie sesji czyści plaintext;
   - ograniczenia Apple obowiązują: nie blokujemy notatek z tagami, audio, PDF-em,
     wideo ani dokumentem; obrazy i skany dokumentów są dozwolone.
5. **Powierzchnia edytora**
   - główny widok eksponuje treść, cofanie/ponawianie i przycisk załącznika;
   - formatowanie jest kontekstowe; AI, eksport, kolor, przypięcie, przeniesienie,
     archiwizacja, blokada i usuwanie mieszkają w menu `…`;
   - załącznik otwiera jedno menu: zdjęcie, plik, skan tekstu, skan dokumentu, audio.
6. **Skanowanie i OCR**
   - automatyczne lub ręczne przechwytywanie strony;
   - korekta czterech narożników, obrót i filtry obrazu;
   - ponawianie strony, wiele stron i wynikowy PDF;
   - „Skanuj tekst” wstawia rozpoznany tekst w miejscu kursora;
   - OCR skanów jest zapisany osobno i zasila wyszukiwanie, nie zmienia treści notatki.
7. **Pozostały cykl życia**
   - foldery, przypięcie, wyszukiwanie, Kosz, eksport i prywatne załączniki pozostają;
   - wyszukiwanie obejmuje treść, tytuł wynikający z pierwszej linii, tagi,
     nazwy załączników i OCR; dla zablokowanej notatki tylko widoczny tytuł.

### Architektura i dane

- Nadal istnieje jeden `InlineEditor` i jedna ścieżka zapisu przez `src/lib`.
- Kanonicznym dokumentem jest HTML `content`; `title` jest pochodną pierwszej linii
  utrzymywaną dla szybkiej listy i wyszukiwania.
- Tagi są pochodną aktywnych tokenów `#tag` w dokumencie.
- Kolejka autosave jest lokalnym szeregowym procesorem, nie systemem synchronizacji.
- Odszyfrowany payload żyje w pamięci kontrolera sesji, nigdy w React Query,
  `localStorage`, indeksie wyszukiwania ani bazie.
- Skaner jest wydzielonym przepływem UI; komponenty nie komunikują się bezpośrednio
  z Supabase. Oryginały/PDF trafiają do prywatnego Storage przez warstwę API.
- OCR wykorzystuje istniejący backend AI; brak odpowiedzi OCR nie blokuje zapisania PDF.

### Obsługa błędów

- Błąd autosave pozostawia szkic lokalnie i pokazuje trwałą akcję „Spróbuj ponownie”.
- Nieudane zamknięcie czeka na bieżący zapis; użytkownik nie traci nowszego szkicu.
- Niepoprawne hasło nie zmienia danych ani czasu sesji odblokowania.
- Nieudany OCR pozostawia skan i umożliwia ponowienie OCR.
- Nieudana pojedyncza strona skanu nie usuwa już zaakceptowanych stron.

### Kolejność wdrożenia

1. Szeregowy autosave i prosty szkic awaryjny.
2. Model pierwszej linii jako tytułu, tagi inline i sprzątanie pustych notatek.
3. Sesyjna blokada bez plaintextu w bazie.
4. Układ foldery/lista/edytor + Galeria i uproszczone menu.
5. Skaner wielostronicowy, PDF, OCR i wyszukiwanie.
6. Pełna weryfikacja desktop/mobile/offline/build.

### Plan techniczny

#### Zadanie 1: zapis dokumentu

- Rozszerzyć `useNoteDraftAutosave.test.ts` o równoległe opóźnione zapisy, zmiany
  podczas zapisu, flush przy przejściu i trwały błąd.
- Zmienić `useNoteDraftAutosave.ts` w procesor z jednym zapisem w locie oraz jednym
  scalonym oczekującym szkicem.
- Zastąpić kolejkę offline Notatek lokalnym szkicem awaryjnym przypisanym do ID.
- Zweryfikować testy hooka, typy i lint.

#### Zadanie 2: jeden dokument

- Dodać czyste funkcje wyznaczające tytuł z pierwszej linii i aktywne `#tagi`.
- Usunąć pola tytułu/tagów z edytora oraz ręczne tworzenie tagu z sidebara.
- Przy zapisie wyprowadzać `title` i `tags` z HTML dokumentu.
- Oznaczać nowe notatki i przenosić całkowicie puste do Kosza przy zamknięciu.
- Zweryfikować wyszukiwanie, podglądy, eksport i szybkie przechwytywanie.

#### Zadanie 3: blokada sesyjna

- Dodać kontroler pamięciowej sesji odblokowania z czasem wygaśnięcia i „Zablokuj teraz”.
- Zapis odblokowanej notatki szyfrować przed wywołaniem API; nie zapisywać plaintextu
  do cache ani lokalnego szkicu.
- Zachować jawny tytuł i egzekwować ograniczenia załączników/tagów.
- Dodać testy wygaśnięcia, ponownego blokowania i braku plaintextu.

#### Zadanie 4: układ i menu Apple

- Zastąpić tryby Grid/Split stałym układem desktopowym foldery/lista/edytor.
- Dodać przełącznik Lista/Galeria dla środkowej kolumny oraz mobilny stos ekranów.
- Przenieść akcje drugorzędne do menu `…` i połączyć wszystkie załączniki w jedno menu.
- Usunąć martwe komponenty, style i stan poprzednich trybów.

#### Zadanie 5: skaner i OCR

- Dodać model stron skanu oraz testy korekty narożników, obrotu i filtrów.
- Zbudować przechwytywanie aparatem/plikiem, ręczne narożniki i podgląd wielu stron.
- Generować jeden PDF i przesyłać go istniejącą warstwą załączników.
- Dodać backendowy tryb OCR, zapis osobnego tekstu OCR i włączenie go do wyszukiwania.
- Dodać „Skanuj tekst”, które wstawia wynik w bieżącym miejscu kursora.

#### Zadanie 6: brama końcowa

- Uruchomić testy Notatek, pełny typecheck, focused lint i produkcyjny build.
- Sprawdzić ręcznie utworzenie, szybkie pisanie, zmianę notatki, offline, blokadę,
  skan wielostronicowy, OCR, wyszukiwanie, Kosz i eksport na desktopie/mobile.

### Bramy jakości

- Każda funkcja zaczyna się od testu, który najpierw nie przechodzi.
- Nowe pliki UI mają mniej niż 300 linii; kontenery nie mieszają zapytań z JSX.
- Brak bezpośredniego Supabase i natywnych dialogów w komponentach.
- Po każdym etapie: testy obszaru, `npm run typecheck:ui`, lint i kontrola martwego kodu.
- Przed końcem: pełna ścieżka użytkownika na desktopie i mobile oraz test produkcyjnego buildu.

### Stan

- [x] Szeregowy autosave i szkic awaryjny
- [x] Dokument Apple: tytuł z pierwszej linii, tagi inline, puste notatki
- [x] Sesyjna blokada
- [x] Układ Apple i uproszczone menu
- [x] Skaner wielostronicowy, PDF i OCR
- [x] Weryfikacja całości

---

## Stan: Capacitor Android — Faza 5 + 6 ✅ (2026-07-21)

### DONE (Faza 5 — sync w tle)

- `TelemetryForegroundService` — FGS typu `location`, powiadomienie „Sync aktywny”
- `BackgroundSyncPlugin` — start/stop, tick co ~15 min → `syncPhoneUsageToday` + `syncLocationNow`
- Wizard w ⚙️ Ustawienia: bateria, autostart (Xiaomi/OPPO/Vivo/Huawei fallback), GPS, toggle sync w tle
- `locationSync` — watchPosition nie zatrzymuje się gdy FGS aktywny
- Manifest: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`

### DONE (Faza 6 — polish)

- Ikona launchera z `public/pwa-*.png` (tło adaptive `#1C1917`)
- Share target `ACTION_SEND text/plain` → `/links` lub `/keep`
- Static shortcuts: Zadania, Linki, Notatki (`res/xml/shortcuts.xml`)
- Deep links `https://localhost/...` + `ShareIntentPlugin` + `initNativeIntents`

### NEXT

- Faza 7 (opcjonalnie): widgety
- Final (~3 tyg.): Oura Gen 3 BLE (noop slice) — wymaga FGS

### DONE wcześniej

- Faza 4 lokalizacja → `location_history`
- Faza 3 Usage Stats → `phone_usage_daily`
- Faza 2 FCM push
- Faza 1 bootstrap Capacitor
