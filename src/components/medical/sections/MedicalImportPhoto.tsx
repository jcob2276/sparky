import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import Button from '../../ui/Button';
import { ControlInput } from '../../ui/ControlPrimitives';
import { notify } from '../../../lib/notify';
import { describeLabScanError, scanLabPhoto } from '../../../lib/health/labPhotoScan';
import type { ParseLabResultsResponse } from '../../../lib/edgeTypes';

interface MedicalImportPhotoProps {
  userId: string | null;
  onScanned: (scan: ParseLabResultsResponse) => void;
}

/** Zdjęcie lub skan wyniku → AI odczytuje markery do wiersza kreatora; zatwierdza użytkownik. */
export default function MedicalImportPhoto({ userId, onScanned }: MedicalImportPhotoProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file || !userId) return;
    setBusy(true);
    try {
      const scan = await scanLabPhoto(file, userId);
      onScanned(scan);
      notify(`Odczytano ${scan.results.length} wyników. Sprawdź je przed zapisem.`, 'success');
    } catch (cause) {
      notify(describeLabScanError(cause), 'error');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/10 p-3">
      <ControlInput ref={inputRef} type="file" accept="image/*" hidden onChange={(event) => void handleFile(event.target.files?.[0])} />
      <Button variant="outline" size="sm" disabled={busy || !userId} onClick={() => inputRef.current?.click()}>
        <Camera size={14} /> {busy ? 'AI czyta wyniki…' : 'Zdjęcie wyniku'}
      </Button>
      <p className="mt-1.5 text-xs text-text-secondary">Zrób zdjęcie lub wybierz skan wyniku. AI przepisze markery, a Ty sprawdzisz je i zatwierdzisz.</p>
    </div>
  );
}
