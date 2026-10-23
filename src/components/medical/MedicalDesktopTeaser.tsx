import { FolderHeart, AlertTriangle, ArrowUpRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMedicalData } from './hooks/useMedicalData';
import {
  buildMarkerSeries,
  diffDaysFromToday,
  formatMedicalDate,
  PRIORITY_CHART_MARKERS,
} from '../../lib/health/medicalAnalytics';
import { ValueCell } from './MedicalLabSections';
import { Card } from '../ui/Card';

interface FlaggedAlertProps {
  flaggedMarkers: ReturnType<typeof buildMarkerSeries>;
}

function FlaggedMarkersAlert({ flaggedMarkers }: FlaggedAlertProps) {
  if (flaggedMarkers.length === 0) return null;
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-2">
      <div className="flex items-center justify-between text-2xs">
        <span className="font-bold text-warning flex items-center gap-1.5">
          <AlertTriangle size={13} />
          <span>Poza normą ({flaggedMarkers.length}):</span>
        </span>
        <Link to="/badania/laboratorium" className="text-2xs font-semibold text-primary hover:underline">
          Otwórz laboratorium →
        </Link>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {flaggedMarkers.slice(0, 7).map((s) => (
          <span
            key={s.marker_key}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface border border-warning/30 max-w-full text-xs text-text-primary shadow-2xs"
          >
            <span className="min-w-0 break-words font-medium">{s.marker_name}</span>
            <strong className="text-warning">
              {s.latest.value} {s.latest.unit}
            </strong>
            {s.latest.flag && (
              <span className="text-2xs font-semibold px-1 rounded bg-warning/20 text-warning">
                {s.latest.flag === 'H' || s.latest.flag === 'high' ? '↑ wysoki' : s.latest.flag === 'L' || s.latest.flag === 'low' ? '↓ niski' : 'poza celem'}
              </span>
            )}
            {s.latest.result_date && (
              <span className="text-2xs text-text-muted font-mono" title={`Data pomiaru: ${s.latest.result_date}`}>
                {s.latest.result_date.slice(0, 7)}
              </span>
            )}
          </span>
        ))}
        {flaggedMarkers.length > 7 && (
          <span className="text-2xs text-text-muted self-center font-medium pl-1">
            +{flaggedMarkers.length - 7} kolejnych
          </span>
        )}
      </div>
    </div>
  );
}

export default function MedicalDesktopTeaser({ userId }: { userId: string }) {
  const { labs, loading } = useMedicalData(userId);
  const series = buildMarkerSeries(labs);
  const latestDate = labs[0]?.result_date ?? null;

  // Filter out of range / flagged markers
  const flaggedMarkers = series.filter(
    (s) => s.latest.flag != null && s.latest.flag !== '' && s.latest.flag !== 'N' && s.latest.flag !== 'normal'
  );

  const preview = PRIORITY_CHART_MARKERS.map((k) => series.find((s) => s.marker_key === k))
    .filter(Boolean)
    .slice(0, 6);

  const staleFlagged = flaggedMarkers.filter((s) => {
    const age = s.latest.result_date ? diffDaysFromToday(s.latest.result_date) : null;
    return age != null && age > 365;
  }).length;

  return (
    <Card variant="surface" className="bg-surface/30 border-border-custom space-y-4" padding="1.25rem">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-error/20 bg-error/10 p-2 text-error">
            <FolderHeart size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Badania</h3>
            {latestDate && !loading ? (
              <p className="text-xs text-text-muted">
                Ostatni panel: <strong className="text-text-secondary">{formatMedicalDate(latestDate)}</strong>
                {staleFlagged > 0 && (
                  <> · <span className="font-medium text-warning">{staleFlagged} {staleFlagged === 1 ? 'wynik poza normą jest' : 'wyników poza normą jest'} sprzed ponad roku — czas na retest</span></>
                )}
              </p>
            ) : (
              <p className="text-xs text-text-muted">Wyniki badań krwi i dokumenty</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/badania"
            className="flex items-center gap-1.5 rounded-xl border border-border-custom bg-background/50 px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            <FileText size={13} />
            <span>Dokumenty</span>
          </Link>
          <Link
            to="/badania/laboratorium"
            className="flex items-center gap-1.5 rounded-xl border border-error/30 bg-error/10 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/20 transition-colors"
          >
            <span>Laboratorium</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="h-28 animate-pulse rounded-xl bg-border-custom/30" />
      ) : series.length === 0 ? (
        <div className="rounded-xl border border-border-custom bg-background/40 p-4 text-center">
          <p className="text-xs text-text-muted">Brak wyników badań w bazie danych.</p>
          <Link to="/badania" className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline">
            + Dodaj pierwsze wyniki badań (PDF lub ręcznie)
          </Link>
        </div>
      ) : (
        <>
          <FlaggedMarkersAlert flaggedMarkers={flaggedMarkers} />

          {/* Siatka kluczowych markerów */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-2xs font-bold tracking-normal text-text-muted">Kluczowe markery laboratoryjne</p>
              <Link to="/badania/laboratorium" className="text-2xs text-text-muted hover:text-primary transition-colors">
                Wszystkie markery →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {preview.map((s) => (
                <div
                  key={s!.marker_key}
                  className="rounded-xl border border-border-custom bg-background/40 px-3 py-2.5 flex flex-col justify-between hover:border-border-focus transition-colors"
                >
                  <p className="text-xs font-semibold leading-snug text-text-secondary line-clamp-2 break-words" title={s!.marker_name}>
                    {s!.marker_name}
                  </p>
                  <div className="mt-1.5">
                    <ValueCell row={s!.latest} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
