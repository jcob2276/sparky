import { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { ControlInput } from '../../ui/ControlPrimitives';
import type { useWorkoutLogger } from '../hooks/useWorkoutLogger';

import Button from '../../ui/Button';

interface ManualTimePickerProps {
  logger: ReturnType<typeof useWorkoutLogger>;
}

export default function ManualTimePicker({ logger }: ManualTimePickerProps) {
  const [isOpen, setIsOpen] = useState(logger.manualTime);

  return (
    <div className="rounded-2xl border border-border-custom/60 bg-surface-solid/30 overflow-hidden">
      <Button
        variant="ghost"
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next && !logger.manualTime) {
            logger.setManualTime(true);
            if (logger.timerStart) logger.setTimerStart(null);
          } else if (!next && logger.manualTime) {
            logger.setManualTime(false);
          }
        }}
        className="w-full flex items-center justify-between p-3 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors cursor-pointer !rounded-none"
      >
        <span className="flex items-center gap-2">
          <Clock size={13} className="text-text-muted" />
          <span>Wpisz godziny ręcznie</span>
        </span>
        <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
      </Button>

      {isOpen && (
        <div className="p-3 pt-0 border-t border-border-custom/30 grid grid-cols-3 gap-2 animate-in fade-in duration-150">
          <div className="space-y-1">
            <label className="text-3xs font-black uppercase tracking-widest text-text-muted">Data</label>
            <ControlInput
              type="date"
              value={logger.workoutDate}
              onChange={(e) => logger.setWorkoutDate(e.target.value)}
              className="w-full bg-surface border border-border-custom rounded-xl px-2 py-1.5 text-xs font-bold text-text-primary outline-none focus:border-primary/50 text-center cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-3xs font-black uppercase tracking-widest text-text-muted">Start</label>
            <ControlInput
              type="time"
              value={logger.startTimeManual}
              onChange={(e) => logger.setStartTimeManual(e.target.value)}
              className="w-full bg-surface border border-border-custom rounded-xl px-2 py-1.5 text-xs font-bold text-text-primary outline-none focus:border-primary/50 text-center cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-3xs font-black uppercase tracking-widest text-text-muted">Koniec</label>
            <ControlInput
              type="time"
              value={logger.endTimeManual}
              onChange={(e) => logger.setEndTimeManual(e.target.value)}
              className="w-full bg-surface border border-border-custom rounded-xl px-2 py-1.5 text-xs font-bold text-text-primary outline-none focus:border-primary/50 text-center cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
