import React from 'react';
import { Activity, Gauge, TrendingUp, Calendar, Heart, Award } from 'lucide-react';
import type { OuraHealthHubData } from './types';

function formatPace(movingSeconds: number, distanceMeters: number): string {
  if (!distanceMeters || distanceMeters <= 0) return '—';
  const totalKm = distanceMeters / 1000;
  const secPerKm = movingSeconds / totalKm;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s < 10 ? '0' : ''}${s} /km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

export function OuraGarminTrainingView({ data }: { data: OuraHealthHubData }) {
  const strainRow = data.strainRow;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comp = (strainRow?.components ?? {}) as any;
  const zones = comp?.zones ?? {};
  const activities = data.stravaActivities ?? [];
  const vo2 = data.garminVo2Max ?? 47.1;
  const cardioStrain = strainRow?.cardio_load ?? 10;
  const fitnessAge = comp?.fitness_age ?? 20;

  return (
    <div className="space-y-5 pb-8 animate-fade-in">
      {/* Top Banner: Training Load & VO2Max */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-surface-solid/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-3xs font-black uppercase tracking-wider">Obciążenie Garmin</span>
            <Activity size={15} className="text-warning" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-text-primary tracking-tight">
              {cardioStrain}
            </span>
            <span className="text-xs text-text-muted">/21 Strain</span>
          </div>
          <p className="mt-1 text-2xs font-bold text-text-secondary">
            Optymalna strefa adaptacji biegowej
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-solid/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-3xs font-black uppercase tracking-wider">Garmin VO2Max</span>
            <Gauge size={15} className="text-info" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-info tracking-tight">
              {vo2}
            </span>
            <span className="text-2xs text-text-muted">ml/kg/min</span>
          </div>
          <p className="mt-1 text-2xs font-bold text-success flex items-center gap-1">
            <Award size={11} /> Wiek fitness: {fitnessAge} lat
          </p>
        </div>
      </div>

      {/* Heart Rate Zones Distribution */}
      <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
            <Heart size={14} className="text-danger" /> Strefy tętna w dzisiejszym wysiłku
          </h3>
          <span className="text-3xs font-semibold text-text-muted">
            Max HR: {zones?.hr_max ?? 127} bpm
          </span>
        </div>

        <div className="space-y-2">
          {/* Z2 Tlenowa */}
          <div>
            <div className="flex justify-between text-2xs font-bold mb-1">
              <span className="text-text-secondary">Strefa 2 (Baza tlenowa / Aerobic)</span>
              <span className="text-text-primary font-mono">{zones?.z2_tlenowa_min ?? 9} min</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-info" style={{ width: '65%' }} />
            </div>
          </div>

          {/* Z1 Aktywna regeneracja */}
          <div>
            <div className="flex justify-between text-2xs font-bold mb-1">
              <span className="text-text-secondary">Strefa 1 (Aktywna regeneracja)</span>
              <span className="text-text-primary font-mono">{zones?.z1_regen_min ?? 2} min</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-success" style={{ width: '25%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Garmin / Strava Running Activities */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
            <TrendingUp size={14} className="text-primary" /> Ostatnie biegi z Garmina ({activities.length})
          </h3>
          <span className="text-3xs text-text-muted">Telemetria z czujników</span>
        </div>

        <div className="space-y-2.5">
          {activities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-text-muted">
              Brak zarejestrowanych biegów w bieżącym oknie.
            </div>
          ) : (
            activities.map((act, i) => {
              const km = act.distance ? (act.distance / 1000).toFixed(1) : '—';
              const pace = act.moving_time && act.distance ? formatPace(act.moving_time, act.distance) : '—';
              const dur = act.moving_time ? formatDuration(act.moving_time) : '—';
              const dateStr = act.start_date ? act.start_date.slice(0, 10) : '';

              return (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-surface-solid/40 p-3.5 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-text-primary leading-tight">
                        🏃 {act.name || 'Trening biegowy'}
                      </h4>
                      <p className="text-3xs text-text-muted mt-0.5 flex items-center gap-1">
                        <Calendar size={10} /> {dateStr}
                      </p>
                    </div>
                    <span className="text-sm font-black text-primary font-mono shrink-0">
                      {km} km
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-2 text-2xs">
                    <div>
                      <span className="text-3xs text-text-muted block">Śr. tempo</span>
                      <span className="font-bold text-text-secondary font-mono">{pace}</span>
                    </div>
                    <div>
                      <span className="text-3xs text-text-muted block">Czas ruchu</span>
                      <span className="font-bold text-text-secondary font-mono">{dur}</span>
                    </div>
                    <div>
                      <span className="text-3xs text-text-muted block">Śr. tętno</span>
                      <span className="font-bold text-danger font-mono">
                        {act.average_heartrate ? `${Math.round(act.average_heartrate)} bpm` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
