import { useState } from 'react';
import Button from '../../ui/Button';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import { Calendar, Bell, Check, Trash2 } from 'lucide-react';
import { Card } from '../../ui/Card';
import type { Supplement } from '../../../lib/health/supplementsClient';

function formatShortDate(dateStr: string) {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]}.${parts[1]}`;
}

function isWithinCycle(sup: Supplement, dateStr: string): boolean {
  if (sup.start_date && dateStr < sup.start_date) return false;
  if (sup.end_date && dateStr > sup.end_date) return false;
  return true;
}

function formatReminderInputValue(raw: string | null): string {
  if (!raw) return '21:30';
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return '21:30';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

interface ReminderEditorProps {
  draftReminder: string;
  setDraftReminder: (val: string) => void;
  onSave: () => void;
  onDisable: () => void;
  onCancel: () => void;
}

function ReminderEditor({ draftReminder, setDraftReminder, onSave, onDisable, onCancel }: ReminderEditorProps) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border-custom/50 bg-surface-solid/30 p-2 text-2xs">
      <div className="space-y-1">
        <label className="text-3xs font-bold uppercase tracking-wider text-text-muted">Godzina push</label>
        <ControlInput
          type="time"
          value={draftReminder}
          onChange={(e) => setDraftReminder(e.target.value)}
          className="rounded border border-border-custom bg-surface px-1.5 py-0.5 text-xs"
        />
      </div>
      <Button type="button" variant="primary" size="sm" onClick={onSave}>
        Zapisz
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDisable}>
        Wyłącz
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Anuluj
      </Button>
    </div>
  );
}

interface HistoryStripProps {
  last7Days: string[];
  today: string;
  sup: Supplement;
  isLogged: (id: string, date: string) => boolean;
  isReverse: boolean;
  isExpired: boolean;
  onRenewCycle?: (days: number) => void;
}

function History7dStrip({ last7Days, today, sup, isLogged, isReverse, isExpired, onRenewCycle }: HistoryStripProps) {
  return (
    <div className="border-t border-border-custom/40 pt-2 flex items-center justify-between gap-2 text-2xs">
      <div className="flex items-center gap-1.5 text-text-muted">
        <span className="text-3xs font-bold uppercase tracking-wider">7d:</span>
        <div className="flex items-center gap-1">
          {last7Days.map((date) => {
            const logged = isLogged(sup.id, date);
            const isToday = date === today;
            const inCycle = isWithinCycle(sup, date);
            const taken = isReverse ? (inCycle ? !logged : false) : logged;
            const dayNum = date.split('-')[2];
            return (
              <div
                key={date}
                className={`w-4 h-4 rounded flex items-center justify-center text-3xs font-mono font-bold transition-all ${
                  taken
                    ? 'bg-success/20 text-success border border-success/40'
                    : !inCycle
                    ? 'bg-surface/20 text-text-muted/30 border border-border-custom/20 line-through'
                    : isToday
                    ? 'bg-primary/20 text-primary border border-primary/50'
                    : 'bg-surface-2/40 text-text-muted/50 border border-border-custom/40'
                }`}
                title={`${date} (${dayNum}): ${taken ? 'Zażyto' : !inCycle ? 'Poza cyklem' : 'Pominięto'}`}
              >
                {taken ? '✓' : dayNum}
              </div>
            );
          })}
        </div>
      </div>

      {isExpired && onRenewCycle && (
        <Pressable
          variant="ghost"
          size="sm"
          onClick={() => onRenewCycle(30)}
          className="text-3xs font-semibold text-warning hover:underline py-0 h-auto"
        >
          + Odnów na 30 dni
        </Pressable>
      )}
    </div>
  );
}

interface SupplementCardProps {
  sup: Supplement;
  takenToday: boolean;
  last7Days: string[];
  today: string;
  onToggle: () => void;
  onDeactivate: () => void;
  onUpdateReminder: (reminderTime: string | null) => void;
  isLogged: (id: string, date: string) => boolean;
  onRenewCycle?: (days: number) => void;
}

export default function SupplementCard({
  sup, takenToday, last7Days, today, onToggle, onDeactivate, onUpdateReminder, isLogged, onRenewCycle,
}: SupplementCardProps) {
  const [editingReminder, setEditingReminder] = useState(false);
  const [draftReminder, setDraftReminder] = useState(formatReminderInputValue(sup.reminder_time));
  const isSkipQty = sup.skip_qty || sup.slug === 'kreatyna' || sup.name.toLowerCase().includes('kreatyna');
  const displayUnit = (sup.slug === 'kreatyna' || sup.name.toLowerCase().includes('kreatyna')) ? '5g' : (sup.unit || 'porcja');
  const isReverse = sup.name.toLowerCase().includes('pyłek') || sup.name.toLowerCase().includes('pollen') || sup.dose_per_unit?.['reverse_logic'] === true;

  let cycleProgress: number | null = null;
  let cycleDaysText: string | null = null;
  let isExpired = false;

  if (sup.start_date) {
    const start = new Date(sup.start_date + 'T00:00:00Z');
    const nowWarsaw = new Date(today + 'T00:00:00Z');
    const elapsedDays = Math.max(0, Math.floor((nowWarsaw.getTime() - start.getTime()) / 86400000) + 1);
    if (sup.end_date) {
      const end = new Date(sup.end_date + 'T00:00:00Z');
      const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      if (elapsedDays > totalDays) {
        isExpired = true;
        const offDays = elapsedDays - totalDays;
        cycleProgress = 100;
        cycleDaysText = `Zakończony (+${offDays}d off)`;
      } else {
        cycleProgress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
        cycleDaysText = `Dzień ${elapsedDays}/${totalDays}`;
      }
    } else {
      cycleDaysText = `Od ${elapsedDays} dni`;
    }
  }

  return (
    <Card
      variant="outline"
      padding="0.875rem"
      className="space-y-2.5 transition-all border-border-custom bg-surface/40 hover:bg-surface/60"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="text-xl shrink-0" role="img" aria-label={sup.name}>{sup.emoji || '💊'}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-xs font-bold uppercase text-text-primary leading-tight truncate">{sup.name}</p>
              {isExpired ? (
                <span className="px-1.5 py-0.5 rounded text-3xs font-semibold bg-warning/15 text-warning border border-warning/30">
                  {cycleDaysText}
                </span>
              ) : cycleDaysText ? (
                <span className="flex items-center gap-0.5 text-3xs font-semibold text-text-secondary">
                  <Calendar size={10} /> {cycleDaysText}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-2xs text-text-muted">
              <span>{isSkipQty ? displayUnit : `1x ${displayUnit}`}</span>
              {sup.reminder_time && !editingReminder && (
                <Pressable
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-0.5 p-0 h-auto text-primary hover:underline text-2xs"
                  onClick={() => {
                    setDraftReminder(formatReminderInputValue(sup.reminder_time));
                    setEditingReminder(true);
                  }}
                >
                  <Bell size={10} /> {sup.reminder_time.slice(0, 5)}
                </Pressable>
              )}
              {!sup.reminder_time && !editingReminder && (
                <Pressable
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-0.5 p-0 h-auto text-text-muted hover:text-primary text-2xs"
                  onClick={() => setEditingReminder(true)}
                >
                  <Bell size={10} /> Ustaw przypomnienie
                </Pressable>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant={takenToday ? 'tonal' : 'outline'}
            size="sm"
            type="button"
            onClick={onToggle}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
              takenToday
                ? 'border-success/40 bg-success/15 text-success hover:bg-success/25'
                : 'border-border-custom bg-surface hover:text-text-primary hover:border-border-custom/80'
            }`}
            icon={<Check size={11} className={takenToday ? 'stroke-[var(--ds-arbitrary-3px)]' : 'opacity-40'} />}
          >
            <span>{isReverse ? (takenToday ? 'Wzięty' : 'Pominięty') : (takenToday ? 'Zażyto' : 'Zaloguj')}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={onDeactivate}
            className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors cursor-pointer"
            title="Zarchiwizuj"
            icon={<Trash2 size={12} />}
          />
        </div>
      </div>

      {editingReminder && (
        <ReminderEditor
          draftReminder={draftReminder}
          setDraftReminder={setDraftReminder}
          onSave={() => {
            onUpdateReminder(draftReminder || null);
            setEditingReminder(false);
          }}
          onDisable={() => {
            onUpdateReminder(null);
            setEditingReminder(false);
          }}
          onCancel={() => setEditingReminder(false)}
        />
      )}

      {cycleProgress !== null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-3xs text-text-muted font-medium">
            <span>Rozpoczęcie: {formatShortDate(sup.start_date!)}</span>
            <span>Koniec: {formatShortDate(sup.end_date!)}</span>
          </div>
          <div className="h-1 w-full bg-border-custom/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isExpired ? 'bg-warning' : 'bg-success'}`}
              style={{ width: `${cycleProgress}%` }}
            />
          </div>
        </div>
      )}

      <History7dStrip
        last7Days={last7Days}
        today={today}
        sup={sup}
        isLogged={isLogged}
        isReverse={isReverse}
        isExpired={isExpired}
        onRenewCycle={onRenewCycle}
      />
    </Card>
  );
}
