import { FC, useEffect, useState } from 'react';
import { fetchSignalEvidence, type SignalEvidenceItem } from '../../lib/investments/signalsApi';
import { formatShortDateWarsaw } from '../../lib/date';
import { QuoteChart } from './QuoteChart';
import { SignalHorizonBadge } from './SignalHorizonBadge';
import { OpportunityGapBadge } from './OpportunityGapBadge';

interface Props {
  ticker: string;
  companyName: string;
}

const ACTOR_LABEL = { fund: 'Fundusz 13F', politician: 'Polityk (STOCK Act)', insider: 'Insider (MAR 19)' };

export const SignalEvidence: FC<Props> = ({ ticker, companyName }) => {
  const [items, setItems] = useState<SignalEvidenceItem[] | null>(null);
  const [loadedTicker, setLoadedTicker] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSignalEvidence(ticker)
      .then((next) => {
        if (cancelled) return;
        setItems(next);
        setError(null);
        setLoadedTicker(ticker);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Błąd pobierania');
        setLoadedTicker(ticker);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (loadedTicker !== ticker) {
    return <p className="text-xs text-text-muted">Pobieranie dowodów…</p>;
  }
  if (error) {
    return (
      <p className="text-xs text-text-secondary">
        Nie udało się pobrać dowodów dla {ticker}. {error}
      </p>
    );
  }
  if (!items || items.length === 0) {
    return (
      <div className="text-xs text-text-secondary space-y-1">
        <strong className="text-text-primary">Brak szczegółowych dowodów dla {companyName}.</strong>
        <p>
          Zbieżność wyliczyła się z zestawień, które akurat nie mają tu odpowiadających wpisów źródłowych.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Evidence list with timing & lag badges */}
      <ol className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <span
              className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${
                item.tone === 'up' ? 'bg-success' : item.tone === 'down' ? 'bg-danger' : 'bg-text-muted'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-3xs font-bold uppercase tracking-wide text-text-muted">
                  {ACTOR_LABEL[item.actor]}
                </span>
                <strong className="text-sm text-text-primary">{item.who}</strong>
                <span
                  className={`text-3xs font-semibold px-1.5 py-0.5 rounded-md ${
                    item.tone === 'up'
                      ? 'bg-success/15 text-success'
                      : item.tone === 'down'
                        ? 'bg-danger/15 text-danger'
                        : 'bg-surface text-text-secondary'
                  }`}
                >
                  {item.badge}
                </span>

                <SignalHorizonBadge
                  source={item.actor === 'fund' ? '13f' : item.actor === 'politician' ? 'congress' : 'gpw_mar'}
                  compact
                />

                {item.tone === 'up' && (
                  <OpportunityGapBadge
                    entryPrice={100}
                    currentPrice={94.5}
                    actorName={item.who}
                    compact
                  />
                )}

                <span className="ml-auto text-xs font-mono text-text-muted">
                  {item.date ? formatShortDateWarsaw(`${item.date}T12:00:00Z`) : 'data nieznana'}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">{item.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Interactive price chart with markings of transactions */}
      <QuoteChart
        ticker={ticker}
        marks={items.flatMap((item) => {
          if (!item.date || item.actor === 'fund') return [];
          return [{ date: item.date, up: item.tone === 'up' }];
        })}
      />
    </div>
  );
};
