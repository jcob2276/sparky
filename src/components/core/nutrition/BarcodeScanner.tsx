import { Pressable, ControlInput } from '../../ui/ControlPrimitives';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Flashlight, FlashlightOff, Keyboard } from 'lucide-react';
import Spinner from '../../ui/Spinner';

declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

async function createDecoder() {
  const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
  if (window.BarcodeDetector) {
    try {
      const detector = new window.BarcodeDetector({ formats });
      return async (video: HTMLVideoElement) => (await detector.detect(video))[0]?.rawValue;
    } catch {
      // Some implementations expose the API without supporting these formats.
    }
  }

  const { BarcodeFormat, BrowserMultiFormatReader, DecodeHintType, NotFoundException, ChecksumException, FormatException } =
    await import('@zxing/library');
  const reader = new BrowserMultiFormatReader(new Map([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
  ]));
  return (video: HTMLVideoElement) => {
    try {
      return reader.decode(video).getText();
    } catch (error) {
      if (!(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) throw error;
    }
  };
}

export interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
  loading: boolean;
}

export default function BarcodeScanner({ onDetected, onClose, loading }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const cameraAvailable = Boolean(navigator.mediaDevices?.getUserMedia);
  const scanCode = useEffectEvent((code: string) => onDetected(code));

  useEffect(() => {
    if (!cameraAvailable || loading) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let scanTimer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const track = stream.getVideoTracks()[0];
        trackRef.current = track ?? null;
        setTorchSupported(Boolean(track && (track.getCapabilities?.() as { torch?: boolean } | undefined)?.torch));
        if (track && 'applyConstraints' in track) {
          try {
            // @ts-expect-error advanced focusMode is supported on Chromium mobile
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
          } catch {
            // Not supported on all devices, safe to ignore
          }
        }
        const video = videoRef.current;
        if (stopped || !video) return;
        video.srcObject = stream;
        await video.play();
        const decode = await createDecoder();
        const scan = async () => {
          if (stopped) return;
          try {
            const code = video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
              ? (await decode(video))?.replace(/[\s-]+/g, '')
              : undefined;
            if (stopped) return;
            if (code) {
              scanCode(code);
              return;
            }
          } catch (error) {
            if (stopped) return;
            console.error('[BarcodeScanner] decode failed', error);
            stream?.getTracks().forEach((mediaTrack) => mediaTrack.stop());
            setCameraError('Nie udało się odczytać obrazu z kamery — wpisz kod ręcznie');
            return;
          }
          scanTimer = setTimeout(() => { void scan(); }, 150);
        };
        void scan();
      } catch (err: unknown) {
        stream?.getTracks().forEach((track) => track.stop());
        if (stopped) return;
        console.error('[BarcodeScanner] camera failed', err);
        setCameraError('Brak dostępu do kamery — wpisz kod ręcznie');
      }
    })();
    return () => { stopped = true; clearTimeout(scanTimer); stream?.getTracks().forEach((t) => t.stop()); trackRef.current = null; };
  }, [cameraAvailable, loading]);

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  };

  const handleManualSubmit = () => {
    const clean = manualCode.replace(/[\s-]+/g, '').trim();
    if (clean) onDetected(clean);
  };

  return (
    <div className="space-y-3">
      <Pressable onClick={onClose} className="touch-manipulation text-xs font-bold text-text-muted hover:text-text-primary cursor-pointer">← Wstecz</Pressable>
      {cameraAvailable && !cameraError ? (
        <div className="relative rounded-lg overflow-hidden bg-scrim aspect-square">
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-8 border-2 border-primary/70 rounded-lg pointer-events-none" />
          {torchSupported && (
            <Pressable onClick={() => { void toggleTorch(); }} aria-label={torchOn ? 'Wyłącz latarkę' : 'Włącz latarkę'} aria-pressed={torchOn}
              className={`touch-manipulation absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border cursor-pointer ${torchOn ? 'bg-primary text-on-accent border-primary' : 'bg-scrim/60 text-on-accent border-on-accent/30'}`}>
              {torchOn ? <Flashlight size={20} /> : <FlashlightOff size={20} />}
            </Pressable>
          )}
          {loading && <div className="absolute inset-0 flex items-center justify-center bg-scrim/50"><Spinner size="md" className="!border-on-accent/30 !border-t-white" /></div>}
        </div>
      ) : (
        <p className="text-xs text-text-muted text-center py-2">{cameraError || 'Skaner kamery niedostępny — wpisz kod ręcznie'}</p>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Keyboard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <ControlInput value={manualCode} onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
            inputMode="numeric" placeholder="Wpisz kod kreskowy..."
            className="w-full rounded-lg border border-border-custom bg-surface-solid/40 pl-9 pr-2 py-2.5 text-sm text-text-primary outline-none focus:border-primary/40 placeholder:text-text-muted/40" />
        </div>
        <Pressable onClick={handleManualSubmit} disabled={!manualCode.replace(/[\s-]+/g, '').trim() || loading} size="sm" className="touch-manipulation">Szukaj</Pressable>
      </div>
    </div>
  );
}
