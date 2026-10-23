import { AlertTriangle, ChevronRight } from 'lucide-react';
import type { MarkerSeries } from '../../../lib/health/medicalAnalytics';
import { Pressable } from '../../ui/ControlPrimitives';
import MedicalRangeGauge from './MedicalRangeGauge';

interface MedicalResultsCardsProps {
  items: Array<{ current: MarkerSeries['latest']; previous: MarkerSeries['prior'] }>;
  onSelectMarker: (markerKey: string) => void;
}

/** Układ mobilny wyników: jedna karta na marker, pełna nazwa w zawijanych liniach, bez poziomego przewijania. */
export default function MedicalResultsCards({ items, onSelectMarker }: MedicalResultsCardsProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-border-custom bg-background/30 px-4 py-8 text-center text-sm italic text-text-muted">
        Brak markerów spełniających kryteria filtrowania.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map(({ current }) => {
        const hasFlag = current.flag && current.flag !== 'N' && current.flag !== 'normal';
        return (
          <li key={current.id}>
            <Pressable
              onClick={() => onSelectMarker(current.marker_key)}
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-border-custom bg-background/30 p-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-start gap-1.5 text-sm font-bold leading-snug text-text-primary">
                  {hasFlag && <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />}
                  <span className="break-words">{current.marker_name}</span>
                </p>
                <p className="mt-0.5 whitespace-nowrap text-xs text-text-muted">{current.result_date}</p>
                <div className="mt-2">
                  <MedicalRangeGauge
                    value={current.value}
                    refLow={current.ref_low}
                    refHigh={current.ref_high}
                    refText={current.ref_text}
                    flag={current.flag}
                  />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-base font-extrabold tabular-nums ${hasFlag ? 'text-warning' : 'text-text-primary'}`}>{current.value}</p>
                <p className="text-xs font-semibold text-text-muted">{current.unit}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-text-muted" aria-hidden="true" />
            </Pressable>
          </li>
        );
      })}
    </ul>
  );
}
