import { BellRing } from 'lucide-react';
import { MIN_INTERRUPTION_DAYS, type InterruptionSummary } from '@vanguard/domain';
import { INTERRUPTION_LEVEL_LABEL } from './phoneSignalsText';

interface PhoneInterruptionsBlockProps {
  interruptions: InterruptionSummary;
}

/** Notifications per waking hour (counts only, never content) and which apps are worth muting. */
export function PhoneInterruptionsBlock({ interruptions }: PhoneInterruptionsBlockProps) {
  const { days, perHourAvg, level, topApps, muteSuggestions, totalPerDayAvg } = interruptions;
  return (
    <section className="space-y-2" aria-label="Przerwania z powiadomień">
      <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <BellRing size={15} aria-hidden="true" /> Przerwania
        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-normal text-text-secondary">
          źródło: liczniki powiadomień · n = {days} {days === 1 ? 'dzień' : 'dni'}
        </span>
      </h3>
      {perHourAvg !== null && level !== null ? (
        <div className="space-y-1 text-sm leading-6 text-text-secondary">
          <p>
            <span className="text-text-primary">{perHourAvg.toLocaleString('pl-PL')} powiadomień na godzinę</span> (
            {INTERRUPTION_LEVEL_LABEL[level]}), ok. {totalPerDayAvg} dziennie, liczone od pobudki, ostatnie 14 dni.
          </p>
          {topApps.length > 0 && (
            <p>
              Najwięcej: {topApps.map((a) => `${a.name} ${a.perDay}/dzień (${a.sharePct}%)`).join(', ')}.
            </p>
          )}
          {muteSuggestions.length > 0 ? (
            <p className="text-text-primary">
              Do wyciszenia w pierwszej kolejności: {muteSuggestions.map((a) => a.name).join(', ')}.
            </p>
          ) : (
            <p className="text-xs text-text-muted">Żadna aplikacja nie przekracza progu 8 powiadomień dziennie i 10% udziału.</p>
          )}
        </div>
      ) : (
        <p className="text-sm leading-6 text-text-muted">
          Wskaźnik pojawi się po {MIN_INTERRUPTION_DAYS} dniach z licznikami powiadomień (masz {days}). Włącz
          „Powiadomienia” w Ustawienia → Dane z telefonu i przyznaj dostęp do powiadomień.
        </p>
      )}
    </section>
  );
}
