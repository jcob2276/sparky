export function formatPlanningsText(
  dailyWinsRows: any[],
  plannings: any[]
): { planningsText: string; planningsCount: number } {
  const daysWithTasks = (dailyWinsRows || []).filter((w: any) =>
    [w.task_1, w.task_2, w.task_3, w.task_4, w.task_5].some(
      (t: any) => t && String(t).trim().length > 0
    )
  );
  const plannedDatesSet = new Set([
    ...(plannings || []).map((p: any) => p.date),
    ...daysWithTasks.map((w: any) => w.date),
  ]);
  const planningsCount = plannedDatesSet.size;

  const datesMap = new Map<string, { powerListTasks: string[]; legacyPlan?: any }>();
  for (const w of dailyWinsRows || []) {
    const tasks: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const t = w[`task_${i}`];
      const done = Boolean(w[`done_${i}`]);
      if (t && String(t).trim()) {
        tasks.push(`- ${String(t).trim()} -> ${done ? "[WYKONANE]" : "[NIEWYKONANE]"}`);
      }
    }
    if (tasks.length > 0) {
      datesMap.set(w.date, { powerListTasks: tasks });
    }
  }

  for (const p of plannings || []) {
    const existing = datesMap.get(p.date) || { powerListTasks: [] };
    existing.legacyPlan = p;
    datesMap.set(p.date, existing);
  }

  const sortedDates = Array.from(datesMap.keys()).sort().reverse();
  const planningsText = sortedDates.length > 0
    ? sortedDates
        .map((date) => {
          const entry = datesMap.get(date)!;
          const parts: string[] = [`[Data: ${date}]`];
          if (entry.powerListTasks.length > 0) {
            parts.push(`Power List (5 zadań dnia):\n${entry.powerListTasks.join("\n")}`);
          }
          if (entry.legacyPlan?.planning_summary) {
            const plan = entry.legacyPlan.planning_summary;
            const prodArtifact =
              plan.production_artifact?.artifact || plan.one_clear_move || "—";
            const minViable = plan.minimum_viable_day || "—";
            const p2 = entry.legacyPlan.p2_parsed || {};
            const biggestCost = p2.biggest_cost || "—";
            const blockers = p2.blocker_candidates?.join("; ") || "—";
            parts.push(
              `Plan wieczorny: ${prodArtifact} | Minimum: ${minViable}\nKoszt: ${biggestCost} | Blokery: ${blockers}`
            );
          }
          return parts.join("\n");
        })
        .join("\n\n")
    : "";

  return { planningsText, planningsCount };
}

export function formatDailyReflectionsText(dailyReflections: any[]): string {
  return (dailyReflections || []).length > 0
    ? (dailyReflections || [])
        .map((d: any) => {
          const parts = [`[${d.date}, wynik dnia: ${d.result ?? "—"}]`];
          if (d.day_note?.trim()) parts.push(`Refleksja: "${d.day_note.trim()}"`);
          if (d.journal_entry?.trim()) parts.push(`Co zrobiono: "${d.journal_entry.trim()}"`);
          return parts.join(" ");
        })
        .join("\n")
    : "";
}

export function formatFrictionSummary(frictionEvents: any[]): {
  frictionText: string;
  frictionDetails: string;
  frictionSorted: [string, number][];
} {
  const frictionByType: Record<string, number> = {};
  for (const e of frictionEvents || []) {
    if (e.friction_type) {
      frictionByType[e.friction_type] = (frictionByType[e.friction_type] || 0) + 1;
    }
  }
  const frictionSorted = Object.entries(frictionByType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const frictionText = frictionSorted.length > 0
    ? frictionSorted.map(([type, count]) => `${type}: ${count}x`).join(" | ")
    : "brak";

  const frictionDetails = (frictionEvents || [])
    .slice(0, 12)
    .map((e: any) => `[${e.occurred_at?.split("T")[0]}] ${e.friction_type}: ${e.deviation || e.actual_behavior || "—"}`)
    .join("\n");

  return { frictionText, frictionDetails, frictionSorted };
}

export function formatBiometricsSummary(biometrics: any[]): {
  bioText: string;
  sleepDaysCount: number;
} {
  const bio = biometrics || [];
  const sleepDays = bio.filter((b: any) => b.sleep_hours != null);
  const hrvDays = bio.filter((b: any) => b.hrv_avg != null);
  const execDays = bio.filter((b: any) => b.execution_score != null);

  const avgSleep = sleepDays.length
    ? (sleepDays.reduce((s: number, b: any) => s + b.sleep_hours, 0) / sleepDays.length).toFixed(1)
    : null;
  const avgHrv = hrvDays.length
    ? Math.round(hrvDays.reduce((s: number, b: any) => s + b.hrv_avg, 0) / hrvDays.length)
    : null;
  const avgExec = execDays.length
    ? Math.round((execDays.reduce((s: number, b: any) => s + b.execution_score, 0) / execDays.length) * 100)
    : null;

  const bioText = [
    `Sen: ${avgSleep ?? "brak"}h (${sleepDays.length} dni)`,
    `HRV: ${avgHrv ?? "brak"} (${hrvDays.length} dni)`,
    `Wykonanie Top3: ${avgExec != null ? avgExec + "%" : "brak"} (${execDays.length} dni)`,
  ].join(" | ");

  return { bioText, sleepDaysCount: sleepDays.length };
}
