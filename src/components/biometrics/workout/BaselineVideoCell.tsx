import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Film, Play, Trash2 } from 'lucide-react';
import Button from '../../ui/Button';
import { ControlInput } from '../../ui/ControlPrimitives';
import { baselineVideoUrl, type BaselinePatch } from '../../../lib/health/baselineApi';
import { drivePreviewUrl, isHttpLink } from '../../../lib/health/driveLink';
import type { BaselineResult, BaselineTest } from '../../../lib/health/baselineTests';

export const baselineInputClass = 'h-11 w-full min-w-0 rounded-xl border border-border-custom bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted';

interface Props {
  test: BaselineTest;
  result?: BaselineResult;
  onSave: (patch: BaselinePatch) => void;
  onUpload: (file: File) => Promise<void>;
  onRemoveVideo: (path: string) => void;
}

export default function BaselineVideoCell({ test, result, onUpload, onRemoveVideo, onSave }: Props) {
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
        <ControlInput className={baselineInputClass} inputMode="url" placeholder="Wklej link do nagrania" aria-label={`Link do wideo: ${test.name}`}
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

