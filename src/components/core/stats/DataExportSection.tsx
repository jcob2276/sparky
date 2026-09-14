import { Calendar, Download, FileText } from 'lucide-react';
import Button from '../../ui/Button';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import Spinner from '../../ui/Spinner';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import { DataExportDomainGrid } from './DataExportDomainGrid';

interface DataExportSectionProps {
  dateRange: { from: string; to: string };
  setDateRange: (range: { from: string; to: string }) => void;
  includeWorkouts: boolean;
  setIncludeWorkouts: (v: boolean) => void;
  includeBody: boolean;
  setIncludeBody: (v: boolean) => void;
  includeNutrition: boolean;
  setIncludeNutrition: (v: boolean) => void;
  includeJournal: boolean;
  setIncludeJournal: (v: boolean) => void;
  includeOura: boolean;
  setIncludeOura: (v: boolean) => void;
  includeHabits: boolean;
  setIncludeHabits: (v: boolean) => void;
  includeActivityWatch: boolean;
  setIncludeActivityWatch: (v: boolean) => void;
  includeFundament: boolean;
  setIncludeFundament: (v: boolean) => void;
  exportData: () => void;
  isExporting: boolean;
}

export function DataExportSection({
  dateRange,
  setDateRange,
  includeWorkouts,
  setIncludeWorkouts,
  includeBody,
  setIncludeBody,
  includeNutrition,
  setIncludeNutrition,
  includeJournal,
  setIncludeJournal,
  includeOura,
  setIncludeOura,
  includeHabits,
  setIncludeHabits,
  includeActivityWatch,
  setIncludeActivityWatch,
  includeFundament,
  setIncludeFundament,
  exportData,
  isExporting,
}: DataExportSectionProps) {
  const today = getTodayWarsaw();

  const presets = [
    { label: '7 dni', days: -7 },
    { label: '30 dni', days: -30 },
    { label: '90 dni', days: -90 },
    { label: 'Pół roku', days: -180 },
  ];

  return (
    <section id="kronika-eksport" className="rounded-2xl border border-border-custom bg-surface/50 backdrop-blur-[var(--blur-md)] p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <p className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-15em)] text-text-muted font-display">
              Eksport & Kopia
            </p>
          </div>
          <h2 className="mt-0.5 font-display text-lg font-black tracking-tight text-text-primary">
            Raport danych (.md)
          </h2>
        </div>
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20">
          <FileText size={16} />
        </div>
      </div>

      {/* Date presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-3xs font-bold uppercase tracking-wider text-text-muted">
            Zakres dat raportu
          </label>
          <div className="flex items-center gap-1">
            {presets.map((p) => (
              <Pressable
                key={p.label}
                onClick={() => setDateRange({ from: shiftDateStr(today, p.days), to: today })}
                className="px-2 py-0.5 rounded-md text-3xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors cursor-pointer border border-transparent hover:border-border-custom"
              >
                {p.label}
              </Pressable>
            ))}
          </div>
        </div>

        {/* Date Pickers */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="relative">
            <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <ControlInput
              type="date"
              value={dateRange.from}
              onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full rounded-xl border border-border-custom bg-surface py-2.5 pl-8 pr-2.5 text-xs font-mono font-bold text-text-primary outline-none transition-all focus:border-primary"
            />
          </div>
          <div className="relative">
            <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <ControlInput
              type="date"
              value={dateRange.to}
              onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-full rounded-xl border border-border-custom bg-surface py-2.5 pl-8 pr-2.5 text-xs font-mono font-bold text-text-primary outline-none transition-all focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Domains Selection Tiles */}
      <DataExportDomainGrid
        includeWorkouts={includeWorkouts}
        setIncludeWorkouts={setIncludeWorkouts}
        includeBody={includeBody}
        setIncludeBody={setIncludeBody}
        includeNutrition={includeNutrition}
        setIncludeNutrition={setIncludeNutrition}
        includeJournal={includeJournal}
        setIncludeJournal={setIncludeJournal}
        includeOura={includeOura}
        setIncludeOura={setIncludeOura}
        includeHabits={includeHabits}
        setIncludeHabits={setIncludeHabits}
        includeActivityWatch={includeActivityWatch}
        setIncludeActivityWatch={setIncludeActivityWatch}
        includeFundament={includeFundament}
        setIncludeFundament={setIncludeFundament}
      />

      {/* Action Download Button */}
      <Button
        variant="primary"
        onClick={exportData}
        disabled={isExporting}
        className="w-full flex items-center justify-center gap-2 py-3"
      >
        {isExporting ? (
          <>
            <Spinner size="sm" className="!border-on-accent/30 !border-t-on-accent" />
            <span>Generowanie raportu Markdown...</span>
          </>
        ) : (
          <>
            <Download size={14} />
            <span>Pobierz Raport (.md)</span>
          </>
        )}
      </Button>
    </section>
  );
}
