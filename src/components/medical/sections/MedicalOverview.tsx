import { Calendar, HelpCircle, CheckCircle2, AlertOctagon, CheckSquare, ArrowRight } from 'lucide-react';
import { diffDaysFromToday, formatMedicalDate, type MedicalLabRow } from '../../../lib/health/medicalAnalytics';
import { Card } from '../../ui/Card';
import { Pressable } from '../../ui/ControlPrimitives';

interface MedicalOverviewProps {
  labs: MedicalLabRow[];
  onActionClick: (actionId: string) => void;
}

export default function MedicalOverview({ labs, onActionClick }: MedicalOverviewProps) {
  const latestPanel = labs.length > 0 ? labs[0] : null;
  const latestDateStr = latestPanel ? latestPanel.result_date : null;
  const daysAgo = latestDateStr ? diffDaysFromToday(latestDateStr) : null;

  // Filter latest panel rows vs historical rows
  const latestPanelRows = latestDateStr ? labs.filter(l => l.result_date === latestDateStr) : [];
  const latestOutOfRange = latestPanelRows.filter(l => l.flag && l.flag !== 'N' && l.flag !== 'normal').length;
  const totalOutOfRange = labs.filter(l => l.flag && l.flag !== 'N' && l.flag !== 'normal').length;

  // Panel completeness logic (check if basic markers exist across user tests AND their freshness)
  const requiredBasicKeys = ['hemoglobin', 'wbc', 'rbc', 'platelets', 'ferritin', 'tsh', 'glucose'];
  const userKeys = new Set(labs.map(l => l.marker_key));
  const hasMarker = (k: string) => {
    if (k === 'platelets') return userKeys.has('platelets') || userKeys.has('plt');
    return userKeys.has(k);
  };
  const missingKeys = requiredBasicKeys.filter(k => !hasMarker(k));

  // Freshness check: when was the full morphology/glucose tested?
  const oldestCoreLab = labs.find(l => ['hemoglobin', 'glucose', 'wbc'].includes(l.marker_key || ''));
  const daysSinceCore = oldestCoreLab?.result_date ? diffDaysFromToday(oldestCoreLab.result_date) : null;
  const isCoreOutdated = daysSinceCore != null && daysSinceCore > 365;

  const completeness = isCoreOutdated
    ? 'Wygasła / Do odświeżenia'
    : missingKeys.length === 0
    ? 'Kompletna'
    : missingKeys.length <= 2
    ? 'Dobra'
    : 'Wymaga uzupełnienia';

  const completenessDetail = isCoreOutdated
    ? `Morfologia i biochemia: ${daysSinceCore} dni (${oldestCoreLab?.result_date})`
    : missingKeys.length === 0
    ? 'Wszystkie kluczowe markery zbadane'
    : `Brakujące: ${missingKeys.length}`;

  const completenessSubtext = isCoreOutdated
    ? 'Wymagany retest morfologii i lipidogramu (brak ApoB/HbA1c)'
    : missingKeys.length === 0
    ? 'Baza danych pokrywa pełną morfologię i biochem'
    : 'Zalecane uzupełnienie w kolejnym panelu';

  return (
    <div className="space-y-6">
      <div className="border-b border-border-custom/50 pb-3">
        <h2 className="text-lg font-black uppercase font-display">1. Przegląd Stanu Zdrowia</h2>
        <p className="text-2xs text-text-muted mt-0.5">Podstawowy stan dokumentów, kompletności i pilnych spraw</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Freshness Card */}
        <Card variant="outline" padding="1rem" className="flex flex-col justify-between h-36 bg-background/30">
          <div>
            <div className="flex items-center gap-1.5 text-2xs font-black uppercase text-text-muted tracking-wider">
              <Calendar size={12} className="text-primary" />
              Aktualność paneli
            </div>
            <p className="text-sm font-bold text-text-primary mt-2">
              {latestDateStr ? formatMedicalDate(latestDateStr) : 'Brak danych'}
            </p>
            {daysAgo != null && (
              <p className="text-xs text-text-muted font-medium mt-0.5">
                {daysAgo === 0 ? 'dzisiaj' : `${daysAgo} dni temu`} · {latestPanelRows.length} markerów
              </p>
            )}
          </div>
          <p className="text-3xs text-text-muted">Optymalna częstotliwość badania: co 6 miesięcy</p>
        </Card>

        {/* Completeness Card */}
        <Card variant="outline" padding="1rem" className="flex flex-col justify-between h-36 bg-background/30">
          <div>
            <div className="flex items-center gap-1.5 text-2xs font-black uppercase text-text-muted tracking-wider">
              <HelpCircle size={12} className="text-primary" />
              Kompletność profilu
            </div>
            <p className={`text-sm font-bold mt-2 ${isCoreOutdated ? 'text-warning' : 'text-text-primary'}`}>
              {completeness}
            </p>
            <p className="text-xs text-text-muted font-medium mt-0.5">
              {completenessDetail}
            </p>
          </div>
          <p className="text-3xs text-text-muted">
            {completenessSubtext}
          </p>
        </Card>

        {/* Out of Range Card */}
        <Card variant="outline" padding="1rem" className="flex flex-col justify-between h-36 bg-background/30">
          <div>
            <div className="flex items-center gap-1.5 text-2xs font-black uppercase text-text-muted tracking-wider">
              {latestOutOfRange > 0 ? (
                <AlertOctagon size={12} className="text-warning" />
              ) : (
                <CheckCircle2 size={12} className="text-primary" />
              )}
              Odchylenia laboratoryjne
            </div>
            <p className="text-sm font-bold text-text-primary mt-2">
              {latestOutOfRange === 0 ? (
                <span className="text-primary">Najnowszy panel: {latestPanelRows.length}/{latestPanelRows.length} w normie</span>
              ) : (
                <span>{latestOutOfRange} poza zakresem</span>
              )}
            </p>
            <p className="text-xs text-text-muted font-medium mt-0.5">
              {totalOutOfRange > 0 ? `${totalOutOfRange} odchyleń w historii badań` : 'Brak odchyleń w historii'}
            </p>
          </div>
          <p className="text-3xs text-text-muted">
            {latestOutOfRange === 0
              ? `Ostatni panel badał tylko ${latestPanelRows.length} markerów (7 odchyleń z 2025 czeka na retest)`
              : 'Sprawdź wyniki oznaczone flagą'}
          </p>
        </Card>

        {/* Next Step / Action Card */}
        <Pressable
          onClick={() => onActionClick('retest')}
          className="rounded-2xl border border-dashed border-primary/30 hover:border-primary/60 bg-primary/[0.02] hover:bg-primary/[0.04] p-4 text-left ui-interactive cursor-pointer flex flex-col justify-between h-36"
        >
          <div>
            <div className="flex items-center gap-1.5 text-2xs font-black uppercase text-primary tracking-wider">
              <CheckSquare size={12} />
              Następny krok
            </div>
            <p className="text-sm font-black text-text-primary mt-2">
              Zaplanuj kolejny panel badań
            </p>
          </div>
          <div className="flex items-center gap-1 text-2xs font-black text-primary uppercase">
            Przejdź do planu <ArrowRight size={10} />
          </div>
        </Pressable>
      </div>
    </div>
  );
}
