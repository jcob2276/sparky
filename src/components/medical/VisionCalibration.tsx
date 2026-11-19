import type { RefObject } from 'react';
import { Ruler } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';

interface Props {
  previewRef: RefObject<HTMLVideoElement | null>;
  cameraState: 'loading' | 'ready' | 'error';
  retryCamera: () => void;
  onCalibrate: () => void;
  calibFailed: boolean;
  isReady: boolean;
  faceDetected: boolean;
  countdown: number | null;
}

export function VisionCalibration({ previewRef, cameraState, retryCamera, onCalibrate, calibFailed, isReady, faceDetected, countdown }: Props) {
  return (
    <div className="w-full max-w-sm bg-surface border border-border-custom rounded-3xl p-7 text-center shadow-xl">
      <div className="w-14 h-14 rounded-lg bg-warning/10 flex items-center justify-center mx-auto mb-5">
        <Ruler className="text-warning" size={24} />
      </div>
      <h2 className="text-xl font-semibold mb-2">Kalibracja jednorazowa</h2>
      <p className="text-sm text-text-muted mb-6 leading-relaxed">
        Wyciągnij rękę, trzymaj telefon dokładnie <span className="text-text-primary font-bold">40 cm</span> od twarzy. Twarz prosto w kamerę.
        Po kliknięciu masz 3 sekundy na ustawienie się.
      </p>
      <video ref={previewRef} autoPlay playsInline muted hidden={cameraState !== 'ready'} className="mx-auto mb-5 aspect-[3/4] w-40 -scale-x-100 rounded-2xl bg-scrim/10 object-cover" />
      {calibFailed && (
        <p role="alert" className="mb-5 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2.5 text-xs text-danger">
          Nie widzę twarzy. Ustaw się przed kamerą i spróbuj jeszcze raz.
        </p>
      )}
      {cameraState === 'error' && <p role="alert" className="mb-5 text-sm text-danger">Nie udało się uruchomić kamery. Sprawdź dostęp do kamery w ustawieniach urządzenia lub przeglądarki.</p>}
      {cameraState === 'ready' && isReady && !faceDetected && (
        <div className="flex items-center gap-2 text-xs text-warning/80 mb-5 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2.5">
          <div className="w-2 h-2 rounded-full bg-warning animate-pulse shrink-0" />
          Skieruj twarz na kamerę
        </div>
      )}
      {cameraState === 'ready' && isReady && faceDetected && (
        <div className="flex items-center gap-2 text-xs text-success mb-5 bg-success/10 border border-success/20 rounded-lg px-3 py-2.5">
          <div className="w-2 h-2 rounded-full bg-success shrink-0" />
          Twarz wykryta — gotowy do kalibracji
        </div>
      )}
      <Pressable
        onClick={cameraState === 'error' ? retryCamera : onCalibrate}
        disabled={cameraState !== 'error' && (cameraState === 'loading' || !isReady || !faceDetected || countdown !== null)}
        className="w-full bg-primary text-background font-bold py-4 rounded-lg disabled:opacity-[var(--opacity-30)] active:scale-95 ui-interactive"
      >
        {cameraState === 'error' ? 'Spróbuj ponownie' : cameraState === 'loading' ? 'Uruchamiam kamerę…' : !isReady ? 'Wczytuję wykrywanie twarzy…' : countdown !== null ? `Trzymaj 40 cm… ${countdown}` : 'Skalibruj na 40 cm'}
      </Pressable>
    </div>
  );
}
