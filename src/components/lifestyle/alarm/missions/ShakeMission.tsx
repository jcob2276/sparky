import { useState, useEffect } from 'react';
import { Vibrate } from 'lucide-react';
import { notify } from '../../../../lib/notify';

interface ShakeMissionProps {
  requiredShakes: number;
  onComplete: () => void;
}

export function ShakeMission({ requiredShakes, onComplete }: ShakeMissionProps) {
  const [shakeCount, setShakeCount] = useState(0);
  const [permissionState, setPermissionState] = useState<'granted' | 'prompt' | 'denied'>('prompt');

  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;
    let lastTime = 0;
    const threshold = 15; // acceleration change threshold

    const handleMotion = (event: DeviceMotionEvent) => {
      const current = event.accelerationIncludingGravity;
      if (!current) return;

      const currentTime = Date.now();
      if (currentTime - lastTime > 100) {
        const diffTime = currentTime - lastTime;
        lastTime = currentTime;

        const x = current.x || 0;
        const y = current.y || 0;
        const z = current.z || 0;

        const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;

        if (speed > threshold) {
          setShakeCount((prev) => {
            const next = prev + 1;
            if (next >= requiredShakes) {
              onComplete();
            }
            return next;
          });
        }

        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, [requiredShakes, onComplete]);

  const requestPermission = async () => {
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> }).requestPermission === 'function'
    ) {
      try {
        const res = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<'granted' | 'denied'> }).requestPermission();
        setPermissionState(res);
        if (res !== 'granted') {
          notify('Brak dostępu do czujników ruchu. Użyj przycisku symulacji potrząśnięcia.', 'error');
        }
      } catch (e) {
        console.error(e);
        setPermissionState('denied');
      }
    } else {
      setPermissionState('granted');
    }
  };

  const manualShake = () => {
    setShakeCount((prev) => {
      const next = prev + 1;
      if (next >= requiredShakes) {
        onComplete();
      }
      return next;
    });
  };

  const progressPercent = Math.min(100, Math.round((shakeCount / requiredShakes) * 100));

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-6 bg-surface/50 backdrop-blur-md rounded-2xl border border-white/10 max-w-md mx-auto">
      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary animate-pulse">
        <Vibrate className="w-10 h-10 animate-bounce" />
      </div>

      <div>
        <h3 className="text-2xl font-bold text-foreground">Potrząśnij telefonem!</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Musisz obudzić ciało i umysł. Wykonaj jeszcze {Math.max(0, requiredShakes - shakeCount)} potrząśnięć.
        </p>
      </div>

      <div className="w-full bg-surface-hover rounded-full h-4 overflow-hidden border border-white/10 p-0.5">
        <div
          className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-200"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="text-3xl font-extrabold text-primary">
        {shakeCount} / {requiredShakes}
      </div>

      {permissionState === 'prompt' && (
        <button
          onClick={() => void requestPermission()}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all"
        >
          Włącz czujnik ruchu
        </button>
      )}

      {/* Manual fall-back trigger for desktop or devices without Motion sensors */}
      <button
        onClick={manualShake}
        className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-foreground text-sm font-medium transition-all active:scale-95"
      >
        📳 Symuluj potrząśnięcie (Przycisk)
      </button>
    </div>
  );
}
