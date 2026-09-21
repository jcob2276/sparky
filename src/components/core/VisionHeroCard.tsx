import { useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { getSprintInfo, SPRINT_SEASON } from '../../lib/growth/sprintUtils';
import { getDailyFuelQuote } from '../../lib/dailyFuelQuotes';

const BORN = new Date('2002-07-06');

function livedDays(): number {
  return Math.floor((Date.now() - BORN.getTime()) / 86400000);
}

/**
 * VisionHeroCard — Zunifikowany moduł tożsamościowy łączący Mapę Marzeń (Wizja 6 Filarów)
 * z Memento Mori i stoickim cytatem dnia w jedną spójną, luksusową bryłę.
 */
export default function VisionHeroCard() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lived = livedDays();
  const sprint = getSprintInfo();
  const fuel = getDailyFuelQuote(lived);

  return (
    <>
      <section className="rounded-3xl border border-border-custom/70 bg-surface-solid/30 shadow-sm backdrop-blur-xs overflow-hidden">
        {/* Cover: Mapa Marzeń 16:9 */}
        <div
          onClick={() => setIsFullscreen(true)}
          className="group relative w-full aspect-video max-h-44 sm:max-h-52 overflow-hidden cursor-pointer select-none bg-black transition-transform active:scale-[0.995]"
        >
          <img
            src="/dream_board_landscape.jpg"
            alt="Mapa Marzeń — Wizja 6 Filarów"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            draggable={false}
          />

          {/* Subtelny gradient górny */}
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

          {/* Badge lewy górny */}
          <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
            <span className="text-3xs font-black uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-md text-warning border border-white/10">
              Wizja · 6 Filarów
            </span>
          </div>

          {/* Ikona pełnego ekranu */}
          <div className="absolute top-2.5 right-3 opacity-75 group-hover:opacity-100 transition-opacity">
            <div className="p-1 rounded-lg bg-black/45 backdrop-blur-md text-white/80 border border-white/10">
              <Maximize2 size={12} />
            </div>
          </div>

          {/* Pasek dolny na zdjęciu z hasłem */}
          <div className="absolute inset-x-0 bottom-0 py-1.5 px-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between">
            <span className="text-3xs font-black uppercase tracking-widest text-white/95">
              Built Not Wished
            </span>
            <span className="text-3xs font-bold text-warning">
              {SPRINT_SEASON[sprint.sprintNumber]}
            </span>
          </div>
        </div>

        {/* Dolna część: Memento Mori & Cytat Dnia */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border-custom/40">
            <span className="text-2xs font-black uppercase tracking-wider text-primary">
              ⏳ Memento Mori · Dzień {lived.toLocaleString('pl-PL')} życia
            </span>
            <span className="text-3xs font-bold text-text-muted">
              Sprint {sprint.sprintNumber} · Tydz. {sprint.weekInSprint}/12 ({sprint.pct}%)
            </span>
          </div>

          <div className="pt-0.5">
            <p className="font-display text-sm md:text-base font-semibold italic text-text-primary whitespace-pre-line leading-relaxed">
              „{fuel.text}”
            </p>
            {fuel.author && (
              <p className="mt-1.5 text-2xs font-bold text-text-muted">
                — {fuel.author}
                {fuel.source ? <span className="font-normal italic">, {fuel.source}</span> : null}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border-custom/30 pt-2 text-3xs font-bold text-text-muted">
            <span className="text-text-secondary">Czas nieustannie płynie — wykorzystaj dzisiejszy dzień w 100%.</span>
            <span className="text-primary font-black uppercase tracking-wider">PY{sprint.personalYear}</span>
          </div>
        </div>
      </section>

      {/* Lightbox Pełnego Ekranu */}
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
