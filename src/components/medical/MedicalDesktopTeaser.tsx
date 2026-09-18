import { FolderHeart, AlertTriangle, ArrowUpRight, FileText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMedicalData } from './hooks/useMedicalData';
import {
  buildMarkerSeries,
  diffDaysFromToday,
  formatMedicalDate,
  freshnessLabel,
  labFreshness,
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
          <span>Markery poza zakresem referencyjnym ({flaggedMarkers.length}):</span>
        </span>
        <Link to="/badania/laboratorium" className="text-3xs font-semibold text-primary hover:underline">
          Otwórz laboratorium →
        </Link>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {flaggedMarkers.slice(0, 7).map((s) => (
          <span
            key={s.marker_key}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface border border-warning/30 text-2xs text-text-primary shadow-2xs"
          >
            <span className="font-medium truncate max-w-[130px]">{s.marker_name}</span>
            <strong className="text-warning">
              {s.latest.value} {s.latest.unit}
            </strong>
            {s.latest.flag && (
              <span className="text-3xs font-semibold px-1 rounded bg-warning/20 text-warning">
                {s.latest.flag === 'H' ? '↑ wysoki' : s.latest.flag === 'L' ? '↓ niski' : s.latest.flag}
              </span>
            )}
            {s.latest.result_date && (
              <span className="text-3xs text-text-muted font-mono" title={`Data pomiaru: ${s.latest.result_date}`}>
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
  const { labs, documents, loading } = useMedicalData(userId);
  const series = buildMarkerSeries(labs);
  const latestDate = labs[0]?.result_date ?? null;

  // Filter out of range / flagged markers
  const flaggedMarkers = series.filter(
    (s) => s.latest.flag != null && s.latest.flag !== '' && s.latest.flag !== 'N' && s.latest.flag !== 'normal'
  );

  const preview = PRIORITY_CHART_MARKERS.map((k) => series.find((s) => s.marker_key === k))
    .filter(Boolean)
    .slice(0, 6);

  // Group unique categories
  const categories = Array.from(new Set(series.map((s) => s.category).filter(Boolean)));

  return (
    <Card variant="surface" className="bg-surface/30 border-border-custom space-y-4" padding="1.25rem">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-error/20 bg-error/10 p-2 text-error">
            <FolderHeart size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-text-primary">Centrum Badań & Laboratorium</h3>
            {latestDate && !loading ? (
              <p className="text-xs text-text-muted">
                Ostatni panel: <strong className="text-text-secondary">{formatMedicalDate(latestDate)}</strong> (hormony/żelazo) ·{' '}
                <span className="text-warning font-medium">lipidy & CBC do retestu (z 2025-04)</span> · {documents.length} plików PDF
              </p>
            ) : (
              <p className="text-xs text-text-muted">Kartoteka medyczna, morfologia i panele diagnostyczne</p>
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
          {/* Liczniki diagnostyczne */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Wszystkie markery</p>
              <p className="mt-1 text-2xl font-light text-text-primary">{series.length}</p>
              <p className="mt-0.5 text-2xs text-text-muted">{categories.length} układów biologicznych</p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-2xs font-bold uppercase tracking-wider text-text-muted">
                {flaggedMarkers.length > 0 ? (
                  <span className="text-warning flex items-center gap-1"><AlertTriangle size={11} /> Poza normą</span>
                ) : (
                  <span className="text-success flex items-center gap-1"><CheckCircle2 size={11} /> W normie</span>
                )}
              </p>
              <p className={`mt-1 text-2xl font-light ${flaggedMarkers.length > 0 ? 'text-warning' : 'text-success'}`}>
                {flaggedMarkers.length}
              </p>
              <p className="mt-0.5 text-2xs text-text-muted">
                {flaggedMarkers.length > 0 ? 'wymaga uwagi lub kontroli' : 'wszystkie wyniki optymalne'}
              </p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Dokumentacja</p>
              <p className="mt-1 text-2xl font-light text-text-primary">{documents.length}</p>
              <p className="mt-0.5 text-2xs text-text-muted">zaimportowane panele</p>
            </div>

            <div className="rounded-xl border border-border-custom bg-background/40 p-3 text-center">
              <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Status panelu</p>
              <p className="mt-1 text-sm font-semibold text-text-primary truncate">
                {latestDate ? freshnessLabel(labFreshness(diffDaysFromToday(latestDate))) : 'brak danych'}
              </p>
              <p className="mt-0.5 text-2xs text-text-muted">
                {latestDate && diffDaysFromToday(latestDate) != null
                  ? `kolejny za ok. ${Math.max(0, 180 - (diffDaysFromToday(latestDate) ?? 0))} dni`
                  : 'retest co 6 mies.'}
              </p>
            </div>
          </div>

          <FlaggedMarkersAlert flaggedMarkers={flaggedMarkers} />

          {/* Siatka kluczowych markerów */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-2xs font-bold uppercase tracking-wider text-text-muted">Kluczowe markery laboratoryjne</p>
              <Link to="/badania/laboratorium" className="text-2xs text-text-muted hover:text-primary transition-colors">
                Wszystkie 35 markerów →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {preview.map((s) => (
                <div
                  key={s!.marker_key}
                  className="rounded-xl border border-border-custom bg-background/40 px-3 py-2.5 flex flex-col justify-between hover:border-border-focus transition-colors"
                >
                  <p className="text-2xs font-semibold text-text-secondary truncate" title={s!.marker_name}>
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
