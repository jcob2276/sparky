import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioFileExtension, getSupportedAudioMimeType } from '../../../lib/audioRecorder';
import { transcribeVoiceRecording } from '../../../lib/voicePlanningApi';
import { notify } from '../../../lib/notify';

type DictationState = 'idle' | 'recording' | 'processing';

/** Nagrywa głos (MediaRecorder działa też w WebView Androida) i zwraca transkrypcję po zatrzymaniu. */
export function useDictationCapture(onTranscript: (text: string) => Promise<void> | void) {
  const [state, setState] = useState<DictationState>('idle');
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; });

  const release = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    release();
  }, [release]);

  const finish = useCallback(async (chunks: Blob[], mimeType: string) => {
    release();
    setState('processing');
    try {
      const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
      const file = new File([blob], `dyktando.${getAudioFileExtension(mimeType)}`, { type: blob.type });
      const text = (await transcribeVoiceRecording(file)).trim();
      if (!text) notify('Nie usłyszałem nic wyraźnego — spróbuj jeszcze raz', 'error');
      else await onTranscriptRef.current(text);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Nie udało się przetworzyć nagrania', 'error');
    } finally {
      setState('idle');
    }
  }, [release]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onstop = () => { void finish(chunks, recorder.mimeType || mimeType); };
      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setState('recording');
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch {
      release();
      notify('Brak dostępu do mikrofonu — zezwól w ustawieniach telefonu', 'error');
    }
  }, [finish, release]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, []);

  return { state, seconds, start, stop };
}
