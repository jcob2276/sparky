import { FolderKanban, CalendarDays, ArrowRight, Plus } from 'lucide-react';
import type { GrowthProjectItem } from '../../lib/growth/growth.types';
import { Pressable } from '../ui/ControlPrimitives';
import { getTodayWarsaw } from '../../lib/date';

interface Props {
  projects: GrowthProjectItem[];
  onNavigateToProjects: () => void;
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const today = new Date(`${getTodayWarsaw()}T12:00:00`);
  const target = new Date(`${date}T12:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function GrowthProjectsSection({ projects, onNavigateToProjects }: Props) {
  return (
    <div className="rounded-3xl border border-border-custom/80 bg-surface/70 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-border-custom/50 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-blue/10 text-accent-blue">
            <FolderKanban size={18} />
          </div>
          <div>
            <p className="text-2xs font-black uppercase tracking-widest text-text-muted">Kierunek & Projekty (SSOT)</p>
            <h3 className="text-sm font-bold text-text-primary">Aktywne Projekty Rozwojowe</h3>
          </div>
        </div>
        <Pressable
          onClick={onNavigateToProjects}
          className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          <span>Wszystkie w Kierunku</span>
          <ArrowRight size={13} />
        </Pressable>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-custom p-6 text-center space-y-3">
          <p className="text-xs text-text-muted">
            Brak aktywnych projektów w filarach Duch / Konto. Zgodnie z zasadą SSOT, każda większa umiejętność powinna być projektem w module Kierunek.
          </p>
          <Pressable
            onClick={onNavigateToProjects}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-black text-on-accent hover:bg-primary-hover transition-colors shadow-xs"
          >
            <Plus size={14} />
            <span>Dodaj projekt w Kierunku</span>
          </Pressable>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects.map((p) => {
            const remaining = daysUntil(p.deadline);
            return (
              <div
                key={p.id}
                onClick={onNavigateToProjects}
                className="cursor-pointer rounded-2xl border border-border-custom/60 bg-background/50 p-4 hover:border-primary/40 hover:bg-background/80 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-md bg-border-custom/60 px-2 py-0.5 text-3xs font-black uppercase tracking-wider text-text-muted">
                      {p.pillar === 'duch' ? 'Duch & Umysł' : p.pillar === 'konto' ? 'Konto & Warsztat' : 'Rozwój'}
                    </span>
                    {remaining !== null && (
                      <span className="flex items-center gap-1 text-2xs font-semibold text-text-muted">
                        <CalendarDays size={11} /> {remaining >= 0 ? `${remaining} dni` : `${Math.abs(remaining)} dni po terminie`}
                      </span>
                    )}
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-text-primary leading-snug">{p.name}</h4>
                  {p.goal && <p className="mt-1 text-xs text-text-muted line-clamp-2">{p.goal}</p>}
                </div>

                <div className="flex items-center justify-between border-t border-border-custom/40 pt-2.5 text-2xs text-text-muted">
                  <span>{p.openTasksCount} otwartych działań</span>
                  <span className="font-bold text-primary flex items-center gap-1">
                    Przejdź <ArrowRight size={11} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
