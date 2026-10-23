import { Moon } from 'lucide-react';
import type { SleepSourceComparison } from '@vanguard/domain';
import { CONFIDENCE_LABEL, hm, signedMin } from './phoneSignalsText';

interface PhoneSleepBlockProps {
  sleep: SleepSourceComparison;
}

/** Sleep window inferred from screen-off + battery + steps, shown next to Oura with the source and n. */
export function PhoneSleepBlock({ sleep }: PhoneSleepBlockProps) {
  const latest = sleep.nights[0] ?? null;
  return (
    <section className="space-y-2" aria-label="Sen z telefonu">
      <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <Moon size={15} aria-hidden="true" /> Sen z telefonu
        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-normal text-text-secondary">
          źródło: telefon (ekran, bateria, kroki) · n = {sleep.nPhone} {sleep.nPhone === 1 ? 'noc' : 'nocy'}
        </span>
      </h3>
      {latest ? (
        <div className="space-y-1 text-sm leading-6 text-text-secondary">
          <p>
            <span className="text-text-primary">
              {latest.phone.bedtime}–{latest.phone.wake} · {hm(latest.phone.minutes)}
            </span>{' '}
            ({latest.date}, {CONFIDENCE_LABEL[latest.phone.confidence]}
            {latest.phone.charging ? ', telefon na ładowarce' : ''}, {latest.phone.steps} kroków w nocy)
          </p>
          {latest.oura ? (
            <p>
              Oura: {latest.oura.bedtime}–{latest.oura.wake} · różnica zasypiania {signedMin(latest.bedDiffMin)},
              pobudki {signedMin(latest.wakeDiffMin)}.
            </p>
          ) : (
            <p>Oura nie ma tej nocy — okno z telefonu jest jedynym źródłem.</p>
          )}
          {sleep.nBoth > 0 && sleep.meanAbsBedDiffMin !== null && sleep.meanAbsWakeDiffMin !== null && (
            <p className="text-xs text-text-muted">
              Zgodność z Oura: średnio ±{sleep.meanAbsBedDiffMin} min (zasypianie) i ±{sleep.meanAbsWakeDiffMin} min
              (pobudka), n = {sleep.nBoth}. To przybliżenie z aktywności telefonu, nie pomiar snu.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm leading-6 text-text-muted">
          Brak okna snu z telefonu. Potrzebna jest noc, w której telefon leżał z wygaszonym ekranem co najmniej 3 godziny
          (włącz „Ekran i odblokowania” w Ustawienia → Dane z telefonu).
        </p>
      )}
    </section>
  );
}
