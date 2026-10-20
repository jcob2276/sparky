import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { notify } from '../../../../lib/notify';
import { parseFoodNL, type ParsedFoodItem } from '../../../../lib/health/foodLogging';
import { scanMealPhoto } from '../../../../lib/health/mealPhotoScan';
import { saveMealPhoto } from '../../../../lib/health/mealPhotoStore';
import type { useSession } from '../../../../store/useStore';

interface Params {
  userId: string | undefined;
  session: ReturnType<typeof useSession>;
  text: string;
  setText: Dispatch<SetStateAction<string>>;
  parsing: boolean;
  setParsing: Dispatch<SetStateAction<boolean>>;
  scanningPhoto: boolean;
  setScanningPhoto: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setDraftFromParsed: (items: ParsedFoodItem[], append?: boolean) => void;
  scannedPhotoIdRef: MutableRefObject<string | null>;
}

/** Text (NL) parsing and photo scanning: the two ways a draft is produced from raw user input. */
export function useMealComposerCapture({
  userId, session, text, setText, parsing, setParsing, scanningPhoto, setScanningPhoto,
  setError, setDraftFromParsed, scannedPhotoIdRef,
}: Params) {
  const parseText = useCallback(async () => {
    if (!text.trim() || parsing || !userId) return;
    setParsing(true);
    setError(null);
    try {
      const items = await parseFoodNL(text.trim(), userId, session!.access_token);
      if (!items.length) {
        notify('Nie rozpoznano produktów — spróbuj opisać inaczej', 'error');
        return;
      }
      setDraftFromParsed(items);
      setText('');
    } catch (cause: unknown) {
      notify(cause instanceof Error ? cause.message : 'Parsowanie nie powiodło się', 'error');
    } finally {
      setParsing(false);
    }
  }, [text, parsing, userId, session, setDraftFromParsed, setParsing, setError, setText]);

  const scanPhoto = useCallback(async (file: File) => {
    if (!userId || scanningPhoto) return;
    setScanningPhoto(true);
    setError(null);
    scannedPhotoIdRef.current = null;
    try {
      // The photo is stored the moment it is taken, even when the analysis fails or the meal is never confirmed.
      const draft = await scanMealPhoto(file, userId, (image) => {
        const photoId = crypto.randomUUID();
        scannedPhotoIdRef.current = photoId;
        saveMealPhoto(userId, photoId, image).catch((photoCause: unknown) => {
          console.warn('[useMealComposer] meal photo was not stored', photoCause);
          notify('Nie udało się zachować zdjęcia', 'info');
        });
      });
      setDraftFromParsed(draft.items);
    } catch (cause: unknown) {
      scannedPhotoIdRef.current = null;
      const message = cause instanceof Error ? cause.message : 'Nie udało się przeanalizować zdjęcia';
      setError(message);
      notify(message, 'error');
    } finally {
      setScanningPhoto(false);
    }
  }, [userId, scanningPhoto, setDraftFromParsed, setScanningPhoto, setError, scannedPhotoIdRef]);

  return { parseText, scanPhoto };
}
