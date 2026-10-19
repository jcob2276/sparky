import { invokeEdge } from '../supabase'
import { TIMEOUTS } from '../constants'

const loadTimers = new Map<string, ReturnType<typeof setTimeout>>()

async function runTrainingLoadAnalysis(userId: string): Promise<void> {
  try {
    await invokeEdge('analyze-training-load', { body: { userId }, signal: AbortSignal.timeout(TIMEOUTS.llm) })
  } catch (e: unknown) {
    console.warn('[trainingInsight] Failed to run training load analysis:', e)
  }
}

/** Debounced background training-load analysis after saving — max ~1 heavy call after logging. */
export function scheduleTrainingLoadAnalysis(userId: string, date: string): void {
  const key = `${userId}:${date}`
  const existing = loadTimers.get(key)
  if (existing) clearTimeout(existing)
  loadTimers.set(
    key,
    setTimeout(() => {
      loadTimers.delete(key)
      void runTrainingLoadAnalysis(userId)
    }, 4000),
  )
}
