import { FC, useEffect, useState } from 'react';
import { fetchEspiReports, EspiReport } from '../../lib/investments/publicMarket';
import Input from '../ui/Input';

export const EspiFeedView: FC = () => {
  const [query, setQuery] = useState('');
  const [needle, setNeedle] = useState('');
  const [rows, setRows] = useState<EspiReport[]>([]);
  const [loadedNeedle, setLoadedNeedle] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setNeedle(query), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    fetchEspiReports(needle)
      .then((next) => {
        if (!active) return;
        setRows(next);
        setLoadedNeedle(needle);
      })
      .catch(() => {
        if (!active) return;
        setRows([]);
        setLoadedNeedle(needle);
      });
    return () => {
      active = false;
    };
  }, [needle]);

  return (
    <div className="space-y-4 animate-fade-in text-text-primary">
      <div className="border border-border-custom bg-surface px-4 py-3">
        <div className="text-3xs font-mono uppercase tracking-wider text-text-muted">ESPI / EBI · GPW</div>
        <h2 className="text-lg font-bold tracking-tight">Czytnik komunikatów</h2>
        <p className="text-xs text-text-secondary mt-1">
          Tytuł, data, kategoria i link do komunikatu na gpw.pl. Treść PDF nie jest w publicznym wierszu.
        </p>
        <div className="mt-3 max-w-sm">
          <Input
            type="text"
            size="sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj spółki, tickera, tytułu"
          />
        </div>
      </div>
      {loadedNeedle !== needle ? (
        <p className="text-xs font-mono text-text-muted">Pobieram komunikaty…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-text-secondary">Brak komunikatów dla tego zapytania.</p>
      ) : (
        <div className="border border-border-custom divide-y divide-border-custom/60">
          {rows.map((row) => (
            <a
              key={row.id}
              href={row.sourceUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 hover:bg-primary/5"
            >
              <div className="flex flex-wrap items-baseline gap-2 text-xs font-mono">
                <span className="font-bold">{row.ticker || '—'}</span>
                <span className="text-text-muted">{row.reportDate}</span>
                <span className="text-text-muted">{row.category}</span>
              </div>
              <div className="text-sm text-text-primary">{row.title}</div>
              <div className="text-3xs text-text-secondary truncate">{row.company}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
