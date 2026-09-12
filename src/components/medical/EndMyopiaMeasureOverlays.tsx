import React from 'react';
import { ArrowLeft, Check, RotateCcw, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import FullscreenExperience from '../ui/FullscreenExperience';
import StabilityRing from './StabilityRing';

const FOCUS_SIZES = [1.5, 2.2, 3.2, 4.5, 6.0, 8.0];

export interface MeasurePhaseOverlayProps {
  pipVideoRef: React.RefObject<HTMLVideoElement | null>;
  faceDetected: boolean;
  distance: number | null;
  stability: number;
  sizeLevel: number;
  autoCapture: boolean;
  onBack: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onManualCapture: () => void;
  onToggleAutoCapture: () => void;
}

export function MeasurePhaseOverlay({
  pipVideoRef,
  faceDetected,
  distance,
  stability,
  sizeLevel,
  autoCapture,
  onBack,
  onZoomOut,
  onZoomIn,
  onManualCapture,
  onToggleAutoCapture,
}: MeasurePhaseOverlayProps) {
  return (
    <FullscreenExperience label="Pomiar wzroku" tone="light">
      <div className="absolute top-4 right-4 w-16 h-20 rounded-xl overflow-hidden border-2 border-border-custom shadow-lg">
        <video
          ref={pipVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover -scale-x-100"
          style={{ objectFit: 'cover' }}
        />
      </div>

      <div className="absolute top-4 left-4 flex items-center gap-3 z-[var(--z-raised)]">
        <Pressable
          onClick={onBack}
          className="p-2 rounded-xl bg-scrim/5 text-text-muted hover:bg-scrim/10 transition-colors"
        >
          <ArrowLeft size={18} />
        </Pressable>
        <div
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            faceDetected ? 'bg-success text-success' : 'bg-danger text-danger'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-success' : 'bg-danger animate-pulse'}`} />
          {faceDetected ? `${distance!.toFixed(1)} cm` : 'Brak twarzy'}
        </div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-[var(--z-raised)]">
        <StabilityRing progress={stability} size={52} />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pt-20 pb-32">
        <p
          className="text-scrim font-black tracking-[var(--ds-arbitrary-0-25em)] text-center leading-none select-none"
          style={{ fontSize: `${FOCUS_SIZES[sizeLevel - 1]}rem` }}
        >
          FOCUS
        </p>
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 px-8">
        <div className="flex items-center justify-between w-full">
          <Pressable
            onClick={onZoomOut}
            className="p-3 rounded-full bg-scrim/5 text-text-muted hover:bg-scrim/10 active:scale-90 transition-all"
          >
            <ZoomOut size={20} />
          </Pressable>

          {autoCapture ? (
            <div className="flex flex-col items-center text-center">
              <p className="text-xs text-text-muted font-medium">Stój na krawędzi rozmycia</p>
              <p className="text-xs text-text-muted mt-0.5">Kółko wypełni się samo i zapisze</p>
            </div>
          ) : (
            <Pressable
              onClick={onManualCapture}
              disabled={!faceDetected}
              className="bg-info text-on-accent font-black px-7 py-3 rounded-2xl text-sm disabled:opacity-[var(--opacity-30)] active:scale-95 transition-all"
            >
              Złap pomiar
            </Pressable>
          )}

          <Pressable
            onClick={onZoomIn}
            className="p-3 rounded-full bg-scrim/5 text-text-muted hover:bg-scrim/10 active:scale-90 transition-all"
          >
            <ZoomIn size={20} />
          </Pressable>
        </div>

        <Pressable
          onClick={onToggleAutoCapture}
          className={`text-xs font-black px-3 py-1.5 rounded-full transition-all ${
            autoCapture
              ? 'bg-info text-info border border-info'
              : 'bg-surface-2 text-text-muted border border-border-custom'
          }`}
        >
          {autoCapture ? '● Auto-capture' : '○ Ręczne złapanie'}
        </Pressable>
      </div>
    </FullscreenExperience>
  );
}

export interface CapturedPhaseOverlayProps {
  selectedEye: 'left' | 'right';
  capturedDistance: number | null;
  capturedDiopters: number | null;
  isSaving: boolean;
  saveError: boolean;
  onSave: () => void;
  onRetry: () => void;
}

export function CapturedPhaseOverlay({
  selectedEye,
  capturedDistance,
  capturedDiopters,
  isSaving,
  saveError,
  onSave,
  onRetry,
}: CapturedPhaseOverlayProps) {
  return (
    <FullscreenExperience label="Wynik pomiaru wzroku" className="items-center justify-center gap-8 px-6">
      <div className="w-full max-w-xs rounded-3xl bg-surface border-2 border-primary/30 p-8 text-center shadow-2xl">
        <p className="text-xs uppercase tracking-widest text-text-muted mb-5 font-bold">
          {selectedEye === 'left' ? '👁 Lewe oko' : 'Prawe oko 👁'}
        </p>
        <div className="flex items-end justify-center gap-4">
          <div>
            <p className="text-6xl font-black font-display tabular-nums">{capturedDistance?.toFixed(1)}</p>
            <p className="text-sm text-text-muted font-bold mt-1">cm</p>
          </div>
          <p className="text-3xl font-black text-text-muted mb-3">=</p>
          <div>
            <p className="text-6xl font-black font-display text-primary tabular-nums">{capturedDiopters?.toFixed(2)}</p>
            <p className="text-sm text-text-muted font-bold mt-1">D</p>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="w-full max-w-xs flex items-center gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="shrink-0" />
          Błąd zapisu. Spróbuj ponownie.
        </div>
      )}

      <div className="w-full max-w-xs flex flex-col gap-3">
        <Pressable
          onClick={onSave}
          disabled={isSaving}
          className="w-full py-5 bg-primary text-background font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-[var(--opacity-50)]"
        >
          <Check size={18} />
          {isSaving ? 'Zapisywanie...' : 'Zapisz pomiar'}
        </Pressable>
        <Pressable
          onClick={onRetry}
          className="w-full py-3 text-sm text-text-muted flex items-center justify-center gap-1.5 hover:text-text-primary transition-colors"
        >
          <RotateCcw size={14} />
          Zmierz ponownie
        </Pressable>
      </div>
    </FullscreenExperience>
  );
}

export interface SavedPhaseOverlayProps {
  selectedEye: 'left' | 'right';
}

export function SavedPhaseOverlay({ selectedEye }: SavedPhaseOverlayProps) {
  return (
    <FullscreenExperience label="Pomiar zapisany" tone="success" className="items-center justify-center gap-4">
      <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
        <Check size={36} className="text-success" />
      </div>
      <p className="text-2xl font-black text-success">Zapisano!</p>
      <p className="text-sm text-success">
        {selectedEye === 'left' ? 'Przechodzę do prawego oka...' : 'Pomiary zakończone!'}
      </p>
    </FullscreenExperience>
  );
}
