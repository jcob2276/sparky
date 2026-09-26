import { FC } from 'react';
import { Search } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';

export type CategoryFilter = 'all' | 'value' | 'macro' | 'activist' | 'tech' | 'quant' | 'corporate';

interface Props {
  totalActive: number;
  curveCount: number;
  consensusCount: number;
  categoriesCount: number;
  search: string;
  onSearchChange: (val: string) => void;
  activeCategory: CategoryFilter;
  onCategoryChange: (cat: CategoryFilter) => void;
  resultsCount: number;
}

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'WSZYSCY' },
  { id: 'value', label: 'WARTOŚĆ' },
  { id: 'macro', label: 'MAKRO' },
  { id: 'activist', label: 'ACTIVIST' },
  { id: 'tech', label: 'TECH' },
  { id: 'quant', label: 'QUANT' },
  { id: 'corporate', label: 'KORPORACJE' },
];

export const SuperinvestorsHeader: FC<Props> = ({
  totalActive,
  curveCount,
  consensusCount,
  categoriesCount,
  search,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  resultsCount,
}) => {
  return (
    <div className="space-y-6">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
          SUPERINWESTORZY · 13F
        </h1>
        <p className="text-3xs uppercase tracking-widest text-text-muted mt-1 font-semibold">
          WARTOŚĆ PORTFELA 13F · ZMIANA OD POPRZEDNIEGO KWARTAŁU
        </p>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border-custom shadow-2xs">
          <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted font-mono">
            Aktywni Inwestorzy
          </div>
          <div className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mt-1">
            {totalActive}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border-custom shadow-2xs">
          <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted font-mono">
            Krzywe Wyników
          </div>
          <div className="text-2xl sm:text-3xl font-black text-success tracking-tight mt-1">
            {curveCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border-custom shadow-2xs">
          <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted font-mono">
            W Konsensusie
          </div>
          <div className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mt-1">
            {consensusCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border-custom shadow-2xs">
          <div className="text-3xs uppercase tracking-wider font-semibold text-text-muted font-mono">
            Kategorie
          </div>
          <div className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mt-1">
            {categoriesCount}
          </div>
        </div>
      </div>

      {/* Search Input & Category Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
        <div className="w-full lg:w-96">
          <Input
            type="text"
            placeholder="Szukaj: Buffett, Icahn, CIK, fundusz..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="text-xs"
            icon={<Search size={14} />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {CATEGORY_TABS.map((tab) => {
            const isSelected = activeCategory === tab.id;
            return (
              <Button
                key={tab.id}
                size="sm"
                variant={isSelected ? 'primary' : 'ghost'}
                onClick={() => onCategoryChange(tab.id)}
                className={`text-2xs font-bold rounded-xl shrink-0 uppercase tracking-wider ${
                  isSelected ? 'shadow-2xs' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </Button>
            );
          })}

          <div className="px-2.5 py-1 text-2xs font-mono font-semibold text-text-muted ml-auto sm:ml-2">
            {resultsCount} WYNIKÓW
          </div>
        </div>
      </div>
    </div>
  );
};
