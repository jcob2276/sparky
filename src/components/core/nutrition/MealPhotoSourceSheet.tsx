import { Camera, Image as ImageIcon } from 'lucide-react';
import Sheet from '../../ui/Sheet';
import { Pressable } from '../../ui/ControlPrimitives';
import { useHaptics } from '../../../hooks/useHaptics';

interface MealPhotoSourceSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
}

export function MealPhotoSourceSheet({
  open,
  onClose,
  onSelectCamera,
  onSelectGallery,
}: MealPhotoSourceSheetProps) {
  const { light } = useHaptics();

  const handleCamera = () => {
    light();
    onClose();
    onSelectCamera();
  };

  const handleGallery = () => {
    light();
    onClose();
    onSelectGallery();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      side="bottom"
      title="Zdjęcie posiłku"
    >
      <div className="mx-auto max-w-sm space-y-3 pb-6">
        <p className="text-xs text-text-muted px-1">
          Wybierz źródło zdjęcia. AI automatycznie rozpozna składniki i oszacuje makroskładniki.
        </p>
        <div className="grid grid-cols-1 gap-2.5 pt-1">
          <Pressable
            type="button"
            onClick={handleCamera}
            className="flex items-center gap-3.5 rounded-2xl border border-border-custom bg-surface-solid/70 p-3.5 text-left transition-all duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:border-primary/50 hover:bg-surface-2 active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
              <Camera size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-primary font-display">Zrób zdjęcie</p>
              <p className="text-xs text-text-muted">Użyj aparatu, aby sfotografować posiłek</p>
            </div>
          </Pressable>

          <Pressable
            type="button"
            onClick={handleGallery}
            className="flex items-center gap-3.5 rounded-2xl border border-border-custom bg-surface-solid/70 p-3.5 text-left transition-all duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:border-primary/50 hover:bg-surface-2 active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/25">
              <ImageIcon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-primary font-display">Wybierz z galerii</p>
              <p className="text-xs text-text-muted">Wybierz gotowe zdjęcie z pamięci urządzenia</p>
            </div>
          </Pressable>
        </div>
      </div>
    </Sheet>
  );
}
