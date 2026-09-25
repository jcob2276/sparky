/**
 * deviceContext.ts
 * Telemetry from Android (phone_usage_daily) and ActivityWatch / NextDNS (aw_daily_summary).
 * Also formats active projects and sprint goals for strategic alignment.
 */

// deno-lint-ignore no-explicit-any
export async function fetchDeviceUsageContext(
  supabase: any,
  userId: string,
): Promise<string> {
  try {
    const [phoneRes, awRes] = await Promise.all([
      supabase
        .from("phone_usage_daily")
        .select("date, total_minutes, late_night_minutes, unlocks, top_apps, social_minutes, messaging_minutes, entertainment_minutes")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(5),
      supabase
        .from("aw_daily_summary")
        .select("date, total_active_seconds, top_apps, web_domains, productivity_ratio")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(5),
    ]);

    const phoneRows = phoneRes.data || [];
    const awRows = awRes.data || [];

    if (!phoneRows.length && !awRows.length) return "";

    const dates = new Set([...phoneRows.map((r: any) => r.date), ...awRows.map((r: any) => r.date)]);
    const sortedDates = Array.from(dates).sort().reverse().slice(0, 5);

    const lines: string[] = ["[CYFROWY DRYF I UŻYCIE URZĄDZEŃ (ANDROID & EKRAN)]:"];
    for (const d of sortedDates) {
      const pRow = phoneRows.find((r: any) => r.date === d);
      const aRow = awRows.find((r: any) => r.date === d);
      
      lines.push(`- ${d}:`);
      
      if (pRow) {
        const apps = Array.isArray(pRow.top_apps)
          ? pRow.top_apps.slice(0, 5).map((a: { app: string; min: number }) => `${a.app} ${a.min}m`).join(", ")
          : "brak";
        lines.push(`  * Czas ekranowy Android: ${pRow.total_minutes} min (odblokowań: ${pRow.unlocks ?? "?"}, w nocy >23: ${pRow.late_night_minutes ?? 0} min). Top apki: ${apps}`);
      }
      
      if (aRow && Array.isArray(aRow.web_domains) && aRow.web_domains.length > 0) {
        const topDomains = aRow.web_domains.slice(0, 8).map((d: { domain: string; queries?: number }) => d.domain).join(", ");
        lines.push(`  * Ukryty ruch w tle i domeny (DNS): ${topDomains}`);
      }
    }

    lines.push("Zasada: Konfrontuj z Żelaznymi Zasadami (zwłaszcza Clash Royale i TikTok w oknach pracy). Czas nocny i wysoka liczba odblokowań to twardy wskaźnik rozproszenia i unikania trudnych zadań.");
    return lines.join("\n");
  } catch (err) {
    console.warn("[oracle] fetchDeviceUsageContext failed (non-fatal):", err);
    return "";
  }
}

// deno-lint-ignore no-explicit-any
export async function fetchProjectsAndGoalsContext(
  supabase: any,
  userId: string,
): Promise<string> {
  try {
    const [projectsRes, goalsRes] = await Promise.all([
      supabase
        .from("projects")
        .select("name, goal, status, deadline")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(5),
      supabase
        .from("sprint_goals")
        .select("title, status, target_date")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(5),
    ]);

    const projects = projectsRes.data || [];
    const goals = goalsRes.data || [];
    if (!projects.length && !goals.length) return "";

    const lines: string[] = ["[AKTYWNE CELE I PROJEKTY (FOCUS)]:"];
    for (const p of projects) {
      lines.push(`- Projekt: ${p.name}${p.goal ? ` (cel: ${p.goal})` : ""}${p.deadline ? ` [termin: ${p.deadline}]` : ""}`);
    }
    for (const g of goals) {
      lines.push(`- Sprint Goal: ${g.title}${g.target_date ? ` [do: ${g.target_date}]` : ""}`);
    }
    return lines.join("\n");
  } catch (err) {
    console.warn("[oracle] fetchProjectsAndGoalsContext failed (non-fatal):", err);
    return "";
  }
}
