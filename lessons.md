# Sparky — reusable lessons

Read before a task; add only a new, reusable pitfall after an actual failure. Rules already enforced or documented in [AGENTS.md](AGENTS.md), [backend](docs/BACKEND_CONTRACT.md), [frontend](docs/FRONTEND_GUIDE.md) or [SINGLE_SOURCE.md](docs/SINGLE_SOURCE.md) belong there, not in another incident log. Pending work belongs in [BACKLOG.md](BACKLOG.md); session status in [ACTIVE_WORK.md](docs/agent/ACTIVE_WORK.md).

## Prove the real path

- A successful API response/deploy does not prove a write, startup or consumer works. Check persisted rows, auth rejection and the actual UI/bot result; inspect real `ai_chat_messages` before judging bot quality.
- Backlog/status prose is not live state. Verify schema, enum values, source records and every consumer before changing a reported defect. Confirm another agent's finding independently.
- Before removing tables/columns/functions, inspect TS plus SQL bodies (`pg_proc.prosrc`), FK/views (`pg_depend`) and `cron.job`. “No TS reference” or “empty column” does not establish disuse. Check deployed functions too.
- Retire a data-bearing module in order: verified export → stop writers/crons → fresh export → verify counts → remove. Check consumers outside the module; retain needed shared services.
- A synced metric can be missing for months while its neighbours look fine: Oura `average_hrv` was null 24.06–24.09 (sleep, steps, score present). Sync looks back only 30 days, so old gaps never heal. Check per-field coverage by month, not row counts; backfill via `sync` with `start_date`/`end_date`, verify sums of untouched fields before and after.
- Never judge “unused” from a search piped through `head`; it hid the `.rpc('get_brain_health_report')` caller. Search the full output and include `.rpc(`/edge invoke call sites before calling a function or table dead.
- Destructive schema changes use expand/contract: additive migration and backup → switch writers/readers and deploy → drop after old clients are safe. PWA bundles may keep the old write contract alive.
- Tests can encode a former bug. When a fix breaks one, verify its intended rule and calculate expected results independently before changing the assertion. A test that was never collected/run is not evidence; domain tests must be included by the actual Vitest/Deno configuration.

## Writes, concurrency and SQL

- Supabase returns `{ error }` rather than throwing. `unwrap()` is for results with `.select()`; a successful no-return mutation is not missing data. Never let logging swallow an error that controls a queue's durable status/retry.
- Telegram acknowledges receipt only after durable inbox storage. Admission failures stay retryable; processing failures belong to the worker/queue state.
- Multi-table day/finance/KPI changes need an atomic RPC, not parallel client read-modify-write. Writes sharing advisory locks run sequentially. Keep source batches in the same date order to avoid deadlocks.
- Partial upserts must preserve existing values when an endpoint omits fields. A heterogeneous PostgREST batch can fill absent columns with NULL. Merge using `keepExistingWhenMissing`; derived fields without inputs are NULL too, not false/zero. Do not independently upsert fields maintained by a canonical projection (for example Oura steps).
- New `SECURITY DEFINER` functions need least-privilege grants/revokes (`PUBLIC`, `anon`, `authenticated`) and either an `auth.uid()` ownership check or service-only access. Test permissions and `db:check-invariants`; qualify extension functions when hardening `search_path`.
- Test SQL functions in transactions that roll back, including realistic auth claims. Data repairs need before/after records, one transaction, and independently predicted totals/invariants.
- Apply migrations through `npm run db:apply`; MCP-assigned ledger versions can differ from filenames. Reconcile against the actual ledger before deploy, not guessed timestamps. Regenerate both frontend and `_shared` DB types; avoid importing unrelated uncommitted schema changes.
- Read a request body once; pass parsed input to sub-handlers. Supabase builders are PromiseLike: use `await`/`try-catch`, not `.catch()` assumed to exist on the builder.

## Time, intervals and cache

- UTC ISO substrings are not Warsaw day/hour values. Use `formatWarsawDate`, `warsawTimeOfDay`, `combineDateTimeWarsawISO` and canonical day/week helpers. Never hardcode a summer offset. Month shifts from the 31st need year/month arithmetic, not `Date.setMonth` rollover.
- Daily tables may already contain tomorrow's rows. “Current/latest” must restrict `date <= requested day`; streaks must ignore future plans.
- Long-lived forms must derive an automatic timestamp at save time and refresh visible time after focus/resume. Preserve explicit user time edits. Do not stamp a historical-day supplement with the current hour when its actual time is unknown.
- Time predictors must describe one actual interval: a sleep outcome on D uses the defined pre-sleep window on D-1, not a calendar bucket mixing two nights. Include a query margin for sessions crossing midnight, then filter by source day.
- ActivityWatch active duration is intersection with merged not-AFK intervals, not the full duration of any event whose start was active. Check pagination and total duration against day length. After moving the repo, verify Task Scheduler paths/results and `.env` resolution from the repo root.
- Every new query needs all writers mapped to its invalidation family in `queryKeys.ts`, including external Telegram/native writes and app resume. A single data owner without shared refresh still shows stale facts.
- Change persisted AI-cache keys/version with prompt/fact changes; verify a reported output is fresh before debugging it. Cross-device results use the existing `aiInsightStore`, not localStorage alone.

## Product data contracts

- Day slots are snapshots in `daily_win_tasks`; selecting an existing Todo must not rename, move or reopen its source. A custom slot keeps `todo_id = null`. Execution sync touches only today's linked snapshot; edits preserve completed state.
- Plan scheduling uses Todo `scheduled_time`, not a duplicate calendar event. Capture retries reuse the required `captureId`. KPI rollups from linked Todo use the shared path and absolute values for Closer, not additive duplicates.
- Structured actions stay with their owners: habits in `habit_logs`, task-review completion in `weekly_reviews`, day slots in `daily_win_tasks`. Do not copy checkmarks into stream. Free text/voice/reflection and vault chunks enter stream through capture, with embeddings.
- A partial Closer-day edit must carry unedited fields forward; a row containing work hours alone is not proof sales numbers were entered. Empty means unentered; zero is valid. Legacy `dials` means **rozmowy odebrane**, not attempts.
- `workout_sessions.workout_day` is a session name, not a date. Garmin “Kardio” is this user's sauna: use `isGarminSaunaActivity` consistently in every consumer. Avoid double-counting intentionally overlapping manual/synced activities.
- Phone events are queued natively; JS drains/upserts/acks idempotently. `event_count = 0` is unknown coverage, not proof of zero activity. Notification collection keeps package/count only, never content; Wi-Fi labels leave the device instead of SSIDs.
- Fathom speaker identity comes from the account owner's matched invitee email. Transcript timestamps support approximate speaking tempo, not silence after price; filler counts are transcription artifacts. Ground AI moments/scores in real timestamped quotes; classify call type before aggregating sales trends.

## Food and measured uncertainty

- LLM extracts food identity/portion; reference data supplies macros where possible, with LLM estimates as labelled fallback. “Database” alone does not make a value user-confirmed. Copying/repeating preserves original provenance and uncertainty (`deriveItemUncertainty`).
- Food matching must agree on kind and raw/cooked state, not just a substring or shortest name. A rejected source match falls through to the next source. USDA energy may be in nutrient IDs 2047/2048; “carbohydrate by difference” includes fibre, unlike EU label carbs.
- Never infer grams from “3 szt.” or invent missing portion mass. Check energy consistency through `assessEnergyConsistency`; “homemade” does not justify lowering fat/sugar. Recipe macros come from weighed ingredients.
- Preserve micronutrient source per value (`data`/`estimate`); real data wins and estimates only fill gaps. Scaling portions must scale all nutrients. Zero is known absence; NULL is unknown. Salt from sodium needs the proper conversion, not a missing-value guess.
- Backfills touch only intended empty fields, preserve calories/macros, and mark attempted/skipped records to avoid loops. Put trusted keys after model spreads (`{ ...estimate, index: 0 }`) so model output cannot override identity.
- Audits must keep seeing quarantined records, otherwise findings falsely close. Automatic repair stays reversible; entry-value corrections require user action. Historical repair windows must cover the affected history, not just recent days.
- Nutrient totals with incomplete coverage are lower bounds, not proof of deficiency. Compute averages only from the canonical completed-day rule; do not mix today's partial intake with full days. Explicit day-completeness/fasting signals require an actual writer before a coach can consume them.
- Photos belong to `meal_group_id`, not one item. Store photo after a successful meal write; photo failure must not roll back food. Re-estimation from a whole-meal photo must request the selected item and include user corrections; absent photo falls back to name.
- Copying from another day is opt-in. Supplement logging lives in Telegram and `MealSupplementsWidget`; the desktop panel is read-only.

## AI and UI boundaries

- Read Gemini output with `readGeminiText`: skip thought parts, check finish/block reasons, retry valid fallback models for truncation/service/network/limit failures. Missing `items` is malformed output; only explicit `items: []` means no food.
- Serialize user text into prompts safely. A sanitizer/allowlist must match the real input shape; fetching data that becomes `{}` or is ignored downstream is wasted work. Never expose raw malformed model JSON to chat; use the existing answer salvage path.
- Stored graph observations are not verified identity facts. Missing logs are missing knowledge. Avoid adding “confront/expose hidden motives” instructions; test tone on real conversations and enforce repetitive behavior limits from actual history when prompts alone fail.
- Mobile modals/portals need the feature theme on the dialog itself. A nested Sheet may render beneath the parent modal; use the established layer contract or inline control. A gradient theme needs an explicit background color too.
- Wrap accessibility-only tables in an `sr-only` container; putting `sr-only` on a table can still widen the viewport. For displaced fixed UI, compare `scrollWidth` with `innerWidth` before adjusting positions.
- Calendar touch must preserve scrolling/swipe before a drag is committed; do not stop event propagation across the whole block. Mouse and touch share drag math/session. Use `calendarHistory` for mutations and the global undo owner; recreated records have new IDs, which redo must use.
- Keyboard shortcuts yield to focused inputs, modifiers and open modal/menu layers. Escape closes the top layer first. Prevent Enter/Escape plus blur from double-saving edits. Reset gesture flags when the next gesture starts.
- Actions need visible progress/result even when values do not change. A visual complaint does not authorize removing behavior (for example a collapsed list). Check mobile primary actions and actual computed animation state before diagnosing a screenshot.
- Native APIs require platform guards. PWA and Capacitor builds differ in base/SW/push transport (Web Push vs FCM); a killed WebView cannot supply native background collection. Android location services require permissions and exception handling, including boot paths.

## Editing and shared work

- In Windows sandbox, Vite transform-cache renames may fail with EPERM in the default TEMP. Use a process-local writable workspace TEMP/TMP. If the default Vitest worker pool stalls before reporting tests, compare file collection and a focused `--pool=threads` run before changing test limits or retrying the whole suite.
- Preserve error handling and layout wrappers during extraction; inspect non-exported returned fields too, because Knip does not find every dead consumer. Graduating a legacy file requires full ESLint, not only max-lines checks.
- In a shared checkout inspect staged paths and use explicit commit pathspecs. Never amend another session's commit or sweep in its files. Check stash state after interrupted operations.
- Use explicit UTF-8 and account for CRLF in editing scripts. SQL goes to a file/`--file`, not a shell-quoted inline command. Keep Polish quotes and Unicode regex escapes intact; typecheck immediately after automated import edits.
