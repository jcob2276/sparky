import { useState } from 'react';
import Button from '../../ui/Button';
import { Pill, Plus, X, AlertCircle, Check } from 'lucide-react';
import Spinner from '../../ui/Spinner';
import EmptyState from '../../ui/EmptyState';
import { Card } from '../../ui/Card';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import { useSupplementsData } from './useSupplementsData';
import SupplementCard from './SupplementCard';
import SupplementAddForm from './SupplementAddForm';

interface SupplementsPanelProps {
  userId: string;
}

export default function SupplementsPanel({ userId }: SupplementsPanelProps) {
  const data = useSupplementsData(userId);
  const [filter, setFilter] = useState<'all' | 'daily' | 'cycles'>('all');

  const filteredSups = data.activeSups.filter((sup) => {
    if (filter === 'daily') return !sup.start_date && !sup.end_date;
    if (filter === 'cycles') return !!(sup.start_date || sup.end_date);
    return true;
  });

  const takenCount = data.activeSups.filter((sup) => {
    const isReverse =
      sup.name.toLowerCase().includes('pyłek') ||
      sup.name.toLowerCase().includes('pollen') ||
      sup.dose_per_unit?.['reverse_logic'] === true;
    return isReverse ? !data.isLogged(sup.id, data.today) : data.isLogged(sup.id, data.today);
  }).length;

  const totalCount = data.activeSups.length;
  const adherencePct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;
  const pendingCount = totalCount - takenCount;

  return (
    <Card padding="1rem 1.25rem" className="space-y-4 text-text-primary">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Pill size={16} className="text-success shrink-0" />
          <h3 className="text-xs font-black uppercase tracking-[var(--ds-arbitrary-0-25em)] text-text-muted">
            Suplementy & Protokoły Biologiczne
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-2/60 p-0.5 rounded-lg border border-border-custom/40 text-2xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                filter === 'all' ? 'bg-surface text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Wszystkie ({data.activeSups.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('daily')}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                filter === 'daily' ? 'bg-surface text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Stałe
            </button>
            <button
              type="button"
              onClick={() => setFilter('cycles')}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                filter === 'cycles' ? 'bg-surface text-text-primary shadow-xs' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Cykle
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              data.setShowAddForm(!data.showAddForm);
              if (!data.startDate) {
                data.setStartDate(shiftDateStr(getTodayWarsaw(), 0));
                data.setEndDate(shiftDateStr(getTodayWarsaw(), 21));
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border-custom hover:border-success/50 bg-surface-solid/40 text-2xs font-bold uppercase tracking-wider text-text-secondary hover:text-success transition-colors cursor-pointer"
            icon={data.showAddForm ? <X size={11} /> : <Plus size={11} />}
          >
            <span>{data.showAddForm ? 'Anuluj' : 'Nowy cykl'}</span>
          </Button>
        </div>
      </div>

      {/* Pasek statusu dziennego + Masowe zażycie */}
      {totalCount > 0 && !data.loading && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl border border-border-custom/50 bg-surface-2/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
              <span>Dzisiejszy bilans:</span>
              <strong className={takenCount === totalCount ? 'text-success' : 'text-text-primary'}>
                {takenCount}/{totalCount}
              </strong>
              <span className="text-2xs text-text-muted">({adherencePct}%)</span>
            </div>

            <div className="w-28 bg-surface-3 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  takenCount === totalCount ? 'bg-success' : 'bg-primary'
                }`}
                style={{ width: `${adherencePct}%` }}
              />
            </div>
          </div>

          {pendingCount > 0 && (
            <Button
              variant="tonal"
              size="sm"
              type="button"
              onClick={() => void data.handleLogAllToday()}
              className="h-7 px-2.5 text-2xs font-bold uppercase tracking-wider text-success bg-success/10 border border-success/30 hover:bg-success/20 transition-all cursor-pointer"
              icon={<Check size={12} className="stroke-[var(--ds-arbitrary-3px)]" />}
            >
              <span>Zaloguj wszystkie na dziś ({pendingCount})</span>
            </Button>
          )}
        </div>
      )}

      {data.error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-danger/20 bg-danger/5 text-danger text-xs">
          <AlertCircle size={12} />
          <span>{data.error}</span>
        </div>
      )}

      {data.showAddForm && (
        <SupplementAddForm
          name={data.name} setName={data.setName} emoji={data.emoji} setEmoji={data.setEmoji}
          unit={data.unit} setUnit={data.setUnit} skipQty={data.skipQty} setSkipQty={data.setSkipQty}
          reverseLogic={data.reverseLogic} setReverseLogic={data.setReverseLogic}
          hasCycle={data.hasCycle} setHasCycle={data.setHasCycle}
          startDate={data.startDate} setStartDate={data.setStartDate}
          endDate={data.endDate} setEndDate={data.setEndDate}
          hasReminder={data.hasReminder} setHasReminder={data.setHasReminder}
          reminderTime={data.reminderTime} setReminderTime={data.setReminderTime}
          submitting={data.submitting} onSubmit={data.handleSubmit}
        />
      )}

      {data.loading ? (
        <div className="flex justify-center items-center py-8"><Spinner size="sm" /></div>
      ) : filteredSups.length === 0 ? (
        <EmptyState icon="💊" label='Brak suplementów w wybranym filtrze. Kliknij "Nowy cykl" powyżej.' />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSups.map((sup) => {
            const isReverse =
              sup.name.toLowerCase().includes('pyłek') ||
              sup.name.toLowerCase().includes('pollen') ||
              sup.dose_per_unit?.['reverse_logic'] === true;
            const takenToday = isReverse ? !data.isLogged(sup.id, data.today) : data.isLogged(sup.id, data.today);
            return (
              <SupplementCard
                key={sup.id}
                sup={sup}
                takenToday={takenToday}
                last7Days={data.last7Days}
                today={data.today}
                onToggle={() => void data.handleToggle(sup)}
                onDeactivate={() => void data.handleDeactivate(sup)}
                onUpdateReminder={(reminderTime) => void data.handleUpdateReminder(sup, reminderTime)}
                isLogged={data.isLogged}
                onRenewCycle={(days) => void data.handleRenewCycle(sup, days)}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}
