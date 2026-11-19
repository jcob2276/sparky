import { useEffect, useRef, useState } from 'react';

export function useVisionCamera(phase: string) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let current: MediaStream | null = null;
    async function openCamera() {
      try {
        current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (cancelled) {
          current.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(current);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    }
    void openCamera();
    return () => {
      cancelled = true;
      current?.getTracks().forEach((track) => track.stop());
    };
  }, [attempt]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const previewElement = pipVideoRef.current;
    if (videoElement) videoElement.srcObject = stream;
    if (previewElement) previewElement.srcObject = stream;
  }, [stream, phase]);

  return { videoRef, pipVideoRef, state, retry: () => { setState('loading'); setAttempt((value) => value + 1); } };
}
