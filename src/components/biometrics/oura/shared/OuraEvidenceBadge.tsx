import type { EvidenceStrength } from '../../../../lib/biometrics/sleepDrivers/types';

const BADGE: Record<EvidenceStrength, { label: string; className: string }> = {
  confirmed: { label: 'Potwierdzone', className: 'border-success/30 bg-success/10 text-success' },
  probable: { label: 'Prawdopodobne', className: 'border-info/30 bg-info/10 text-info' },
  tentative: { label: 'Wstępne', className: 'border-warning/30 bg-warning/10 text-warning' },
  insufficient: { label: 'Za mało danych', className: 'border-white/10 bg-white/5 text-text-muted' },
};

/** Plakietka pewności zależności; jedno źródło etykiet i kolorów dla obu zakładek. */
export function OuraEvidenceBadge({ strength, n }: { strength: EvidenceStrength; n?: number }) {
  const { label, className } = BADGE[strength];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-semibold ${className}`}>
      {label}
      {n != null && <span className="font-normal">· {n} nocy</span>}
    </span>
  );
}
