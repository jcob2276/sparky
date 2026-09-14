import { Calendar, ShieldCheck } from 'lucide-react';
import { Card } from '../../ui/Card';
import type { MedicalRecordSummary } from '../../../lib/health/medicalRecords';

interface MedicalPassportHeaderProps {
  summary: MedicalRecordSummary;
}

export default function MedicalPassportHeader({ summary }: MedicalPassportHeaderProps) {
  return (
    <section aria-labelledby="passport-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-3xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
            <ShieldCheck size={13} /> Paszport Zdrowia
          </span>
          <h2 id="passport-heading" className="text-2xl font-black font-display uppercase tracking-tight text-text-primary mt-1">
            Twój Obraz Zdrowia
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Fakty zebrane z wizyt lekarskich, raportów i badań laboratoryjnych — bez diagnozowania.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {summary.specialties.map((specialty) => (
            <span
              key={specialty}
              className="rounded-xl border border-border-custom bg-surface-2 px-3 py-1 text-2xs font-bold text-text-secondary"
            >
              {specialty}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card variant="surface" padding="1.25rem" className="flex flex-col justify-between">
          <div>
            <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Ostatni Wpis</span>
            <p className="mt-2 text-base font-bold text-text-primary truncate" title={summary.latestLabel ?? ''}>
              {summary.latestLabel ?? 'Brak wpisów'}
            </p>
          </div>
          <p className="mt-2 text-xs font-semibold text-primary flex items-center gap-1">
            <Calendar size={12} /> {summary.latestOn ?? 'Dodaj pierwsze zdarzenie'}
          </p>
        </Card>

        <Card variant="surface" padding="1.25rem" className="flex flex-col justify-between">
          <div>
            <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Ciągłość Danych</span>
            <p className="mt-2 text-2xl font-black text-text-primary">{summary.recordCount} zdarzeń</p>
          </div>
          <p className="mt-2 text-xs text-text-secondary font-semibold">
            {summary.specialtyCount} {summary.specialtyCount === 1 ? 'obszar opieki' : summary.specialtyCount < 5 ? 'obszary opieki' : 'obszarów opieki'}
          </p>
        </Card>

        <Card variant="surface" padding="1.25rem" className="flex flex-col justify-between">
          <div>
            <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Najbliższa Kontrola</span>
            <p className="mt-2 text-base font-bold text-text-primary">
              {summary.nextFollowUpOn ?? 'Brak zaplanowanych'}
            </p>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Na podstawie zaleceń profilaktycznych
          </p>
        </Card>
      </div>
    </section>
  );
}
