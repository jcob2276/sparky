import { FC, useState } from 'react';
import { InsiderTradeItem } from '../../lib/investments/investmentsApi';
import { PELOSI_TRADES_SEED } from '../../lib/investments/pelosiTradesSeed';
import { TRUMP_TRADES_SEED } from '../../lib/investments/trumpTradesSeed';
import { CONGRESS_SEED_EXTRA } from '../../lib/investments/congressSeedData';
import { PoliticiansTable } from './PoliticiansTable';
import Button from '../ui/Button';

interface Props {
  trades: InsiderTradeItem[];
}

interface PoliticianDef {
  id: string;
  label: string;
  party: string;
  description: string;
  filterKey: string;
}

const POLITICIANS: PoliticianDef[] = [
  { id: 'all', label: 'Wszyscy', party: '', description: '', filterKey: '' },
  {
    id: 'pelosi',
    label: 'Nancy Pelosi',
    party: 'D',
    filterKey: 'pelosi',
    description: 'Izba Reprezentantów, D-CA. Słynna z zakupów opcji Call LEAPS na spółki technologiczne — NVDA, GOOGL, MSFT, AVGO.',
  },
  {
    id: 'trump',
    label: 'Donald Trump',
    party: 'R',
    filterKey: 'trump',
    description: 'Prezydent USA. Główne pozycje: DJT (Trump Media), obligacje skarbowe T-Bills, fundusze ETF.',
  },
  {
    id: 'allen',
    label: 'R. Allen',
    party: 'R',
    filterKey: 'allen',
    description: 'Richard Allen, Izba Reprezentantów, R-GA. Zakup Broadcom ($AVGO) w sierpniu 2026.',
  },
  {
    id: 'biggs',
    label: 'S. Biggs',
    party: 'R',
    filterKey: 'biggs',
    description: 'Sheri Biggs, Izba Reprezentantów, R-SC. Zakup Alphabet ($GOOGL) w lipcu 2026.',
  },
  {
    id: 'tuberville',
    label: 'Tuberville',
    party: 'R',
    filterKey: 'tuberville',
    description: 'Tommy Tuberville, Senat USA, R-AL. Zakup Amazon ($AMZN).',
  },
  {
    id: 'kelly',
    label: 'M. Kelly',
    party: 'D',
    filterKey: 'kelly',
    description: 'Mark Kelly, Senat USA, D-AZ. Zakup Meta ($META).',
  },
];

const ALL_SEED: InsiderTradeItem[] = [
  ...PELOSI_TRADES_SEED,
  ...TRUMP_TRADES_SEED,
  ...CONGRESS_SEED_EXTRA,
].sort((a, b) => (b.transaction_date ?? '').localeCompare(a.transaction_date ?? ''));

function mergeAndSort(live: InsiderTradeItem[]): InsiderTradeItem[] {
  const out = [...live];
  for (const seed of ALL_SEED) {
    if (!out.find((t) => t.id === seed.id)) out.push(seed);
  }
  return out.sort((a, b) => (b.transaction_date ?? '').localeCompare(a.transaction_date ?? ''));
}

export const PoliticiansView: FC<Props> = ({ trades }) => {
  const [selectedId, setSelectedId] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');

  const liveFiltered = trades.filter(
    (t) => t.branch === 'congress' || t.branch === 'executive' || t.chamber
  );
  const merged = mergeAndSort(liveFiltered);

  const selectedPolitician = POLITICIANS.find((p) => p.id === selectedId);

  const filtered = merged.filter((t) => {
    if (selectedId !== 'all' && selectedPolitician?.filterKey) {
      if (!(t.filer_name ?? '').toLowerCase().includes(selectedPolitician.filterKey)) return false;
    }
    if (typeFilter !== 'all') {
      const isBuy =
        (t.transaction_type ?? '').toLowerCase().includes('buy') ||
        (t.transaction_type ?? '').toLowerCase().includes('purchase');
      if (typeFilter === 'buy' && !isBuy) return false;
      if (typeFilter === 'sell' && isBuy) return false;
    }
    return true;
  });

  const buys = filtered.filter(
    (t) =>
      (t.transaction_type ?? '').toLowerCase().includes('buy') ||
      (t.transaction_type ?? '').toLowerCase().includes('purchase')
  ).length;
  const sells = filtered.length - buys;
  const avgDelay = filtered.length > 0
    ? Math.round(filtered.reduce((s, t) => s + (t.days_to_file ?? 0), 0) / filtered.length)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-border-custom/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-primary/10 text-primary border border-primary/20">
                Ujawnienia STOCK Act
              </span>
              <span className="text-2xs font-mono text-text-secondary">
                Senat &amp; Izba Reprezentantów USA · Biały Dom
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Politycy USA (STOCK Act Disclosures)
            </h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-2xl leading-relaxed">
              {selectedPolitician?.description ||
                'Zgłoszone transakcje członków Kongresu i Senatu USA. Daty transakcji, daty ujawnienia, opóźnienie raportowania i linki do oryginalnych dokumentów.'}
            </p>
          </div>

          {/* KPI mini cards */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            <div className="p-3 rounded-2xl bg-surface border border-border-custom/70 text-right shadow-xs">
              <div className="text-2xs text-success font-medium">Kupno</div>
              <div className="text-xl font-black text-success font-mono mt-0.5">{buys}</div>
            </div>
            <div className="p-3 rounded-2xl bg-surface border border-border-custom/70 text-right shadow-xs">
              <div className="text-2xs text-danger font-medium">Sprzedaż</div>
              <div className="text-xl font-black text-danger font-mono mt-0.5">{sells}</div>
            </div>
            <div className="p-3 rounded-2xl bg-surface border border-border-custom/70 text-right shadow-xs">
              <div className="text-2xs text-text-secondary font-medium">Śr. opóźnienie</div>
              <div className="text-xl font-black text-text-primary font-mono mt-0.5">{avgDelay}d</div>
            </div>
          </div>
        </div>

        {/* Politician selector + type filter */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4">
          {POLITICIANS.map((p) => {
            const partyColor =
              p.party === 'D' ? 'text-info' : p.party === 'R' ? 'text-danger' : '';
            return (
              <Button
                key={p.id}
                size="sm"
                variant={selectedId === p.id ? 'primary' : 'secondary'}
                onClick={() => setSelectedId(p.id)}
                className="rounded-xl text-xs"
              >
                {p.party && <span className={`font-black mr-1 ${partyColor}`}>{p.party}</span>}
                {p.label}
              </Button>
            );
          })}

          <div className="ml-auto flex items-center gap-1.5">
            {(['all', 'buy', 'sell'] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={typeFilter === f ? 'primary' : 'secondary'}
                onClick={() => setTypeFilter(f)}
                className="rounded-xl text-xs"
              >
                {f === 'all' ? 'Wszystkie' : f === 'buy' ? '🟢 Kupno' : '🔴 Sprzedaż'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Chronological transactions table */}
      <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-border-custom/50 flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <span>🏛</span> Transakcje chronologicznie ({filtered.length})
          </h3>
          <a
            href="https://efts.house.gov/LATEST/search.json?submitted_ethics_filing_type=RFDA&filed_start_date=2026-01-01"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-primary hover:underline"
          >
            efts.house.gov ↗
          </a>
        </div>
        <PoliticiansTable trades={filtered} />
      </div>
    </div>
  );
};
