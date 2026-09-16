import Button from '../ui/Button';
import { ControlTextarea } from '../ui/ControlPrimitives';
import React from 'react';
import Spinner from '../ui/Spinner';
import { Card } from '../ui/Card';
import { TrendingUp, Zap, RotateCcw, Lightbulb, AlertCircle } from 'lucide-react';
import type { MonthFacts } from '../../lib/growth/monthReview';

type MonthRecap = {
  narrative: string;
  longterm_motif: string | null;
  question: string;
  theme_suggestion?: string | null;
};

interface Props {
  monthStart: string;
  monthFacts: MonthFacts;
  recap: MonthRecap | null;
  recapLoading: boolean;
  patternNote: string;
  setPatternNote: (v: string) => void;
  leverageNote: string;
  setLeverageNote: (v: string) => void;
  correctionNote: string;
  setCorrectionNote: (v: string) => void;
  monthTheme: string;
  setMonthTheme: (v: string) => void;
  onComplete: () => void;
  completing: boolean;
}

function Textarea({
  value, onChange, placeholder, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <ControlTextarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-surface/60 border border-border-custom/60 rounded-2xl px-4 py-3 text-sm
        text-text-primary placeholder-text-muted/60 resize-none focus:outline-none
        focus:border-primary/50 focus:bg-surface transition-colors leading-relaxed"
    />
  );
}

function StatPill({ value, label, highlight }: { value: string; label: string; highlight?: 'good' | 'bad' | 'neutral' }) {
  const color = highlight === 'good'
    ? 'text-success'
    : highlight === 'bad'
      ? 'text-warning'
      : 'text-text-primary';
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border-custom/50 bg-surface/60 px-3 py-3 gap-0.5 text-center">
      <span className={`text-2xl font-black tracking-tight leading-none ${color}`}>{value}</span>
      <span className="text-2xs font-bold uppercase tracking-wide text-text-muted mt-1 leading-tight">{label}</span>
    </div>
  );
}

function ReflectionInput({
  icon: Icon,
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ElementType;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-primary shrink-0" />
        <span className="text-xs font-black uppercase tracking-widest text-text-primary">{label}</span>
      </div>
      <p className="text-xs text-text-muted pl-5">{hint}</p>
      <Textarea value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

export default function DirectionMonthlyMode({
  monthFacts,
  recap,
  recapLoading,
  patternNote,
  setPatternNote,
  leverageNote,
  setLeverageNote,
  correctionNote,
  setCorrectionNote,
  monthTheme,
  setMonthTheme,
  onComplete,
  completing,
}: Props) {
  const questionsOk =
    patternNote.trim().length > 0 &&
    leverageNote.trim().length > 0 &&
    correctionNote.trim().length > 0 &&
    monthTheme.trim().length > 0;

  const pillarLine = [
    monthFacts.pillarAverages.cialo != null && `C${monthFacts.pillarAverages.cialo}`,
    monthFacts.pillarAverages.duch != null && `D${monthFacts.pillarAverages.duch}`,
    monthFacts.pillarAverages.konto != null && `K${monthFacts.pillarAverages.konto}`,
  ].filter(Boolean).join(' · ');

  const winRate = monthFacts.powerListZ + monthFacts.powerListP > 0
    ? Math.round((monthFacts.powerListZ / (monthFacts.powerListZ + monthFacts.powerListP)) * 100)
    : null;

  return (
    <div className="space-y-6 pb-6 border-b border-border-custom mb-6">

      {/* Header strip */}
      <div className="rounded-2xl border border-warning/20 bg-warning/[0.06] px-4 py-3.5">
        <p className="text-2xs font-black uppercase tracking-[0.2em] text-warning">Przegląd miesiąca</p>
        <p className="mt-1 text-base font-bold text-text-primary capitalize">{monthFacts.monthLabel}</p>
        <p className="mt-1 text-xs text-text-secondary leading-relaxed">
          Warstwa między sprintem a tygodniem — zamknij miesiąc, potem planuj tydzień.
        </p>
      </div>

      {/* Stats grid — numbers are the hero */}
      <div className="space-y-2">
        <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Miesiąc w liczbach</p>
        <div className="grid grid-cols-3 gap-2">
          <StatPill
            value={`${monthFacts.weeksReviewed}/${monthFacts.weeksInMonth}`}
            label="tyg. z refleksją"
            highlight={monthFacts.weeksReviewed === 0 ? 'bad' : monthFacts.weeksReviewed >= monthFacts.weeksInMonth - 1 ? 'good' : 'neutral'}
          />
          <StatPill
            value={String(monthFacts.powerListZ)}
            label="dni Z"
            highlight={monthFacts.powerListZ >= 15 ? 'good' : monthFacts.powerListZ <= 3 ? 'bad' : 'neutral'}
          />
          <StatPill
            value={winRate != null ? `${winRate}%` : '—'}
            label="win rate"
            highlight={winRate != null && winRate >= 60 ? 'good' : winRate != null && winRate <= 20 ? 'bad' : 'neutral'}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatPill
            value={`${monthFacts.powerListDone}/${monthFacts.powerListPlanned}`}
            label="zadań done"
          />
          <StatPill value={String(monthFacts.kpiWeeksLogged)} label="tyg. z KPI" />
          <StatPill value={String(monthFacts.activeProjectCount)} label="projektów" />
        </div>
        {pillarLine && (
          <p className="text-2xs text-text-muted text-center pt-1">
            Filary: {pillarLine}
          </p>
        )}
      </div>

      {/* AI Narrative — full-width feature block */}
      <div className="rounded-2xl border border-border-custom/60 bg-surface/40 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border-custom/40">
          <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Jak wyglądał twój miesiąc</p>
        </div>

        {recapLoading && (
          <div className="flex items-center gap-3 px-4 py-5 text-text-muted">
            <Spinner size="sm" />
            <span className="text-sm">AI analizuje miesiąc — głosówki, sen, PowerList…</span>
          </div>
        )}

        {recap && (
          <div className="divide-y divide-border-custom/30">
            {/* Narrative */}
            <div className="px-4 py-4">
              <p className="text-sm text-text-primary leading-[1.7]">{recap.narrative}</p>
            </div>

            {/* Motif — only if present */}
            {recap.longterm_motif && (
              <div className="px-4 py-3 bg-warning/[0.05]">
                <p className="text-2xs font-black uppercase tracking-widest text-warning mb-1.5">Motyw powtarzający się</p>
                <p className="text-sm font-semibold text-text-primary">{recap.longterm_motif}</p>
              </div>
            )}

            {/* Question */}
            {recap.question && (
              <div className="px-4 py-3">
                <p className="text-2xs font-black uppercase tracking-widest text-text-muted mb-2">Pytanie otwierające</p>
                <p className="text-sm text-text-secondary italic leading-relaxed">„{recap.question}”</p>
              </div>
            )}
          </div>
        )}

        {!recapLoading && !recap && (
          <div className="px-4 py-5 text-sm text-text-muted italic">Podsumowanie AI pojawi się za chwilę…</div>
        )}
      </div>

      {/* Reflection questions */}
      <div className="space-y-5">
        <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Refleksja miesiąca</p>
        <ReflectionInput
          icon={AlertCircle}
          label="Wzorzec miesiąca"
          hint="Co się powtarzało — w działaniu, unikaniu, energii…"
          value={patternNote}
          onChange={setPatternNote}
          placeholder="Jaki wzorzec wracał przez cały miesiąc?"
        />
        <ReflectionInput
          icon={Zap}
          label="Największa dźwignia"
          hint="Jedna rzecz, która ciągnęła resztę do przodu."
          value={leverageNote}
          onChange={setLeverageNote}
          placeholder="Co było największą dźwignią?"
        />
        <ReflectionInput
          icon={RotateCcw}
          label="Korekta na następny miesiąc"
          hint="Jedna korekta — nie plan 4 tygodni."
          value={correctionNote}
          onChange={setCorrectionNote}
          placeholder="Co koryguję?"
        />
      </div>

      {/* Theme — single bold input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lightbulb size={13} className="text-primary shrink-0" />
            <p className="text-xs font-black uppercase tracking-widest text-text-primary">Temat miesiąca</p>
          </div>
          {recap?.theme_suggestion && (
            <span className="text-2xs font-bold text-primary/70 bg-primary/10 rounded-full px-2 py-0.5">
              AI zaproponowało ↓
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted pl-5">
          {recap?.theme_suggestion
            ? 'Propozycja AI na podstawie danych miesiąca — możesz ją zmienić.'
            : 'Jedna linia — horyzont na 4 tygodnie. Szczegóły zostają w planowaniu tygodniowym.'}
        </p>
        <Textarea
          value={monthTheme}
          onChange={setMonthTheme}
          placeholder='np. "Pipeline przed perfekcją" albo "Ciało jako fundament"'
          rows={2}
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        type="button"
        onClick={onComplete}
        disabled={!questionsOk || completing}
        loading={completing}
        className="w-full rounded-2xl"
      >
        {completing ? 'Zapisuję…' : 'Zamknij miesiąc → przejdź do tygodnia'}
      </Button>
    </div>
  );
}
