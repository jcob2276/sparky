/**
 * @module personalTargets
 * @purpose Single source of truth for user's personal goal parameters.
 *
 * Reads from:
 *   - nutrition_targets  (most recent row) → protein_floor_g, target_kcal
 *   - nutrition_profile                    → protein_g_per_kg, sleep_target_hours, weight fallback
 *   - body_metrics                         → latest weight (for protein fallback calc)
 *
 * Used by:
 *   - fitnessScoreUtils (frontend, via useDesktopData)
 *   - recovery_score.ts → computeRecoveryScore (SLEEP_TARGET + sleep perf denominator)
 *   - metrics_recovery.ts → runComputeRecoveryForecast (needSleepHours)
 *   - vanguard-nightly (orchestrator)
 *
 * NEVER hardcode protein or sleep targets elsewhere — use this resolver (edge) or `derivePersonalTargets` (frontend).
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { derivePersonalTargets } from '@vanguard/domain';

export interface PersonalTargets {
  /** Minimum daily protein (g). From nutrition_targets.protein_floor_g (latest).
   *  Falls back to: weight_kg × protein_g_per_kg, then DEFAULT_PROTEIN_FLOOR_G. */
  proteinFloorG: number;
  /** Daily kcal target. From nutrition_targets.target_kcal (latest). Null if coach hasn't run yet. */
  targetKcal: number | null;
  /** Personal sleep need (h). From nutrition_profile.sleep_target_hours (default 8.0).
   *  Used as 100%-sleep-performance denominator AND as debt ledger target in recovery_score. */
  sleepTargetH: number;
}

export async function resolvePersonalTargets(
  supabase: SupabaseClient,
  userId: string,
): Promise<PersonalTargets> {
  const [targetsRes, profileRes, bodyRes] = await Promise.all([
    supabase
      .from('nutrition_targets')
      .select('protein_floor_g, target_kcal')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('nutrition_profile')
      .select('protein_g_per_kg, sleep_target_hours')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('body_metrics')
      .select('weight')
      .eq('user_id', userId)
      .not('weight', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return derivePersonalTargets({ target: targetsRes.data, profile: profileRes.data, weightKg: bodyRes.data?.weight });
}
