import { FC } from 'react';
import { DISCLOSURE_STREAM_ITEMS } from '../../lib/investments/disclosuresFeedData';
import { InsiderTradeItem } from '../../lib/investments/investmentsApi';
import { formatShortMonthLabel } from '../../lib/date';
import { Pressable } from '../ui/ControlPrimitives';
import Button from '../ui/Button';

// Computed once at module level — avoids impure calls inside JSX
const _now = new Date();
const _14dAgo = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate() - 14);
const DATE_RANGE_START = formatShortMonthLabel(_14dAgo);
const DATE_RANGE_END = formatShortMonthLabel(_now);

export const WatchlistBuilder: FC<{
  watchlist: string[];
  onToggle: (ticker: string) => void;
}> = ({ watchlist, onToggle }) => {
  const SUGGESTIONS = ['AMZN', 'AMAT', 'NBIS', 'CRH', 'EA', 'MDLN', 'STX', 'CRWV', 'TMO', 'ALAB'];

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-custom/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-text-primary">
              Zbuduj pierwszą watchlistę
            </span>
            <span className="px-2 py-0.5 rounded-full text-2xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              ({watchlist.length}/3)
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Dodaj co najmniej 3 spółki, aby śledzić ruchy polityków USA, funduszy 13F oraz szorty KNF.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((t) => {
          const isAdded = watchlist.includes(t);
          return (
            <Pressable
              key={t}
              onClick={() => onToggle(t)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                isAdded
                  ? 'bg-primary text-text-on-primary border-primary'
                  : 'bg-surface border-border-custom text-text-primary hover:border-primary/40'
              }`}
            >
              <span>${t}</span>
              <span className="text-2xs font-bold">{isAdded ? '✓' : '+'}</span>
            </Pressable>
          );
        })}
      </div>
    </div>
  );
};

export const SourceActivityCard: FC<{
  politiciansCount?: number;
  fundsCount?: number;
  insidersCount?: number;
  gpwShortsCount?: number;
  totalRecentEvents?: number;
}> = ({
  politiciansCount = 70,
  fundsCount = 5,
  insidersCount = 4205,
  gpwShortsCount = 11,
  totalRecentEvents = 4286,
}) => {
  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-text-muted">
            Aktywność źródeł (14 dni)
          </span>
          <div className="text-xl font-extrabold text-text-primary mt-0.5 font-mono tabular-nums">
            {totalRecentEvents.toLocaleString()} zdarzeń
          </div>
          <p className="text-3xs text-text-secondary">Ze wszystkich źródeł · zagregowane na żywo</p>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-surface border border-border-custom text-2xs font-mono text-text-secondary">
          {DATE_RANGE_START} — {DATE_RANGE_END}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <div className="p-3 rounded-2xl bg-surface border border-border-custom/60">
          <div className="text-2xs text-text-secondary">Politycy</div>
          <div className="text-lg font-bold font-mono text-text-primary mt-0.5">{politiciansCount}</div>
          <div className="text-3xs text-text-muted">STOCK Act</div>
        </div>
        <div className="p-3 rounded-2xl bg-surface border border-border-custom/60">
          <div className="text-2xs text-text-secondary">Fundusze 13F</div>
          <div className="text-lg font-bold font-mono text-text-primary mt-0.5">{fundsCount}</div>
          <div className="text-3xs text-text-muted">Aktywne fundusze</div>
        </div>
        <div className="p-3 rounded-2xl bg-surface border border-border-custom/60">
          <div className="text-2xs text-text-secondary">Insiderzy Form 4</div>
          <div className="text-lg font-bold font-mono text-text-primary mt-0.5">{insidersCount}</div>
          <div className="text-3xs text-text-muted">Akcje własne</div>
        </div>
        <div className="p-3 rounded-2xl bg-surface border border-border-custom/60">
          <div className="text-2xs text-text-secondary">Short GPW</div>
          <div className="text-lg font-bold font-mono text-danger mt-0.5">{gpwShortsCount}</div>
          <div className="text-3xs text-text-muted">KNF &ge; 0.5%</div>
        </div>
      </div>
    </div>
  );
};

export const DisclosureStreamWidget: FC<{
  trades?: InsiderTradeItem[];
  onViewAll: () => void;
}> = ({ trades = [], onViewAll }) => {
  // If dynamic trades exist, render real live transactions, otherwise fallback to seed feed
  const displayItems = trades.length > 0
    ? trades.slice(0, 8).map((t) => {
        const isPl = t.state === 'PL';
        const isStock = !isPl && (t.branch === 'senate' || t.branch === 'house' || Boolean(t.chamber));
        return {
          id: t.id,
          dateLabel: t.filing_date ? t.filing_date.slice(5) : 'Dziś',
          sourceType: isPl ? 'KNF / MAR' : isStock ? 'STOCK' : 'FORM 4',
          ticker: t.ticker || 'N/A',
          description: `${t.filer_name} · ${t.transaction_type} ${t.asset_name || ''}`,
          amountOrPercent: t.amount_label || (t.amount_high ? `$${t.amount_high.toLocaleString()}` : '—'),
        };
      })
    : DISCLOSURE_STREAM_ITEMS.slice(0, 8);

  return (
    <div className="bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-xs">
      <div className="p-4 sm:p-5 border-b border-border-custom/50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <span>⚡</span> Strumień ujawnień (Live Feed)
          </h3>
          <p className="text-xs text-text-secondary">Form 4, KNF, STOCK Act w czasie rzeczywistym</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onViewAll} className="text-xs font-semibold text-primary">
          Wszystkie →
        </Button>
      </div>

      <div className="divide-y divide-border-custom/40">
        {displayItems.map((item) => (
          <div key={item.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-surface transition-colors">
            <div className="flex items-center gap-2.5">
              <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded-md bg-surface border border-border-custom text-text-muted shrink-0">
                {item.dateLabel}
              </span>
              <span className={`text-2xs font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                item.sourceType.includes('KNF')
                  ? 'bg-danger/10 text-danger border-danger/20'
                  : item.sourceType === 'STOCK'
                  ? 'bg-info/10 text-info border-info/20'
                  : 'bg-primary/10 text-primary border-primary/20'
              }`}>
                {item.sourceType}
              </span>
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-surface border border-border-custom text-text-primary shrink-0 shadow-xs">
                ${item.ticker}
              </span>
              <p className="text-xs text-text-secondary truncate max-w-md">
                {item.description}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="font-mono text-xs font-bold text-text-primary">
                {item.amountOrPercent}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DisclosureCalendarWidget: FC<{
  year: number;
  latestDateLabel: string;
}> = ({ year, latestDateLabel }) => {
  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-border-custom shadow-xs">
      <h3 className="text-xs font-black uppercase tracking-wider text-text-muted mb-3">
        Kalendarz Ujawnień
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60">
          <div className="text-xs font-bold font-mono text-primary">14 LIS {year}</div>
          <div className="text-xs font-semibold text-text-primary mt-1">Fundusze 13F (SEC)</div>
          <div className="text-3xs text-text-secondary mt-0.5">Nieprzekraczalny termin zgłoszenia raportów za Q3.</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60">
          <div className="text-xs font-bold font-mono text-primary">9 LIS {year}</div>
          <div className="text-xs font-semibold text-text-primary mt-1">Kongres (STOCK Act)</div>
          <div className="text-3xs text-text-secondary mt-0.5">Maksymalny termin ujawnienia transakcji zawartych w październiku.</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-surface border border-border-custom/60">
          <div className="text-xs font-bold font-mono text-success">{latestDateLabel}</div>
          <div className="text-xs font-semibold text-text-primary mt-1">Najnowsze dane</div>
          <div className="text-3xs text-text-secondary mt-0.5">Automatyczna synchronizacja z otwartych rejestrów SEC i KNF.</div>
        </div>
      </div>
    </div>
  );
};
