import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildHealthCoachContext } from "./healthCoachContext.ts";
import { buildHealthCoachReview } from "./healthCoachReview.ts";

const asOf = "2026-10-18T20:00:00Z"; // Sunday evening
const weekStart = "2026-10-12";
const weekEnd = "2026-10-18";

Deno.test("healthCoachReview — unrecorded workout session is not counted as skipped or failed", () => {
  const context = buildHealthCoachContext({
    asOf,
    data: {
      training_plan_workouts: [
        { id: "pw1", planned_date: "2026-10-12", title: "Siła A", completed: true, skipped_at: null },
        { id: "pw2", planned_date: "2026-10-14", title: "Bieg tlenowy", completed: true, skipped_at: null },
        { id: "pw3", planned_date: "2026-10-16", title: "Siła B", completed: false, skipped_at: "2026-10-16T10:00:00Z" },
        { id: "pw4", planned_date: "2026-10-17", title: "Podbiegi", completed: false, skipped_at: null }, // no log, no skip
      ],
      workout_sessions: [
        { id: "ws1", date: "2026-10-12", exercise_logs:Array.from({length:15},(_,index)=>({id:`set-${index}`,exercise_name:'Bench Press',reps:8,weight:60})) },
      ],
      strava_activities_clean: [
        { id: "run1", sport_type:'Run', start_date: "2026-10-14T08:00:00Z", distance: 8000, elapsed_time: 2400, source: "garmin_intervals" },
      ],
    },
  });

  const review = buildHealthCoachReview({
    context,
    weekStart,
    weekEnd,
    decisions: [],
  });

  assertEquals(review.adherence.plannedSessionsCount, 4);
  assertEquals(review.adherence.completedSessionsCount, 2);
  assertEquals(review.adherence.skippedSessionsCount, 1);
  assertEquals(review.adherence.unrecordedSessionsCount, 1);
  assertEquals(review.adherence.cardioKm, 8);
  assertEquals(review.adherence.strengthSets, 15);
});

Deno.test("healthCoachReview — missing measurement for KPI yields unassessed rather than regressing", () => {
  const context = buildHealthCoachContext({
    asOf,
    data: {
      goal_kpis: [
        { id: "kpi-bench", label: "Wyciskanie leżąc", target: 100, unit: "kg", current_value: null, measurement_standard: "1RM z pauzą" },
        { id: "kpi-run", label: "Bieg 10 km", target: 2700, unit: "s", current_value: 2850, measurement_standard: "atestowana trasa" },
      ],
      training_plan_workouts: [],
      workout_sessions: [],
    },
  });

  const review = buildHealthCoachReview({
    context,
    weekStart,
    weekEnd,
    decisions: [],
  });

  const bench = review.goalProgress.find(g => g.kpiId === "kpi-bench");
  assertEquals(bench?.status, "unassessed");
  assertEquals(bench?.currentValue, null);

  const run = review.goalProgress.find(g => g.kpiId === "kpi-run");
  assertEquals(run?.status, "unassessed");
  assertEquals(run?.currentValue, null);
});

Deno.test('weekly review excludes future prescriptions and does not prescribe progression from adherence alone', () => {
  const context = buildHealthCoachContext({asOf:'2026-10-14T12:00:00Z',data:{
    training_plan_workouts:[{id:'done',planned_date:'2026-10-12',completed:true},{id:'future',planned_date:'2026-10-18',completed:false}],
    strava_activities_clean:[{strava_id:1,sport_type:'Ride',distance:50000,start_date:'2026-10-13T10:00:00Z'},
      {strava_id:2,sport_type:'Run',distance:5000,start_date:'2026-10-11T23:30:00Z'}],
    daily_strain:[{date:'2026-10-14',illness_level:'high'}],
  }});
  const result = buildHealthCoachReview({context,weekStart,weekEnd});
  assertEquals(result.adherence.plannedSessionsCount,1);
  assertEquals(result.adherence.unrecordedSessionsCount,0);
  assertEquals(result.adherence.cardioKm,5);
  assertEquals(result.nextWeekProposal.action,'deload');
  // powód to faktyczny sygnał z dzisiejszej decyzji, nie stała lista możliwych przyczyn
  assertEquals(result.nextWeekProposal.rationale.includes('sygnał choroby'),true);
  assertEquals(result.nextWeekProposal.rationale.includes('zgłoszenie bólu'),false);
});

Deno.test("healthCoachReview — separates measured progress from causal claim about coach advice", () => {
  const context = buildHealthCoachContext({
    asOf,
    data: {
      goal_kpis: [
        { id: "kpi-pullups", label: "Podciąganie nachwytem", target: 10, unit: "reps", current_value: 8, measurement_standard: "pełny zwis do brody" },
      ],
      training_plan_workouts: [
        { id: "p1", planned_date: "2026-10-13", completed: true },
      ],
      workout_sessions: [
        { id: "w1", session_date: "2026-10-13", total_sets: 10 },
      ],
    },
  });

  const decisions = [
    { id: "dec-1", created_at: "2026-10-13T07:00:00Z", decision_type: "lighten", explanation: "Lżejsza sesja po gorszym śnie", status: "applied" },
  ];

  const review = buildHealthCoachReview({
    context,
    weekStart,
    weekEnd,
    decisions,
  });

  assertEquals(review.decisions.length, 1);
  assertEquals(review.decisions[0].applied, true);
  // Ensure the review summary grounds results in recorded evidence without unprovable causal attribution
  assertEquals(review.summary.includes("spowodowała"), false);
  assertEquals(review.summary.includes("sukces dzięki poradzie"), false);
});

Deno.test("healthCoachReview — proposal preserves version continuity and avoids duplicated plan workouts", () => {
  const context = buildHealthCoachContext({
    asOf,
    data: {
      training_plan_workouts: [
        { id: "p1", planned_date: "2026-10-12", title: "Bieg 10k", completed: true },
        { id: "p2", planned_date: "2026-10-14", title: "Siła", completed: true },
        { id: "p3", planned_date: "2026-10-16", title: "Interwały", completed: true },
      ],
      daily_strain: [
        { date: "2026-10-12", score: 14.2 },
        { date: "2026-10-14", score: 12.0 },
      ],
      oura_daily_summary: [
        { day: "2026-10-18", readiness_score: 82 },
      ],
    },
  });

  const review = buildHealthCoachReview({
    context,
    weekStart,
    weekEnd,
    decisions: [],
  });

  assertEquals(review.assessmentStatus, "evaluated");
  assertEquals(["keep", "progress"].includes(review.nextWeekProposal.action), true);
  assertEquals(review.nextWeekProposal.changesSummary.length >= 1, true);
});
