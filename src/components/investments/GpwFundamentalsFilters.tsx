import { FC } from 'react';
import { Search, Plus, Columns } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

export interface GpwPresetFilters {
  peBelowMedian: boolean;
  divYieldAbove4: boolean;
  revenueYoyAbove15: boolean;
  roeAbove15: boolean;
  fcfYieldAbove5: boolean;
  debtToEbitdaAbove3: boolean;
  forwardPeBelowPe: boolean;
}

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  sector: string;
  onSectorChange: (val: string) => void;
  sectorOptions: { value: string; label: string }[];
  marketCapFilter: string;
  onMarketCapFilterChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: string) => void;
  presets: GpwPresetFilters;
  onTogglePreset: (key: keyof GpwPresetFilters) => void;
  totalFiltered: number;
  totalAll: number;
}

const MCAP_OPTIONS = [
  { value: 'all', label: 'dowolna' },
  { value: 'large', label: 'Duża (> 10 mld zł)' },
  { value: 'mid', label: 'Średnia (1 - 10 mld zł)' },
  { value: 'small', label: 'Mała (< 1 mld zł)' },
];

const SORT_OPTIONS = [
  { value: 'mcap_desc', label: 'Kapitalizacja ↓' },
  { value: 'mcap_asc', label: 'Kapitalizacja ↑' },
  { value: 'pe_asc', label: 'C/Z najniższe' },
  { value: 'pe_desc', label: 'C/Z najwyższe' },
  { value: 'div_desc', label: 'Stopa dywidendy ↓' },
  { value: 'roe_desc', label: 'ROE ↓' },
  { value: 'rev_desc', label: 'Przychody r/r ↓' },
  { value: 'margin_desc', label: 'Marża netto ↓' },
];

const PRESET_BUTTONS: { key: keyof GpwPresetFilters; label: string }[] = [
  { key: 'peBelowMedian', label: 'C/Z poniżej mediany sektora' },
  { key: 'divYieldAbove4', label: 'Stopa dywidendy > 4 %' },
  { key: 'revenueYoyAbove15', label: 'Przychody r/r > 15 %' },
  { key: 'roeAbove15', label: 'ROE > 15 %' },
  { key: 'fcfYieldAbove5', label: 'FCF yield > 5 %' },
  { key: 'debtToEbitdaAbove3', label: 'Dług netto/EBITDA > 3x' },
  { key: 'forwardPeBelowPe', label: 'Forward C/Z niżej niż C/Z' },
];

const GpwPresetPills: FC<{
  presets: GpwPresetFilters;
  onTogglePreset: (key: keyof GpwPresetFilters) => void;
}> = ({ presets, onTogglePreset }) => (
  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
    {PRESET_BUTTONS.map(({ key, label }) => (
      <Button
        key={key}
        size="sm"
        variant={presets[key] ? 'primary' : 'secondary'}
        onClick={() => onTogglePreset(key)}
        className="text-2xs font-medium rounded-xl"
      >
        {label}
      </Button>
    ))}
  </div>
);

export const GpwFundamentalsFilters: FC<Props> = ({
  search,
  onSearchChange,
  sector,
  onSectorChange,
  sectorOptions,
  marketCapFilter,
  onMarketCapFilterChange,
  sortBy,
  onSortByChange,
  presets,
  onTogglePreset,
  totalFiltered,
  totalAll,
}) => {
  return (
    <div className="space-y-3.5">
      {/* Top Controls Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Ticker albo nazwa spółki"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="text-xs"
              icon={<Search size={14} />}
            />
          </div>

          {/* Sektor Select */}
          <div className="w-36 sm:w-44">
            <Select
              id="gpw-sector-select"
              options={sectorOptions}
              value={sector}
              onChange={(e) => onSectorChange(e.target.value)}
              controlSize="md"
              className="text-xs font-mono"
            />
          </div>

          {/* Kapitalizacja Select */}
          <div className="w-36 sm:w-44">
            <Select
              id="gpw-mcap-select"
              options={MCAP_OPTIONS}
              value={marketCapFilter}
              onChange={(e) => onMarketCapFilterChange(e.target.value)}
              controlSize="md"
              className="text-xs font-mono"
            />
          </div>

          {/* Sortuj Select */}
          <div className="w-36 sm:w-44">
            <Select
              id="gpw-sort-select"
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              controlSize="md"
              className="text-xs font-mono"
            />
          </div>
        </div>

        {/* Counter */}
        <div className="text-2xs font-mono font-bold text-text-muted shrink-0 text-right">
          {totalFiltered} z {totalAll} spółek
        </div>
      </div>

      {/* Quick Condition Presets */}
      <GpwPresetPills presets={presets} onTogglePreset={onTogglePreset} />

      {/* Action buttons row */}
      <div className="flex items-center justify-between pt-1">
        <Button
          size="sm"
          variant="secondary"
          className="text-2xs font-bold rounded-xl gap-1"
        >
          <Plus size={12} />
          Filtr
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="text-2xs font-mono font-bold text-text-secondary hover:text-text-primary rounded-xl gap-1.5"
        >
          <Columns size={12} />
          Kolumny
        </Button>
      </div>
    </div>
  );
};
