import { useState, useRef, useEffect, useCallback } from 'react';
import { notify } from '../../../lib/notify';
import { getSupportedAudioMimeType, getAudioFileExtension, startSpeechPreview } from '../../../lib/audioRecorder';
import {
  converseDailyPlan,
  transcribeVoiceRecording,
  type ConversationMessage,
  type PlanSlotItem,
} from '../../../lib/voicePlanningApi';

interface Props {
  userId: string | undefined;
  planningDate: string;
  initialSlots?: Array<{ slot: number; category: string; title: string } | null>;
}

const DEFAULT_SLOTS: PlanSlotItem[] = [
  { slot: 1, category: 'cialo', title: '' },
  { slot: 2, category: 'duch', title: '' },
  { slot: 3, category: 'konto', title: '' },
  { slot: 4, category: 'general', title: '' },
  { slot: 5, category: 'general', title: '' },
];

function createInitialPlanSlots(initialSlots: Props['initialSlots']): PlanSlotItem[] {
  if (!initialSlots || initialSlots.length !== 5) return DEFAULT_SLOTS;
  return initialSlots.map((slot, index) => ({
    slot: index + 1,
    category: (slot?.category as PlanSlotItem['category']) || DEFAULT_SLOTS[index].category,
    title: slot?.title || '',
  }));
}

export function useVoicePlanInterview({ userId, planningDate, initialSlots }: Props) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [slots, setSlots] = useState<PlanSlotItem[]>(() => createInitialPlanSlots(initialSlots));

  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioDuration, setAudioDuration] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechRecognitionRef = useRef<ReturnType<typeof startSpeechPreview>>(null);
  const transcriptRef = useRef('');
  const timerRef = useRef<number | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      speechRecognitionRef.current?.stop?.();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const sendQuery = useCallback(
    async (text: string) => {
      if (!userId || !text.trim()) return;

      const userMsg: ConversationMessage = { role: 'user', content: text.trim() };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setIsProcessing(true);

      try {
        const response = await converseDailyPlan({
          userId,
          planningDate,
          messages: nextMessages,
          currentSlots: slots,
        });

        const assistantMsg: ConversationMessage = {
          role: 'assistant',
          content: response.reply,
        };
        setMessages([...nextMessages, assistantMsg]);
        setSlots(response.slots);
        setIsReady(response.is_ready);
      } catch (err: unknown) {
        console.error('[VoicePlan] conversation error:', err);
        notify(err instanceof Error ? err.message : 'Błąd rozmowy z asystentem', 'error');
      } finally {
        setIsProcessing(false);
      }
    },
    [userId, planningDate, messages, slots],
  );

  const startRecording = useCallback(async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Brak interfejsu nagrywania dźwięku (navigator.mediaDevices).');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];

      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        const mime = recorder.mimeType || mimeType || 'audio/webm';
        const ext = getAudioFileExtension(mime);
        const file = new File(chunks, `voice-plan-${Date.now()}.${ext}`, { type: mime });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        setIsProcessing(true);
        let transcribedText: string;
        try {
          transcribedText = await transcribeVoiceRecording(file);
        } catch (transcribeErr) {
          console.warn('[VoicePlan] Whisper error, using speech recognition fallback:', transcribeErr);
          transcribedText = transcriptRef.current.trim();
        }

        if (transcribedText) {
          await sendQuery(transcribedText);
        } else {
          notify('Nie udało się rozpoznać mowy. Spróbuj ponownie lub wpisz z klawiatury.', 'info');
          setIsProcessing(false);
        }
        setInterimTranscript('');
        transcriptRef.current = '';
      };

      recorder.start();
      setIsRecording(true);
      setAudioDuration(0);
      setInterimTranscript('');
      transcriptRef.current = '';

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setAudioDuration((d) => d + 1);
      }, 1000);

      // Optionally start Web Speech Recognition for live text preview (non-blocking)
      try {
        speechRecognitionRef.current = startSpeechPreview((text) => {
          transcriptRef.current = text;
          setInterimTranscript(text);
        });
      } catch {
        // Web Speech is optional luxury, Whisper is the primary transcription engine
      }
    } catch (err: unknown) {
      console.error('[VoicePlan] startRecording error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Nie udało się uruchomić nagrywania: ${msg}`, 'error');
    }
  }, [sendQuery]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      speechRecognitionRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const handleClearSlot = useCallback((index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], title: '' };
      return next;
    });
  }, []);

  const handleEditSlot = useCallback((index: number, title: string) => {
    setSlots((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], title };
      return next;
    });
  }, []);

  return {
    messages, slots, isReady,
    isRecording, isProcessing, interimTranscript, audioDuration,
    startRecording, stopRecording,
    sendMessage: sendQuery,
    handleClearSlot,
    handleEditSlot,
  };
}
