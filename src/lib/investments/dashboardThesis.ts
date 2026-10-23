import type { DashboardData } from './dashboardService';

export type ThesisTone = 'neutral' | 'positive' | 'negative' | 'warning';
interface ThesisPoint { key: string; label: string; text: string; context: string; source: string; tone: ThesisTone; tab: string }
export interface DashboardThesis { headline: string; windowNote: string | null; points: ThesisPoint[] }

type Activity = DashboardData['activity14d'];

const plDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;

/** "14 dni" albo, gdy okno ucięte do początku roku, "5 dni (od 1 stycznia)". */
export function activityWindowLabel(activity: Activity): string {
  const days = `${activity.windowDays} ${activity.windowDays === 1 ? 'dzień' : 'dni'}`;
  return activity.clampedToYearStart ? `${days} (od 1 stycznia)` : days;
}

export function activityWindowNote(activity: Activity): string | null {
  return activity.clampedToYearStart
    ? `Dane od 1 stycznia ${activity.windowStart.slice(0, 4)}: baza trzyma wyłącznie bieżący rok, więc okno jest krótsze niż 14 dni.`
    : null;
}

const NO_READ = 'brak odczytu';

/** Jedna teza pulpitu: co dziś wynika z 13F, krótkiej sprzedaży, Kongresu i insiderów (tylko z odczytanych danych). */
export function buildDashboardThesis(data: DashboardData): DashboardThesis {
  const a = data.activity14d;
  const win = activityWindowLabel(a);
  const { topConsensus: c, maxShort: s, congress14: k, insider14: i } = data;
  const points: ThesisPoint[] = [
    c
      ? { key: '13f', label: 'Konsensus 13F', text: `${c.ticker} ${signed(c.net)} netto`, context: 'zmiana liczby funduszy, dwa ostatnie kwartały', source: 'SEC 13F', tone: c.net > 0 ? 'positive' : c.net < 0 ? 'negative' : 'neutral', tab: 'stocks' }
      : { key: '13f', label: 'Konsensus 13F', text: NO_READ, context: 'brak spółki z porównaniem funduszy', source: 'SEC 13F', tone: 'neutral', tab: 'stocks' },
    s
      ? { key: 'short', label: 'Największy short GPW', text: `${s.company} ${s.totalPct.toFixed(2)}%`, context: 'suma pozycji od 0,5% w rejestrze', source: 'KNF', tone: 'negative', tab: 'gpw_shorts' }
      : { key: 'short', label: 'Największy short GPW', text: NO_READ, context: 'rejestr KNF bez pozycji', source: 'KNF', tone: 'neutral', tab: 'gpw_shorts' },
    k
      ? { key: 'congress', label: 'Kongres USA', text: `${k.total} ujawnień`, context: `${win}: ${k.sales} sprzedaży, ${k.buys} zakupów`, source: 'STOCK Act', tone: k.sales > k.buys ? 'warning' : 'neutral', tab: 'politicians' }
      : { key: 'congress', label: 'Kongres USA', text: NO_READ, context: 'źródło niedostępne', source: 'STOCK Act', tone: 'neutral', tab: 'politicians' },
    i
      ? { key: 'insiders', label: 'Insiderzy USA', text: `${i.total} zgłoszeń`, context: `${win}: ${i.buys} kupna (P), ${i.sells} sprzedaży (S)`, source: 'SEC Form 4', tone: i.buys > i.sells ? 'positive' : i.sells > i.buys ? 'warning' : 'neutral', tab: 'live' }
      : { key: 'insiders', label: 'Insiderzy USA', text: NO_READ, context: 'źródło niedostępne', source: 'SEC Form 4', tone: 'neutral', tab: 'live' },
  ];
  const headline = a.total === 0
    ? `Brak nowych zgłoszeń w oknie ${win}`
    : `${a.total.toLocaleString('pl-PL')} zgłoszeń w oknie ${win}${a.peakDateLabel ? `, szczyt ${a.peakDateLabel}` : ''}`;
  return { headline: `${headline} · dane do ${plDate(a.windowEnd)}`, windowNote: activityWindowNote(a), points };
}
