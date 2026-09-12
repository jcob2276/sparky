import { AlertTriangle, CheckCircle, FilePlus } from 'lucide-react';
import type { MedicalDocumentRow, MarkerSeries } from '../../../lib/health/medicalAnalytics';
import { diffDaysFromToday } from '../../../lib/health/medicalAnalytics';
import { Card } from '../../ui/Card';
import Button from '../../ui/Button';

interface MedicalHeaderProps {
  series: MarkerSeries[];
  documents: MedicalDocumentRow[];
  onImportClick: () => void;
  onViewResults: () => void;
  onPlanRetest: () => void;
}

export default function MedicalHeader({ series, documents, onImportClick, onViewResults, onPlanRetest }: MedicalHeaderProps) {
  const latestDateStr = series.reduce<string | null>(
    (latest, s) => (s.latest.result_date > (latest ?? '') ? s.latest.result_date : latest),
    null,
  );
  const daysAgo = latestDateStr ? diffDaysFromToday(latestDateStr) : null;

  const markerCount = series.length;
  const comparableCount = series.filter((s) => s.history.length >= 2).length;

  // Wymaga Uwagi analysis
  const warnings: string[] = [];

  // 1. Check for Ferritin consecutive drops
  const ferritin = series.find(
    (s) => s.marker_key === 'ferritin' || s.marker_name.toLowerCase().includes('ferryty'),
  );
  const [f0, f1, f2] = ferritin?.history ?? [];
  if (f0 && f1 && f2 && f0.value < f1.value && f1.value < f2.value) {
    warnings.push('Ferrytyna spadła w trzech kolejnych pomiarach');
  }

  // 2. Out of range lab values flag
  const outOfRange = series
    .flatMap((s) => s.history)
    .filter((row) => row.flag && row.flag !== 'N' && row.flag !== 'normal');
  if (outOfRange.length > 0) {
    warnings.push(`${outOfRange.length} wyniki poza zakresem referencyjnym laboratorium`);
  }

  // 3. Stale panel warning (> 180 days)
  if (daysAgo && daysAgo > 180) {
    warnings.push('Ostatni panel ma ponad 180 dni — dane mogą być nieaktualne');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-display uppercase tracking-tight">Badania i Analizy</h1>
          <p className="text-sm text-text-muted mt-1">Zaufane centrum dokumentacji zdrowotnej i decyzji</p>
        </div>
        <Button
          variant="outline"
          onClick={onImportClick}
          icon={<FilePlus size={15} />}
          className="self-start sm:self-center uppercase font-black text-xs tracking-wider border-primary/20 bg-primary/[0.02]"
        >
          Dodaj wyniki
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status of documentation */}
        <Card variant="surface" padding="1.25rem" className="md:col-span-1 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-2xs font-black uppercase tracking-wider text-text-muted">Stan Dokumentacji</span>
            {latestDateStr ? (
              <div className="mt-3">
                <p className="text-base font-bold text-text-primary leading-snug">
                  Ostatni panel: {latestDateStr}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {daysAgo} dni temu · {documents.length} plików PDF
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted mt-3">Brak zaimportowanych badań.</p>
            )}
          </div>
          {latestDateStr && (
            <div className="border-t border-border-custom/50 pt-3 flex gap-4 text-xs font-bold text-text-secondary">
              <span>{markerCount} markerów</span>
              <span>{comparableCount} porównywalnych</span>
            </div>
          )}
        </Card>

        {/* Wymaga Uwagi / Actionable Center */}
        <Card variant="surface" padding="1.25rem" className="md:col-span-2 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-2xs font-black uppercase tracking-wider text-text-muted">Wymaga Uwagi</span>
            {warnings.length > 0 ? (
              <ul className="space-y-2 pt-2">
                {warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-bold text-text-secondary">
                    <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 pt-2 text-xs text-text-secondary">
                <CheckCircle size={14} className="text-success shrink-0" />
                <span>Brak nowych zmian wymagających uwagi. Ostatni panel pozostaje wystarczająco aktualny.</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border-custom/50 flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={onViewResults} className="uppercase font-black text-2xs">
              Zobacz Wyniki
            </Button>
            <Button variant="ghost" size="sm" onClick={onPlanRetest} className="uppercase font-black text-2xs text-primary">
              Zaplanuj ponowne badanie
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
