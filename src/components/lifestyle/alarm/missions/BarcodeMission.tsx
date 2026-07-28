import { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, CameraOff, CheckCircle2 } from 'lucide-react';
import { notify } from '../../../../lib/notify';

interface BarcodeMissionProps {
  targetBarcodeValue?: string;
  targetBarcodeName?: string;
  onComplete: () => void;
}

export function BarcodeMission({ targetBarcodeValue, targetBarcodeName, onComplete }: BarcodeMissionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let scanInterval: number | null = null;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStreamActive(true);
        }

        // Try BarcodeDetector if supported in browser
        if ('BarcodeDetector' in window) {
          const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({
            formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'upc_a']
          });

          scanInterval = window.setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const scanned = barcodes[0].rawValue;
                  handleMatch(scanned);
                }
              } catch (e) {
                // ignore scanning frame errors
              }
            }
          }, 400);
        }
      } catch (err) {
        console.warn('[BarcodeMission] Camera access failed:', err);
        setPermissionError(true);
      }
    };

    void startCamera();

    return () => {
      if (scanInterval !== null) clearInterval(scanInterval);
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleMatch = (scannedCode: string) => {
    if (!targetBarcodeValue || targetBarcodeValue.trim() === '' || scannedCode.includes(targetBarcodeValue) || targetBarcodeValue.includes(scannedCode)) {
      notify('Kod kreskowy zweryfikowany pomyślnie!', 'success');
      onComplete();
    } else {
      notify(`Zeskanowano: ${scannedCode}. Nie pasuje do wymaganego kodu.`, 'error');
    }
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    handleMatch(manualInput.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-5 bg-surface/50 backdrop-blur-md rounded-2xl border border-white/10 max-w-sm mx-auto">
      <div className="flex items-center space-x-2 text-cyan-400">
        <QrCode className="w-6 h-6 animate-pulse" />
        <span className="text-sm font-semibold tracking-wider uppercase">Skanuj Kod Produktu</span>
      </div>

      <div className="text-xs text-muted-foreground">
        {targetBarcodeName ? (
          <span>Idź do miejsca: <strong className="text-foreground font-semibold">{targetBarcodeName}</strong> i zeskanuj kod!</span>
        ) : (
          <span>Zeskanuj zarejestrowany kod kreskowy lub QR z opakowania</span>
        )}
      </div>

      <div className="relative w-full aspect-video bg-black/60 rounded-xl overflow-hidden border border-white/15 flex items-center justify-center">
        {permissionError ? (
          <div className="p-4 text-center space-y-2">
            <CameraOff className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="text-xs text-muted-foreground">Brak dostępu do kamery lub kamerka wyłączona.</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {streamActive && (
              <div className="absolute inset-0 border-2 border-dashed border-cyan-400/60 m-6 rounded-lg pointer-events-none animate-pulse" />
            )}
          </>
        )}
      </div>

      <div className="w-full space-y-2 pt-2">
        <div className="text-xs text-muted-foreground">Lub wpisz/zeskanuj kod ręcznie:</div>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Kod EAN / QR..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-sm text-foreground focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={handleManualSubmit}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-xs flex items-center space-x-1"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>OK</span>
          </button>
        </div>
      </div>
    </div>
  );
}
