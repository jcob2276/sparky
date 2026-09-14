import { useState, useEffect, useRef } from 'react';
import { Timer, X, Plus, RotateCcw } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { useHaptics } from '../../../hooks/useHaptics';

interface RestTimerBarProps {
  initialSeconds?: number;
  onFinish?: () => void;
  onDismiss?: () => void;
}

export default function RestTimerBar({
  initialSeconds = 90,
  onFinish,
  onDismiss,
}: RestTimerBarProps) {
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [remaining, setRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const haptics = useHaptics();
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!isRunning || remaining <= 0) return;

    const timer = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRunning(false);
          if (!finishedRef.current) {
            finishedRef.current = true;
            haptics.success();
            onFinish?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, remaining, haptics, onFinish]);

  const addTime = (secs: number) => {
    haptics.light();
    setTotalSeconds((prev) => prev + secs);
    setRemaining((prev) => prev + secs);
    setIsRunning(true);
    finishedRef.current = false;
  };

  const restart = (secs = totalSeconds) => {
    haptics.light();
    setTotalSeconds(secs);
    setRemaining(secs);
    setIsRunning(true);
    finishedRef.current = false;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const pct = totalSeconds > 0 ? Math.max(0, Math.min(100, (remaining / totalSeconds) * 100)) : 0;
  const isDone = remaining === 0;

  return (
    <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-30 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div
        className={`rounded-2xl border shadow-xl backdrop-blur-md p-3 transition-colors ${
          isDone
            ? 'bg-success/15 border-success/40 text-success'
            : 'bg-surface-solid/95 border-primary/30 text-text-primary'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left: icon + time */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-xl ${isDone ? 'bg-success/20 text-success' : 'bg-primary/15 text-primary'}`}>
              <Timer size={16} />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-black font-mono tracking-tight tabular-nums">
                  {isDone ? 'Koniec przerwy!' : formatTime(remaining)}
                </span>
                <span className="text-3xs font-bold uppercase tracking-wider text-text-muted">
                  {isDone ? 'Czas na serię' : 'Odpoczynek'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick actions */}
          <div className="flex items-center gap-1.5">
            {!isDone && (
              <Pressable
                onClick={() => addTime(30)}
                className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-surface border border-border-custom text-2xs font-black text-text-secondary hover:text-text-primary transition-all active:scale-95 cursor-pointer"
                title="Dodaj 30 sekund"
              >
                <Plus size={10} /> 30s
              </Pressable>
            )}

            {isDone ? (
              <Pressable
                onClick={() => restart(90)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-success text-on-accent text-2xs font-black uppercase tracking-wider hover:bg-success/90 transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw size={11} /> 90s
              </Pressable>
            ) : (
              <div className="flex gap-1">
                {[60, 90, 120].map((s) => (
                  <Pressable
                    key={s}
                    onClick={() => restart(s)}
                    className={`px-1.5 py-1 rounded-md text-3xs font-bold transition-all cursor-pointer ${
                      totalSeconds === s ? 'bg-primary/20 text-primary font-black' : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {s}s
                  </Pressable>
                ))}
              </div>
            )}

            <Pressable
              onClick={onDismiss}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer ml-1"
              title="Zamknij stoper"
            >
              <X size={14} />
            </Pressable>
          </div>
        </div>

        {/* Progress bar */}
        {!isDone && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border-custom/50">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
