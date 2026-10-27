/**
 * Pierwszy prosty Early Warning (Etap 1)
 *
 * Wykrywa wczesne sygnały wchodzenia w znany zły reżim:
 * "Niski sen + powtarzający się blocker" → wysokie ryzyko unikania / niskiego wykonania w najbliższych dniach.
 *
 * Na razie tylko jeden reżim, bardzo konserwatywnie.
 */

import { HEALTH_THRESHOLDS } from '@vanguard/domain';
import { safeExecute } from '../supabase.ts';
import { getWarsawDateString } from '../time.ts';
import type { PatternInsight } from './types.ts';

// Wartość cooldownu dla Early Warning przed fazą testów.
// 12 dni to rozsądny kompromis, żeby użytkownik nie dostawał tego samego ostrzeżenia co kilka dni.
const DEFAULT_EARLY_WARNING_COOLDOWN_DAYS = 12;

export async function detectEarlyWarningSignals(
  supabase: any,
  userId: string,
  options: { cooldownDays?: number } = {}
): Promise<PatternInsight[]> {
  const cooldownDays = options.cooldownDays ?? DEFAULT_EARLY_WARNING_COOLDOWN_DAYS;

  // Bierzemy ostatnie 5-7 dni danych
  // Warsaw-calendar cutoff — `date` columns hold Warsaw calendar dates, and near midnight
  // the UTC date of (now - N days) can lag a full day behind Warsaw's.
  const cutoff = getWarsawDateString(new Date(Date.now() - 8 * 24 * 3600 * 1000));

  const cooldownCutoff = getWarsawDateString(new Date(Date.now() - cooldownDays * 24 * 3600 * 1000));

  // 2. Sprawdź czy był niski sen/fragmentacja/słaby stan w ostatnich dniach (S3 + nowości)
  const recentAggs = await safeExecute(
    supabase
      .from('vanguard_daily_aggregates')
      .select('date, sleep_hours, fragmentation_index, execution_score, final_state')
      .eq('user_id', userId)
      .gte('date', cutoff)
      .order('date', { ascending: false })
      .limit(5)
  );

  let recentLowSleep = 0;
  if (recentAggs) {
    for (const a of recentAggs) {
      if (a.sleep_hours != null && a.sleep_hours < HEALTH_THRESHOLDS.SLEEP_WARNING_H) recentLowSleep++;
    }
  }

  // 3. Sprawdź czy w ostatnich dniach był aktywny recurring blocker (S1)
  const recentPatterns = await safeExecute(
    supabase
      .from('vanguard_behavioral_patterns')
      .select('pattern_type, status, last_seen')
      .eq('user_id', userId)
      .eq('pattern_type', 'recurring_blocker')
      .in('status', ['visible', 'user_confirmed'])
      .gte('last_seen', cutoff)
  );

  const hasActiveRecurringBlocker = recentPatterns && recentPatterns.length > 0;

  // Warunek Early Warning (bardzo konserwatywny) — Reżim 1: niski sen + aktywny blocker
  const riskSignals = [];
  if (recentLowSleep >= 2) riskSignals.push('niski sen w ostatnich dniach');
  if (hasActiveRecurringBlocker) riskSignals.push('aktywny powtarzający się blocker');

  if (riskSignals.length >= 2) {
    // Cooldown + user rejection check
    const recentWarning = await safeExecute(
      supabase
        .from('vanguard_behavioral_patterns')
        .select('last_seen, status')
        .eq('user_id', userId)
        .eq('pattern_type', 'early_warning')
        .eq('metadata->>regime', 'sleep_blocker')
        .gte('last_seen', cooldownCutoff)
        .order('last_seen', { ascending: false })
        .limit(1)
    );

    const shouldSuppress = recentWarning?.some((w: any) =>
      w.status === 'user_rejected' || w.last_seen >= cooldownCutoff
    );

    if (!shouldSuppress) {
      return [{
        type: 'early_warning',
        title: 'Wczesny sygnał wejścia w zły schemat',
        evidenceText: `W ostatnich dniach masz ${riskSignals.join(' + ')}. U Ciebie takie kombinacje w przeszłości często poprzedzały silne unikanie i spadek wykonania.`,
        confidence: 0.71,
        sampleSize: riskSignals.length,
        lastSeenDate: recentAggs?.[0]?.date ?? null,
        metadata: {
          regime: 'sleep_blocker',
          lowSleepDays: recentLowSleep,
          hasRecurringBlocker: hasActiveRecurringBlocker,
        },
      }];
    }
  }

  // Reżim 2 (drugi prosty): Powtarzające się problemy z plan adherence
  const recentAdherenceWarnings = await safeExecute(
    supabase
      .from('vanguard_behavioral_patterns')
      .select('last_seen, confidence')
      .eq('user_id', userId)
      .eq('pattern_type', 'plan_adherence_gap')
      .in('status', ['visible', 'user_confirmed'])
      .gte('last_seen', cutoff)
      .order('last_seen', { ascending: false })
      .limit(5)
  );

  const recentAdherenceCount = recentAdherenceWarnings ? recentAdherenceWarnings.length : 0;

  if (recentAdherenceCount >= 2) {
    // Cooldown check for second regime
    const recentWarning = await safeExecute(
      supabase
        .from('vanguard_behavioral_patterns')
        .select('last_seen')
        .eq('user_id', userId)
        .eq('pattern_type', 'early_warning')
        .eq('metadata->>regime', 'repeated_adherence_failures')
        .gte('last_seen', cooldownCutoff)
        .order('last_seen', { ascending: false })
        .limit(1)
    );

    if (!recentWarning || recentWarning.length === 0) {
      return [{
        type: 'early_warning',
        title: 'Wczesny sygnał: powtarzające się rozjazdy plan vs wykonanie',
        evidenceText: `W ostatnich dniach miałeś ${recentAdherenceCount} wyraźne rozjazdy między planem a rzeczywistością. U Ciebie takie serie często poprzedzały dłuższy okres niskiego wykonania i unikania.`,
        confidence: 0.68,
        sampleSize: recentAdherenceCount,
        lastSeenDate: recentAdherenceWarnings?.[0]?.last_seen || null,
        metadata: {
          regime: 'repeated_adherence_failures',
          adherenceGapDays: recentAdherenceCount,
        },
      }];
    }
  }

  // Reżim 3: Wysoka fragmentacja + niski sen
  let fragmentationSleepDays = 0;
  let lastFragSleepDate = '';
  if (recentAggs) {
    for (const a of recentAggs) {
      if (a.sleep_hours != null && a.sleep_hours < HEALTH_THRESHOLDS.SLEEP_WARNING_H && a.fragmentation_index != null && a.fragmentation_index > 0.55) {
        fragmentationSleepDays++;
        if (!lastFragSleepDate) lastFragSleepDate = a.date;
      }
    }
  }

  if (fragmentationSleepDays >= 2) {
    const recentWarning = await safeExecute(
      supabase
        .from('vanguard_behavioral_patterns')
        .select('last_seen, status')
        .eq('user_id', userId)
        .eq('pattern_type', 'early_warning')
        .eq('metadata->>regime', 'fragmentation_sleep')
        .gte('last_seen', cooldownCutoff)
        .order('last_seen', { ascending: false })
        .limit(1)
    );
    const shouldSuppress = recentWarning?.some((w: any) =>
      w.status === 'user_rejected' || w.last_seen >= cooldownCutoff
    );
    if (!shouldSuppress) {
      return [{
        type: 'early_warning',
        title: 'Wczesny sygnał: wysoka fragmentacja + niski sen',
        evidenceText: `W ostatnich 5 dniach odnotowaliśmy ${fragmentationSleepDays} dni z krótkim snem (<${HEALTH_THRESHOLDS.SLEEP_WARNING_H}h) i podwyższoną fragmentacją uwagi (>0.55). Ta kombinacja silnie obniża odporność na dryf i unikanie trudnych zadań.`,
        confidence: 0.73,
        sampleSize: fragmentationSleepDays,
        lastSeenDate: lastFragSleepDate || null,
        metadata: {
          regime: 'fragmentation_sleep',
          daysCount: fragmentationSleepDays,
        },
      }];
    }
  }

  // Reżim 4: Przeniesienie unikania z weekendu na tydzień roboczy (Weekend Avoidance Spillover)
  let weekendAvoidance = false;
  let weekendDate = '';
  if (recentAggs) {
    for (const a of recentAggs) {
      const day = new Date(a.date).getDay();
      if (day === 0 || day === 6) { // Niedziela lub Sobota
        if ((a.execution_score != null && a.execution_score < 0.45) || a.final_state === 'AVOIDANCE' || a.final_state === 'CHAOS') {
          weekendAvoidance = true;
          weekendDate = a.date;
          break;
        }
      }
    }
  }

  let mondayTuesdayDrift = false;
  let driftDate = '';
  if (recentAggs) {
    for (const a of recentAggs) {
      const day = new Date(a.date).getDay();
      if (day === 1 || day === 2) { // Poniedziałek lub Wtorek: te same kryteria co weekendowe unikanie
        if ((a.execution_score != null && a.execution_score < 0.45) || a.final_state === 'AVOIDANCE' || a.final_state === 'CHAOS') {
          mondayTuesdayDrift = true;
          driftDate = a.date;
          break;
        }
      }
    }
  }

  if (weekendAvoidance && mondayTuesdayDrift) {
    const recentWarning = await safeExecute(
      supabase
        .from('vanguard_behavioral_patterns')
        .select('last_seen, status')
        .eq('user_id', userId)
        .eq('pattern_type', 'early_warning')
        .eq('metadata->>regime', 'weekend_spillover')
        .gte('last_seen', cooldownCutoff)
        .order('last_seen', { ascending: false })
        .limit(1)
    );
    const shouldSuppress = recentWarning?.some((w: any) =>
      w.status === 'user_rejected' || w.last_seen >= cooldownCutoff
    );
    if (!shouldSuppress) {
      return [{
        type: 'early_warning',
        title: 'Wczesny sygnał: przeniesienie unikania z weekendu',
        evidenceText: `Twój weekend (${weekendDate}) przyniósł spadek wykonania lub stan avoidance/chaos, a na początku tygodnia roboczego (${driftDate}) wykonanie znów spadło lub pojawił się stan avoidance/chaos. Grozi to zainfekowaniem całego tygodnia roboczego.`,
        confidence: 0.75,
        sampleSize: 2,
        lastSeenDate: driftDate,
        metadata: {
          regime: 'weekend_spillover',
          weekendDate,
          driftDate,
        },
      }];
    }
  }

  return [];
}
