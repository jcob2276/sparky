import { useRef, useState } from 'react';
import { ScanText } from 'lucide-react';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import { scanNutritionLabel } from '../../../lib/health/foodLabelScan';
import { isNativePlatform } from '../../../lib/native/platform';
import { pickMealPhotoNative } from '../../../lib/native/mealPhotoCapture';
import type { FoodBase } from './hooks/foodEntryUtils';

export default function NutritionLabelScanner({ userId, onScanned, onError }: {
  userId?: string;
  onScanned: (food: FoodBase) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file || !userId) return;
    setLoading(true);
    onError('');
    try {
      onScanned(await scanNutritionLabel(file, userId));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Nie udało się odczytać etykiety');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleTrigger = async () => {
    if (isNativePlatform()) {
      try {
        const file = await pickMealPhotoNative('camera');
        if (file) await handleFile(file);
      } catch (err: unknown) {
        onError(err instanceof Error ? err.message : 'Nie udało się zrobić zdjęcia');
      }
      return;
    }
    inputRef.current?.click();
  };

  return (
    <>
      <ControlInput ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        capture="environment" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
      <Pressable variant="outline" size="sm" loading={loading} onClick={() => void handleTrigger()}
        icon={<ScanText size={14} />} className="touch-manipulation w-full">
        Zeskanuj tabelę z etykiety
      </Pressable>
    </>
  );
}

