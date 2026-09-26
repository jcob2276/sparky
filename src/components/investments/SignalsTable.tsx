import { FC, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SignalRow } from '../../lib/investments/signalsApi';
import { formatShortDateWarsaw } from '../../lib/date';
import { SignalEvidence } from './SignalEvidence';

interface Props {
  title: string;
  windowLabel: string;
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

function formatWhen(value: string | null): string {
  if (!value) return '—';
  return formatShortDateWarsaw(`${value}T12:00:00Z`);
}

const SignalRowView: FC<{ row: SignalRow }> = ({ row }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="border-b border-border-custom/40 cursor-pointer hover:bg-surface/80"
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
        <td className="py-3 pr-3">
          <div className="flex items-center gap-2">
            <span className="w-7 font-mono font-bold text-primary tabular-nums">{row.score}</span>
            <span className="h-1.5 w-14 rounded-full bg-border-custom overflow-hidden">
              <span className="block h-1.5 bg-primary" style={{ width: `${row.score}%` }} />
            </span>
          </div>
        </td>
        <td className="py-3 pr-3 min-w-36">
          <div className="font-mono font-bold text-sm text-text-primary">{row.ticker}</div>
          <div className="text-3xs text-text-muted truncate max-w-48">{row.companyName}</div>
        </td>
        <td className="py-3 pr-3 text-xs text-text-secondary max-w-72">{row.summary}</td>
        <td className={`py-3 pr-3 text-right font-mono text-sm tabular-nums ${row.fundNetBuyers > 0 ? 'text-success' : row.fundNetBuyers < 0 ? 'text-danger' : 'text-text-secondary'}`}>
          {row.fundNetBuyers > 0 ? '+' : ''}
          {row.fundNetBuyers}
        </td>
        <td className="py-3 pr-3 text-right font-mono text-sm tabular-nums">
          <span className="text-success">{row.polBuys}</span>
          <span className="text-text-muted"> / </span>
          <span className={row.polSells > 0 ? 'text-danger' : 'text-text-muted'}>{row.polSells}</span>
        </td>
        <td className={`py-3 pr-3 text-right font-mono text-sm tabular-nums ${row.insiderBuys > 0 ? 'text-success' : 'text-text-muted'}`}>
          {row.insiderBuys > 0 ? row.insiderBuys : '—'}
        </td>
        <td className="py-3 pr-3 text-right font-mono text-xs tabular-nums text-text-primary">
          {formatVolume(row.buyVolumeMid)}
        </td>
        <td className="py-3 pr-2 text-right font-mono text-xs text-text-muted">{formatWhen(row.lastTradeDate)}</td>
        <td className="py-3 text-text-muted">
          <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </td>
      </tr>
      {open && (
        <tr className="bg-surface/60">
          <td colSpan={9} className="p-0 border-b border-border-custom/40">
            <div className="sticky left-0 w-full max-w-full px-4 py-4">
              <SignalEvidence ticker={row.ticker} companyName={row.companyName} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export const SignalsTable: FC<Props> = ({ title, windowLabel, rows }) => (
  <div className="rounded-3xl bg-surface border border-border-custom shadow-xs overflow-hidden">
    <div className="px-4 py-3 border-b border-border-custom/50 text-xs font-black uppercase tracking-wider text-text-secondary">
      {title}
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-full">
        <thead>
          <tr className="text-3xs font-bold uppercase tracking-wide text-text-muted border-b border-border-custom/40">
            <th className="py-2 px-3 font-bold">Ocena</th>
            <th className="py-2 pr-3 font-bold">Spółka</th>
            <th className="py-2 pr-3 font-bold">Dowody · {windowLabel}</th>
            <th className="py-2 pr-3 font-bold text-right">Fundusze</th>
            <th className="py-2 pr-3 font-bold text-right">Pol. K/S</th>
            <th className="py-2 pr-3 font-bold text-right">Insiderzy</th>
            <th className="py-2 pr-3 font-bold text-right">Wolumen ≈</th>
            <th className="py-2 pr-3 font-bold text-right">Ostatnia</th>
            <th className="py-2 w-6" />
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
