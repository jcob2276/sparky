import { FC } from 'react';
import { Zap, Clock, Hourglass } from 'lucide-react';

type SignalSourceType = 'gpw_mar' | 'congress' | '13f';

interface Props {
  source: SignalSourceType;
  className?: string;
  compact?: boolean;
}

export const SignalHorizonBadge: FC<Props> = ({
  source,
  className = '',
  compact = false,
}) => {
  if (source === 'gpw_mar') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-3xs font-semibold bg-success/15 text-success border border-success/30 ${className}`}
        title="Ujawnienia MAR art. 19 mają zaledwie 2-3 dni robocze opóźnienia. Idealne do natychmiastowej reakcji i swing-tradingu na GPW."
      >
        <Zap size={11} className="shrink-0" />
        <span>
          {compact ? 'MAR 19 · 2-3 dni' : '⚡ GPW MAR 19 · Opóźnienie 2-3 dni (reakcja na bieżąco)'}
        </span>
      </span>
    );
  }

  if (source === 'congress') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-3xs font-semibold bg-primary/15 text-primary border border-primary/30 ${className}`}
        title="STOCK Act nakłada obowiązek zgłoszenia do 45 dni. Dobre do wyłapywania średnioterminowych trendów polityczno-gospodarczych."
      >
        <Clock size={11} className="shrink-0" />
        <span>
          {compact ? 'Kongres · 30-45 dni' : '⏱ Kongres USA · Opóźnienie 30-45 dni (momentum)'}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-3xs font-semibold bg-text-muted/15 text-text-secondary border border-border-custom ${className}`}
      title="Raporty kwartalne 13F składane są do 45 dni po zakończeniu kwartału. To pozycje budowane przez Buffetta i fundusze na 2-5 lat."
    >
      <Hourglass size={11} className="shrink-0" />
      <span>
        {compact ? '13F · Kwartalne' : '⏳ Superinwestorzy 13F · Opóźnienie kwartalne (horyzont 2-5 lat)'}
      </span>
    </span>
  );
};
