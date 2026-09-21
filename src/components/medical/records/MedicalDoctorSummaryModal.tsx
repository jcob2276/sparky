import { Printer, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import type { MedicalTimelineItem, MedicalRecordSummary } from '../../../lib/health/medicalRecords';
import type { MarkerSeries } from '../../../lib/health/medicalAnalytics';
import { getTodayWarsaw } from '../../../lib/date';

interface MedicalDoctorSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: MedicalRecordSummary;
  timeline: MedicalTimelineItem[];
  series: MarkerSeries[];
  userAge?: number | null;
}

function KeyMarkersTable({ markers }: { markers: MarkerSeries[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-custom bg-surface-1">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border-custom text-3xs font-black uppercase text-text-muted bg-surface-2">
            <th className="p-2.5">Parametr</th>
            <th className="p-2.5">Ostatni Wynik</th>
            <th className="p-2.5">Zakres Normy</th>
            <th className="p-2.5">Data Pomiaru</th>
            <th className="p-2.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-custom/40">
          {markers.map((m) => {
            const row = m.latest;
            const isAlert = row.flag && row.flag !== 'N' && row.flag !== 'normal';
            const normStr = row.ref_low != null && row.ref_high != null
              ? `${row.ref_low} – ${row.ref_high}`
              : row.ref_text || 'Standard';

            return (
              <tr key={m.marker_key} className="hover:bg-surface-2 print:hover:bg-transparent">
                <td className="p-2.5 font-bold">{m.marker_name}</td>
                <td className={`p-2.5 font-mono font-extrabold ${isAlert ? 'text-warning font-black' : ''}`}>
                  {row.value} {row.unit}
                </td>
                <td className="p-2.5 font-mono text-text-muted">{normStr}</td>
                <td className="p-2.5 text-text-muted">{row.result_date}</td>
                <td className="p-2.5">
                  {isAlert ? (
                    <span className="inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-3xs font-bold text-warning">
                      <AlertTriangle size={10} /> Poza zakresem
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-3xs font-bold text-success">
                      <CheckCircle2 size={10} /> W normie
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MedicalDoctorSummaryModal({
  isOpen,
  onClose,
  summary,
  timeline,
  series,
  userAge,
}: MedicalDoctorSummaryModalProps) {
  const today = getTodayWarsaw();

  const keyMarkerKeys = ['ferritin', 'tsh', 'glucose', 'testosterone_total', 'hgb', 'wbc', 'cholesterol_total', 'hdl', 'ldl', 'triglycerides', 'vitamin_d'];
  const keyMarkers = series.filter(
    (s) => keyMarkerKeys.includes(s.marker_key) || keyMarkerKeys.some((k) => s.marker_name.toLowerCase().includes(k)),
  );

  const outOfRange = series
    .flatMap((s) => s.history)
    .filter((row) => row.flag && row.flag !== 'N' && row.flag !== 'normal');

  const recentVisits = timeline.filter((item) => item.kind === 'visit' || item.documentType === 'visit').slice(0, 5);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Karta Zdrowia / Raport dla Lekarza"
      subtitle="Zestawienie kliniczne do konsultacji lekarskiej"
      size="xl"
    >
      <div className="medical-doc-print space-y-6 text-text-primary">
        <div className="flex items-center justify-between border-b border-border-custom pb-3 print:hidden">
          <p className="text-xs text-text-muted">
            Wygenerowano na podstawie bazy Sparky OS: <span className="font-bold text-text-primary">{today}</span>
          </p>
          <Button icon={<Printer size={15} />} onClick={() => window.print()} size="sm">
            Drukuj / Zapisz jako PDF
          </Button>
        </div>

        <div className="space-y-6 text-xs">
          <div className="rounded-xl border border-border-custom bg-surface-1 p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold uppercase tracking-tight">Karta Podsumowania Medycznego</h3>
                <p className="text-3xs text-text-muted mt-0.5">
                  Sparky Health Hub · Dane pacjenta do wglądu diagnostycznego
                </p>
              </div>
              <div className="text-right text-3xs text-text-muted">
                <p>Data raportu: <span className="font-bold text-text-primary">{today}</span></p>
                {userAge != null && <p>Wiek pacjenta: <span className="font-bold text-text-primary">{userAge} lat</span></p>}
                <p>Ostatnie badanie: <span className="font-bold text-text-primary">{summary.latestOn ?? '—'}</span></p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border-custom/50 pt-2.5">
              <span className="text-3xs font-bold text-text-muted uppercase mr-1">Obszary opieki:</span>
              {summary.specialties.map((s) => (
                <span key={s} className="rounded-md bg-surface-2 px-2 py-0.5 text-3xs font-semibold">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-2xs font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <FileText size={13} className="text-primary" />
              Ostatnie Wyniki Kluczowych Markerów Laboratoryjnych
            </h4>
            <KeyMarkersTable markers={keyMarkers} />
          </div>

          {outOfRange.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-2xs font-black uppercase tracking-wider text-warning flex items-center gap-1.5">
                <AlertTriangle size={13} />
                Zarejestrowane Odchylenia w Historii Badań ({outOfRange.length})
              </h4>
              <div className="rounded-xl border border-warning/20 bg-warning/[0.03] p-3 text-xs space-y-1.5">
                {outOfRange.slice(0, 6).map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between text-3xs">
                    <span className="font-bold text-text-primary">
                      {row.marker_name}: <span className="font-mono text-warning font-black">{row.value} {row.unit}</span>
                    </span>
                    <span className="text-text-muted">
                      {row.result_date} · Norma: {row.ref_low != null && row.ref_high != null ? `${row.ref_low} – ${row.ref_high}` : row.ref_text || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentVisits.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-2xs font-black uppercase tracking-wider text-text-muted">
                Ostatnie Wizyty i Zalecenia Specjalistyczne
              </h4>
              <div className="space-y-2">
                {recentVisits.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border-custom bg-surface-1 p-3 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-text-primary">{item.title}</span>
                      <span className="text-3xs text-text-muted">{item.occurredOn}</span>
                    </div>
                    {item.specialty && <span className="text-3xs text-primary font-bold">{item.specialty}</span>}
                    {item.summary && <p className="text-3xs text-text-secondary">{item.summary}</p>}
                    {item.recommendations && (
                      <p className="text-3xs font-semibold text-text-primary mt-1">
                        Zalecenia: {item.recommendations}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
