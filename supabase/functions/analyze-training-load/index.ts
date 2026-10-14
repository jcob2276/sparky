/**
 * @function analyze-training-load
 * @trigger HTTP POST / Frontend / manual LLM analysis
 * @role Analiza obciążenia treningowego na podstawie sesji i planów.
 * @reads daily_strain, workout_sessions, strava_activities_clean, training_plan_workouts, oura_daily_summary, training_plan_versions, health_coach_jobs, goal_kpis, vanguard_preferences
 * @writes training_plan_versions, training_plan_workouts, health_coach_jobs
 * @calls deepseek-chat (w analysis.ts)
 * @consumer Sekcja treningowa w aplikacji
 * @status active
 */
import { serveJson } from '../_shared/http.ts'
import { analyzeTrainingLoad } from './analysis.ts'
import { fetchHealthCoachContext } from '../_shared/healthCoachContext.ts'
import { HealthPlanRepo } from './planRepo.ts'
import { runPlanJob } from './planJobs.ts'
import { generateTrainingPlan, trainingConstraintsFromContext } from './planGenerator.ts'
import { approvePlan, revertPlan } from './planActions.ts'
import { HealthPlanInputError } from './planErrors.ts'

Deno.serve(serveJson(async (req, ctx) => {
  const { userId, supabase } = ctx
  const body = await req.json().catch(() => ({}))
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY') || ''
  if (body.action === 'run_job') {
    if (!ctx.isServiceRole) throw new Error('Forbidden: worker requires service role')
    if (typeof body.jobId !== 'string') throw new Error('Missing jobId')
    if (!apiKey) throw new Error('Missing DEEPSEEK_API_KEY')
    return runPlanJob(body.jobId, { repo: new HealthPlanRepo(supabase),
      context: owner => fetchHealthCoachContext({ supabase, userId: owner }),
      generate: (context, request) => generateTrainingPlan(context, apiKey, request) })
  }
  if (!userId) throw new Error('Missing userId')
  if (body.action === 'generate_plan') {
    if (typeof body.requestKey !== 'string' || !body.requestKey || body.requestKey.length > 120) throw new Error('Missing requestKey')
    const context = await fetchHealthCoachContext({ supabase, userId })
    trainingConstraintsFromContext(context)
    if (!context.sources.goal_kpis.value?.some(row => row.measurement_spec)) throw new HealthPlanInputError('Najpierw zapisz mierzalne cele treningowe.')
    const jobId = await new HealthPlanRepo(supabase).enqueue(userId, body.requestKey, { weeks: body.weeks ?? 4, instructions: typeof body.instructions === 'string' ? body.instructions.slice(0, 2000) : '' })
    return { success: true, jobId }
  }
  if (body.action === 'approve_plan' || body.action === 'revert_plan') {
    if (typeof body.requestKey !== 'string' || !body.requestKey || !Number.isInteger(body.baseRevision)) throw new Error('Missing revision or requestKey')
    return body.action === 'approve_plan' ? approvePlan(supabase, userId, body) : revertPlan(supabase, userId, body)
  }
  if (body.action && body.action !== 'analyze') throw new Error('Unknown training action')
  if (!apiKey) throw new Error('Missing DEEPSEEK_API_KEY')

  const parsed = await analyzeTrainingLoad(supabase, userId, apiKey)

  return { success: true, ...parsed }
}))
