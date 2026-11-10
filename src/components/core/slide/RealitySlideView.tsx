import { Compass, Pencil } from 'lucide-react';
import { slideAgeDays, type RealitySlide } from '../../../lib/realitySlide';
import Button from '../../ui/Button';
import IconButton from '../../ui/IconButton';
import DataStateNotice from '../DataStateNotice';
import Skeleton from '../../ui/Skeleton';

interface RealitySlideViewProps {
  slide: RealitySlide | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onEdit: () => void;
}

/** Slajd: deklaracja użytkownika. Bez oceny i bez orzekania, że się spełnia. */
export function RealitySlideView({ slide, loading, error, onRetry, onEdit }: RealitySlideViewProps) {
  if (loading) return <Skeleton variant="card" lines={3} />;
  if (error) {
    return (
      <div className="space-y-2">
        <DataStateNotice tone="warning" title="Nie udało się wczytać slajdu"
          detail="Twoja deklaracja jest bezpieczna. Ponów odczyt przed edycją." />
        <Button variant="outline" onClick={onRetry}>Ponów odczyt</Button>
      </div>
    );
  }
  if (!slide) {
    return (
      <section className="rounded-[var(--radius-grouped)] border border-dashed border-border-custom/70 p-5">
        <div className="flex items-start gap-3">
          <Compass className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" aria-hidden />
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-semibold text-text-primary">Dokąd zmierzasz?</h3>
            <p className="text-sm text-text-secondary">
              Opisz wariant, który wybierasz, i do trzech kroków, które go budują. To Twoja deklaracja.
            </p>
          </div>
        </div>
        <Button className="mt-4 min-h-11 w-full" onClick={onEdit}>Ustaw slajd</Button>
      </section>
    );
  }
  const age = slideAgeDays(slide.created_at);
  return (
    <section className="ui-surface-lift rounded-[var(--radius-grouped)] border border-border-custom/60 bg-surface-solid/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-text-secondary">
          Slajd · wybrany {age === 0 ? 'dziś' : `${age} dn. temu`}
        </p>
        <IconButton icon={<Pencil className="h-4 w-4" aria-hidden />} label="Zmień slajd" size="sm" onClick={onEdit} />
      </div>
      <h3 className="mt-1 font-display text-xl font-semibold leading-snug tracking-tight text-text-primary">{slide.title}</h3>
      {slide.statement && <p className="mt-2 text-sm leading-relaxed text-text-secondary">{slide.statement}</p>}
      {slide.process_steps.length > 0 && (
        <ul className="mt-4 divide-y divide-border-custom/50 border-t border-border-custom/50">
          {slide.process_steps.map(step => (
            <li key={step} className="py-2 text-sm text-text-primary">{step}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
