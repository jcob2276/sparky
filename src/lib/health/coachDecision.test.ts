import { afterEach, describe, expect, it } from 'vitest';
import { decideTraining, recentPainReport, HEALTH_COACH_SOURCES, HEALTH_THRESHOLDS, type HealthCoachContext, type CoachRow, type HealthCoachSource, type CoachSignal } from '@vanguard/domain';
function context(data: Partial<Record<HealthCoachSource, CoachRow[]>>): HealthCoachContext {
  return { asOf:'2026-10-14T12:00:00Z',localDate:'2026-10-14',windowStart:'2026-09-17',queryErrors:[],
    coverage: Object.fromEntries(HEALTH_COACH_SOURCES.map(key=>[key,data[key]?.length ?? 0])) as HealthCoachContext['coverage'],
    sources: Object.fromEntries(HEALTH_COACH_SOURCES.map((key): [HealthCoachSource, CoachSignal<CoachRow[]>] =>
      [key,{value:data[key] ?? null,state:data[key]?.length ? 'current':'missing',refs:[]}])) as HealthCoachContext['sources'] };
}
const session = { key:'strength',date:'2026-10-14',type:'strength',name:'Siła',goal:'Bench',durationMinutes:50,warmupMinutes:8,cooldownMinutes:5,intensity:'hard',notes:'Plan',
  exercises:[{name:'Bench Press',sets:4,reps:8,rir:2,restSeconds:120,weightKg:null,equipment:['barbell'],pattern:'upper'}] };
const planned = { id:'session',planned_date:'2026-10-14',completed:false,prescription:session };
const constraints = {revision:1,availability:[{day:3,minutes:60}],equipment:['barbell'],limitations:[]};
const originalThresholds = { ...HEALTH_THRESHOLDS };
afterEach(() => { Object.assign(HEALTH_THRESHOLDS, originalThresholds); });
describe('shared daily training decision', () => {
  it.each([
    { threshold: 'SLEEP_SHORT_H', value: 7, sleep: 6.5, readiness: 80, expected: 'reduce' },
    { threshold: 'SLEEP_SHORT_H', value: 5, sleep: 5.5, readiness: 80, expected: 'keep' },
    { threshold: 'SLEEP_SHORT_H', value: 7, sleep: 7, readiness: 80, expected: 'keep' },
    { threshold: 'READINESS_PLAN_LOW', value: 75, sleep: 8, readiness: 70, expected: 'reduce' },
    { threshold: 'READINESS_PLAN_LOW', value: 50, sleep: 8, readiness: 55, expected: 'keep' },
    { threshold: 'READINESS_PLAN_LOW', value: 75, sleep: 8, readiness: 75, expected: 'keep' },
  ] as const)('stosuje podmieniony $threshold=$value przy śnie $sleep i gotowości $readiness', ({ threshold, value, sleep, readiness, expected }) => {
    HEALTH_THRESHOLDS[threshold] = value;
    const result = decideTraining(context({ training_plan_workouts: [planned],
      oura_daily_summary: [{ date: '2026-10-14', total_sleep_hours: sleep, readiness_score: readiness }] }), { constraints });
    expect(result.recommendation).toBe(expected);
    expect(result.replacement === null).toBe(expected === 'keep');
  });

  it('does not equate missing sleep with good recovery or authorize increased load', () => {
    const result = decideTraining(context({training_plan_workouts:[planned]}), {constraints});
    expect(result.recommendation).toBe('unknown');
    expect(result.allowIncrease).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });
  it('reported pain blocks hard work without diagnosing an injury', () => {
    const result = decideTraining(context({training_plan_workouts:[planned]}), {constraints:{...constraints,painReported:true}});
    expect(result.recommendation).toBe('recover');
    expect(result.allowIncrease).toBe(false);
    expect(result.replacement).toBeNull();
  });
  it('low sleep gives an actual lower-volume prescription and preserves the original', () => {
    const result = decideTraining(context({training_plan_workouts:[planned],oura_daily_summary:[{date:'2026-10-14',total_sleep_hours:5.5,readiness_score:55}]}), {constraints});
    expect(result.recommendation).toBe('reduce');
    expect(result.replacement?.exercises[0].sets).toBeLessThan(session.exercises[0].sets);
    expect(session.exercises[0].sets).toBe(4);
  });
  it('unclosed food data cannot increase a deficit or invent completed meals', () => {
    const result = decideTraining(context({training_plan_workouts:[planned],oura_daily_summary:[{date:'2026-10-14',total_sleep_hours:8,readiness_score:80}],daily_nutrition:[{date:'2026-10-14',calories:800}]}), {constraints});
    expect(result.allowIncrease).toBe(false);
    expect(result.reasons.join(' ')).not.toMatch(/deficyt \d/);
  });
  it('a recent explicit pain report is distinct from no pain and an old mention', () => {
    expect(recentPainReport(context({vanguard_stream:[{id:'p',timestamp:'2026-10-14T10:00:00Z',content:'Boli mnie bark po wyciskaniu'}]}))?.id).toBe('p');
    expect(recentPainReport(context({vanguard_stream:[{id:'n',timestamp:'2026-10-14T10:00:00Z',content:'Nie boli mnie bark, nie mam bólu'}]}))).toBeNull();
    expect(recentPainReport(context({vanguard_stream:[{id:'old',timestamp:'2026-10-01T10:00:00Z',content:'Boli mnie bark'}]}))).toBeNull();
  });
  it('reducing a run switches to time and easy effort rather than preserving the original hard distance', () => {
    const result = decideTraining(context({training_plan_workouts:[{...planned,prescription:{...session,type:'run',exercises:[],distanceKm:10}}],
      oura_daily_summary:[{date:'2026-10-14',total_sleep_hours:5,readiness_score:50}]}),{constraints});
    expect(result.replacement?.distanceKm).toBeUndefined();
    expect(result.replacement?.notes).toContain('Bieg na czas');
  });
});
