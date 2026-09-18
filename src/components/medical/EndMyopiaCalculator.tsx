import { Pressable } from '../ui/ControlPrimitives';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFaceDistance } from './hooks/useFaceDistance';
import { insertEndmyopiaMeasurement } from '../../lib/endmyopiaApi';
import { ArrowLeft, Ruler } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VisionJournal from './VisionJournal';
import GlassesCabinet from './GlassesCabinet';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { distance, stability, isReady, calibrationFactor, calibrate, resetCalibration, resetStability, faceDetected } = useFaceDistance(videoRef);

  const [phase, setPhase] = useState<Phase>('calibrate');
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
    if (calibrationFactor && phase === 'calibrate') {
      void (async () => { startMeasure('left'); })();
    }
  }, [calibrationFactor, phase, startMeasure]);

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

  // Camera setup
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function setupCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        if (pipVideoRef.current) pipVideoRef.current.srcObject = stream;
      } catch (err: unknown) {
      console.warn('[EndMyopiaCalculator] Failed to setup camera stream:', err);
    }
    }
    setupCamera();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  // PIP <video> unmounts/remounts every time we leave/re-enter the measure phase
  // (it's only rendered inside that phase) — reattach the live stream each time.
  useEffect(() => {
    if (phase === 'measure' && pipVideoRef.current && streamRef.current) {
      pipVideoRef.current.srcObject = streamRef.current;
    }
  }, [phase]);

  const handleCalibrate = () => {
    calibrate(40);
    startMeasure('left');
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
              className="rounded-xl border border-border-custom p-2 text-text-muted hover:text-text-primary bg-surface transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} />
            </Pressable>
            <div>
              <h1 className="text-base font-black uppercase tracking-tight leading-none">Sparky Optics</h1>
              <p className="text-xs text-text-muted mt-0.5">
                {phase === 'calibrate' ? 'Kalibracja wymagana' : 'Wybierz oko do pomiaru'}
              </p>
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center px-4 pt-10 pb-32 gap-6">

            {/* Calibration */}
            {phase === 'calibrate' && (
              <div className="w-full max-w-sm bg-surface border border-border-custom rounded-3xl p-7 text-center shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-5">
                  <Ruler className="text-warning" size={24} />
                </div>
                <h2 className="text-xl font-black mb-2">Kalibracja jednorazowa</h2>
                <p className="text-sm text-text-muted mb-6 leading-relaxed">
                  Wyciągnij rękę, trzymaj telefon dokładnie <span className="text-text-primary font-bold">40 cm</span> od twarzy. Twarz prosto w kamerę.
                </p>
                {isReady && !faceDetected && (
                  <div className="flex items-center gap-2 text-xs text-warning/80 mb-5 bg-warning/10 border border-warning/20 rounded-xl px-3 py-2.5">
                    <div className="w-2 h-2 rounded-full bg-warning animate-pulse shrink-0" />
                    Skieruj twarz na kamerę
                  </div>
                )}
                {isReady && faceDetected && (
                  <div className="flex items-center gap-2 text-xs text-success mb-5 bg-success/10 border border-success/20 rounded-xl px-3 py-2.5">
                    <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                    Twarz wykryta — gotowy do kalibracji
                  </div>
                )}
                <Pressable
                  onClick={handleCalibrate}
                  disabled={!isReady || !faceDetected}
                  className="w-full bg-primary text-background font-bold py-4 rounded-2xl disabled:opacity-[var(--opacity-30)] active:scale-95 ui-interactive"
                >
                  {!isReady ? 'Ładowanie AI...' : 'Skalibruj na 40 cm'}
                </Pressable>
              </div>
            )}

            {/* Eye selection */}
            {phase === 'select-eye' && (
              <>
                <div className="w-full max-w-sm text-center mb-2">
                  <h2 className="text-2xl font-black mb-1">Które oko?</h2>
                  <p className="text-sm text-text-muted">Zasłoń drugie oko i dotknij odpowiedniego</p>
                </div>

                <div className="w-full max-w-sm grid grid-cols-2 gap-4">
                  <Pressable
                    onClick={() => startMeasure('left')}
                    className="aspect-square bg-surface border border-border-custom rounded-3xl flex flex-col items-center justify-center gap-3 active:scale-95 ui-interactive hover:border-primary/50 hover:bg-primary/5"
                  >
                    <span className="text-5xl">👁</span>
                    <span className="font-black text-lg">Lewe</span>
                  </Pressable>
                  <Pressable
                    onClick={() => startMeasure('right')}
                    className="aspect-square bg-surface border border-border-custom rounded-3xl flex flex-col items-center justify-center gap-3 active:scale-95 ui-interactive hover:border-primary/50 hover:bg-primary/5"
                  >
                    <span className="text-5xl">👁</span>
                    <span className="font-black text-lg">Prawe</span>
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

          {/* Glasses Cabinet + History */}
          <div className="w-full max-w-4xl mx-auto px-4 pb-24 space-y-10">
            <GlassesCabinet />
            <div>
              <h2 className="text-2xl font-black font-display uppercase tracking-tight mb-6">Dziennik EndMyopia</h2>
              <VisionJournal refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
