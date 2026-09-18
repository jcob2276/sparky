import type { Tables } from '../database.types';
import type { ExportData } from './exportStatsFetch';
import type { StravaCleanActivity } from './exportStatsTypes';

interface MacroAnalyticsParams {
  d: ExportData;
  dateRange: { from: string; to: string };
  avgSleep: number | string;
  avgReadiness: number | string;
  avgHrv: number | string;
  avgRhr: number | string;
  avgCalories: number | string;
  avgProtein: number | string;
  avgPhoneMinutes: number | string;
  avgLateNight: number | string;
  totalCardioKm: number;
}

export function renderMacroAnalytics({
  d,
  avgSleep,
  avgProtein,
  avgPhoneMinutes,
  avgLateNight,
  totalCardioKm,
}: MacroAnalyticsParams): string {
  const journalRows = d.journal ?? [];
  const journalDays = journalRows.length;
  const journalWins = journalRows.filter((j) => j.result === 'Z').length;
  const winRatePct = journalDays > 0 ? Math.round((journalWins / journalDays) * 100) : 0;

  // 1. Task category distribution
  const catStats: Record<string, { total: number; done: number }> = {
    konto: { total: 0, done: 0 },
    cialo: { total: 0, done: 0 },
    duch: { total: 0, done: 0 },
    general: { total: 0, done: 0 },
  };

  journalRows.forEach((day) => {
    for (let i = 1; i <= 5; i++) {
      const cat = (day[`category_${i}` as keyof Tables<'daily_wins'>] as string | undefined)?.toLowerCase() || '';
      const task = day[`task_${i}` as keyof Tables<'daily_wins'>];
      const done = day[`done_${i}` as keyof Tables<'daily_wins'>];
      if (task) {
        const key = cat.includes('konto') ? 'konto' : cat.includes('cialo') ? 'cialo' : cat.includes('duch') ? 'duch' : 'general';
        catStats[key].total += 1;
        if (done) catStats[key].done += 1;
      }
    }
  });

  // 2. Lenie / Habit slips analysis
  const relapses = (d.habitLogs ?? []).filter((l) => {
    const h = (d.habits ?? []).find((x) => x.id === l.habit_id);
    return h && !h.is_positive;
  });
  const stimuliCounts: Record<string, number> = {};
  relapses.forEach((l) => {
    const stim = (l.final_stimulus || 'Inny bodziec').trim();
    stimuliCounts[stim] = (stimuliCounts[stim] || 0) + 1;
  });
  const topStimuli = Object.entries(stimuliCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([s, count]) => `${s} (${count}×)`)
    .join(', ') || 'Brak wpisów';

  // 3. Running & Cardio stats
  const runs = ((d.stravaData ?? []) as StravaCleanActivity[]).filter((a) => !a.is_oura && (a.distance || 0) > 0);
  const longestRunKm = runs.reduce((max, r) => Math.max(max, (r.distance || 0) / 1000), 0);
  const vo2MaxVal = runs.find((r) => r.gc_vo2max)?.gc_vo2max || d.ouraEnhanced?.find((o) => o.vo2_max)?.vo2_max || 48.5;

  // 4. App screen time distribution
  let entertainmentMin = 0;
  let clashRoyaleMin = 0;
  let tiktokMin = 0;
  (d.phoneUsageData ?? []).forEach((day) => {
    entertainmentMin += day.entertainment_minutes || 0;
    (day.top_apps as { app?: string; min?: number }[] | null)?.forEach((app) => {
      const name = (app.app || '').toLowerCase();
      if (name.includes('clash')) clashRoyaleMin += app.min || 0;
      if (name.includes('tiktok')) tiktokMin += app.min || 0;
    });
  });

  let md = `## ⚡ 1. MACIERZ ROZJAZDU TOŻSAMOŚCI (IDENTITY GAP MATRIX)\n`;
  md += `*Konfrontacja 3 Filarów Tożsamości z Rozdziału 0 z twardą telemetrią zachowań.*\n\n`;
  md += `| Filar Tożsamości | Deklaracja | Twardy Pomiar Tygodnia | Rozjazd & Diagnoza |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;
  md += `| **Filar 1: Dowożę mimo oporu** | Wygrane dni, brak ucieczki w prokrastynację | **${journalWins}/${journalDays} wygranych (${winRatePct}%)**<br>${avgPhoneMinutes} min ekranu/dzień | ${
    winRatePct < 50
      ? `🔴 **Eskapizm:** ${relapses.length} wpadki w tygodniu. Ekran rozrywkowy pochłania ${Math.round(entertainmentMin / 60)}h w tygodniu.`
      : `🟢 **Stabilna realizacja:** Większość dni dowieziona zgodnie z planem.`
  } |\n`;
  md += `| **Filar 2: Ciało, obecność & odpowiedzialność** | Baza dla pewności siebie, przygotowanie do maratonu | **Sen: ${avgSleep}h** · Białko: ${avgProtein}g / 140g<br>Kardio: ${totalCardioKm} km | ${
    Number(avgProtein) < 130
      ? `🟡 **Deficyt Paliwa:** Niedobór ${140 - Number(avgProtein)}g białka/dzień. Ryzyko katabolizmu przy kilometrażu biegowym.`
      : `🟢 **Optymalne paliwo:** Białko i regeneracja w normie.`
  } |\n`;
  md += `| **Filar 3: Wiedza spotyka rynek** | Zamiana wiedzy w sprzedaż, Top Closer, dowożenie | **Konto: ${catStats.konto.done}/${catStats.konto.total} zadań** (${
    catStats.konto.total > 0 ? Math.round((catStats.konto.done / catStats.konto.total) * 100) : 0
  }%) | ${
    catStats.konto.done < catStats.konto.total
      ? `🟡 **Bariera domknięcia:** Zrealizowano diale, lecz występuje opór przed finalnym zamknięciem rozmowy sprzedażowej.`
      : `🟢 **Pełna realizacja celów komercyjnych.**`
  } |\n\n`;

  md += `## 💼 2. PIPELINE SPRZEDAŻY & TONAZ REALIZACJI\n\n`;
  md += `- **Zadania biznesowe / sprzedażowe (Konto):** ${catStats.konto.done} / ${catStats.konto.total} ukończone (${
    catStats.konto.total > 0 ? Math.round((catStats.konto.done / catStats.konto.total) * 100) : 0
  }%)\n`;
  md += `- **Zadania treningowe i regeneracyjne (Ciało):** ${catStats.cialo.done} / ${catStats.cialo.total} ukończone (${
    catStats.cialo.total > 0 ? Math.round((catStats.cialo.done / catStats.cialo.total) * 100) : 0
  }%)\n`;
  md += `- **Zadania mentalne i nawykowe (Duch):** ${catStats.duch.done} / ${catStats.duch.total} ukończone (${
    catStats.duch.total > 0 ? Math.round((catStats.duch.done / catStats.duch.total) * 100) : 0
  }%)\n`;
  md += `- **Ekran rozrywkowy vs Realizacja:** TikTok (${tiktokMin} min), Clash Royale (${clashRoyaleMin} min) — łącznie ${Math.round(
    (tiktokMin + clashRoyaleMin) / 60
  )}h w grach i wideo.\n\n`;

  md += `## 🔄 3. ANATOMIA PĘTLI SABOTAŻU & RECOVERY (LENIE)\n\n`;
  md += `- **Liczba incydentów (wpadki):** ${relapses.length} w ostatnich 7 dniach\n`;
  md += `- **Główne bodźce wyzwalające:** ${topStimuli}\n`;
  md += `- **Nocny ekran po 22:00:** Średnio **${avgLateNight} min/dzień** (hamowanie melatoniny i opóźnienie nocnego spadku tętna Oura do godzin porannych).\n\n`;

  md += `## 🏃 4. GOTOWOŚĆ BIEGOWA: MARATON 4 PAŹDZIERNIKA\n\n`;
  md += `- **Kilometraż tygodnia:** ${totalCardioKm} km (${runs.length} jednostek biegowych)\n`;
  md += `- **Najdłuższy bieg (Long Run):** ${longestRunKm > 0 ? `${longestRunKm.toFixed(1)} km` : '—'}\n`;
  md += `- **Szacowane VO2Max:** ${vo2MaxVal} ml/kg/min (Wiek sprawnościowy: 20 lat)\n`;
  md += `- **Status regeneracji mięśniowej:** Średnie białko ${avgProtein}g / 140g targetu (${
    Number(avgProtein) < 130 ? '⚠️ WYMAGA PILNEGO ZWIĘKSZENIA DLA UNIKNIĘCIA KONTUZJI' : 'Zadowalające'
  })\n\n`;

  md += `## 🎯 5. DŹWIGNIA NA KOLEJNY TYDZIEŃ (KEYSTONE DOMINO)\n\n`;
  md += `> **Główna Interwencja Operacyjna:** **No-Phone Morning (90 minut bez ekranu)**. Telefon poza zasięgiem rąk w sypialni. Poranny blok: woda, białko ≥40g, 10 min dykcji i natychmiastowe wejście w pierwsze 20 diali handlowych przed otwarciem aplikacji rozrywkowych.\n\n`;
  md += `---\n\n`;

  return md;
}
