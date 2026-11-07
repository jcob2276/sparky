import { Loader2, Mic, Square } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';

interface Props {
  state: 'idle' | 'recording' | 'processing';
  seconds: number;
  onStart: () => void;
  onStop: () => void;
}

const clock = (total: number) => `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;

/** Duży przycisk dyktowania: mów swobodnie, AI wyłuska zadania. */
export default function TodoDictationBar({ state, seconds, onStart, onStop }: Props) {
  const recording = state === 'recording';
  const processing = state === 'processing';
  return (
    <Pressable
      onClick={recording ? onStop : onStart}
      disabled={processing}
      aria-label={recording ? 'Zakończ nagrywanie' : 'Podyktuj zadania'}
      className={`flex min-h-14 w-full items-center justify-center gap-3 rounded-xl px-4 text-sm font-semibold ${
        recording ? 'bg-danger text-on-accent' : 'bg-primary/10 text-primary'
      }`}
    >
      {processing ? <Loader2 size={20} className="animate-spin" /> : recording ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
      <span>
        {processing ? 'Rozpisuję na zadania…' : recording ? `Słucham ${clock(seconds)} · stuknij, aby zakończyć` : 'Podyktuj wszystko, co masz w głowie'}
      </span>
    </Pressable>
  );
}
