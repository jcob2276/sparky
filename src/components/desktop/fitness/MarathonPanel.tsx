import React from 'react';
import { differenceInDays } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { Activity, ArrowUpRight } from 'lucide-react';
import { C, weeklyRunKm, avg, daysBefore, type StravaActivitySummary } from '../desktopUtils';
import { Panel, Tip } from '../shell/Panel';
import { formatLongDateWarsaw } from '../../../lib/date';

type MarathonTargetTime = string | { hours?: number; minutes?: number } | null | undefined;

export interface MarathonPanelProps {
  strava: StravaActivitySummary[];
  grid: string;
  tick: string;
  marathon?: {
    name: string;
    date: string;
    target_time?: MarathonTargetTime;
    status: string;
  } | null;
}

function pluralWeeks(w: number): string {
  if (w === 1) return '1 tydzień';
  const rem10 = w % 10;
  const rem100 = w % 100;
  if (rem10 >= 2 && rem10 <= 4 && !(rem100 >= 12 && rem100 <= 14)) {
    return `${w} tygodnie`;
  }
  return `${w} tygodni`;
}

function formatInterval(t: MarathonTargetTime): string | null {
  if (!t) return null;
  if (typeof t === 'string') {
    const parts = t.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return `${h}h ${m < 10 ? `0${m}` : m}m`;
    }
    return t;
  }
  if (typeof t === 'object') {
    const h = t.hours || 0;
    const m = t.minutes || 0;
    return `${h}h ${m < 10 ? `0${m}` : m}m`;
  }
  return null;
}

function parseTargetSeconds(t: MarathonTargetTime): number | null {
  if (!t) return null;
  if (typeof t === 'string') {
    const parts = t.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      const s = parts[2] ? parseInt(parts[2], 10) || 0 : 0;
      return h * 3600 + m * 60 + s;
    }
  }
  if (typeof t === 'object') {
    const h = t.hours || 0;
    const m = t.minutes || 0;
    return h * 3600 + m * 60;
  }
  return null;
}

function calculatePace(totalSec: number | null): string {
  if (!totalSec || totalSec <= 0) return '5:20 min/km';
  const secPerKm = totalSec / 42.195;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s < 10 ? `0${s}` : s} min/km`;
}

export default function MarathonPanel({ strava, grid, tick, marathon }: MarathonPanelProps) {
  const raceDate = marathon?.date ? new Date(marathon.date + 'T00:00:00') : null;
  const raceName = marathon?.name || "Brak nadchodzących maratonów";
  const targetTime = formatInterval(marathon?.target_time);
  const targetPace = calculatePace(parseTargetSeconds(marathon?.target_time));

  const daysLeft = raceDate ? differenceInDays(raceDate, new Date()) : null;
  const weeksLeft = daysLeft !== null ? Math.ceil(daysLeft / 7) : null;
  const kmData = weeklyRunKm(strava);
  const recent4 = kmData.slice(-4);
  const avgKm = recent4.length ? Math.round((avg(recent4.map(w => w.km)) ?? 0) * 10) / 10 : null;
  const bestKm = kmData.length ? Math.max(...kmData.map(w => w.km)) : null;

  // Running telemetry & Long Run Tracker (14 days)
  const since14d = daysBefore(14);
  const runs = strava.filter(s => (s.sport_type || '').toLowerCase().includes('run'));
  const recentRuns14d = runs.filter(s => s.start_date.slice(0, 10) >= since14d);
  const longestRun = recentRuns14d.reduce((max, r) => (Number(r.distance) || 0) > (Number(max?.distance) || 0) ? r : max, null as StravaActivitySummary | null);
  const longestKm = longestRun ? Math.round(((Number(longestRun.distance) || 0) / 1000) * 10) / 10 : null;
  const longestDaysAgo = longestRun ? differenceInDays(new Date(), new Date(longestRun.start_date)) : null;

  const validHrs = runs.slice(-6).map(r => r.hr_avg).filter((h): h is number => typeof h === 'number' && h > 0);
  const avgRunHr = validHrs.length ? Math.round(avg(validHrs) ?? 150) : 155;

  const phase = weeksLeft === null ? 'Planowanie'
    : weeksLeft <= 0 ? 'Start & Superkompensacja'
    : weeksLeft <= 3 ? 'Tapering (redukcja objętości)'
    : weeksLeft <= 8 ? 'Faza Specyficzna (tempo)'
    : 'Baza Tlenowa (objętość)';

  const formattedDate = marathon?.date
    ? formatLongDateWarsaw(marathon.date)
    : null;

  return (
    <Panel
      title={formattedDate ? `${raceName} — ${formattedDate}` : raceName}
      action={
        <Link
          to="/bieganie"
          className="flex items-center gap-1 rounded-lg border border-border-custom bg-surface-2/60 px-2 py-1 text-2xs font-semibold text-text-muted hover:text-primary hover:border-primary/30 transition-colors"
          title="Przejdź do Centrum Analityki Biegowej"
        >
          <Activity size={12} className="text-primary" />
          <span>Running Performance</span>
          <ArrowUpRight size={12} />
        </Link>
      }
    >
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="font-display text-4xl font-black leading-none text-text-primary">
            {daysLeft !== null ? (daysLeft >= 0 ? daysLeft : 0) : '—'}
          </p>
          <p className="text-xs font-bold text-text-muted mt-1">
            {daysLeft !== null
              ? (daysLeft >= 0 ? `dni do startu · ${pluralWeeks(weeksLeft ?? 0)}` : 'Wydarzenie zakończone')
              : 'Skonfiguruj nadchodzący maraton w bazie danych'}
          </p>
          {targetTime && (
            <div className="mt-2.5">
              <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Cel czasowy</p>
              <p className="font-display text-base font-black text-warning leading-none mt-0.5">
                {targetTime}
              </p>
            </div>
          )}
        </div>
        <div className="text-right space-y-2">
          {avgKm !== null && (
            <div>
              <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Avg 4 tygodnie</p>
              <p className="font-display text-2xl font-black text-warning leading-none">
                {avgKm} <span className="text-xs text-text-muted">km/tyg</span>
              </p>
            </div>
          )}
          {bestKm !== null && (
            <div>
              <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Rekord tyg.</p>
              <p className="font-display text-lg font-black text-text-primary leading-none">
                {bestKm} <span className="text-xs text-text-muted">km</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-surface-2/40 border border-border-custom/50 text-2xs text-text-secondary mb-4">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-primary">Tempo docelowe:</span>
          <span className="font-mono font-semibold">{targetPace}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-warning">Tętno ø:</span>
          <span className="font-mono font-semibold">{avgRunHr} bpm</span>
        </div>
        <div className="text-text-muted">
          Faza: <span className="font-semibold text-text-primary">{phase}</span>
        </div>
        {longestKm !== null && (
          <div className="w-full pt-1 mt-0.5 border-t border-border-custom/30 flex items-center justify-between text-3xs text-text-muted">
            <span className="font-medium text-info">Long Run (14d): {longestKm} km</span>
            <span>{longestDaysAgo === 0 ? 'dzisiaj' : `${longestDaysAgo}d temu`}</span>
          </div>
        )}
      </div>
      {kmData.length > 1 ? (
        <ResponsiveContainer width="100%" height={140} minWidth={0} minHeight={0}>
          <AreaChart data={kmData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gRun" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.amber} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.amber} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="week" tick={{ fontSize: 9, fill: tick }} />
            <YAxis tick={{ fontSize: 9, fill: tick }} />
            <Tooltip content={<Tip />} />
            <Area type="monotone" dataKey="km" name="km" stroke={C.amber} fill="url(#gRun)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-24 text-xs text-text-muted">
          Brak danych — zsynchronizuj Stravę
        </div>
      )}
      <div className="mt-3 pt-2.5 border-t border-border-custom flex items-center justify-between text-2xs text-text-muted">
        <span>Integracja Strava & Garmin</span>
        <Link to="/bieganie" className="text-primary hover:underline flex items-center gap-1 font-medium">
          Strefy HR, tempo i kadencja →
        </Link>
      </div>
    </Panel>
  );
}
