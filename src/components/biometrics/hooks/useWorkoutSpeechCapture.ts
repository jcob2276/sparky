import { useCallback, useEffect, useRef, useState } from 'react';
import { createSpeechRecognition } from '../../../lib/audioRecorder';
import { notify } from '../../../lib/notify';
import { useHaptics } from '../../../hooks/useHaptics';

export function useWorkoutSpeechCapture(isOpen: boolean, onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition>>(null);
  const haptics = useHaptics();

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      try {
        if (recognition.abort) recognition.abort();
        else recognition.stop();
      } catch { /* The browser may already have ended recognition. */ }
    }
    setIsListening(false);
  }, []);

  // Release the external resource on either an open-state change or unmount.
  useEffect(() => stopListening, [isOpen, stopListening]);

  const toggleListening = () => {
    if (recognitionRef.current) {
      stopListening();
      return;
    }
    if (!isOpen) return;
    try {
      const recognition = createSpeechRecognition();
      if (!recognition) {
        notify('Dyktafon w przeglądarce nie jest wspierany — wpisz tekst', 'error');
        return;
      }
      recognitionRef.current = recognition;
      recognition.lang = 'pl-PL';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => {
        if (recognitionRef.current === recognition) haptics.light();
      };
      recognition.onresult = (event) => {
        if (recognitionRef.current !== recognition) return;
        const transcript = event.results[0]?.[0]?.transcript ?? '';
        if (transcript) { onTranscript(transcript); haptics.success(); }
      };
      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        setIsListening(false);
      };
      recognition.onerror = () => {
        if (recognitionRef.current !== recognition) return;
        stopListening();
        haptics.error();
      };
      setIsListening(true);
      recognition.start();
    } catch {
      stopListening();
      notify('Nie udało się uruchomić mikrofonu', 'error');
    }
  };

  return { isListening, toggleListening, stopListening };
}
