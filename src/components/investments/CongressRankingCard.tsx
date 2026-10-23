import { FC, useMemo, useState } from 'react';
import Button from '../ui/Button';
import { PoliticianAvatar } from './PoliticianAvatar';
import type { CongressOverview } from '../../lib/investments/congressService';
import { formatDatePl, formatUsdShort } from '../../lib/investments/congressTradeFormat';

interface Props {
  rankings: CongressOverview['rankings'];
  since: string;
  onSelectPolitician: (name: string) => void;
}

type RankingSort = 'trades' | 'volume';
const VISIBLE_STEP = 10;

export const CongressRankingCard: FC<Props> = ({ rankings, since, onSelectPolitician }) => {
  const [sort, setSort] = useState<RankingSort>('trades');
  const [visible, setVisible] = useState(VISIBLE_STEP);

  const sorted = useMemo(() => [...rankings].sort((a, b) => sort === 'trades'
    ? b.tradesCount - a.tradesCount || b.volumeMidUsd - a.volumeMidUsd
    : b.volumeMidUsd - a.volumeMidUsd || b.tradesCount - a.tradesCount), [rankings, sort]);

  return (
    <section className="bg-surface-elevated border border-border-custom rounded-2xl p-5 shadow-sm space-y-4" aria-label="Ranking polityków">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-baseline gap-2">
            <h3 className="text-xs font-semibold text-text-primary">Ranking aktywności</h3>
            <span className="text-2xs font-mono text-text-muted">od {formatDatePl(since)}</span>
          </div>
          <div className="flex items-center bg-surface-subtle p-0.5 rounded-lg border border-border-custom/50" role="group" aria-label="Sortowanie rankingu">
            {([['trades', 'Transakcje'], ['volume', 'Wolumen']] as const).map(([value, label]) => (
              <Button key={value} size="sm" variant={sort === value ? 'secondary' : 'ghost'} aria-pressed={sort === value}
                onClick={() => { setSort(value); setVisible(VISIBLE_STEP); }}
                className="text-2xs font-bold px-2 py-0.5 h-6 rounded-md">{label}</Button>
            ))}
          </div>
        </div>
        <p className="text-2xs text-text-muted leading-relaxed">
          Alfa vs S&amp;P 500 jest niedostępna: baza ma ceny tylko dla części spółek z ujawnień, więc nie liczymy zwrotu.
          Ranking pokazuje, kto ujawnia najwięcej i na jakie widełki kwot (suma dolnych i górnych granic z formularzy).
        </p>
      </div>

      {!sorted.length ? (
        <p className="text-xs text-text-muted py-4">Brak ujawnień w wybranym zakresie. Dane obejmują wyłącznie bieżący rok.</p>
      ) : (
        <ol className="divide-y divide-border-custom/40">
          {sorted.slice(0, visible).map((pol, idx) => (
            <li key={pol.id}>
              <Button variant="ghost" onClick={() => onSelectPolitician(pol.name)}
                className="w-full h-auto justify-between gap-3 py-2.5 px-2 rounded-xl text-left font-normal group">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xs font-mono font-bold text-text-muted w-5 text-center shrink-0">{idx + 1}</span>
                  <PoliticianAvatar name={pol.name} bioguideId={pol.bioguideId} party={pol.party} size={30} />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-text-primary group-hover:text-primary transition-colors truncate">{pol.name}</span>
                    <span className="block text-2xs font-mono text-text-muted truncate">
                      {pol.chamber === 'senate' ? 'Senat' : pol.chamber === 'house' ? 'Izba' : 'Kongres'}
                      {pol.party && ` · ${pol.party}${pol.state ? `-${pol.state}` : ''}`}
                      {` · ${pol.buysCount} K / ${pol.sellsCount} S · ostatnio ${formatDatePl(pol.lastDisclosureDate)}`}
                    </span>
                  </span>
                </span>
                <span className="text-right shrink-0">
                  <span className="block text-xs font-mono font-bold tabular-nums text-text-primary">{pol.tradesCount} trans.</span>
                  <span className="block text-2xs font-mono tabular-nums text-text-muted">
                    {formatUsdShort(pol.volumeLowUsd)} – {formatUsdShort(pol.volumeHighUsd)}
                  </span>
                </span>
              </Button>
            </li>
          ))}
        </ol>
      )}
      {visible < sorted.length && (
        <Button size="sm" variant="secondary" onClick={() => setVisible((v) => v + VISIBLE_STEP)}>
          Pokaż kolejnych ({sorted.length - visible})
        </Button>
      )}
    </section>
  );
};
