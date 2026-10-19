import { invokeEdge } from '../supabase'
import type { AnalyzeTrainingLoadResponse } from '../edgeTypes'
import { TIMEOUTS } from '../constants'
import { shiftDateStr } from '../date'

const INSIGHT_KEY = (userId: string, date: string) => `vanguard_training_insight_${userId}_${date}`

const loadTimers = new Map<string, ReturnType<typeof setTimeout>>()

function storeTrainingInsight(userId: string, date: string, line: string): void {
  try {
    localStorage.setItem(INSIGHT_KEY(userId, date), JSON.stringify({ line, at: Date.now() }))
  } catch {
    /* ignore */
  }
}

type TrainingInsightRecord = { line: string; at: number; date: string }

function parseInsightRecord(raw: string, date: string): TrainingInsightRecord | null {
  try {
    const parsed = JSON.parse(raw) as { line?: unknown; at?: unknown }
    if (typeof parsed.line !== 'string' || !parsed.line.trim()) return null
    const at = typeof parsed.at === 'number' && Number.isFinite(parsed.at) ? parsed.at : 0
    return { line: parsed.line.trim(), at, date }
  } catch {
    return null
  }
}

/** Latest post-save coach line from analyze-training-load (localStorage). */
function readTrainingInsight(userId: string, date: string): string | null {
  try {
    const raw = localStorage.getItem(INSIGHT_KEY(userId, date))
    if (!raw) return null
    return parseInsightRecord(raw, date)?.line ?? null
  } catch {
    return null
  }
}

/** Prefer today, then walk back a few days for the newest stored insight + timestamp. */
function readLatestTrainingInsightRecord(
  userId: string,
  fromDate: string,
  lookbackDays = 14,
): TrainingInsightRecord | null {
  let best: TrainingInsightRecord | null = null
  for (let i = 0; i < lookbackDays; i += 1) {
    const date = shiftDateStr(fromDate, -i)
    try {
      const raw = localStorage.getItem(INSIGHT_KEY(userId, date))
      if (!raw) continue
      const rec = parseInsightRecord(raw, date)
      if (!rec) continue
      if (!best || rec.at > best.at || (rec.at === best.at && rec.date > best.date)) best = rec
    } catch {
      /* ignore */
    }
  }
  return best
}

export function readLatestTrainingInsight(userId: string, fromDate: string, lookbackDays = 14): string | null {
  return readLatestTrainingInsightRecord(userId, fromDate, lookbackDays)?.line ?? null
}

/** Fresh enough for hub display without re-hitting the edge function (6h). */
const TRAINING_INSIGHT_MAX_AGE_MS = 6 * 60 * 60 * 1000

/**
 * Ensure Centrum has a fresh coach line: return cache if young, otherwise call
 * analyze-training-load, persist under today's key, and return the new line.
 */
export async function ensureFreshTrainingInsight(
  userId: string,
  date: string,
  opts?: { force?: boolean; maxAgeMs?: number },
): Promise<string | null> {
  const maxAge = opts?.maxAgeMs ?? TRAINING_INSIGHT_MAX_AGE_MS
  const cached = readLatestTrainingInsightRecord(userId, date)
  const age = cached ? Date.now() - cached.at : Infinity
  if (!opts?.force && cached && age < maxAge) return cached.line

  await runTrainingLoadAnalysis(userId, date)
  return readTrainingInsight(userId, date) ?? cached?.line ?? null
}

async function runTrainingLoadAnalysis(userId: string, date: string): Promise<void> {
  try {
    const json = await invokeEdge('analyze-training-load', {
      body: { userId },
      signal: AbortSignal.timeout(TIMEOUTS.llm),
    }) as AnalyzeTrainingLoadResponse
    const line =
      json.coach_decision_summary ||
      json.load_summary ||
      json.strength_note ||
      (json.load_status ? `Obciążenie: ${json.load_status}` : null)
    if (line) storeTrainingInsight(userId, date, String(line))
  } catch (e: unknown) {
    console.warn('[workoutLogging] Failed to run training load analysis:', e)
  }
}

/** Debounced background training insight — max ~1 heavy call after logging. */
export function scheduleTrainingLoadAnalysis(userId: string, date: string): void {
  const key = `${userId}:${date}`
  const existing = loadTimers.get(key)
  if (existing) clearTimeout(existing)
  loadTimers.set(
    key,
    setTimeout(() => {
      loadTimers.delete(key)
      void runTrainingLoadAnalysis(userId, date)
    }, 4000),
  )
}
