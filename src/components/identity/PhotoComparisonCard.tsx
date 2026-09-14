import { useState } from 'react';
import { Camera, Sparkles, Columns, SlidersHorizontal, Flame } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';
import Spinner from '../ui/Spinner';
import { PhotoCompareSlider } from './PhotoCompareSlider';
import type { ProgressPhoto } from '../../lib/photosApi';

interface PhotoComparisonCardProps {
  basePhoto: ProgressPhoto | undefined;
  targetPhoto: ProgressPhoto | undefined;
  daysDiff: number;
  onAnalyze: (photo: ProgressPhoto) => void;
  analyzingId: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}

export function PhotoComparisonCard({
  basePhoto,
  targetPhoto,
  daysDiff,
  onAnalyze,
  analyzingId,
  onUpload,
  uploading,
}: PhotoComparisonCardProps) {
  const [mode, setMode] = useState<'side' | 'slider'>('side');

  const baseDateStr = basePhoto?.date ? format(parseISO(basePhoto.date), 'dd.MM.yy') : '--';
  const targetDateStr = targetPhoto?.date ? format(parseISO(targetPhoto.date), 'dd.MM.yy') : '--';

  return (
    <div className="rounded-2xl border border-border-custom bg-surface/50 backdrop-blur-[var(--blur-md)] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <p className="text-2xs font-black uppercase tracking-[var(--ds-arbitrary-0-18em)] text-text-muted font-display">
              Postęp sylwetki
            </p>
          </div>
          <h2 className="mt-0.5 font-display text-lg font-black tracking-tight text-text-primary flex items-center gap-2">
            Transformacja
            {daysDiff > 0 && (
              <span className="text-xs font-bold text-primary font-mono">
                +{daysDiff}d
              </span>
            )}
          </h2>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          {basePhoto && targetPhoto && (
            <div className="flex items-center rounded-xl bg-surface border border-border-custom p-0.5">
              <Pressable
                onClick={() => setMode('side')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-2xs font-bold transition-all ${
                  mode === 'side'
                    ? 'bg-primary text-on-accent shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Obok siebie"
              >
                <Columns size={12} />
                <span className="hidden sm:inline">Kafelki</span>
              </Pressable>
              <Pressable
                onClick={() => setMode('slider')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-2xs font-bold transition-all ${
                  mode === 'slider'
                    ? 'bg-primary text-on-accent shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Interaktywny suwak"
              >
                <SlidersHorizontal size={12} />
                <span className="hidden sm:inline">Suwak</span>
              </Pressable>
            </div>
          )}

          {targetPhoto && (
            <Pressable
              onClick={() => onAnalyze(targetPhoto)}
              disabled={analyzingId === targetPhoto.id}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-on-accent font-display text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              {analyzingId === targetPhoto.id ? <Spinner size="sm" /> : <Sparkles size={14} />}
              <span>{targetPhoto.ai_analysis ? 'Wynik AI' : 'Analizuj AI'}</span>
            </Pressable>
          )}

          <label className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-xl border border-border-custom bg-surface text-text-secondary transition-all hover:bg-primary hover:border-primary hover:text-on-accent shadow-sm active:scale-95">
            {uploading ? <Spinner size="sm" /> : <Camera size={15} />}
            <ControlInput type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Comparison Area */}
      <div className="border-t border-border-custom">
        {mode === 'slider' && basePhoto && targetPhoto ? (
          <PhotoCompareSlider
            basePhotoUrl={basePhoto.image_url}
            targetPhotoUrl={targetPhoto.image_url}
            baseLabel={`Baza: ${baseDateStr}`}
            targetLabel={`Cel: ${targetDateStr}`}
          />
        ) : (
          <div className="relative aspect-[var(--ds-arbitrary-4-5)] bg-surface-solid overflow-hidden">
            <div className="absolute inset-0 flex">
              {/* Baza (Left) */}
              <div className="relative flex-1 border-r border-border-custom overflow-hidden">
                {basePhoto ? (
                  <>
                    <img src={basePhoto.image_url} alt="Zdjęcie bazowe sylwetki" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 bg-surface/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-border-custom shadow-sm">
                      <p className="text-3xs font-black text-text-secondary uppercase tracking-widest">Baza: {baseDateStr}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs font-black text-text-muted uppercase">Wybierz bazę</div>
                )}
              </div>

              {/* Cel (Right) */}
              <div className="relative flex-1 overflow-hidden">
                {targetPhoto ? (
                  <>
                    <img src={targetPhoto.image_url} alt="Zdjęcie docelowe sylwetki" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute top-3 right-3 bg-primary/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-primary/30 shadow-sm">
                      <p className="text-3xs font-black text-primary uppercase tracking-widest">Cel: {targetDateStr}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs font-black text-text-muted uppercase">Wybierz cel</div>
                )}
              </div>
            </div>

            {/* VS Badge */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="bg-surface/90 backdrop-blur-md border border-border-custom w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-xs font-black text-text-primary">VS</span>
              </div>
            </div>

            {/* Progress Pill */}
            {daysDiff > 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-on-accent px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 pointer-events-none">
                <Flame size={12} />
                <p className="text-2xs font-black uppercase tracking-wider whitespace-nowrap">
                  +{daysDiff} dni transformacji
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
