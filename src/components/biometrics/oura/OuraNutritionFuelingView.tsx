import React from 'react';
import { Utensils, Coffee, Droplet, AlertCircle, Clock, Flame } from 'lucide-react';
import type { OuraHealthHubData } from './types';

export function OuraNutritionFuelingView({ data }: { data: OuraHealthHubData }) {
  const strainRow = data.strainRow;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comp = (strainRow?.components ?? {}) as any;
  const kcal = comp?.kcal ?? 2155;
  const protein = comp?.protein ?? 90;
  const carbs = comp?.carbs ?? 183;
  const caffeineMg = comp?.caffeine_active_mg ?? 38;
  const hydrationGoal = comp?.hydration_goal_ml ?? 3750;

  const proteinTarget = 140;
  const carbsTarget = 200;
  const proteinPct = Math.min(100, Math.round((protein / proteinTarget) * 100));
  const carbsPct = Math.min(100, Math.round((carbs / carbsTarget) * 100));

  return (
    <div className="space-y-5 pb-8 animate-fade-in">
      {/* Top Banner: Calories & Hydration */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-surface-solid/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-3xs font-black uppercase tracking-wider">Paliwo Dnia</span>
            <Flame size={15} className="text-warning" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-text-primary tracking-tight font-mono">
              {kcal}
            </span>
            <span className="text-xs text-text-muted">kcal</span>
          </div>
          <p className="mt-1 text-2xs font-bold text-text-secondary">
            Zbilansowane pokrycie wydatku
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-solid/60 p-4 shadow-sm">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-3xs font-black uppercase tracking-wider">Nawodnienie Cel</span>
            <Droplet size={15} className="text-info" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-info tracking-tight font-mono">
              {hydrationGoal}
            </span>
            <span className="text-xs text-text-muted">ml</span>
          </div>
          <p className="mt-1 text-2xs font-bold text-text-secondary">
            Zapotrzebowanie dla regeneracji
          </p>
        </div>
      </div>

      {/* Macronutrient Architecture & Targets */}
      <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-4 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
          <Utensils size={14} className="text-primary" /> Architektura Makroskładników
        </h3>

        {/* Protein Target */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-2xs">
            <span className="font-bold text-text-primary">Białko (Budulec i Adaptacja)</span>
            <span className={`font-bold font-mono ${protein < proteinTarget ? 'text-warning' : 'text-success'}`}>
              {protein}g / {proteinTarget}g ({proteinPct}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${protein < proteinTarget ? 'bg-warning' : 'bg-success'}`}
              style={{ width: `${proteinPct}%` }}
            />
          </div>
          {protein < proteinTarget && (
            <p className="text-3xs text-warning flex items-center gap-1 mt-0.5">
              <AlertCircle size={10} /> Brak {proteinTarget - protein}g białka do pełnej regeneracji mięśniowej.
            </p>
          )}
        </div>

        {/* Carbs Target */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-2xs">
            <span className="font-bold text-text-primary">Węglowodany (Glikogen Biegowy)</span>
            <span className="font-bold font-mono text-text-secondary">
              {carbs}g / {carbsTarget}g ({carbsPct}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-info transition-all"
              style={{ width: `${carbsPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Caffeine Clearance & Cutoff Telemetry */}
      <div className="rounded-2xl border border-white/10 bg-surface-solid/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
            <Coffee size={14} className="text-warning" /> Metabolizm Kofeiny & Adenozyna
          </h3>
          <span className="text-3xs font-bold text-warning font-mono">
            {caffeineMg} mg we krwi
          </span>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-2xs text-text-secondary space-y-1.5">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-warning shrink-0" />
            <span>Godzina odcięcia kofeiny: <strong>14:00</strong></span>
          </div>
          <p className="text-3xs text-text-muted leading-relaxed">
            Czas półtrwania kofeiny wynosi 5–7h. Aktywna kofeina po godzinie 20:00 blokuje receptory adenozyny i spłyca fazę NREM 3 (sen głęboki) o 20–40%.
          </p>
        </div>
      </div>

      {/* Late Night Meal Biohacking Insight */}
      <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 space-y-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-danger flex items-center gap-1.5">
          <AlertCircle size={14} /> Wpływ pory kolacji na spadek tętna (Dip)
        </h4>
        <p className="text-2xs text-text-secondary leading-relaxed font-medium">
          Ostatni posiłek o godzinie <strong>22:25</strong> wymusza trawienie w pierwszej połowie nocy, opóźniając osiągnięcie najniższego tętna spoczynkowego (Lowest HR 45 bpm pojawiło się dopiero po 03:00 zamiast przed północą).
        </p>
      </div>
    </div>
  );
}
