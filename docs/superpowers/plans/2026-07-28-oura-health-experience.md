# Oura Health Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zbudować zgodne z API Oura centrum zdrowia z widokami Dzisiaj, Parametry i Moje zdrowie oraz szczegółem snu, który pokazuje prawdziwą oś faz i przewagi danych Sparky.

**Architecture:** Warstwa `src/lib` wybiera jeden kanoniczny dzień i składa wszystkie źródła dla tego dnia w jawny model widoku. Czyste funkcje domenowe odpowiadają za fazy, czasy, sumy i stany braków, a małe prezentery React renderują trzy główne widoki i szczegóły. Istniejący pipeline synchronizacji pozostaje jedyną ścieżką zapisu.

**Tech Stack:** React 18, TypeScript, TanStack Query, Supabase, Tailwind z tokenami `src/index.css`, Vitest, Testing Library.

## Global Constraints

- Jedna karta dnia reprezentuje jeden kanoniczny dzień Oura.
- Brak danych jest widoczny; UI nie tworzy zastępczych faz, godzin, ruchu ani pomiarów.
- Nowe pliki UI mają mniej niż 300 linii i nie łączą pobierania danych z renderowaniem.
- Komponenty nie wywołują Supabase bezpośrednio.
- Cele dotykowe mają minimum 44 × 44 px, a ruch respektuje `prefers-reduced-motion`.
- Kolory używają istniejących tokenów; nowe tokeny są dozwolone wyłącznie dla semantyki faz snu.
- Nie powstaje drugi pipeline synchronizacji Oura.

---

### Task 1: Kanoniczny model dnia Oura

**Files:**
- Create: `src/lib/biometrics/ouraDayModel.ts`
- Create: `src/lib/biometrics/ouraDayModel.test.ts`
- Modify: `src/lib/biometricsApi.ts`
- Modify: `src/components/biometrics/oura/types.ts`

**Interfaces:**
- Consumes: wiersze `oura_daily_summary` i `oura_enhanced`.
- Produces: `selectCanonicalOuraDay(input): OuraDayModel | null` oraz `OuraHealthHubData.day`.

- [ ] **Step 1: Write the failing canonical-day tests**

```ts
it('never combines summary and enhanced rows from different dates', () => {
  const result = selectCanonicalOuraDay({
    preferredDate: '2026-07-28',
    summaries: [{ date: '2026-07-28', total_sleep_hours: 7.7 }],
    enhanced: [{ date: '2026-07-27', time_in_bed_hours: 9.1 }],
  });
  expect(result?.date).toBe('2026-07-28');
  expect(result?.enhanced).toBeNull();
  expect(result?.missingSources).toContain('oura_enhanced');
});

it('falls back as a complete day instead of choosing each source independently', () => {
  const result = selectCanonicalOuraDay({
    preferredDate: '2026-07-28',
    summaries: [{ date: '2026-07-27', total_sleep_hours: 7.7 }],
    enhanced: [{ date: '2026-07-27', time_in_bed_hours: 9.1 }],
  });
  expect(result?.date).toBe('2026-07-27');
  expect(result?.summary?.date).toBe('2026-07-27');
  expect(result?.enhanced?.date).toBe('2026-07-27');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/lib/biometrics/ouraDayModel.test.ts`

Expected: FAIL because `selectCanonicalOuraDay` does not exist.

- [ ] **Step 3: Implement the typed canonical selector**

Create a pure selector that indexes both arrays by `date`, prefers the requested
date when it has a summary, otherwise chooses the newest summary date, and only
attaches `enhancedByDate.get(selectedDate)`. Return `missingSources` explicitly.

- [ ] **Step 4: Replace independent row selection in `useDailyStrainOura`**

Query a bounded recent window, call `selectCanonicalOuraDay`, and expose its
`summary`, `enhanced`, `date`, `missingSources`, and previous complete day through
the existing query result. Preserve the public aliases temporarily so untouched
cards continue compiling.

- [ ] **Step 5: Run tests and types**

Run: `npm test -- --run src/lib/biometrics/ouraDayModel.test.ts`

Expected: PASS.

Run: `npm run typecheck:ui`

Expected: zero errors in touched files.

- [ ] **Step 6: Commit the isolated data-model change**

Stage only the four files from this task and commit `fix: align Oura metrics to one canonical day`.

---

### Task 2: Prawdziwa oś snu i inwarianty

**Files:**
- Create: `src/lib/biometrics/ouraSleepTimeline.ts`
- Create: `src/lib/biometrics/ouraSleepTimeline.test.ts`
- Modify: `src/components/biometrics/oura/OuraHypnogramChart.tsx`

**Interfaces:**
- Consumes: `sleep_phase_5_min`, `bedtime_start`, `bedtime_end`, zapisane sumy faz.
- Produces: `buildSleepTimeline(input): SleepTimelineResult`.

- [ ] **Step 1: Write failing phase and time-axis tests**

```ts
it('preserves short awake transitions', () => {
  const result = buildSleepTimeline({
    phases: '2214223',
    bedtimeStart: '2026-07-27T23:31:00+02:00',
    bedtimeEnd: '2026-07-28T08:42:00+02:00',
  });
  expect(result.segments.map(({ stage, blocks }) => [stage, blocks])).toEqual([
    ['light', 2], ['deep', 1], ['awake', 1], ['light', 2], ['rem', 1],
  ]);
});

it('derives labels across midnight from the actual interval', () => {
  const result = buildSleepTimeline({
    phases: '2'.repeat(110),
    bedtimeStart: '2026-07-27T23:31:00+02:00',
    bedtimeEnd: '2026-07-28T08:42:00+02:00',
  });
  expect(result.axisLabels[0]).toBe('23:31');
  expect(result.axisLabels.at(-1)).toBe('08:42');
});

it('returns unavailable instead of fabricating phases', () => {
  expect(buildSleepTimeline({
    phases: null,
    bedtimeStart: '2026-07-27T23:31:00+02:00',
    bedtimeEnd: '2026-07-28T08:42:00+02:00',
  }).status).toBe('unavailable');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/lib/biometrics/ouraSleepTimeline.test.ts`

Expected: FAIL because `buildSleepTimeline` does not exist.

- [ ] **Step 3: Implement timeline parsing and validation**

Map Oura characters `1/2/3/4` to deep/light/REM/awake, group only consecutive
equal blocks, calculate positions from block count, calculate five axis labels
from the real timestamp interval, and return a warning when phase duration differs
materially from the real interval or stored totals.

- [ ] **Step 4: Rebuild `OuraHypnogramChart` around the pure result**

Delete:

- the synthetic `80`-block fallback;
- hardcoded `23:15`, `01:30`, `03:30`, `05:30`, `07:30`;
- hardcoded movement positions.

Render a visible unavailable state when phases or movement are absent. Use actual
movement rows only after Task 3 exposes them.

- [ ] **Step 5: Run focused tests and types**

Run: `npm test -- --run src/lib/biometrics/ouraSleepTimeline.test.ts`

Expected: PASS.

Run: `npm run typecheck:ui`

Expected: zero errors in touched files.

- [ ] **Step 6: Commit the real hypnogram**

Commit `fix: render Oura sleep timeline from measured phases`.

---

### Task 3: Pełny model szczegółów nocy

**Files:**
- Modify: `src/lib/biometricsApi.ts`
- Modify: `src/lib/queryKeys.ts`
- Modify: `src/components/biometrics/oura/types.ts`
- Create: `src/lib/biometrics/ouraNightDetails.test.ts`

**Interfaces:**
- Consumes: `oura_sleep_phase_timeline`, `oura_sleep_hr_timeline`,
  `oura_sleep_hrv_timeline`, `oura_heartrate` dla kanonicznej nocy.
- Produces: `OuraNightDetails` z fazami, ruchem, HR i HRV oraz stanami źródeł.

- [ ] **Step 1: Add a failing query-model test**

Test the pure mapper used by the query:

```ts
expect(mapOuraNightDetails({
  date: '2026-07-28',
  phases: [{ ts: '2026-07-27T23:31:00+02:00', phase: 4 }],
  heartRate: [{ ts: '2026-07-28T02:00:00+02:00', bpm: 49 }],
  hrv: [{ ts: '2026-07-28T02:00:00+02:00', hrv: 62 }],
})).toMatchObject({
  date: '2026-07-28',
  phaseStatus: 'available',
  heartRateStatus: 'available',
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run src/lib/biometrics/ouraNightDetails.test.ts`

Expected: FAIL because the mapper is absent.

- [ ] **Step 3: Add the canonical detail query**

Fetch by `user_id` and the selected night bounds or sleep identifier. Do not fetch
unbounded history. Expose independent source status so a missing HR series does
not erase the measured phases.

- [ ] **Step 4: Pass the details through the page container**

Extend `OuraHealthHubData` without adding Supabase calls to components. Keep all
raw-to-view mapping in `src/lib`.

- [ ] **Step 5: Verify tests and types**

Run the focused model tests and `npm run typecheck:ui`.

- [ ] **Step 6: Commit**

Commit `feat: expose measured Oura night details`.

---

### Task 4: Nowa struktura Dzisiaj / Parametry / Moje zdrowie

**Files:**
- Modify: `src/components/biometrics/OuraHealthPage.tsx`
- Create: `src/components/biometrics/oura/OuraHealthContainer.tsx`
- Create: `src/components/biometrics/oura/OuraHealthView.tsx`
- Create: `src/components/biometrics/oura/OuraTodayView.tsx`
- Create: `src/components/biometrics/oura/OuraVitalsView.tsx`
- Create: `src/components/biometrics/oura/OuraLongTermView.tsx`
- Create: `src/components/biometrics/oura/OuraMetricCard.tsx`
- Create: `src/components/biometrics/oura/OuraHealthView.test.tsx`

**Interfaces:**
- Consumes: `OuraHealthHubData` and selected section.
- Produces: responsive navigation and three pure section views.

- [ ] **Step 1: Write failing navigation and empty-state tests**

Verify the three labels are present, the default section is `Dzisiaj`, clicking
`Parametry` changes the visible heading, and a missing score renders a named
unavailable state instead of `--` alone.

- [ ] **Step 2: Run the focused component test and verify RED**

Run: `npm test -- --run src/components/biometrics/oura/OuraHealthView.test.tsx`

Expected: FAIL because the new view does not exist.

- [ ] **Step 3: Split container and presenters**

Keep query hooks and selected-day state in `OuraHealthContainer`. Keep
`OuraHealthView` and all section views free of data fetching. Make
`OuraHealthPage.tsx` a route-level wrapper.

- [ ] **Step 4: Implement the Oura-inspired visual hierarchy**

Use a dark graphite canvas, large lightweight scores, semantic icon colors,
rounded surface cards, mobile bottom navigation and desktop top navigation.
Cards expose Gotowość, Sen, Aktywność, Stres, Serce and core vitals using only
available measured values.

- [ ] **Step 5: Verify component tests, types and file limits**

Run the focused test, `npm run typecheck:ui`, focused ESLint, and confirm each new
TSX file is below 300 lines.

- [ ] **Step 6: Commit**

Commit `feat: add Oura-inspired health navigation`.

---

### Task 5: Szczegół snu 1:1 w zakresie dostępnych danych

**Files:**
- Create: `src/components/biometrics/oura/SleepDetailView.tsx`
- Create: `src/components/biometrics/oura/SleepStageSummary.tsx`
- Create: `src/components/biometrics/oura/SleepMovementRow.tsx`
- Modify: `src/components/biometrics/oura/OuraSleepTab.tsx`
- Modify: `src/components/biometrics/oura/OuraHypnogramChart.tsx`
- Create: `src/components/biometrics/oura/SleepDetailView.test.tsx`

**Interfaces:**
- Consumes: canonical `OuraDayModel` and `OuraNightDetails`.
- Produces: detailed sleep page with source-faithful totals and charts.

- [ ] **Step 1: Write failing parity fixture test**

Use a fixture matching the reference night:

```ts
expect(screen.getByText('7 h 42 min')).toBeInTheDocument();
expect(screen.getByText('Całkowity czas trwania 9 h 10 min')).toBeInTheDocument();
expect(screen.getByText('23:31')).toBeInTheDocument();
expect(screen.getByText('08:42')).toBeInTheDocument();
expect(screen.getByText('REM 41 min 9%')).toBeInTheDocument();
expect(screen.getByText('Płytki 5 h 19 min 69%')).toBeInTheDocument();
expect(screen.getByText('Głęboki 1 h 41 min 22%')).toBeInTheDocument();
```

- [ ] **Step 2: Run the fixture test and verify RED**

Run: `npm test -- --run src/components/biometrics/oura/SleepDetailView.test.tsx`

Expected: FAIL before the view exists.

- [ ] **Step 3: Implement the detailed composition**

Match the reference hierarchy: date header, title, time card, stepped chart,
movement row, stage summary, then HR/HRV and contributors. Avoid copying Oura
logos or marketing copy.

- [ ] **Step 4: Add discrepancy notices**

If stored totals and timeline-derived totals differ beyond the allowed rounding,
show a compact source inconsistency notice containing the date. Never alter values
to make the chart appear consistent.

- [ ] **Step 5: Verify parity fixture and responsive layout**

Run the focused test and inspect at Android-sized and desktop viewports.

- [ ] **Step 6: Commit**

Commit `feat: rebuild Oura sleep detail with measured data`.

---

### Task 6: Przewagi Sparky nad podstawowym widokiem Oura

**Files:**
- Create: `src/lib/biometrics/ouraContextInsights.ts`
- Create: `src/lib/biometrics/ouraContextInsights.test.ts`
- Create: `src/components/biometrics/oura/OuraContextSection.tsx`
- Modify: `src/components/biometrics/oura/OuraTodayView.tsx`
- Modify existing API modules only where required to expose measured daily values.

**Interfaces:**
- Consumes: sleep date/window plus measured training, screen-time, meals, food
  quality and caffeine timestamps.
- Produces: deterministic context cards and explicitly qualified hypotheses.

- [ ] **Step 1: Write failing deterministic-context tests**

Cover:

- training load before the sleep window;
- screen time in the final two hours before bed;
- last caffeine timestamp and elapsed time before bed;
- last meal timestamp, calories and food-quality status;
- missing source remains missing;
- correlation language is withheld below the documented sample threshold.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --run src/lib/biometrics/ouraContextInsights.test.ts`

Expected: FAIL before the module exists.

- [ ] **Step 3: Implement source-attributed context**

Each card contains the measured fact, date/window and source family. Single-night
cards say “kontekst”, never causal language. Trend claims require a documented
sample count and show `n`.

- [ ] **Step 4: Render context after core Oura measurements**

Add cards for Trening, Ekran, Kofeina and Jedzenie below the daily/sleep core so
Sparky enriches rather than obscures the Oura measurements.

- [ ] **Step 5: Verify tests and types**

Run focused tests, `npm run typecheck:ui` and focused ESLint.

- [ ] **Step 6: Commit**

Commit `feat: connect sleep with measured daily context`.

---

### Task 7: Końcowa weryfikacja i sprzątanie

**Files:**
- Modify or delete touched legacy Oura components that have no consumers.
- Update: `docs/surface-contracts/BIOMETRICS.md` only if the implemented contract
  adds a durable regression rule not already present.

**Interfaces:**
- Consumes: complete implementation.
- Produces: verified, maintainable `/oura` experience.

- [ ] **Step 1: Search for dead and fabricated paths**

Run searches for the old component names and for hardcoded sleep defaults:

`rg "23:15|07:30|01:30|03:30|05:30|totalBlocks = 80|\\[4, 18, 25" src/components/biometrics src/lib`

Expected: no fabricated sleep data remains.

- [ ] **Step 2: Run all focused Oura tests**

Run all new model and component test files together.

Expected: PASS.

- [ ] **Step 3: Run frontend gates**

Run:

- `npm run typecheck:ui`
- focused ESLint for touched files;
- `npm run ratchet:frontend`;
- `npm run build`.

Record unrelated pre-existing failures separately; no new counter may grow.

- [ ] **Step 4: Verify visually against one real night**

Compare the same selected date in Oura and Sparky. Confirm:

- sleep and time-in-bed totals;
- bedtime and end time;
- stage totals and percentages;
- all visible awake transitions;
- measured movement/HR/HRV where available;
- named missing states where unavailable.

- [ ] **Step 5: Verify responsive and accessible behavior**

Inspect Android-sized and desktop viewports, keyboard navigation, focus rings,
44 px controls and reduced-motion behavior.

- [ ] **Step 6: Final commit**

Commit only cleanup and durable contract changes with `test: verify Oura health experience`.
