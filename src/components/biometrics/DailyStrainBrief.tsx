/**
 * @component DailyStrainBrief
 * @role Werdykt dnia po ludzku: pierścień regeneracji, nagłówek, jedno zdanie rady i jedno zdanie o tym, co ciągnie dzień w dół.
 * @usedBy DailyStrainCard
 */
import { buildReadinessBrief, type ReadinessInput, type ReasonTone } from '../../lib/biometrics/readinessPlain';
import { bandForScore } from '../../lib/biometrics/ouraScoreBands';

const RING_RADIUS = 44;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function RecoveryRing({ score }: { score: number | null | undefined }) {
  const value = score != null && Number.isFinite(score) ? score : null;
  const fraction = value == null ? 0 : Math.min(1, Math.max(0, value / 100));
  return (
    <div className="readiness-ring" role="img" aria-label={value == null ? 'Regeneracja: brak pomiaru' : `Regeneracja: ${Math.round(value)} na 100`}>
      <svg viewBox="0 0 100 100" className="readiness-ring-svg" focusable="false" aria-hidden="true">
        <circle className="readiness-ring-track" cx="50" cy="50" r={RING_RADIUS} fill="none" strokeWidth="8" />
        {value != null && (
          <circle className="readiness-ring-arc" data-band={bandForScore(value)} cx="50" cy="50" r={RING_RADIUS} fill="none" strokeWidth="8" strokeLinecap="round"
            transform="rotate(-90 50 50)" strokeDasharray={RING_LENGTH} strokeDashoffset={RING_LENGTH * (1 - fraction)} />
        )}
      </svg>
      <span className="readiness-ring-value">{value == null ? '—' : Math.round(value)}</span>
    </div>
  );
}

const TONE_TEXT: Record<ReasonTone, string> = {
  good: 'text-success',
  neutral: 'text-text-primary',
  watch: 'text-warning',
  bad: 'text-danger',
};

export default function DailyStrainBrief({ recoveryScore, ...input }: ReadinessInput & { recoveryScore?: number | null }) {
  const brief = buildReadinessBrief(input);

  return (
    <div className="relative z-[var(--z-raised)] space-y-3">
      <div className="flex items-center gap-4">
        <RecoveryRing score={recoveryScore} />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Regeneracja</p>
          <p className={`text-xl font-semibold leading-tight ${TONE_TEXT[brief.tone]}`}>{brief.headline}</p>
          <p className="mt-1 text-sm leading-snug text-text-secondary">{brief.advice}</p>
          {brief.drivers && <p className="mt-1.5 text-sm leading-snug text-text-primary">{brief.drivers}</p>}
        </div>
      </div>
    </div>
  );
}
