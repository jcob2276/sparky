import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RefreshCw, Trash2 } from 'lucide-react';
import { notify } from '../../../../lib/notify';
import { pickMealPhotoNative } from '../../../../lib/native/mealPhotoCapture';
import { isNativePlatform } from '../../../../lib/native/platform';
import { ControlInput, Pressable } from '../../../ui/ControlPrimitives';
import Spinner from '../../../ui/Spinner';

interface EditPhotoControlsProps {
  hasPhoto: boolean;
  busy: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}

const CHIP =
  'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-border-custom/60 bg-surface-solid/50 px-3 text-xs font-semibold text-text-primary backdrop-blur-md active:scale-95 ui-interactive disabled:opacity-50';

/** Add / replace / remove the meal photo. Sources are inline: a Sheet would sit below this modal. */
export default function EditPhotoControls({ hasPhoto, busy, onPick, onRemove }: EditPhotoControlsProps) {
  const [choosing, setChoosing] = useState(false);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  const pick = async (source: 'camera' | 'photos', input: HTMLInputElement | null) => {
    setChoosing(false);
    try {
      if (isNativePlatform()) {
        const file = await pickMealPhotoNative(source);
        if (file) onPick(file);
        return;
      }
      input?.click();
    } catch (cause: unknown) {
      notify(cause instanceof Error ? cause.message : 'Nie udało się wybrać zdjęcia', 'error');
    }
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onPick(file);
    event.target.value = '';
  };

  const showSources = !hasPhoto || choosing;

  return (
    <div className="space-y-1.5">
      <p className="text-2xs font-semibold tracking-wide text-text-muted">Zdjęcie posiłku</p>
      <div className="flex gap-2">
        {busy ? (
          <div className={`${CHIP} cursor-wait`} role="status">
            <Spinner size="sm" />
            <span>Zapisuję zdjęcie…</span>
          </div>
        ) : showSources ? (
          <>
            <Pressable type="button" className={CHIP} onClick={() => void pick('camera', cameraRef.current)}>
              <Camera size={16} aria-hidden="true" />
              <span>Aparat</span>
            </Pressable>
            <Pressable type="button" className={CHIP} onClick={() => void pick('photos', galleryRef.current)}>
              <ImageIcon size={16} aria-hidden="true" />
              <span>Galeria</span>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable type="button" className={CHIP} onClick={() => setChoosing(true)}>
              <RefreshCw size={15} aria-hidden="true" />
              <span>Zmień zdjęcie</span>
            </Pressable>
            <Pressable
              type="button"
              className={`${CHIP} !flex-none text-danger`}
              aria-label="Usuń zdjęcie"
              onClick={onRemove}
            >
              <Trash2 size={15} aria-hidden="true" />
            </Pressable>
          </>
        )}
      </div>

      <ControlInput
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={onFileChange}
      />
      <ControlInput
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onFileChange}
      />
    </div>
  );
}
