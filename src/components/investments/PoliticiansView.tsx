import { FC, useState } from 'react';
import { InsiderTradeItem } from '../../lib/investments/investmentsApi';
import { ORCA_SELECT_CAP } from '../../lib/investments/superinvestorsApi';
import { PoliticiansTable } from './PoliticiansTable';
import { PoliticianAlpha } from './PoliticianAlpha';
import { PoliticianDirectory } from './PoliticianDirectory';
import { useCongressDirectory } from './useCongressDirectory';
import Button from '../ui/Button';

type PartyFilter = 'all' | 'D' | 'R';

function isBuy(trade: InsiderTradeItem): boolean {
  const type = (trade.transaction_type ?? '').toLowerCase();
  return type.includes('buy') || type.includes('purchase');
}

function capLabel(value: number): string {
  return new Intl.NumberFormat('pl-PL').format(value);
}

export const PoliticiansView: FC = () => {
  const directory = useCongressDirectory();
  const [party, setParty] = useState<PartyFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [visible, setVisible] = useState(120);
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = directory.trades.filter((trade) => {
    if (party !== 'all' && trade.party !== party) return false;
    if (typeFilter === 'buy' && !isBuy(trade)) return false;
    if (typeFilter === 'sell' && isBuy(trade)) return false;
    return true;
  });
  const shown = filtered.slice(0, visible);
  const buys = filtered.filter(isBuy).length;
  const delays = filtered.map((trade) => trade.days_to_file).filter((days): days is number => days != null);
  const avgDelay = delays.length > 0 ? Math.round(delays.reduce((sum, days) => sum + days, 0) / delays.length) : 0;
  const windowLabel = capLabel(ORCA_SELECT_CAP);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-border-custom/50">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-primary/10 text-primary border border-primary/20">
                Ujawnienia STOCK Act
              </span>
              <span className="text-2xs font-mono text-text-secondary">
                {directory.loading ? 'pobieranie…' : `${directory.politicians.length} osób w rejestrze`}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Politycy USA (STOCK Act)
            </h2>
            <p className="text-xs text-text-secondary mt-1.5 max-w-2xl leading-relaxed">
              Każda osoba z publicznego rejestru STOCK Act, z wyszukiwarką. Demokraci to partia D, republikanie to partia R.
            </p>
            {directory.truncated && (
              <p className="text-xs text-text-secondary mt-2 max-w-2xl leading-relaxed">
                Rejestr ma {capLabel(directory.tradeTotal)} zgłoszeń. Widok „Wszyscy” pokazuje najnowsze {windowLabel}.
                Starsze wiersze są poza tym oknem. Wybór osoby pobiera jej zgłoszenia osobno.
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 shrink-0">
            <div className="p-3 rounded-2xl bg-surface border border-border-custom/70 text-right shadow-xs">
              <div className="text-2xs text-success font-medium">Kupno</div>
              <div className="text-xl font-black text-success font-mono mt-0.5">{buys}</div>
            </div>
            <div className="p-3 rounded-2xl bg-surface border border-border-custom/70 text-right shadow-xs">
              <div className="text-2xs text-danger font-medium">Sprzedaż</div>
              <div className="text-xl font-black text-danger font-mono mt-0.5">{filtered.length - buys}</div>
            </div>
            <div className="p-3 rounded-2xl bg-surface border border-border-custom/70 text-right shadow-xs">
              <div className="text-2xs text-text-secondary font-medium">Śr. opóźnienie</div>
              <div className="text-xl font-black text-text-primary font-mono mt-0.5">{avgDelay}d</div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-4">
          {([
            ['all', 'Wszyscy'],
            ['D', 'Demokraci'],
            ['R', 'Republikanie'],
          ] as const).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={party === id ? 'primary' : 'secondary'}
              onClick={() => {
                setParty(id);
                setVisible(120);
              }}
              className="rounded-xl text-xs"
            >
              {label}
            </Button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            {(['all', 'buy', 'sell'] as const).map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={typeFilter === filter ? 'primary' : 'secondary'}
                onClick={() => setTypeFilter(filter)}
                className="rounded-xl text-xs"
              >
                {filter === 'all' ? 'Wszystkie' : filter === 'buy' ? 'Kupno' : 'Sprzedaż'}
              </Button>
            ))}
          </div>
        </div>
        <PoliticianDirectory
          people={directory.politicians}
          party={party}
          selectedId={directory.personId}
          onSelect={(id) => {
            directory.setPersonId(id);
            setVisible(120);
            setSelected(null);
          }}
        />
      </div>
      {selected && (
        <PoliticianAlpha
          name={selected}
          trades={directory.trades.filter((trade) => trade.filer_name === selected)}
          onClose={() => setSelected(null)}
        />
      )}
      <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-border-custom/50 flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary">
            Transakcje ({filtered.length})
          </h3>
        </div>
        {directory.loading || directory.personLoading ? (
          <p className="p-8 text-center text-xs text-text-secondary">Pobieram zgłoszenia STOCK Act…</p>
        ) : shown.length === 0 ? (
          <p className="p-8 text-center text-xs text-text-secondary">
            Brak publicznych zgłoszeń STOCK Act dla tego filtra.
          </p>
        ) : (
          <PoliticiansTable trades={shown} onSelect={setSelected} />
        )}
        {shown.length < filtered.length && (
          <div className="p-4 border-t border-border-custom/50 text-center">
            <Button size="sm" variant="secondary" onClick={() => setVisible((count) => count + 120)}>
              Pokaż kolejne
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
