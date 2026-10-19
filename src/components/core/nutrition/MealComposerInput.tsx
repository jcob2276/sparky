import { useRef, useState } from 'react';
import { Camera, ScanLine, Search, Sparkles } from 'lucide-react';
import { notify } from '../../../lib/notify';
import { pickMealPhotoNative } from '../../../lib/native/mealPhotoCapture';
import { isNativePlatform } from '../../../lib/native/platform';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import Spinner from '../../ui/Spinner';
import { MealPhotoSourceSheet } from './MealPhotoSourceSheet';

export function ComposerInput({
  text, setText, parsing, saving, scanningPhoto, searchOpen,
  onParse, onPhotoPick, onToggleSearch, onOpenScanner, photoInputRef,
}: {
  text: string;
  setText: (value: string) => void;
  parsing: boolean;
  saving: boolean;
  scanningPhoto: boolean;
  searchOpen: boolean;
  onParse: () => void;
  onPhotoPick: (file: File) => void;
  onToggleSearch: () => void;
  onOpenScanner: () => void;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const pickPhoto = async (source: 'camera' | 'photos', input: HTMLInputElement | null, failure: string) => {
    try {
      if (isNativePlatform()) {
        const file = await pickMealPhotoNative(source);
        if (file) onPhotoPick(file);
        return;
      }
      input?.click();
    } catch (cause: unknown) {
      notify(cause instanceof Error ? cause.message : failure, 'error');
    }
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onPhotoPick(file);
    event.target.value = '';
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative min-w-0 flex-1">
        <ControlInput
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onParse();
            }
          }}
          aria-label="Opisz posiłek"
          enterKeyHint="send"
          placeholder="np. 2 jajka, kawa"
          className="meal-input h-11 w-full rounded-xl border pl-3 pr-11 text-base"
        />
        <Pressable
          onClick={onParse}
          disabled={!text.trim() || parsing || saving}
          aria-label="Rozpoznaj posiłek (AI)"
          title="Rozpoznaj posiłek (AI)"
          className="meal-ai-btn absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg"
        >
          {parsing ? <Spinner size="sm" /> : <Sparkles size={18} aria-hidden="true" />}
        </Pressable>
      </div>

      <ControlInput
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={onFileChange}
      />
      <ControlInput
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onFileChange}
      />

      <Pressable
        onClick={() => setPhotoSheetOpen(true)}
        disabled={scanningPhoto || saving}
        aria-label={scanningPhoto ? 'Skanuję zdjęcie…' : 'Dodaj zdjęcie posiłku'}
        title="Zdjęcie"
        className="meal-photo-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
      >
        {scanningPhoto ? <Spinner size="sm" /> : <Camera size={20} aria-hidden="true" />}
      </Pressable>
      <Pressable
        onClick={onOpenScanner}
        disabled={saving}
        aria-label="Skanuj kod kreskowy"
        title="Kod kreskowy"
        className="meal-icon-btn flex h-11 w-10 shrink-0 items-center justify-center rounded-xl"
      >
        <ScanLine size={19} aria-hidden="true" />
      </Pressable>
      <Pressable
        onClick={onToggleSearch}
        disabled={saving}
        aria-label="Szukaj produktu"
        aria-pressed={searchOpen}
        title="Szukaj"
        className="meal-icon-btn flex h-11 w-10 shrink-0 items-center justify-center rounded-xl"
      >
        <Search size={19} aria-hidden="true" />
      </Pressable>

      <MealPhotoSourceSheet
        open={photoSheetOpen}
        onClose={() => setPhotoSheetOpen(false)}
        onSelectCamera={() => void pickPhoto('camera', photoInputRef.current, 'Nie udało się otworzyć aparatu')}
        onSelectGallery={() => void pickPhoto('photos', galleryInputRef.current, 'Nie udało się otworzyć galerii')}
      />
    </div>
  );
}
