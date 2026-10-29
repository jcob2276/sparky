# Sparky — agent instructions

Repository constitution. Navigation and reading order: [docs/README.md](docs/README.md). Read [lessons.md](lessons.md) and the “Kanał Claude ↔ Codex” handoff in [ACTIVE_WORK.md](docs/agent/ACTIVE_WORK.md) at session start. Open work belongs in [BACKLOG.md](BACKLOG.md).

## Constitution

1. **System measures behavior. User gives meaning.** Evidence ≠ reasoning. Measure friction and recovery; recognize repeated states (spirals/momentum) only from evidence.
2. **One friction/recovery write path:** `vanguard_stream` → `vanguard-auto-classify` → `friction_events` → `confirmed_friction_events` (VIEW).
3. **Extend existing handlers/functions.** No second Telegram client or classifier; no Oracle chat-turn writes to graph/knowledge. `vanguard-architect` builds graph from stream; `vanguard-wiki-compiler` compiles derived wiki. Vault ingest is in `vanguard-capture`, writes stream only; do not restore `ingest-vault-log`.
4. **Current-first:** stream from the last 72h beats archive. Pattern/state/trajectory claims require historical evidence and explicit N.
5. **No shadow engine, psychoanalytic coaching, diagnosis or undeclared “digital twin” certainty.** User-controlled intentions (prayers, affirmations, goals) are allowed as declarations compared with behavior. No autonomous verdict that an intention/manifestation worked. [Product principles](docs/PRODUCT_PRINCIPLES.md#transurfing-layer-guardrail) govern this distinction.
6. **Finish the last mile:** a feature is done when its result has an active consumer (UI/bot/cron/other function). Build vertical slices from storage to consumer; no disconnected wiring.
7. **Metabolism, not hoarding:** condense data into useful beliefs/narrative rather than accumulating noise indefinitely.
8. **Call the product Sparky** in UI, docs and user communication. “Vanguard” remains only in legacy technical identifiers (`vanguard-*`). Vocabulary: [PRODUCT_LANGUAGE.md](docs/PRODUCT_LANGUAGE.md).

Vision: [KIERUNEK.md](docs/direction/KIERUNEK.md) — one journal app that measures what can be measured and connects findings. Detecting self-deception is not a goal. Full epistemic/feature guardrails: [PRODUCT_PRINCIPLES.md](docs/PRODUCT_PRINCIPLES.md).

## Runtime map

- Live loop: user stream via `vanguard-telegram` → noon `vanguard-eval-interview` (“Wywiad”) → evening `vanguard-daily-reconciliation` reflection. Tomorrow planning belongs to app/Oracle.
- Morning brief/ping and legacy midday-check crons are removed (`CRON_REMOVED` in `scripts/ops/smoke-manifest.mjs`); never redeploy them. Observation-only mode is deprecated.
- React SPA: `src/`; backend: `supabase/functions/`; integrations: `sync-*`/`analyze-*`; legacy workout uses `workout_*` tables.
- Function status/JWT/tables: [function registry](supabase/functions/README.md). Data flow: [ARCHITECTURE.md](docs/ARCHITECTURE.md). Before changing/removing data: [SINGLE_SOURCE.md](docs/SINGLE_SOURCE.md), [DATA_MAP.md](docs/DATA_MAP.md).

## Engineering and deploy

- Prioritize code quality, structure, correctness and zero dead code before new features. Search existing implementations before adding helpers or pipelines.
- No `as any`; use precise types or `unknown` with type guards.
- Touched files over 300 lines require refactoring. New UI files must stay under 300 lines. Legacy files listed in `eslint.config.js`/`legacy-lines-baseline.json` may only shrink; never add exceptions to evade the ratchet.
- One session/topic → one readable commit; working tree must be clean before the next topic. Record only new, reusable pitfalls in `lessons.md`, not execution history.
- Store timestamps in UTC; domain days/display use `Europe/Warsaw` through canonical date helpers. Backend DB/auth use `createServiceClient()` and `resolveUserScope()`; see [BACKEND_CONTRACT.md](docs/BACKEND_CONTRACT.md).
- Check constraints before INSERT: `planning_status` is `pending | active | completed`, never `done`.
- Telegram secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`. `vanguard-telegram` is a thin router: change one flow surgically.
- Telegram webhook has a 30s budget: durably enqueue accepted updates in `vanguard_telegram_inbox` before ACK; enqueue failure stays retryable. `vanguard-telegram-worker` awaits required voice processing and writes within its own request before returning. Never rely on `EdgeRuntime.waitUntil` to finish required work after response.
- Cron/webhook functions deploy with `verify_jwt: false` (`--no-verify-jwt`): `vanguard-daily-reconciliation`, `food-integrity-audit`, `vanguard-oracle`, `vanguard-auto-classify`, `vanguard-architect`, `vanguard-wiki-compiler`, `vanguard-analyst`, `save-daily-aggregate`, `vanguard-weekly-synthesis`, `vanguard-eval-interview`, `vanguard-nutrition-coach`, `sync-strava`, `rescore-workout-sessions`, `compute-illness-signal`, `vanguard-librarian`, `analyze-training-load`. Check the registry/config for all functions.
- After deploy: `npm run smoke` (or `node scripts/ops/smoke-vanguard.mjs --with-service-role`) plus edge logs; no 401. Follow the backend contract and deploy runbook.

## Frontend checklist — before finishing

Follow [FRONTEND_GUIDE.md](docs/FRONTEND_GUIDE.md) and [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md). Verify each item:

1. **Reuse helpers.** Before writing a helper, run `rg 'function <name>' src/components/notes/ src/lib/` and search other declaration forms. Import existing implementations. Notes helpers: `keepUtils.ts`; dates: `src/lib/date.ts`.
2. **No raw Supabase in components.** Use `src/lib/*Api.ts` or `src/lib/<domain>/*.ts` for DB access and `invokeEdge()` from `src/lib/supabase.ts` for functions. Check `rg 'supabase\.from|supabase\.functions' src/components/`: zero matches except the whitelist in `eslint.config.js`.
3. **No native dialogs.** Use `confirmDialog('message')` for destructive actions and `notify('message', 'error')` from `src/lib/notify.ts` for errors. Check `rg 'window\.confirm|window\.alert' src/components/`.
4. **Separate data from JSX.** A file with `useQuery`/data mutations and rendered JSX must split into Container + View (Wzorzec A). Files over 300 lines without documented `/* eslint-disable max-lines */` are violations. Dense cursor/selection/DOM editors may have an explicit, explained exception.
5. **Verify imports.** After creating/moving helpers run `npm run typecheck:ui`; fix errors before finishing.
6. **Remove dead code.** After extraction run `rg '<OldComponentName>' src/`; remove the old implementation if no consumer remains.

## Thesis: research and LaTeX invariants

- Never run complex Python inline strings containing quotes/commas in Windows PowerShell. Write `.py`/`.sh`, transfer with SCP, execute with `ssh -n`.
- Verify primary authors and official peer-reviewed venues (EMNLP, ACL, IEEE, WWW, AACL) for every bibliography entry; remove hallucinated citations.
- LaTeX must compile with exit 0 and no unresolved `Overfull \hbox`. Variable-width tables use `tabularx` with `X` columns; long formulas use `align`.

## Documentation rules

1. Add `.md` only if no existing document fits. Session plans/handoffs use the overwritten [ACTIVE_WORK.md](docs/agent/ACTIVE_WORK.md); on completion move open items to [BACKLOG.md](BACKLOG.md) and delete separate finished plans/briefs in the same commit, without archiving them.
2. No hand-maintained counts, LOC, “last verified” dates, deploy versions or copied state inventories. Keep generated facts in generated registry files (`supabase/functions/README.md`/`FUNCTIONS.md`) or compute on demand.
3. A stale document must be repaired or deleted in the same change; no “STALE — do not trust” banners.
4. One topic, one canonical file. Check [docs/README.md](docs/README.md) before adding sections; no parallel `v2`/`FINAL` docs or per-audit backlogs.
5. Read an edited document fully and check the index for duplicate authority before changing it.

## Models

- Default: `deepseek-v4-flash` (classification, Oracle, architect, wiki, reconciliation, nutrition coach).
- Oracle deep (`!!`) and nightly analyst: `deepseek-reasoner`.
- Structured JSON (`responseFormat: json_object`): `deepseek-chat` (food/workout parsing, food quality, training load, librarian, interview classification); reasoning models may return `reasoning_content` instead of structured content.
- Audio, vision and embeddings use Gemini, including fallback between Gemini models; secret `GEMINI_API_KEY`. `_shared/openai.ts` is a compatibility shim: `openaiChat`, `transcribeBlob`, `getEmbedding` call Gemini; legacy `openAiKey` parameters are not OpenAI keys.
- Embeddings: `gemini-embedding-001`, 1536 dimensions. Do not restore OpenAI runtime fallbacks.
