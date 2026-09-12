import { FolderKanban, CheckCircle2, Clock, AlertOctagon, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../ui/Card';

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  goal: string | null;
  color: string | null;
  deadline: string | null;
  sense_status?: string | null;
}

interface MoveRow {
  id: string;
  title: string;
  status: string;
  completed_at: string | null;
  planned_for: string | null;
  project_id: string | null;
}

interface Props {
  projects: ProjectRow[];
  moves: MoveRow[];
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr.slice(0, 10)}T12:00:00Z`);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DesktopProjectsOverview({ projects, moves }: Props) {
  const inProgress = projects.filter((p) => p.status === 'in_progress');
  const active = projects.filter((p) => p.status === 'active');
  const blocked = projects.filter((p) => p.status === 'blocked');
  const done = projects.filter((p) => p.status === 'completed' || p.status === 'done');

  // Find next moves mapped by project_id
  const openMoves = moves.filter((m) => m.status !== 'completed' && m.status !== 'done');
  const nextMoveByProject: Record<string, string> = {};
  for (const m of openMoves) {
    if (m.project_id && !nextMoveByProject[m.project_id]) {
      nextMoveByProject[m.project_id] = m.title;
    }
  }

  return (
    <Card variant="surface" padding="1.25rem" className="space-y-4 border-border-custom bg-surface/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
            <FolderKanban size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Pulpit Projektów</h3>
            <p className="text-xs text-text-muted">
              Strategiczne kontenery wykonawcze, najbliższe ruchy i status realizacji
            </p>
          </div>
        </div>
        <Link
          to="/projekty"
          className="flex items-center gap-1.5 rounded-xl border border-border-custom bg-background/50 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
        >
          <span>Wszystkie projekty</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* Liczniki statusu */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="flex items-center justify-center gap-1 text-2xs font-bold uppercase tracking-wider text-primary">
            <Clock size={11} /> W toku
          </p>
          <p className="mt-1 text-2xl font-light text-text-primary">{inProgress.length}</p>
          <p className="mt-0.5 text-2xs text-text-muted">aktywny fokus</p>
        </div>

        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="text-2xs font-bold uppercase tracking-wider text-info">Aktywne</p>
          <p className="mt-1 text-2xl font-light text-text-primary">{active.length}</p>
          <p className="mt-0.5 text-2xs text-text-muted">w buforze sprintu</p>
        </div>

        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="flex items-center justify-center gap-1 text-2xs font-bold uppercase tracking-wider text-danger">
            <AlertOctagon size={11} /> Zablokowane
          </p>
          <p className={`mt-1 text-2xl font-light ${blocked.length > 0 ? 'text-danger' : 'text-text-primary'}`}>
            {blocked.length}
          </p>
          <p className="mt-0.5 text-2xs text-text-muted">{blocked.length > 0 ? 'wymaga decyzji' : 'brak tarcia'}</p>
        </div>

        <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
          <p className="flex items-center justify-center gap-1 text-2xs font-bold uppercase tracking-wider text-success">
            <CheckCircle2 size={11} /> Zrealizowane
          </p>
          <p className="mt-1 text-2xl font-light text-text-primary">{done.length}</p>
          <p className="mt-0.5 text-2xs text-text-muted">dowiezione artefakty</p>
        </div>
      </div>

      {/* Lista aktywnych projektów */}
      <div className="space-y-2">
        <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Priorytety sprintu</p>
        {projects.length === 0 ? (
          <p className="text-xs text-text-muted py-2">Brak aktywnych projektów w bazie.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {projects.slice(0, 6).map((project) => {
              const remaining = daysUntil(project.deadline);
              const nextMove = nextMoveByProject[project.id];
              return (
                <div
                  key={project.id}
                  className="rounded-xl border border-border-custom/60 bg-surface-2/30 p-3 hover:border-border-focus transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">{project.name}</p>
                      {project.goal && (
                        <p className="text-3xs text-text-secondary truncate mt-0.5">{project.goal}</p>
                      )}
                    </div>
                    {remaining != null && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-3xs font-semibold ${
                        remaining < 0 ? 'bg-danger/15 text-danger' : remaining <= 7 ? 'bg-warning/15 text-warning' : 'bg-surface-solid text-text-muted'
                      }`}>
                        {remaining < 0 ? `${Math.abs(remaining)}d po terminie` : `${remaining}d do końca`}
                      </span>
                    )}
                  </div>

                  {nextMove && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-background/40 px-2 py-1 text-2xs text-text-secondary">
                      <span className="font-semibold text-primary">Ruch:</span>
                      <span className="truncate">{nextMove}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
