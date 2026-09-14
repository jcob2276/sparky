import { useState, useMemo } from 'react';
import { ChevronRight, AlertTriangle, ArrowDown, ArrowUp, Minus, Search, X } from 'lucide-react';
import type { MarkerSeries, MedicalLabRow } from '../../../lib/health/medicalAnalytics';
import { ControlInput, ControlSelect, Pressable } from '../../ui/ControlPrimitives';
import MedicalRangeGauge from './MedicalRangeGauge';

interface MedicalResultsTableProps {
  series: MarkerSeries[];
  onSelectMarker: (markerKey: string) => void;
}

const FILTER_TABS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'attention', label: 'Wymaga uwagi' },
  { value: 'changed', label: 'Zmienione' },
  { value: 'new', label: 'Nowe' },
];

function renderDelta(current: number, previous: MedicalLabRow | null) {
  if (!previous) return <span className="text-text-muted flex items-center gap-0.5"><Minus size={10} /> Brak</span>;
  const prevVal = Number(previous.value);
  const diff = current - prevVal;
  if (diff === 0) return <span className="text-text-secondary flex items-center gap-0.5"><Minus size={10} /> 0</span>;
  
  const isUp = diff > 0;
  const formattedDiff = Math.abs(diff) < 0.01 ? diff.toFixed(3) : diff.toFixed(1);
  
  return (
    <span className={`flex items-center gap-0.5 font-bold ${isUp ? 'text-primary' : 'text-text-muted'}`}>
      {isUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {formattedDiff}
    </span>
  );
}

function ResultsTableRow({
  item,
  onSelect,
}: {
  item: { current: MedicalLabRow; previous: MedicalLabRow | null; count: number };
  onSelect: () => void;
}) {
  const hasFlag = item.current.flag && item.current.flag !== 'N' && item.current.flag !== 'normal';

  return (
    <tr
      onClick={onSelect}
      className="border-b border-border-custom/50 hover:bg-background/50 transition-all cursor-pointer last:border-0"
    >
      <td className="px-4 py-3 font-bold text-text-primary">
        <div className="flex items-center gap-1.5">
          {hasFlag && <AlertTriangle size={12} className="text-warning shrink-0" />}
          <span>{item.current.marker_name}</span>
        </div>
        {item.current.category && (
          <span className="text-3xs text-text-muted font-normal block">{item.current.category}</span>
        )}
      </td>
      <td className={`px-4 py-3 font-extrabold ${hasFlag ? 'text-warning' : 'text-text-primary'}`}>
        {item.current.value} <span className="text-3xs font-semibold text-text-muted uppercase ml-0.5">{item.current.unit}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <MedicalRangeGauge
          value={item.current.value}
          refLow={item.current.ref_low}
          refHigh={item.current.ref_high}
          refText={item.current.ref_text}
          flag={item.current.flag}
        />
      </td>
      <td className="px-4 py-3 font-mono">{renderDelta(item.current.value, item.previous)}</td>
      <td className="px-4 py-3 text-text-muted">{item.current.result_date}</td>
      <td className="px-4 py-3 text-text-secondary truncate max-w-[var(--ds-maxw-120px)]" title={item.current.provider || item.current.source_name}>
        {item.current.provider || item.current.source_name}
      </td>
      <td className="px-4 py-3 text-right text-text-muted">
        <ChevronRight size={14} className="inline" />
      </td>
    </tr>
  );
}

export default function MedicalResultsTable({ series, onSelectMarker }: MedicalResultsTableProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const latestMarkers = useMemo(
    () =>
      series
        .map((s) => ({ current: s.latest, previous: s.prior, count: s.history.length }))
        .sort((a, b) => a.current.marker_name.localeCompare(b.current.marker_name)),
    [series],
  );

  const categories = useMemo(() => {
    const set = new Set(series.map((s) => s.category).filter(Boolean) as string[]);
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'pl'))];
  }, [series]);

  const filteredMarkers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return latestMarkers.filter(m => {
      if (q && !m.current.marker_name.toLowerCase().includes(q) && !(m.current.category?.toLowerCase() || '').includes(q)) {
        return false;
      }
      if (selectedCategory !== 'all' && m.current.category !== selectedCategory) {
        return false;
      }
      if (activeTab === 'attention') {
        return m.current.flag && m.current.flag !== 'N' && m.current.flag !== 'normal';
      }
      if (activeTab === 'changed') {
        return m.previous !== null && m.current.value !== m.previous.value;
      }
      if (activeTab === 'new') {
        return m.count === 1;
      }
      return true;
    });
  }, [latestMarkers, activeTab, selectedCategory, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="border-b border-border-custom/50 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black uppercase font-display">2. Wyniki Laboratoryjne</h2>
            <span className="text-3xs font-bold text-text-muted rounded-full bg-surface-2 px-2 py-0.5">
              {filteredMarkers.length} z {series.length}
            </span>
          </div>
          <p className="text-2xs text-text-muted mt-0.5">Surowe fakty bezpośrednio z laboratoriów z graficznym zakresem referencyjnym</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <ControlInput
              type="text"
              placeholder="Szukaj markeru…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-7 py-1.5 text-xs rounded-xl border border-border-custom bg-background w-36 sm:w-44 focus:w-56 transition-all"
            />
            {searchQuery && (
              <Pressable
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
              >
                <X size={12} />
              </Pressable>
            )}
          </div>

          <ControlSelect
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-border-custom bg-background px-3 py-1.5 text-xs font-bold outline-none cursor-pointer"
          >
            <option value="all">Układy biologiczne (Wszystkie)</option>
            {categories.filter(c => c !== 'all').map(c => (
              <option key={c || ''} value={c || ''}>{c}</option>
            ))}
          </ControlSelect>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border-custom/60 pb-2">
        {FILTER_TABS.map(tab => (
          <Pressable
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.value 
                ? 'bg-primary/10 text-primary border border-primary/20' 
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
          </Pressable>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border-custom bg-background/30">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-custom text-2xs font-black uppercase text-text-muted tracking-wider bg-background/50">
              <th className="px-4 py-3">Nazwa</th>
              <th className="px-4 py-3">Wynik</th>
              <th className="px-4 py-3 text-center">Norma Lab (Wskaźnik)</th>
              <th className="px-4 py-3">Zmiana</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Metoda / Lab</th>
              <th className="px-4 py-3 text-right">Szczegóły</th>
            </tr>
          </thead>
          <tbody>
            {filteredMarkers.map(m => (
              <ResultsTableRow
                key={m.current.id}
                item={m}
                onSelect={() => onSelectMarker(m.current.marker_key)}
              />
            ))}

            {filteredMarkers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-text-muted italic">
                  Brak markerów spełniających kryteria filtrowania.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
