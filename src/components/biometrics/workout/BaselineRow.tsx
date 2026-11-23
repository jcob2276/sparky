import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Film, Play, Trash2 } from 'lucide-react';
import Button from '../../ui/Button';
import { ControlInput } from '../../ui/ControlPrimitives';
import { baselineVideoUrl, type BaselinePatch } from '../../../lib/health/baselineApi';
import { drivePreviewUrl, isHttpLink } from '../../../lib/health/driveLink';
import { BASELINE_PLACEHOLDER, isBaselineSkipped, type BaselineResult, type BaselineTest } from '../../../lib/health/baselineTests';

interface Props {
  test: BaselineTest;
  result?: BaselineResult;
  /** Naprzemienne tło: dwa kolory jak w arkuszu trenera. */
  tone: 'a' | 'b';
  onSave: (patch: BaselinePatch) => void;
  onUpload: (file: File) => Promise<void>;
  onRemoveVideo: (path: string) => void;
}

const TONE: Record<Props['tone'], string> = { a: 'bg-warning/15', b: 'bg-primary/12' };
const inputClass = 'h-10 w-full min-w-0 rounded-lg border border-border-custom bg-surface px-2 text-sm text-text-primary placeholder:text-text-muted';

function VideoCell({ test, result, onUpload, onRemoveVideo, onSave }: Pick<Props, 'test' | 'result' | 'onUpload' | 'onRemoveVideo' | 'onSave'>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingLink, setPlayingLink] = useState(false);
  const [playingFile, setPlayingFile] = useState(false);
  const path = result?.video_path ?? null;
  const link = result?.video_url ?? null;
  const preview = drivePreviewUrl(link);
  const { data: url } = useQuery({ queryKey: ['baseline-video', path], queryFn: () => baselineVideoUrl(path!), enabled: playingFile && path != null, staleTime: 50 * 60_000 });

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError(null);
    try { await onUpload(file); } catch (e) { setError(e instanceof Error ? e.message : 'Nie udało się wgrać nagrania.'); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div className="space-y-1.5">
      <ControlInput ref={fileRef} type="file" accept="video/*" className="hidden" aria-label={`Nagranie: ${test.name}`} onChange={(e) => void pick(e.target.files?.[0])} />
      <label className="block space-y-1 text-2xs font-semibold text-text-muted">Wideo (link z Dysku Google)
        <ControlInput className={inputClass} inputMode="url" placeholder="Wklej link do nagrania" aria-label={`Link do wideo: ${test.name}`}
          defaultValue={link ?? ''} onBlur={(e) => { const value = e.target.value.trim(); if (value !== (link ?? '')) { setPlayingLink(false); onSave({ video_url: value || null }); } }} />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {preview && <Button size="sm" variant="tonal" icon={<Play size={14} />} onClick={() => setPlayingLink((p) => !p)}>{playingLink ? 'Ukryj' : 'Odtwórz'}</Button>}
        {link && !preview && isHttpLink(link) && <Button size="sm" variant="tonal" icon={<Play size={14} />} onClick={() => window.open(link, '_blank', 'noopener')}>Otwórz</Button>}
        <Button size="sm" variant="ghost" loading={busy} icon={<Film size={14} />} onClick={() => fileRef.current?.click()}>{path ? 'Zmień plik' : 'Wgraj plik (do 50 MB)'}</Button>
        {path && <Button size="sm" variant="ghost" onClick={() => setPlayingFile((p) => !p)}>{playingFile ? 'Ukryj plik' : 'Odtwórz plik'}</Button>}
        {path && <Button size="sm" variant="ghost" aria-label="Usuń wgrany plik" icon={<Trash2 size={14} />} onClick={() => onRemoveVideo(path)} />}
      </div>
      {!link && !path && <p className="text-2xs text-text-muted">Wrzuć nagranie na Dysk Google, ustaw „Każdy, kto ma link” i wklej tu link.</p>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      {playingLink && preview && <iframe title={`Wideo: ${test.name}`} src={preview} className="aspect-video w-full rounded-lg bg-black" allow="autoplay; fullscreen" />}
      {playingFile && url && <video className="w-full rounded-lg bg-black" src={url} controls playsInline preload="metadata" />}
    </div>
  );
}

export default function BaselineRow({ test, result, tone, onSave, onUpload, onRemoveVideo }: Props) {
  const skipped = isBaselineSkipped(test, result);
  const hint = BASELINE_PLACEHOLDER[test.unit];
  return (
    <li className={`space-y-2 rounded-lg p-3 ${TONE[tone]} ${skipped ? 'opacity-55' : ''}`} data-testid={`baseline-${test.key}`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-xs font-bold tabular-nums text-text-muted">{test.no}</span>
        <p className={`min-w-0 flex-1 text-sm font-semibold leading-snug text-text-primary ${skipped ? 'line-through' : ''}`}>{test.name}</p>
        <Button size="sm" variant="ghost" onClick={() => onSave({ skipped: !skipped })}>
          {skipped ? 'Przywróć' : 'Pomiń'}
        </Button>
      </div>
      {!skipped && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-2xs font-semibold text-text-muted">Główna seria
              <ControlInput className={inputClass} placeholder={hint.main} defaultValue={result?.main_set ?? ''} aria-label={`Główna seria: ${test.name}`}
                onBlur={(e) => { const v = e.target.value.trim(); if (v !== (result?.main_set ?? '')) onSave({ main_set: v || null }); }} />
            </label>
            <label className="space-y-1 text-2xs font-semibold text-text-muted">Mój max
              <ControlInput className={inputClass} placeholder={hint.max} defaultValue={result?.max_value ?? ''} aria-label={`Mój max: ${test.name}`}
                onBlur={(e) => { const v = e.target.value.trim(); if (v !== (result?.max_value ?? '')) onSave({ max_value: v || null }); }} />
            </label>
          </div>
          <VideoCell test={test} result={result} onUpload={onUpload} onRemoveVideo={onRemoveVideo} onSave={onSave} />
        </>
      )}
    </li>
  );
}
