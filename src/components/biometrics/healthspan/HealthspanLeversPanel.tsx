import type { HealthspanLeverRow } from '../../../lib/healthspanCheckinsApi';
import Button from '../../ui/Button';

export default function HealthspanLeversPanel({
  levers,
  onDecision,
}: {
  levers: HealthspanLeverRow[];
  onDecision: (id: string, status: 'accepted' | 'completed' | 'dismissed') => void;
}) {
  const currentWeek = levers[0]?.week_start;
  const current = levers.filter((item) => item.week_start === currentWeek).slice(0, 3);
  const evaluated = levers.filter((item) => item.status === 'evaluated').slice(0, 3);
  if (!current.length && !evaluated.length) return null;
  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-surface-1 p-4">
      <div>
        <h3 className="text-sm font-bold text-white">Dźwignie tego tygodnia</h3>
        <p className="mt-1 text-xs text-text-muted">Maksymalnie trzy ruchy, rozliczane po zamknięciu tygodnia.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {current.map((lever, index) => (
          <article key={lever.id} className="rounded-xl bg-white/5 p-3">
            <p className="text-3xs font-black uppercase text-primary">#{index + 1} {lever.title}</p>
            <p className="mt-2 text-sm font-semibold text-white">{lever.target_label}</p>
            <p className="mt-1 text-xs text-text-muted">
              Start {lever.baseline_score ?? '—'} → cel {lever.target_score ?? '—'}
            </p>
            <div className="mt-3 flex gap-2">
              {lever.status === 'proposed' && (
                <>
                  <Button size="sm" variant="tonal" onClick={() => onDecision(lever.id, 'accepted')}>Biorę</Button>
                  <Button size="sm" variant="ghost" onClick={() => onDecision(lever.id, 'dismissed')}>Pomiń</Button>
                </>
              )}
              {lever.status === 'accepted' && (
                <Button size="sm" variant="tonal" onClick={() => onDecision(lever.id, 'completed')}>Wykonane</Button>
              )}
              {lever.status === 'completed' && <p className="text-xs font-bold text-success">Czeka na rozliczenie</p>}
            </div>
          </article>
        ))}
      </div>
      {evaluated.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          <p className="text-3xs font-black uppercase tracking-widest text-text-muted">Ostatnie rozliczenia</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {evaluated.map((lever) => (
              <span key={lever.id} className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-text-secondary">
                {lever.title}: {lever.outcome === 'success' ? 'sukces' : lever.outcome === 'fail' ? 'nie dowieziono' : 'brak danych'}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
