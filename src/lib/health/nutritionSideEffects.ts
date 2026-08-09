import { TIMEOUTS } from '../constants';
import { invokeEdge } from '../supabase';
import { scheduleStrainRecompute } from './strainRefresh';

const qualityTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function runFoodQualityAnalysis(userId: string, date: string): Promise<void> {
  try {
    await invokeEdge('analyze-food-quality', {
      body: { userId, date },
      signal: AbortSignal.timeout(TIMEOUTS.heavy),
    });
  } catch (error: unknown) {
    console.warn('[nutritionSideEffects] Failed to run food quality analysis:', error);
  }
}

export function scheduleFoodQualityAnalysis(userId: string, date: string): void {
  const key = `${userId}:${date}`;
  const existing = qualityTimers.get(key);
  if (existing) clearTimeout(existing);
  qualityTimers.set(key, setTimeout(() => {
    qualityTimers.delete(key);
    void runFoodQualityAnalysis(userId, date);
  }, 2500));
}

export function scheduleNutritionRefresh(userId: string, date: string): void {
  scheduleFoodQualityAnalysis(userId, date);
  scheduleStrainRecompute(userId);
}
