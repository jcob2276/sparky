import { FC } from 'react';
import { Zap, Clock, Hourglass } from 'lucide-react';

type SignalSourceType = 'gpw_mar' | 'congress' | '13f' | 'insider';

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
  if (source === 'insider') return <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-3xs text-text-muted ${className}`}
    title="Dokument SEC Form 4. Datę transakcji i datę publikacji pokazujemy osobno.">
    SEC Form 4
  </span>;
  if (source === 'gpw_mar') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-3xs font-semibold bg-success/15 text-success border border-success/30 ${className}`}
        title="Ujawnienie MAR art. 19. Sprawdź datę transakcji i datę publikacji dokumentu."
      >
        <Zap size={11} className="shrink-0" />
        <span>
          {compact ? 'MAR 19' : 'GPW · MAR art. 19'}
        </span>
      </span>
    );
  }

  if (source === 'congress') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-3xs font-semibold bg-primary/15 text-primary border border-primary/30 ${className}`}
        title="Termin zgłoszenia: 30 dni od uzyskania informacji, najpóźniej 45 dni od transakcji. Rzeczywiste daty pokazujemy osobno."
      >
        <Clock size={11} className="shrink-0" />
        <span>
          {compact ? 'Kongres · termin do 45 dni' : 'Kongres USA · termin zgłoszenia do 45 dni'}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-3xs font-semibold bg-text-muted/15 text-text-secondary border border-border-custom ${className}`}
      title="13F pokazuje stan na koniec kwartału. Zmiana między raportami nie ujawnia daty transakcji ani horyzontu inwestora."
    >
      <Hourglass size={11} className="shrink-0" />
      <span>
        {compact ? '13F · Kwartalne' : 'Fundusze 13F · stan kwartalny'}
      </span>
    </span>
  );
};
