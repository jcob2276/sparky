import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

interface PhotoCompareSliderProps {
  basePhotoUrl: string;
  targetPhotoUrl: string;
  baseLabel: string;
  targetLabel: string;
}

export function PhotoCompareSlider({
  basePhotoUrl,
  targetPhotoUrl,
  baseLabel,
  targetLabel,
}: PhotoCompareSliderProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      setContainerWidth(el.clientWidth);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  }, [handleMove]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  }, [handleMove]);

  const stopDrag = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchend', stopDrag);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove);
    return () => {
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchend', stopDrag);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [stopDrag, onMouseMove, onTouchMove]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[var(--ds-arbitrary-4-5)] select-none overflow-hidden bg-surface-solid cursor-ew-resize touch-none"
      onMouseDown={(e) => {
        isDragging.current = true;
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        isDragging.current = true;
        if (e.touches[0]) handleMove(e.touches[0].clientX);
      }}
    >
      {/* Target (Cel) Photo - Full background */}
      <img
        src={targetPhotoUrl}
        alt="Docelowa sylwetka"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Base (Baza) Photo - Clipped on the left */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={basePhotoUrl}
          alt="Bazowa sylwetka"
          className="absolute inset-0 w-full h-full object-cover max-w-none"
          style={{ width: containerWidth > 0 ? `${containerWidth}px` : '100%' }}
        />
      </div>

      {/* Divider line & handle */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-0 bottom-0 -left-px w-0.5 bg-on-accent shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
        <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 rounded-full bg-surface/90 backdrop-blur-md border border-border-custom flex items-center justify-center shadow-lg text-text-primary">
          <ChevronsLeftRight size={16} />
        </div>
      </div>

      {/* Left label badge */}
      <div className="absolute top-3 left-3 bg-surface/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-border-custom shadow-sm pointer-events-none">
        <p className="text-3xs font-black text-text-secondary uppercase tracking-wider">{baseLabel}</p>
      </div>

      {/* Right label badge */}
      <div className="absolute top-3 right-3 bg-primary/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-primary/30 shadow-sm pointer-events-none">
        <p className="text-3xs font-black text-primary uppercase tracking-wider">{targetLabel}</p>
      </div>
    </div>
  );
}
