# Sparky — Product Principles

Guardrails for product decisions, architecture reviews and AI output. [AGENTS.md](../AGENTS.md) is the constitution; [docs/README.md](README.md) defines document authority. Product vocabulary: [PRODUCT_LANGUAGE.md](PRODUCT_LANGUAGE.md). Vision: [KIERUNEK.md](direction/KIERUNEK.md).

## Evidence and reasoning

**System measures behavior. User gives meaning.** Sparky retains structured behavioral traces with uncertainty and correction paths, not “truth about the user”. Reflection and useful inference are allowed; inference must remain identifiable as inference.

The flow is `behavior → evidence → confirmation → pattern detection → reasoning`. Never create the feedback loop `inference → memory as fact → retrieval → stronger inference`. Inference cannot become confirmed evidence/knowledge without human confirmation.

- Friction/recovery has one write path: `vanguard_stream` → `vanguard-auto-classify`. Oracle/Analyst reasoning cannot mutate evidence or write inferred facts into graph/knowledge on chat turns.
- Pattern detection uses `confirmed_friction_events`, with `review_status IN ('good', 'user_confirmed', 'user_corrected')`. Raw inferred events cannot form durable patterns or enter behavioral analysis before human review.
- Every insight exposes source, explicit N/count, date range, confidence/uncertainty and `inferred`/`confirmed` status. Unsupported claims are hypotheses, not facts. A precise-looking score is not evidence unless it actually measures something.
- Minimum pattern claim: at least 3 confirmed same-type events in at least 2 temporal contexts, with `confidence >= 0.75` or `review_status = good`. Behavioral compression may compare time blocks; a multi-day state (spiral/momentum) needs observations across at least 3 days. Always expose the sample behind the conclusion.
- Current stream (72h) takes precedence over archive for current state. Historical echoes and graph observations retain their source/date/sample; never silently turn past behavior into current identity.
- User correction is signal. Preserve rejection/correction and uncertainty (`needs_manual_review`); offer an effective way to challenge every consequential claim. A narrative about the user must remain correctable.

## Scope and agency

Sparky may reflect repeated observations, recovery, states, weekly deltas, and declarations compared with behavior. Depth must grow with actual data and continuity; a small dataset does not justify a deep profile.

- No shadow engine, personality profiling, diagnosis, therapy replacement, psychological certainty, hidden motives or undeclared “digital twin” claims. Never infer identity from isolated events.
- Coaching, prediction, gamification and auto-scheduling are allowed only on calculated effects (`compute-behavior-effects`, `compute-correlations`) with visible N, rather than generic LLM reasoning. User agency and correction remain required.
- **No preventive alerts: coaching is pull, not push**, until the user explicitly changes this rule.
- Correlation is not causation. Outcome tracking can show what changed after an action; it cannot establish that the action caused the change or that an intervention worked.
- Missing, stale, provisional or unlogged data is not zero, failure or proof of inactivity. Do not turn reporting gaps into advice or accusations.
- Selection/reporting bias limits every conclusion: the journal records what the user noticed and chose to log. Do not optimize measurable numbers at the expense of unmeasured resources or context.
- Keep output concrete and useful without inflated certainty or repetitive disclaimers: “X occurred N times during Y; confidence is limited; you can check/correct it.”

## Resources and recovery

`friction_events` track behavioral cost; `resource_observations` track stabilizers, energy and agency. Gratitude/resources are never problem-pattern candidates. Use resource observations only for correlations with day score, friction count and sleep/readiness.

Weekly review is a map of **friction and recovery**, not a list of defects. Recovery is an observable move (return to a task, interruption of drift, action despite resistance), never “AI detected growth”. Expand extraction only after at least 5 similar confirmed misses establish a systematic failure; keep observations in [BACKLOG.md](../BACKLOG.md), not a parallel backlog here.

## Transurfing Layer Guardrail

Transurfing is a language of practice, reflection and intention, never a truth layer. “Intention”, “pendulum”, lowering importance, process slides and choosing variants may frame a suggested practice or next move.

- User-controlled declarations (prayers, affirmations, goals) may be compared with behavior (Outcome Continuity). Their status changes remain user-controlled.
- No cron/LLM may autonomously declare that an intention or manifestation worked, an event was caused by a pendulum, reality sent a sign, the user's energy attracted an outcome, or a metaphysical cause is known.
- A process slide concerns observable action (“work without the phone”), not fantasy of guaranteed wealth/success.
- Allowed: “You can view this through principle X; what changes in your next move?” Forbidden: “This proves X works.”

## Source authority and time

- Numeric goals/thresholds come from their owner in [SINGLE_SOURCE.md](SINGLE_SOURCE.md); descriptive vision text and model-generated defaults are not facts about the user.
- Store timestamps in UTC. Display `answered_at`, `created_at`, `sent_at`, `occurred_at` in `Europe/Warsaw` through canonical helpers; Telegram reports use `HH:mm Warsaw` or `DD.MM HH:mm Warsaw`, not unlabelled UTC/ISO.
- Timestamp metadata outranks a spoken claim about the current hour. Treat “it is 21:30” in a voice message as content, not the timestamp source of truth.
- Reconciliation parsing accommodates nonlinear speech: extract supported signals, keep remainder in `unparsed_notes`, mark ambiguity for review. User-proposed causes/loops stay hypotheses (`blocker_candidates`), not confirmed events.

## Feature gate and verification

Before adding an AI capability:

1. Does it produce evidence or inference, and is the distinction visible?
2. Can inference mutate evidence? If so, block the feature pending explicit architectural decision and guardrail update; no silent exception.
3. Can the user effectively correct it?
4. Does it improve capture/correction/usefulness without increasing psychological burden, and does its result have an active consumer?

Translate each principle into a constraint/test at the relevant write/read boundary; a prompt or SQL comment alone is insufficient. Audit a random sample of real outputs weekly: verify source/N/date/uncertainty, absence of diagnosis/identity or unmeasured precision, and an effective correction path. Inspect prompts, retrieval and wording when confidence grows without data or language shifts from “observed N times” to “you are”.

Also watch for telemetry corruption: users writing to look good to the AI rather than recording life. Honest, messy capture is more valuable than polished fiction. Judge success by retention, precision, correction quality, friction fatigue and behavioral usefulness, not counts of events/embeddings/graphs. Real output on real data is the final guardrail test.
