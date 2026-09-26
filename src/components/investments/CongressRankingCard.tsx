import { FC, useState } from 'react';
import Button from '../ui/Button';
import { PoliticianAvatar } from './PoliticianAvatar';
import type { CongressOverview } from '../../lib/investments/congressService';

interface Props {
  rankings: CongressOverview['rankings'];
  onSelectPolitician: (name: string) => void;
}

type RankingTimeframe = '3M' | '6M' | '12M';

export const CongressRankingCard: FC<Props> = ({
  rankings,
  onSelectPolitician,
}) => {
  const [timeframe, setTimeframe] = useState<RankingTimeframe>('12M');

  const getAlpha = (r: (typeof rankings)[0]) => {
    if (timeframe === '3M') return r.alpha3m;
    if (timeframe === '6M') return r.alpha6m;
    return r.alpha12m;
  };

  const sortedRankings = [...rankings].sort((a, b) => getAlpha(b) - getAlpha(a));

  return (
    <div className="bg-surface-elevated border border-border-custom rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
              Ranking
            </h3>
            <span className="text-3xs font-mono text-text-muted">{timeframe}</span>
          </div>

          {/* Timeframe switch */}
          <div className="flex items-center bg-surface-subtle p-0.5 rounded-lg border border-border-custom/50">
            {(['3M', '6M', '12M'] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={timeframe === t ? 'secondary' : 'ghost'}
                onClick={() => setTimeframe(t)}
                className="text-3xs font-bold px-2 py-0.5 h-6 rounded-md"
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        <p className="text-3xs uppercase tracking-wider font-mono text-text-muted">
          Alfa vs S&amp;P 500, nie surowy zwrot
        </p>
      </div>

      {/* Rankings List */}
      <div className="divide-y divide-border-custom/40">
        {sortedRankings.map((pol, idx) => {
          const alpha = getAlpha(pol);
          const isPos = alpha >= 0;

          return (
            <div
              key={pol.id}
              onClick={() => onSelectPolitician(pol.name)}
              className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-subtle/60 px-2 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-3xs font-mono font-bold text-text-muted w-4 text-center">
                  {idx + 1}
                </span>
                <PoliticianAvatar
                  name={pol.name}
                  bioguideId={pol.bioguideId}
                  party={pol.party}
                  size={30}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                    {pol.name}
                  </div>
                  <div className="text-3xs font-mono text-text-muted truncate">
                    <span>{pol.chamber}</span>
                    <span className="mx-1">·</span>
                    <span>
                      {pol.party}-{pol.state}
                    </span>
                    <span className="mx-1">·</span>
                    <span>{pol.tradesCount} TRANS.</span>
                  </div>
                </div>
              </div>

              {/* Alpha Return */}
              <div
                className={`text-xs font-mono font-bold tabular-nums shrink-0 ${
                  isPos ? 'text-success' : 'text-danger'
                }`}
              >
                {isPos ? `+${alpha.toFixed(2).replace('.', ',')}%` : `${alpha.toFixed(2).replace('.', ',')}%`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
