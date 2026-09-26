import { FC, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SignalRow } from '../../lib/investments/signalsApi';
import { polishCount } from '../../lib/investments/signalsScore';
import { SignalEvidence } from './SignalEvidence';
import { CompanyLogo } from './CompanyLogo';

interface Props {
  title?: string;
  rows: SignalRow[];
}

function formatVolume(value: number): string {
  if (value <= 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

const SignalRowView: FC<{ row: SignalRow }> = ({ row }) => {
  const [open, setOpen] = useState(false);
  const fundLabel = polishCount(row.holders, 'fundusz', 'fundusze', 'funduszy');

  return (
    <>
      <tr
        className="border-b border-border-custom/40 cursor-pointer hover:bg-surface-elevated/60 transition-colors"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
      >
        <td className="py-3.5 px-4">
          <div className="flex items-center gap-3">
            <CompanyLogo ticker={row.ticker} name={row.companyName} size={32} />
            <div className="min-w-0">
              <div className="font-mono font-bold text-sm text-text-primary flex items-center gap-1.5">
                <span>{row.ticker}</span>
                {row.fundNetBuyers > 0 && row.polBuys > 0 && (
                  <span className="px-1.5 py-0.2 rounded-xs text-4xs font-mono font-bold uppercase bg-primary/15 text-primary border border-primary/30" title="Potrójna Zbieżność: zakupy 13F oraz Kongresu">
                    ★ 10/10
                  </span>
                )}
              </div>
              <div className="text-3xs text-text-muted truncate max-w-56 sm:max-w-xs">
                {row.companyName} {row.holders > 0 ? `· ${row.holders} ${fundLabel}` : ''}
              </div>
            </div>
          </div>
        </td>

        <td className="py-3.5 px-4 text-center font-mono text-sm font-bold tabular-nums">
          <span
            className={
              row.fundNetBuyers > 0
                ? 'text-success'
                : row.fundNetBuyers < 0
                ? 'text-danger'
                : 'text-text-secondary'
            }
          >
            {row.fundNetBuyers > 0 ? `+${row.fundNetBuyers}` : row.fundNetBuyers}
          </span>
        </td>

        <td className="py-3.5 px-4 text-center font-mono text-xs tabular-nums">
          <span className={row.polBuys > 0 ? 'text-success font-bold' : 'text-text-muted'}>
            {row.polBuys}
          </span>
          <span className="text-text-muted"> / </span>
          <span className={row.polSells > 0 ? 'text-danger font-bold' : 'text-text-muted'}>
            {row.polSells}
          </span>
        </td>

        <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-text-primary">
          {formatVolume(row.buyVolumeMid)}
        </td>

        <td className="py-3.5 px-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="font-mono font-bold text-xs tabular-nums px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              {row.score}
            </span>
            <ChevronDown
              size={14}
              className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </div>
        </td>
      </tr>

      {open && (
        <tr className="bg-surface/50 border-b border-border-custom/40">
          <td colSpan={5} className="p-0">
            <div className="px-4 py-4">
              <SignalEvidence ticker={row.ticker} companyName={row.companyName} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export const SignalsTable: FC<Props> = ({ title, rows }) => (
  <div className="rounded-3xl bg-surface border border-border-custom shadow-xs overflow-hidden">
    {title && (
      <div className="px-4 py-3 border-b border-border-custom/50 text-xs font-black uppercase tracking-wider text-text-secondary">
        {title}
      </div>
    )}
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-full">
        <thead>
          <tr className="text-3xs font-bold uppercase tracking-wider text-text-muted border-b border-border-custom/40 bg-surface/40">
            <th className="py-3 px-4 font-bold">Spółka</th>
            <th className="py-3 px-4 font-bold text-center">Fundusze netto</th>
            <th className="py-3 px-4 font-bold text-center">Politycy (k/s)</th>
            <th className="py-3 px-4 font-bold text-right">Wolumen ≈</th>
            <th className="py-3 px-4 font-bold text-right">Zbieżność</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <SignalRowView key={row.ticker} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
