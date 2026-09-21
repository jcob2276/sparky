import { useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';

const BORN = new Date('2002-07-06');

function livedDays(): number {
  return Math.floor((Date.now() - BORN.getTime()) / 86400000);
}

/**
 * DreamBoardBanner — zwięzły, estetyczny banner 16:9 z pełnym gridem mapy marzeń.
 * Nie dominuje całego ekranu (wysokość ~180-210px na telefonie), a kliknięcie
 * pozwala otworzyć pełny podgląd na pełnym ekranie.
 */
export default function DreamBoardBanner() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lived = livedDays();

  return (
    <>
      <div
        onClick={() => setIsFullscreen(true)}
        className="group relative w-full aspect-video max-h-48 sm:max-h-56 overflow-hidden rounded-2xl border border-border-custom/50 bg-black shadow-sm cursor-pointer select-none transition-transform active:scale-[0.99]"
      >
        <img
          src="/dream_board_landscape.jpg"
          alt="Mapa Marzeń — Pełna Wizja"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          draggable={false}
        />

        {/* Cienki gradient górny pod badge */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

        {/* Badge górny lewy */}
        <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
          <span className="text-3xs font-black uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-warning border border-white/10">
            Wizja · 6 Filarów
          </span>
        </div>

        {/* Ikona powiększenia prawy górny */}
        <div className="absolute top-2.5 right-3 opacity-70 group-hover:opacity-100 transition-opacity">
          <div className="p-1 rounded-lg bg-black/40 backdrop-blur-md text-white/80 border border-white/10">
            <Maximize2 size={12} />
          </div>
        </div>

        {/* Dyskretny pasek dolny */}
        <div className="absolute inset-x-0 bottom-0 py-1.5 px-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between">
          <span className="text-3xs font-black uppercase tracking-widest text-white/90">
            Built Not Wished
          </span>
          <span className="text-3xs font-bold text-warning">
            Dzień {lived.toLocaleString('pl-PL')}
          </span>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsFullscreen(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-3 backdrop-blur-sm animate-fadeIn cursor-zoom-out"
        >
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <div className="absolute -top-11 right-0 flex items-center gap-2">
              <Pressable
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="rounded-full bg-white/10 hover:bg-white/20 p-2 text-white cursor-pointer"
                icon={<X size={16} />}
              />
            </div>
            <img
              src="/dream_board_landscape.jpg"
              alt="Pełna Mapa Marzeń"
              className="w-full h-auto rounded-xl border border-white/15 shadow-2xl"
            />
            <p className="mt-3 text-center text-xs font-semibold text-white/60 tracking-wider uppercase">
              Dotknij gdziekolwiek aby zamknąć
            </p>
          </div>
        </div>
      )}
    </>
  );
}
