import { FC, useState, useEffect } from 'react';
import {
  fetchAllSuperinvestors,
  fetchInvestorHoldings,
  SuperinvestorItem,
  LiveHoldingItem,
} from '../../lib/investments/superinvestorsApi';
import { InvestorHoldingsTable } from './InvestorHoldingsTable';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { notify } from '../../lib/notify';
import { Search } from 'lucide-react';

export const Investors13FView: FC = () => {
  const [investors, setInvestors] = useState<SuperinvestorItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [holdings, setHoldings] = useState<LiveHoldingItem[]>([]);
  const [search, setSearch] = useState('');
  const [loadingHoldings, setLoadingHoldings] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const list = await fetchAllSuperinvestors();
      if (!active) return;
      setInvestors(list);
      if (list.length > 0) {
        setSelectedId(list[0].id);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const currentInvestor = investors.find((inv) => inv.id === selectedId) || investors[0];

  useEffect(() => {
    if (!currentInvestor?.id) return;
    let active = true;
    (async () => {
      setLoadingHoldings(true);
      const data = await fetchInvestorHoldings(currentInvestor.id);
      if (!active) return;
      setHoldings(data);
      setLoadingHoldings(false);
    })();
    return () => {
      active = false;
    };
  }, [currentInvestor?.id]);

  const filteredInvestors = investors.filter((inv) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      inv.name.toLowerCase().includes(term) ||
      inv.fundName.toLowerCase().includes(term) ||
      inv.category.toLowerCase().includes(term)
    );
  });

  const handleExportCsv = () => {
    if (!currentInvestor) return;
    const headers = 'Ticker,Spółka,Udział_%,Wartość_USD,Liczba_akcji,Zmiana_QoQ\n';
    const rows = holdings
      .map(
        (h) =>
          `"${h.ticker}","${h.name}","${h.weightPercent.toFixed(2)}","${h.valueUsd}","${h.shares}","${h.changeType}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfel_13F_${currentInvestor.slug || currentInvestor.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify(`Wyeksportowano portfel ${currentInvestor.name} do CSV!`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in text-text-primary">
      {/* Header and Search for 59 Investors */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-success/15 text-success border border-success/30">
                Live SEC 13F-HR ({investors.length} superinwestorów)
              </span>
              <span className="text-2xs font-mono text-text-muted">100% otwarty dostęp</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight mt-1">
              Superinwestorzy & Fundusze z Wall Street
            </h2>
          </div>

          <div className="w-full sm:w-72">
            <Input
              type="text"
              placeholder="Szukaj inwestora (np. Buffett, Burry, Citadel)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs"
              icon={<Search size={14} />}
            />
          </div>
        </div>

        {/* 59 Investors Horizontal Pill Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 border-t border-border-custom/40">
          {filteredInvestors.map((inv) => {
            const isSelected = inv.id === currentInvestor?.id;
            return (
              <Button
                key={inv.id}
                size="sm"
                variant={isSelected ? 'primary' : 'secondary'}
                onClick={() => setSelectedId(inv.id)}
                className="rounded-xl shrink-0 text-xs font-semibold"
              >
                {inv.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Selected Investor Card */}
      {currentInvestor && (
        <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-custom/50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xs font-mono text-text-secondary">
                  CIK: {currentInvestor.cik} · Kategoria: {currentInvestor.category}
                </span>
              </div>
              <h3 className="text-2xl font-black text-text-primary tracking-tight">
                {currentInvestor.name}
              </h3>
              <div className="text-sm font-semibold text-primary">{currentInvestor.fundName}</div>
              <p className="text-xs text-text-secondary mt-1.5 max-w-3xl leading-relaxed">
                {currentInvestor.description}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border-custom/70 text-right shrink-0 shadow-xs">
              <div className="text-xs font-medium text-text-secondary">Źródło formularza</div>
              <div className="text-xl font-black text-text-primary font-mono mt-0.5">SEC 13F-HR</div>
              <div className="text-3xs text-text-muted mt-0.5">Oficjalny rejestr SEC</div>
            </div>
          </div>
        </div>
      )}

      {/* Holdings Table Subcomponent */}
      <InvestorHoldingsTable
        currentInvestor={currentInvestor}
        holdings={holdings}
        loadingHoldings={loadingHoldings}
        onExportCsv={handleExportCsv}
      />
    </div>
  );
};
