import { FC } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Search } from 'lucide-react';

export type ChamberFilter = 'all' | 'house' | 'senate';
export type PartyFilter = 'all' | 'D' | 'R';
export type TimeframeFilter = '90' | '365' | 'all';

interface Props {
  chamber: ChamberFilter;
  onChamberChange: (c: ChamberFilter) => void;
  party: PartyFilter;
  onPartyChange: (p: PartyFilter) => void;
  timeframe: TimeframeFilter;
  onTimeframeChange: (t: TimeframeFilter) => void;
  searchPolitician: string;
  onSearchPoliticianChange: (s: string) => void;
  searchTicker: string;
  onSearchTickerChange: (t: string) => void;
}

export const CongressFilterToolbar: FC<Props> = ({
  chamber,
  onChamberChange,
  party,
  onPartyChange,
  timeframe,
  onTimeframeChange,
  searchPolitician,
  onSearchPoliticianChange,
  searchTicker,
  onSearchTickerChange,
}) => {
  return (
    <div className="space-y-3">
      {/* Pills Row */}
      <div className="flex flex-wrap items-center gap-4 text-2xs">
        {/* Izba */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-3xs uppercase font-bold text-text-muted">Izba:</span>
          <div className="flex items-center bg-surface-subtle p-0.5 rounded-lg border border-border-custom/50">
            {(
              [
                ['all', 'Obie'],
                ['house', 'Izba'],
                ['senate', 'Senat'],
              ] as const
            ).map(([val, label]) => (
              <Button
                key={val}
                size="sm"
                variant={chamber === val ? 'secondary' : 'ghost'}
                onClick={() => onChamberChange(val)}
                className="text-3xs font-bold px-2 py-0.5 h-6 rounded-md"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Partia */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-3xs uppercase font-bold text-text-muted">Partia:</span>
          <div className="flex items-center bg-surface-subtle p-0.5 rounded-lg border border-border-custom/50">
            {(
              [
                ['all', 'Wszyscy'],
                ['D', 'Demokraci'],
                ['R', 'Republikanie'],
              ] as const
            ).map(([val, label]) => (
              <Button
                key={val}
                size="sm"
                variant={party === val ? 'secondary' : 'ghost'}
                onClick={() => onPartyChange(val)}
                className="text-3xs font-bold px-2 py-0.5 h-6 rounded-md"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Okres */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-3xs uppercase font-bold text-text-muted">Okres:</span>
          <div className="flex items-center bg-surface-subtle p-0.5 rounded-lg border border-border-custom/50">
            {(
              [
                ['90', '90 Dni'],
                ['365', '365 Dni'],
                ['all', 'Cala Historia'],
              ] as const
            ).map(([val, label]) => (
              <Button
                key={val}
                size="sm"
                variant={timeframe === val ? 'secondary' : 'ghost'}
                onClick={() => onTimeframeChange(val)}
                className="text-3xs font-bold px-2 py-0.5 h-6 rounded-md"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Search inputs row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          size="sm"
          placeholder="Szukaj polityka..."
          icon={<Search size={14} />}
          value={searchPolitician}
          onChange={(e) => onSearchPoliticianChange(e.target.value)}
        />
        <Input
          size="sm"
          placeholder="Szukaj po tickerze..."
          icon={<Search size={14} />}
          value={searchTicker}
          onChange={(e) => onSearchTickerChange(e.target.value)}
        />
      </div>
    </div>
  );
};
