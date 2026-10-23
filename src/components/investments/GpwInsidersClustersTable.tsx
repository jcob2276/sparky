import { FC } from 'react';
import type { GpwInsiderCluster } from '../../lib/investments/gpwInsidersService';
import Button from '../ui/Button';
import { formatDotDate } from './gpwInsidersFormat';

interface Props {
  clusters: GpwInsiderCluster[];
  onSelectTicker?: (ticker: string) => void;
}

export const GpwInsidersClustersTable: FC<Props> = ({ clusters, onSelectTicker }) => (
  <section className="bg-surface border border-border-custom/70 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">Klastry nabyć od początku roku</h2>
      <span className="text-2xs font-mono text-text-muted">co najmniej 2 zawiadomienia o nabyciu, kolejne do 14 dni od siebie</span>
    </div>

    {clusters.length === 0 ? (
      <p className="py-6 text-center text-xs text-text-secondary">Brak klastrów nabyć w tym roku.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-custom/50 text-2xs font-mono text-text-muted">
              <th className="pb-2.5 font-semibold">Spółka</th>
              <th className="pb-2.5 font-semibold text-center">Zawiadomień</th>
              <th className="pb-2.5 font-semibold text-center">Okno dat</th>
              <th className="pb-2.5 font-semibold pl-4">Tytuły</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-custom/40">
            {clusters.map((c) => (
              <tr key={c.id} className="hover:bg-primary/5 transition-colors">
                <td className="py-2.5 font-mono">
                  <Button variant="ghost" size="sm" onClick={() => onSelectTicker?.(c.ticker)} className="font-bold mr-1">
                    {c.ticker}
                  </Button>
                  <span className="text-text-secondary text-2xs">{c.companyName}</span>
                </td>
                <td className="py-2.5 text-center font-mono font-bold text-success">{c.tradesCount}</td>
                <td className="py-2.5 text-center font-mono text-2xs text-text-secondary whitespace-nowrap">
                  {formatDotDate(c.dateFrom)} – {formatDotDate(c.dateTo)}
                </td>
                <td className="py-2.5 pl-4 text-2xs text-text-primary">{c.titles.join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);
