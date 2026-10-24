import { useState } from 'react';
import { AlertTriangle, Ruler, Scale } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { useBodyReminders, useSaveBodyEntry } from '../../../lib/health/bodyRemindersApi';
import { isActionable, type BodyReminder, type BodyReminderKind } from '../../../lib/health/bodyReminders';
import BodyMeasureSheet from './BodyMeasureSheet';

const LABEL: Record<BodyReminderKind, string> = { weight: 'wagę i talię', tape: 'obwody (klatka, brzuch, biodra, ramię, udo, łydka, szyja)' };

function ageText(item: BodyReminder): string {
  if (item.ageDays === null) return 'Jeszcze nic nie wpisano.';
  return item.ageDays === 0 ? 'Wpisane dziś.' : `Ostatni wpis ${item.ageDays} dni temu.`;
}

function Row({ item, onOpen }: { item: BodyReminder; onOpen: () => void }) {
  const overdue = item.state === 'overdue';
  const Icon = item.kind === 'weight' ? Scale : Ruler;
  return (
    <div
      role={overdue ? 'alert' : undefined}
      className={`flex items-center gap-3 rounded-[var(--radius-grouped)] border p-3.5 ${
        overdue ? 'border-danger/60 bg-danger/10 motion-safe:animate-pulse' : 'border-warning/40 bg-warning/10'
      }`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${overdue ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning'}`}>
        {overdue ? <AlertTriangle size={17} /> : <Icon size={17} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${overdue ? 'text-danger' : 'text-text-primary'}`}>
          {overdue ? `Obowiązek: wpisz ${LABEL[item.kind]}` : `Czas wpisać ${LABEL[item.kind]}`}
        </p>
        <p className="text-xs text-text-secondary">{ageText(item)} Mierzymy co {item.everyDays} dni.</p>
      </div>
      <Pressable
        type="button"
        onClick={onOpen}
        className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold active:scale-95 ${overdue ? 'bg-danger text-on-accent' : 'bg-primary text-on-accent'}`}
      >
        Wpisz
      </Pressable>
    </div>
  );
}

/** Na Dziś: spokojne przypomnienie w dniu terminu, a po jego przekroczeniu czerwony, pulsujący obowiązek aż do wpisu. */
export default function BodyMeasureBanner({ userId }: { userId: string }) {
  const { reminders, rows, loading } = useBodyReminders(userId);
  const save = useSaveBodyEntry(userId, rows);
  const [open, setOpen] = useState<BodyReminderKind | null>(null);
  const actionable = reminders.filter(isActionable);
  if (loading || actionable.length === 0) return null;
  return (
    <>
      <div className="space-y-2">
        {actionable.map((item) => <Row key={item.kind} item={item} onOpen={() => setOpen(item.kind)} />)}
      </div>
      <BodyMeasureSheet kind={open} onClose={() => setOpen(null)} onSave={save} />
    </>
  );
}
