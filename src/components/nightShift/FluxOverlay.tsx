import { useEffect, useState, useMemo } from 'react';
import { useFluxStore } from '../../lib/nightShift/useFluxStore';
import {
  calculateFluxIntensity,
  kelvinToRGBMatrix,
  getSVGColorMatrixString,
} from '../../lib/nightShift/fluxEngine';
import { isNativePlatform } from '../../lib/native/platform';
import { StatusBar, Style } from '@capacitor/status-bar';

export default function FluxOverlay() {
  const {
    enabled,
    startTime,
    endTime,
    targetTemperature,
    gradualTransition,
    pausedUntil,
  } = useFluxStore();

  const [state, setState] = useState<{ isActive: boolean; intensity: number }>({
    isActive: false,
    intensity: 0,
  });

  useEffect(() => {
    function update() {
      if (!enabled) {
        setState({ isActive: false, intensity: 0 });
        return;
      }

      if (pausedUntil && Date.now() < pausedUntil) {
        setState({ isActive: false, intensity: 0 });
        return;
      }

      const rampMins = gradualTransition ? 30 : 0;
      const res = calculateFluxIntensity(new Date(), startTime, endTime, rampMins);
      setState(res);
    }

    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [enabled, startTime, endTime, gradualTransition, pausedUntil]);

  // Sync native status bar color if on Capacitor Android
  useEffect(() => {
    if (!isNativePlatform()) return;
    async function updateStatusBar() {
      try {
        if (state.isActive && state.intensity > 0.3) {
          // Warm status bar tint to match f.lux night filter
          await StatusBar.setBackgroundColor({ color: '#1A1410' });
          await StatusBar.setStyle({ style: Style.Dark });
        } else {
          // Default dark theme status bar
          await StatusBar.setBackgroundColor({ color: '#1C1917' });
          await StatusBar.setStyle({ style: Style.Dark });
        }
      } catch {
        /* StatusBar optional */
      }
    }
    void updateStatusBar();
  }, [state.isActive, state.intensity]);

  const matrixString = useMemo(() => {
    const rgbMatrix = kelvinToRGBMatrix(targetTemperature);
    return getSVGColorMatrixString(rgbMatrix, state.intensity);
  }, [targetTemperature, state.intensity]);

  if (!state.isActive || state.intensity <= 0) {
    return null;
  }

  // Alpha blend value for subtle warm tint overlay
  const amberOpacity = (state.intensity * 0.12).toFixed(2);

  return (
    <>
      {/* SVG Color Matrix Definition */}
      <svg className="hidden" aria-hidden="true">
        <defs>
          <filter id="vanguard-flux-filter" x="0%" y="0%" width="100%" height="100%">
            <feColorMatrix type="matrix" values={matrixString} />
          </filter>
        </defs>
      </svg>

      {/* GPU Accelerated SVG Backdrop Filter Overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[999999] transition-all duration-1000 ease-out"
        style={{
          backdropFilter: 'url(#vanguard-flux-filter)',
          WebkitBackdropFilter: 'url(#vanguard-flux-filter)',
        }}
      />

      {/* Secondary Warm Amber Color Blend Layer */}
      <div
        className="pointer-events-none fixed inset-0 z-[999998] transition-opacity duration-1000 ease-out"
        style={{
          backgroundColor: `rgba(255, 130, 0, ${amberOpacity})`,
          mixBlendMode: 'multiply',
        }}
      />
    </>
  );
}
