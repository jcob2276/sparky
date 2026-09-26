import { FC, useEffect, useState } from 'react';
import { fetchSignalEvidence, type SignalEvidenceItem } from '../../lib/investments/signalsApi';
import { formatShortDateWarsaw } from '../../lib/date';
import { QuoteChart } from './QuoteChart';

interface Props {
  ticker: string;
  companyName: string;
}

const ACTOR_LABEL = { fund: 'Fundusz', politician: 'Polityk', insider: 'Insider' };

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
    <>
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3">
          <span
            className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${
              item.tone === 'up' ? 'bg-success' : item.tone === 'down' ? 'bg-danger' : 'bg-text-muted'
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
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
              <span className="ml-auto text-xs font-mono text-text-muted">
                {item.date ? formatShortDateWarsaw(`${item.date}T12:00:00Z`) : 'data nieznana'}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{item.detail}</p>
          </div>
        </li>
      ))}
    </ol>
    <QuoteChart
      ticker={ticker}
      marks={items.flatMap((item) => {
        if (!item.date || item.actor === 'fund') return [];
        return [{ date: item.date, up: item.tone === 'up' }];
      })}
    />
    </>
  );
};
