import { Eye, ArrowUpRight, Ruler, Glasses, Sparkles, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { Pressable } from '../../ui/ControlPrimitives';
import { useVisionMeasurements } from '../../../lib/visionApi';

interface Props {
  onOpenOptics?: () => void;
}

export default function DesktopOpticsCard({ onOpenOptics }: Props) {
  const { data: measurements = [], isLoading } = useVisionMeasurements();

  // Find latest left and right measurements
  const leftMeasurements = measurements.filter((m) => m.eye_measured === 'left' || m.eye_measured === 'both');
  const rightMeasurements = measurements.filter((m) => m.eye_measured === 'right' || m.eye_measured === 'both');

  const latestLeft = leftMeasurements[leftMeasurements.length - 1] ?? null;
  const latestRight = rightMeasurements[rightMeasurements.length - 1] ?? null;

  const avgDistance = latestLeft && latestRight
    ? Math.round(((latestLeft.blur_distance_cm + latestRight.blur_distance_cm) / 2) * 10) / 10
    : latestLeft?.blur_distance_cm ?? latestRight?.blur_distance_cm ?? null;

  const avgDiopters = latestLeft && latestRight
    ? Math.round(((latestLeft.diopters + latestRight.diopters) / 2) * 100) / 100
    : latestLeft?.diopters ?? latestRight?.diopters ?? null;

  return (
    <Card variant="surface" padding="1.25rem" className="space-y-4 border-border-custom bg-surface/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-info/20 bg-info/10 p-2 text-info">
            <Eye size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Wzrok & EndMyopia</h3>
            <p className="text-xs text-text-muted">
              Pomiary krawędzi rozmycia, reedukacja akomodacji i redukcja pseudokrótkowzroczności
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onOpenOptics && (
            <Pressable
              onClick={onOpenOptics}
              className="flex items-center gap-1.5 rounded-xl border border-info/30 bg-info/10 px-3 py-1.5 text-xs font-semibold text-info hover:bg-info/20 transition-colors"
            >
              <span>Pomiar</span>
            </Pressable>
          )}
          <Link
            to="/optics"
            className="flex items-center gap-1.5 rounded-xl border border-border-custom bg-background/50 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <span>Kalkulator</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-border-custom/30" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-2xs font-bold uppercase tracking-wider text-text-muted">
                <Ruler size={11} /> Krawędź rozmycia
              </p>
              <p className="mt-1 text-2xl font-light text-text-primary">
                {avgDistance != null ? `${avgDistance} cm` : '—'}
              </p>
              <p className="mt-0.5 text-2xs text-text-muted">średnia obu oczu</p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-2xs font-bold uppercase tracking-wider text-info">
                <Glasses size={11} /> Wyliczona wada
              </p>
              <p className="mt-1 text-2xl font-light text-info">
                {avgDiopters != null ? `${avgDiopters > 0 ? `+${avgDiopters}` : avgDiopters} D` : '—'}
              </p>
              <p className="mt-0.5 text-2xs text-text-muted">-100 / odległość w cm</p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Oko lewe (OS)</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">
                {latestLeft ? `${latestLeft.diopters.toFixed(2)} D` : '—'}
              </p>
              <p className="mt-0.5 text-2xs text-text-muted">
                {latestLeft ? `${latestLeft.blur_distance_cm} cm rozmycia` : 'brak wpisu'}
              </p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Oko prawe (OD)</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">
                {latestRight ? `${latestRight.diopters.toFixed(2)} D` : '—'}
              </p>
              <p className="mt-0.5 text-2xs text-text-muted">
                {latestRight ? `${latestRight.blur_distance_cm} cm rozmycia` : 'brak wpisu'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-custom/50 bg-surface-2/40 px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-info shrink-0" />
              <span className="text-text-secondary">
                Zasada <strong>20-20-20</strong>: Co 20 minut spójrz na odległość 6 metrów przez 20 sekund, aby zresetować skurcz rzęskowy.
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-3xs font-bold uppercase tracking-widest text-success">
              <CheckCircle2 size={12} /> Aktywne skupienie
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
