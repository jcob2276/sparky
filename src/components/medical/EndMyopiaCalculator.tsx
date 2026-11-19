import { useBackHandler } from '../../lib/native/backStack';
import { Pressable } from '../ui/ControlPrimitives';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VisionCalibration } from './VisionCalibration';
import { useVisionCamera } from './hooks/useVisionCamera';
import { useFaceDistance } from './hooks/useFaceDistance';
import { insertEndmyopiaMeasurement } from '../../lib/endmyopiaApi';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VisionJournal from './VisionJournal';
import { useHaptics } from '../../hooks/useHaptics';
import { useUserId } from '../../store/useStore';
import { STORAGE_KEYS } from '../../lib/constants';
import {
  MeasurePhaseOverlay,
  CapturedPhaseOverlay,
  SavedPhaseOverlay,
} from './EndMyopiaMeasureOverlays';

type Eye = 'left' | 'right';
type Phase = 'calibrate' | 'select-eye' | 'measure' | 'captured' | 'saved';

export default function EndMyopiaCalculator() {
  const navigate = useNavigate();
  const haptics = useHaptics();
  const userId = useUserId();
  const [phase, setPhase] = useState<Phase>('calibrate');
  const camera = useVisionCamera(phase);
  const { videoRef, pipVideoRef } = camera;
  const { distance, stability, isReady, calibrationFactor, calibrate, resetCalibration, resetStability, faceDetected } = useFaceDistance(videoRef);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [calibFailed, setCalibFailed] = useState(false);
  const calibTimerRef = useRef<number | null>(null);
  useEffect(() => () => { if (calibTimerRef.current) window.clearTimeout(calibTimerRef.current); }, []);
  const [selectedEye, setSelectedEye] = useState<Eye>('left');
  const [capturedDistance, setCapturedDistance] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sizeLevel, setSizeLevel] = useState(4); // 1=smallest … 6=largest
  const [autoCapture, setAutoCapture] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.ENDMYOPIA_AUTO_CAPTURE) !== 'false'
  );

  const capturedDiopters = capturedDistance ? (-100 / capturedDistance) : null;

  const startMeasure = useCallback((eye: Eye) => {
    setSelectedEye(eye);
    setCapturedDistance(null);
    setSaveError(false);
    resetStability();
    setPhase('measure');
  }, [resetStability]);

  // Skip calibrate phase if already calibrated
  useEffect(() => {
    if (calibrationFactor && phase === 'calibrate' && camera.state === 'ready') {
      void (async () => { startMeasure('left'); })();
    }
  }, [calibrationFactor, phase, startMeasure, camera.state]);

  // Bez kalibracji pomiar nie ma sensu: wracamy do ekranu kalibracji zamiast zostawiać pusty widok pomiaru.
  useEffect(() => {
    if (!calibrationFactor && (phase === 'measure' || phase === 'select-eye')) {
      void (async () => { setPhase('calibrate'); })();
    }
  }, [calibrationFactor, phase]);

  // Systemowy „wstecz” w pomiarze wraca do wyboru oka (albo kalibracji), a nie wyrzuca z modułu Wzrok.
  const inMeasurement = phase === 'measure' || phase === 'captured';
  useBackHandler(() => {
    setPhase(calibrationFactor ? 'select-eye' : 'calibrate');
    setCapturedDistance(null);
    return true;
  }, inMeasurement);

  // Auto-capture when stability reaches 1 (only in auto mode)
  useEffect(() => {
    if (!autoCapture) return;
    if (phase === 'measure' && stability >= 1 && distance !== null) {
      haptics.vibrate([80, 40, 80]);
      void (async () => {
        setCapturedDistance(distance);
        setPhase('captured');
        resetStability();
      })();
    }
  }, [stability, phase, distance, autoCapture, haptics, resetStability]);

  const handleManualCapture = () => {
    if (distance === null) return;
    haptics.vibrate([80, 40, 80]);
    setCapturedDistance(distance);
    setPhase('captured');
    resetStability();
  };

  const toggleAutoCapture = () => {
    setAutoCapture(!autoCapture);
    localStorage.setItem(STORAGE_KEYS.ENDMYOPIA_AUTO_CAPTURE, String(!autoCapture));
  };

  // Odliczanie 3-2-1 daje czas, żeby wyciągnąć rękę na 40 cm; kalibracja łapie klatkę dopiero na końcu.
  const handleCalibrate = () => {
    setCalibFailed(false);
    setCountdown(3);
    const tick = (n: number) => {
      calibTimerRef.current = window.setTimeout(() => {
        if (n > 1) {
          setCountdown(n - 1);
          tick(n - 1);
          return;
        }
        setCountdown(null);
        // Do pomiaru przechodzimy tylko po udanej kalibracji; inaczej zostajemy na ekranie kalibracji.
        if (calibrate(40)) startMeasure('left');
        else setCalibFailed(true);
      }, 1000);
    };
    tick(3);
  };

  const handleRetry = () => {
    setCapturedDistance(null);
    setSaveError(false);
    resetStability();
    setPhase('measure');
  };

  const handleSave = async () => {
    if (!capturedDistance || !capturedDiopters) return;
    setIsSaving(true);
    setSaveError(false);
    try {
      if (!userId) throw new Error('Brak zalogowanego użytkownika');
      await insertEndmyopiaMeasurement({
        userId,
        eyeMeasured: selectedEye,
        blurDistanceCm: parseFloat(capturedDistance.toFixed(2)),
        diopters: parseFloat(capturedDiopters.toFixed(2)),
      });
      setRefreshTrigger(prev => prev + 1);

      const currentEye = selectedEye;
      setPhase('saved');

      setTimeout(() => {
        if (currentEye === 'left') {
          startMeasure('right');
        } else {
          setPhase('select-eye');
        }
      }, 1500);
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">

      {/* Hidden video (PIP only in measure phase) */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {/* ══════════════════════════════════════════════
          MEASURE PHASE — full-screen, immersive
      ══════════════════════════════════════════════ */}
      {phase === 'measure' && (
        <MeasurePhaseOverlay
          pipVideoRef={pipVideoRef}
          faceDetected={faceDetected}
          distance={distance}
          stability={stability}
          sizeLevel={sizeLevel}
          autoCapture={autoCapture}
          onBack={() => setPhase('select-eye')}
          onZoomOut={() => setSizeLevel((l) => Math.max(1, l - 1))}
          onZoomIn={() => setSizeLevel((l) => Math.min(6, l + 1))}
          onManualCapture={handleManualCapture}
          onToggleAutoCapture={toggleAutoCapture}
        />
      )}

      {phase === 'captured' && (
        <CapturedPhaseOverlay
          selectedEye={selectedEye}
          capturedDistance={capturedDistance}
          capturedDiopters={capturedDiopters}
          isSaving={isSaving}
          saveError={saveError}
          onSave={handleSave}
          onRetry={handleRetry}
        />
      )}

      {phase === 'saved' && (
        <SavedPhaseOverlay selectedEye={selectedEye} />
      )}

      {/* ══════════════════════════════════════════════
          NORMAL PHASES (calibrate / select-eye)
      ══════════════════════════════════════════════ */}
      {(phase === 'calibrate' || phase === 'select-eye') && (
        <>
          <header className="sticky top-0 z-[var(--z-modal)] w-full px-4 py-3 flex items-center gap-3 border-b border-border-custom bg-background/90 backdrop-blur-[var(--blur-md)]">
            <Pressable
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/dzis');
                }
              }}
              aria-label="Wróć"
              className="rounded-lg border border-border-custom p-2 text-text-muted hover:text-text-primary bg-surface transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} />
            </Pressable>
            <div>
              <h1 className="text-base font-semibold tracking-tight leading-none">Wzrok</h1>
              <p className="text-xs text-text-muted mt-0.5">
                {phase === 'calibrate' ? 'Kalibracja wymagana' : 'Wybierz oko do pomiaru'}
              </p>
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center px-4 pt-10 pb-32 gap-6">

            {/* Calibration */}
            {phase === 'calibrate' && (
              <VisionCalibration previewRef={pipVideoRef} cameraState={camera.state} retryCamera={camera.retry}
                onCalibrate={handleCalibrate} calibFailed={calibFailed} isReady={isReady} faceDetected={faceDetected} countdown={countdown} />
            )}

            {/* Eye selection */}
            {phase === 'select-eye' && (
              <>
                <div className="w-full max-w-sm text-center mb-2">
                  <h2 className="text-2xl font-semibold mb-1">Które oko?</h2>
                  <p className="text-sm text-text-muted">Zasłoń drugie oko i dotknij odpowiedniego</p>
                </div>

                <div className="w-full max-w-sm grid grid-cols-2 gap-4">
                  <Pressable
                    onClick={() => startMeasure('left')}
                    className="aspect-square bg-surface border border-border-custom rounded-3xl flex flex-col items-center justify-center gap-3 active:scale-95 ui-interactive hover:border-primary/50 hover:bg-primary/5"
                  >
                    <span className="text-5xl">👁</span>
                    <span className="font-semibold text-lg">Lewe</span>
                  </Pressable>
                  <Pressable
                    onClick={() => startMeasure('right')}
                    className="aspect-square bg-surface border border-border-custom rounded-3xl flex flex-col items-center justify-center gap-3 active:scale-95 ui-interactive hover:border-primary/50 hover:bg-primary/5"
                  >
                    <span className="text-5xl">👁</span>
                    <span className="font-semibold text-lg">Prawe</span>
                  </Pressable>
                </div>

                <Pressable
                  onClick={resetCalibration}
                  className="text-xs text-text-muted/50 hover:text-text-muted transition-colors underline underline-offset-4 mt-2"
                >
                  Powtórz kalibrację
                </Pressable>
              </>
            )}
          </main>

          {/* Dziennik EndMyopia */}
          <div className="w-full max-w-4xl mx-auto px-4 pb-24 space-y-10">
            <div>
              <h2 className="text-2xl font-semibold font-display tracking-tight mb-6">Dziennik EndMyopia</h2>
              <VisionJournal refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
