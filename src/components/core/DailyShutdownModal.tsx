/**
 * @component DailyShutdownModal
 * @role Jednoetapowe wieczorne domknięcie dnia, po którym otwiera się plan jutra.
 */
import { X, Send } from 'lucide-react';
import Button from '../ui/Button';
import { ControlInput, ControlTextarea } from '../ui/ControlPrimitives';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { useShutdownData } from './shutdown/useShutdownData';
import DailyScorePicker from '../shared/DailyScorePicker';
import ShutdownChecklist from './shutdown/ShutdownChecklist';
import ShutdownFoodReview from './shutdown/ShutdownFoodReview';

interface Props {
  onClose: () => void;
  onSaved?: () => void;
  onPlanTomorrow?: () => void;
}

export default function DailyShutdownModal({
  onClose,
  onSaved,
  onPlanTomorrow,
}: Props) {
  const data = useShutdownData();

  const handleSave = async () => {
    const saved = await data.handleSaveShutdown();
    if (!saved) return;
    onSaved?.();
    onPlanTomorrow?.();
  };

  const toggleTask = (index: number) => {
    data.setCompletedTasks((current) =>
      current.map((done, taskIndex) => (taskIndex === index ? !done : done)),
    );
  };

  if (data.loading) {
    return (
      <Modal isOpen onClose={onClose} showCloseButton={false} padding="p-6" size="xs" closeOnBackdropClick={false}>
        <div className="flex flex-col items-center gap-3">
          <Spinner size="md" />
          <span className="text-sm font-bold text-text-muted">Wczytywanie dnia…</span>
        </div>
      </Modal>
    );
  }

  if (!data.todayWin) {
    return (
      <Modal isOpen onClose={onClose} showCloseButton={false} padding="p-6" size="sm">
        <div className="text-center space-y-4">
          <h2 className="text-base font-black text-text-primary">Brak planu na dziś</h2>
          <p className="text-sm text-text-muted">Nie ma dzisiejszej Power List do rozliczenia.</p>
          <Button onClick={onClose} className="w-full" size="sm">Zamknij</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} showCloseButton={false} padding="p-0" overflowY={false} size="lg">
      <div className="relative w-full flex flex-col max-h-[var(--ds-h-85vh)] overflow-hidden">
        <header className="p-4 border-b border-border-custom/20 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-text-primary uppercase tracking-wider">Domknięcie dnia</h2>
            <span className="text-xs font-semibold text-text-muted">{data.today}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} icon={<X size={18} />} />
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <section className="space-y-2">
            <span className="text-xs font-bold text-text-secondary">Power List</span>
            {data.tasksList.map((task) => (
              <label
                key={task.idx}
                className="px-3 py-2.5 rounded-xl border border-border-custom/40 bg-surface/30 flex items-center gap-3 cursor-pointer"
              >
                <ControlInput
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.idx)}
                  className="size-5 accent-primary"
                />
                <span className={`text-sm font-semibold text-text-primary ${task.done ? 'line-through opacity-[var(--opacity-60)]' : ''}`}>
                  {task.title}
                </span>
              </label>
            ))}
          </section>

          <section className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary block" htmlFor="shutdown-reflection">
              Co realnie poszło inaczej i dlaczego?
            </label>
            <ControlTextarea
              id="shutdown-reflection"
              value={data.reflectionText}
              onChange={(event) => data.setReflectionText(event.target.value)}
              placeholder="Krótka refleksja o dniu i napotkanym tarciu…"
              rows={3}
              className="w-full bg-surface-2 border border-border-custom/60 rounded-xl px-3 py-2 text-sm font-semibold text-text-primary resize-none"
            />
          </section>

          <DailyScorePicker
            dayScore={data.dayScore}
            setDayScore={data.setDayScore}
            moodScore={data.moodScore}
            setMoodScore={data.setMoodScore}
          />

          {data.userId ? (
            <>
              <ShutdownChecklist userId={data.userId} date={data.today} />
              <ShutdownFoodReview userId={data.userId} date={data.today} />
            </>
          ) : null}
        </div>

        <footer className="p-4 border-t border-border-custom/20">
          <Button onClick={handleSave} loading={data.saving} icon={<Send size={14} />} className="w-full">
            {data.saving ? 'Zamykam dzień…' : 'Zatwierdź zamknięcie'}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
