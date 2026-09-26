import { FC, useEffect, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { fetchRecentCongress } from '../../lib/investments/publicDisclosures';
import { fetchEspiReports, EspiReport } from '../../lib/investments/publicMarket';
import { fetchNamedForm4 } from '../../lib/investments/form4Public';
import { InsiderTradeItem } from '../../lib/investments/investmentsApi';

interface Props {
  watchlist: string[];
}

const SEEN_KEY = 'sparky_digest_seen_v1';

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

const MAIL_KEY = 'sparky_digest_mail_v1';

function openDigestMail(address: string, lines: string[]) {
  const subject = encodeURIComponent('Sparky · digest ujawnień');
  const body = encodeURIComponent(lines.slice(0, 24).join('\n'));
  const to = encodeURIComponent(address.trim());
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}

export const DisclosureDigest: FC<Props> = ({ watchlist }) => {
  const [congress, setCongress] = useState<InsiderTradeItem[]>([]);
  const [form4, setForm4] = useState<InsiderTradeItem[]>([]);
  const [espi, setEspi] = useState<EspiReport[]>([]);
  const [seen, setSeen] = useState<string[]>(() => readSeen());
  const [mail, setMail] = useState(() => localStorage.getItem(MAIL_KEY) ?? '');
  const watched = new Set(watchlist.map((ticker) => ticker.toUpperCase()));

  useEffect(() => {
    let active = true;
    Promise.all([fetchRecentCongress(8), fetchEspiReports(''), fetchNamedForm4()])
      .then(([trades, reports, insiders]) => {
        if (!active) return;
        const nextCongress = trades;
        const nextEspi = reports.slice(0, 8);
        const nextForm4 = insiders.slice(0, 8);
        setCongress(nextCongress);
        setEspi(nextEspi);
        setForm4(nextForm4);
        if (localStorage.getItem(SEEN_KEY) == null) {
          const ids = [
            ...nextCongress.map((trade) => trade.id),
            ...nextForm4.map((trade) => trade.id),
            ...nextEspi.map((report) => report.id),
          ];
          localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
          setSeen(ids);
        }
      })
      .catch(() => {
        if (!active) return;
        setCongress([]);
        setEspi([]);
        setForm4([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const lines = [
    ...congress.map((trade) => `${trade.transaction_date ?? ''} STOCK ${trade.filer_name} ${trade.transaction_type ?? ''} ${trade.ticker ?? ''}`),
    ...form4.map((trade) => `${trade.transaction_date ?? ''} FORM4 ${trade.filer_name} ${trade.transaction_type ?? ''} ${trade.ticker ?? ''}`),
    ...espi.map((report) => `${report.reportDate} ESPI ${report.ticker} ${report.title}`),
  ];
  const fresh = [
    ...congress.filter((trade) => !seen.includes(trade.id) && watched.has((trade.ticker ?? '').toUpperCase())),
    ...form4.filter((trade) => !seen.includes(trade.id) && watched.has((trade.ticker ?? '').toUpperCase())),
    ...espi.filter((report) => !seen.includes(report.id) && watched.has(report.ticker.toUpperCase())),
  ];

  return (
    <div className="border border-border-custom bg-surface p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold">Digest ujawnień</h3>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-xs font-mono text-primary"
          onClick={() => {
            const ids = [
              ...congress.map((trade) => trade.id),
              ...form4.map((trade) => trade.id),
              ...espi.map((report) => report.id),
            ];
            const next = [...new Set([...seen, ...ids])].slice(-400);
            localStorage.setItem(SEEN_KEY, JSON.stringify(next));
            setSeen(next);
            void navigator.clipboard.writeText(lines.join('\n'));
          }}
        >
          kopiuj i oznacz
        </Button>
      </div>
      <p className="text-3xs text-text-muted mb-2">
        {fresh.length > 0
          ? `${fresh.length} nowych pozycji z watchlisty.`
          : 'Brak nowych pozycji z watchlisty.'}
        {' '}Digest otwiera się w Twojej poczcie. Sparky nie trzyma serwera maili.
      </p>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="w-56">
          <Input
            type="email"
            size="sm"
            value={mail}
            placeholder="adres do digestu"
            onChange={(event) => {
              setMail(event.target.value);
              localStorage.setItem(MAIL_KEY, event.target.value);
            }}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-xs font-mono text-primary"
          onClick={() => openDigestMail(mail, lines)}
        >
          otwórz w poczcie
        </Button>
      </div>
      <ul className="space-y-1 text-xs font-mono">
        {congress.map((trade) => (
          <li key={trade.id}>
            {trade.transaction_date} · {trade.filer_name} · {trade.ticker} · {trade.transaction_type}
          </li>
        ))}
        {form4.map((trade) => (
          <li key={trade.id}>
            {trade.transaction_date} · Form 4 {trade.filer_name} · {trade.ticker}
          </li>
        ))}
        {espi.map((report) => (
          <li key={report.id}>
            {report.reportDate} · ESPI {report.ticker} · {report.title}
          </li>
        ))}
        {congress.length === 0 && espi.length === 0 && form4.length === 0 && <li className="text-text-muted">Pobieram digest…</li>}
      </ul>
    </div>
  );
};
