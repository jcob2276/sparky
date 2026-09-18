import { useState } from 'react';
import { Mic, Sparkles } from 'lucide-react';
import Modal from '../../ui/Modal';
import { Pressable, ControlTextarea } from '../../ui/ControlPrimitives';
import Spinner from '../../ui/Spinner';
import { parseWorkoutNl, type ParsedWorkoutResult } from '../../../lib/health/workoutNlApi';
import { notify } from '../../../lib/notify';
import { useHaptics } from '../../../hooks/useHaptics';

interface WorkoutNlCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyParsed: (result: ParsedWorkoutResult) => void;
}

const EXAMPLE_PROMPTS = [
  'Wyciskanie hantli skos 32kg x 10, 36kg x 8, 38kg x 6, wznosy bokiem 14kg 3x15',
  'Przysiad 100kg 3 serie po 5, RDL 80kg 3x8, wykroki 20kg 2x10',
  'Podciąganie BW 4x8, wiosłowanie hantlem 36kg 3x10, biceps 16kg 3x12',
];

export default function WorkoutNlCaptureModal({
  isOpen,
  onClose,
  onApplyParsed,
}: WorkoutNlCaptureModalProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const haptics = useHaptics();

  const handleSpeechToggle = () => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (!SpeechRecognition) {
      notify('Dyktafon w przeglądarce nie jest wspierany — wpisz tekst', 'error');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pl-PL';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        haptics.light();
      };

      /* eslint-disable @typescript-eslint/no-explicit-any */
      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript || '';
        if (transcript) {
          setText((prev) => (prev ? `${prev}, ${transcript}` : transcript));
          haptics.success();
        }
      };
      /* eslint-enable @typescript-eslint/no-explicit-any */

      recognition.onerror = () => {
        setIsListening(false);
        haptics.error();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      notify('Nie udało się uruchomić mikrofonu', 'error');
    }
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      notify('Wpisz lub podyktuj opis treningu', 'error');
      return;
    }

    setIsSubmitting(true);
    haptics.light();

    try {
      const result = await parseWorkoutNl(trimmed);
      if (!result.exercises.length && !result.activities.length) {
        notify('Nie udało się rozpoznać ćwiczeń w tekście', 'info');
        return;
      }

      haptics.success();
      notify(`Rozpoznano ${result.exercises.length} ćwiczeń`, 'info');
      onApplyParsed(result);
      onClose();
    } catch (err: unknown) {
      haptics.error();
      const msg = err instanceof Error ? err.message : 'Błąd parsowania';
      notify(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Zrzut Treningu AI (DeepSeek)" size="md">
      <div className="space-y-4">
        <p className="text-xs text-text-secondary">
          Wklej notatki z siłowni lub podyktuj seriami — model dopasuje ćwiczenia do Twojej historii.
        </p>

        <div className="relative">
          <ControlTextarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="np. Wyciskanie sztangi 80kg x 8, 85kg x 6, potem rozpiętki 16kg 3x12..."
            rows={4}
            className="w-full bg-surface-solid border border-border-custom rounded-2xl p-3.5 text-xs text-text-primary outline-none focus:border-primary/50 focus:shadow-focus ui-interactive resize-none"
          />

          <Pressable
            onClick={handleSpeechToggle}
            className={`absolute bottom-3 right-3 p-2 rounded-xl ui-interactive cursor-pointer ${
              isListening
                ? 'bg-danger text-on-accent animate-pulse shadow-md'
                : 'bg-surface border border-border-custom text-text-secondary hover:text-text-primary'
            }`}
            title={isListening ? 'Zatrzymaj dyktowanie' : 'Dyktuj głosem'}
          >
            <Mic size={15} />
          </Pressable>
        </div>

        {/* Quick Example Chips */}
        <div className="space-y-1.5">
          <span className="text-3xs font-black uppercase tracking-wider text-text-muted">Przykłady:</span>
          <div className="flex flex-col gap-1">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <Pressable
                key={i}
                onClick={() => {
                  haptics.light();
                  setText(ex);
                }}
                className="text-left text-3xs text-text-secondary bg-surface/60 hover:bg-surface border border-border-custom/50 rounded-xl px-2.5 py-1.5 truncate cursor-pointer transition-colors"
              >
                {ex}
              </Pressable>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Pressable
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border-custom bg-surface text-text-secondary text-xs font-bold hover:text-text-primary ui-interactive text-center cursor-pointer"
          >
            Anuluj
          </Pressable>
          <Pressable
            onClick={handleSubmit}
            disabled={isSubmitting || !text.trim()}
            className="flex-1 py-3 rounded-xl bg-primary text-on-accent text-xs font-black uppercase tracking-wider shadow-md hover:bg-primary-hover disabled:opacity-50 ui-interactive flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Sparkles size={14} /> Rozpoznaj & Wstaw
              </>
            )}
          </Pressable>
        </div>
      </div>
    </Modal>
  );
}
