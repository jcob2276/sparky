import { Target, Compass, Heart, Feather, Landmark, Calendar } from 'lucide-react';
import { Card } from '../../ui/Card';
import type { GoalsRow, SprintGoalRow } from '../shell/useDesktopData';

interface Props {
  goals: GoalsRow | null;
  sprintGoals: SprintGoalRow[];
}

function daysUntil(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr.slice(0, 10)}T12:00:00Z`);
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d po terminie`;
  if (diff === 0) return 'dzisiaj';
  return `${diff}d`;
}

export default function DesktopGoalSpineCard({ goals, sprintGoals }: Props) {
  const activeSprintGoal = sprintGoals[0] ?? null;

  const pillars = [
    {
      id: 'cialo',
      label: 'Ciało & Biologia',
      icon: Heart,
      color: 'text-error',
      bgColor: 'bg-error/10 border-error/20',
      text: goals?.goal_cialo,
      date: goals?.date_cialo,
    },
    {
      id: 'duch',
      label: 'Duch & Umysł',
      icon: Feather,
      color: 'text-warning',
      bgColor: 'bg-warning/10 border-warning/20',
      text: goals?.goal_duch,
      date: goals?.date_duch,
    },
    {
      id: 'konto',
      label: 'Konto & Suwerenność',
      icon: Landmark,
      color: 'text-success',
      bgColor: 'bg-success/10 border-success/20',
      text: goals?.goal_konto,
      date: goals?.date_konto,
    },
  ];

  return (
    <Card variant="surface" padding="1.25rem" className="space-y-4 border-border-custom bg-surface/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-warning/20 bg-warning/10 p-2 text-warning">
            <Target size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Oś Celów Kierunkowych (Goal Spine)</h3>
            <p className="text-xs text-text-muted">
              Spójna linia intencji: Misja życiowa → Cel Sprintu → 3 Filary Strategiczne
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-border-custom bg-background/50 px-2.5 py-1 text-2xs text-text-muted">
          <Compass size={12} className="text-warning" />
          <span>Sprint 3 · Jesień</span>
        </div>
      </div>

      {/* Główny Cel Sprintu */}
      <div className="rounded-xl border border-warning/20 bg-warning/5 p-3.5">
        <p className="text-2xs font-bold uppercase tracking-wider text-warning">Cel bieżącego sprintu</p>
        <p className="mt-1 text-sm font-semibold text-text-primary leading-snug">
          {activeSprintGoal?.goal_text || 'Fundament energetyczny, redukcja tarcia i stabilizacja rutyn regeneracji'}
        </p>
      </div>

      {/* 3 Filary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          const remaining = daysUntil(pillar.date);
          return (
            <div
              key={pillar.id}
              className="rounded-xl border border-border-custom bg-background/40 p-3.5 space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon size={14} className={pillar.color} />
                    <span className="text-xs font-bold text-text-primary">{pillar.label}</span>
                  </div>
                  {remaining && (
                    <span className="flex items-center gap-1 text-3xs font-semibold text-text-muted">
                      <Calendar size={10} /> {remaining}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                  {pillar.text || 'Cel w trakcie kalibracji'}
                </p>
              </div>

              {pillar.date && (
                <p className="text-3xs text-text-muted border-t border-border-custom/40 pt-1.5">
                  Horyzont: <strong className="text-text-secondary">{pillar.date}</strong>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
