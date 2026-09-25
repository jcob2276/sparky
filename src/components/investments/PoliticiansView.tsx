import { FC, useState } from 'react';
import { InsiderTradeItem } from '../../lib/investments/investmentsApi';
import { InvestmentsCard } from './InvestmentsCard';
import Button from '../ui/Button';

interface Props {
  trades: InsiderTradeItem[];
}

export const PoliticiansView: FC<Props> = ({ trades }) => {
  const [selectedPolitician, setSelectedPolitician] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');

  // Filter only US political disclosures (House, Senate, Executive)
  const politiciansTrades = trades.filter(
    (t) => t.branch === 'congress' || t.branch === 'executive' || t.chamber
  );

  const filtered = politiciansTrades.filter((t) => {
    if (selectedPolitician !== 'all') {
      const name = (t.filer_name || '').toLowerCase();
      if (!name.includes(selectedPolitician.toLowerCase())) return false;
    }
    if (typeFilter !== 'all') {
      const isBuy =
        (t.transaction_type || '').toLowerCase().includes('buy') ||
        (t.transaction_type || '').toLowerCase().includes('purchase');
      if (typeFilter === 'buy' && !isBuy) return false;
      if (typeFilter === 'sell' && isBuy) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Info Banner */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-custom/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-primary/10 text-primary border border-primary/20">
                Ujawnienia STOCK Act
              </span>
              <span className="text-2xs font-mono text-text-secondary">
                Senat & Izba Reprezentantów USA
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Politycy USA (STOCK Act Disclosures)
            </h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-3xl leading-relaxed">
              Zgłoszone transakcje członków Kongresu i Senatu USA. Prezentujemy oficjalne fakty zgłoszeń (daty, widełki kwot, opóźnienie w raportowaniu).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border-custom/70 text-right shrink-0 shadow-xs">
            <div className="text-xs font-medium text-text-secondary">Liczba transakcji</div>
            <div className="text-2xl font-black text-text-primary font-mono mt-0.5">
              {politiciansTrades.length}
            </div>
            <div className="text-3xs text-text-secondary mt-1">Ujawnienia z ostatnich miesięcy</div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-text-secondary mr-1">Osoba:</span>
            {[
              { id: 'all', label: 'Wszyscy' },
              { id: 'pelosi', label: 'Nancy Pelosi' },
              { id: 'trump', label: 'Donald Trump' },
            ].map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={selectedPolitician === p.id ? 'primary' : 'secondary'}
                onClick={() => setSelectedPolitician(p.id)}
                className="rounded-xl text-xs"
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-text-secondary mr-1">Typ:</span>
            <Button
              size="sm"
              variant={typeFilter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setTypeFilter('all')}
              className="rounded-xl text-xs"
            >
              Wszystkie
            </Button>
            <Button
              size="sm"
              variant={typeFilter === 'buy' ? 'primary' : 'secondary'}
              onClick={() => setTypeFilter('buy')}
              className="rounded-xl text-xs"
            >
              🟢 Kupno
            </Button>
            <Button
              size="sm"
              variant={typeFilter === 'sell' ? 'primary' : 'secondary'}
              onClick={() => setTypeFilter('sell')}
              className="rounded-xl text-xs"
            >
              🔴 Sprzedaż
            </Button>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((trade) => (
          <InvestmentsCard key={trade.id} trade={trade} />
        ))}
      </div>
    </div>
  );
};
