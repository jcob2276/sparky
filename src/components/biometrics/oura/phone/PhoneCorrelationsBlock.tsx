import { LineChart } from 'lucide-react';
import type { PhoneSleepInsights } from '@vanguard/domain';
import { correlationTitle, correlationVerdict } from './phoneSignalsText';

interface PhoneCorrelationsBlockProps {
  insights: PhoneSleepInsights;
}

/** Evening screen / light vs Oura sleep. Hidden behind a data threshold; every row shows n. */
export function PhoneCorrelationsBlock({ insights }: PhoneCorrelationsBlockProps) {
  return (
    <section className="space-y-2" aria-label="Ekran wieczorem a sen">
      <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
        <LineChart size={15} aria-hidden="true" /> Wieczór z telefonem a sen
        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-normal text-text-secondary">
          źródło: telefon + Oura · n = {insights.nights}
        </span>
      </h3>
      {insights.status === 'insufficient' ? (
        <p className="text-sm leading-6 text-text-muted">
          Za mało danych: potrzebuję {insights.needed} nocy z danymi telefonu i Oura, mam {insights.nights}. Do tego czasu
          nie pokazuję żadnych wniosków.
        </p>
      ) : (
        <ul className="space-y-1 text-sm leading-6 text-text-secondary">
          {insights.correlations.map((c) => (
            <li key={`${c.metric}-${c.outcome}`}>
              <span className="text-text-primary">{correlationTitle(c)}:</span> {correlationVerdict(c)} (r ={' '}
              {c.r.toFixed(2).replace('.', ',')}, n = {c.n})
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
