# Food Backend Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make food parsing reject semantically absurd portions and untrustworthy matches, preserve compound dish names, deduplicate writes, and persist auditable provenance.

**Architecture:** Add a pure semantic validation layer after reconciliation, tighten source-aware matching, and remove heuristic splitting of compound names. Add database-backed idempotency to the canonical `add_food_entry` RPC while keeping frontend and Telegram on the same parser.

**Tech Stack:** Deno Edge Functions, TypeScript, Supabase Postgres, Vitest/Deno tests.

## Global Constraints

- Frontend layout and interaction remain unchanged.
- Existing food history is not silently rewritten.
- Existing BLE working-tree changes are not modified or staged.
- User corrections and explicit quantities outrank inferred values.
- Every new behavior begins with a failing regression test.

---

### Task 1: Semantic portion and source validation

**Files:**
- Create: `supabase/functions/_shared/foodParse/semanticValidation.ts`
- Create: `supabase/functions/_shared/foodParse/semanticValidation.test.ts`
- Modify: `supabase/functions/_shared/foodParseCore.ts`
- Modify: `supabase/functions/_shared/foodParseCore.ts`

**Interfaces:**
- Consumes: `ParsedFoodItem`, original input text.
- Produces: `validateParsedItems(items, originalText): ParsedFoodItem[]`.

- [ ] Add failing tests proving `2 g` soup, implausible imported bread data, and low-score imported matches become low-confidence results with warnings.
- [ ] Run `deno test supabase/functions/_shared/foodParse/semanticValidation.test.ts` and verify failures come from the missing validator.
- [ ] Implement category-aware portion floors, broad kcal/100 g bounds, and source-aware trust downgrades without silently changing explicit grams.
- [ ] Call `validateParsedItems` after reconciliation and macro math.
- [ ] Run semantic-validation and existing food parser tests.

### Task 2: Preserve compound dishes

**Files:**
- Modify: `supabase/functions/_shared/foodParse/reconcile.ts`
- Create: `supabase/functions/_shared/foodParse/compoundDish.test.ts`

**Interfaces:**
- Consumes: unmatched parsed dish names.
- Produces: one intact item unless the original input explicitly enumerates ingredients.

- [ ] Add failing tests for `ciastko z jabłkami`, `naleśniki z serem`, `rosół z makaronem`, and an explicitly enumerated ingredient list.
- [ ] Verify the first three currently split or can enter the split path.
- [ ] Replace generic `z|ze` splitting with an explicit ingredient-list gate; intact dish names continue to macro fallback as one item.
- [ ] Run the new tests plus all `_shared/foodParse*.test.ts` tests.

### Task 3: Unit-aware parsing metadata

**Files:**
- Modify: `supabase/functions/_shared/foodParseCore.ts`
- Modify: `supabase/functions/_shared/foodParse/normalize.ts`
- Modify: `supabase/functions/_shared/foodParse/prompts.ts`
- Modify: `src/lib/health/foodLogging.ts`
- Test: `supabase/functions/_shared/foodParse/semanticValidation.test.ts`

**Interfaces:**
- Produces parse metadata containing `quantity`, `unit`, `explicitGrams`, `warnings`, and parser version.

- [ ] Add failing tests that distinguish `2 g rosołu` from `2 miski rosołu` and retain explicit grams.
- [ ] Extend the grams-only JSON contract with quantity/unit/explicitness while remaining backward-compatible with older model responses.
- [ ] Normalize supported Polish units and attach conversion assumptions to `parseMeta`.
- [ ] Verify frontend response types accept the new optional metadata without UI changes.

### Task 4: Idempotent food writes

**Files:**
- Create via Supabase CLI: `supabase/migrations/<generated>_food_entry_idempotency.sql`
- Modify: `supabase/functions/vanguard-telegram/_handlers/foodMeal.ts`
- Modify: `src/lib/health/foodLogging.ts`
- Modify: `src/components/core/nutrition/hooks/useFoodEntryActions.ts`

**Interfaces:**
- `add_food_entry(..., p_request_id uuid default null)` returns the existing row for a repeated request.
- Every caller generates one request ID per user intent and reuses it for retries.

- [ ] Write a SQL reproduction showing repeated request IDs currently create duplicate rows.
- [ ] Generate the migration with `supabase migration new food_entry_idempotency`.
- [ ] Add `request_id`, ownership-scoped uniqueness, and short-window fallback deduplication to the RPC.
- [ ] Update all canonical callers to send stable request IDs.
- [ ] Apply on a development path, execute the same request three times, and verify one row exists.

### Task 5: Audit and quarantine poisoned library records

**Files:**
- Create: `scripts/ops/audit-food-library.mjs`
- Create via Supabase CLI: `supabase/migrations/<generated>_food_library_validation.sql`
- Modify: `supabase/functions/_shared/foodParse/reconcile.ts`

**Interfaces:**
- Library records expose validation state and are excluded from automatic high-confidence matching when quarantined.

- [ ] Add tests proving `yazio_import` is not equivalent to a verified record and a quarantined record cannot produce high confidence.
- [ ] Add validation columns with safe defaults and no deletion of historical records.
- [ ] Implement an audit query for impossible macro math, broad category density violations, and ambiguous composite dishes.
- [ ] Quarantine the identified `Bułka pszenna` and `Kebab box` records instead of rewriting their nutritional values.
- [ ] Re-run the seven-day anomaly query and confirm new parsing cannot trust those records automatically.

### Task 6: End-to-end verification and deployment

**Files:**
- Modify: `supabase/functions/README.md` only if generated registry tooling requires it.

**Interfaces:**
- Frontend and Telegram consume the same deployed `parse-food-nl` behavior.

- [ ] Run all food parser unit tests and typechecks.
- [ ] Invoke the parser with the production regression corpus and inspect returned confidence, warnings, grams, kcal, and source.
- [ ] Apply migrations and deploy affected Edge Functions with the repository-required JWT settings.
- [ ] Run smoke tests and inspect Edge logs for failures.
- [ ] Query newly written test entries to prove complete `parse_meta` and idempotency.
- [ ] Confirm the BLE working tree remains unstaged and unchanged.
