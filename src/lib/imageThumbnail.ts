/** Target ~1.1 MB JPEG so base64 JSON stays under edge gateway limits. */
const VISION_UPLOAD_MAX_BYTES = 1_100_000;

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

const DECODE_ERROR = 'Nie udało się wczytać zdjęcia. Zrób je jeszcze raz albo wybierz inne.';

/** Dekoduje plik do rysowania. Gdy createImageBitmap zawiedzie (WebKit potrafi rzucić „Load failed”), próbuje przez <img>. */
async function decodeImage(file: Blob): Promise<DecodedImage> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  } catch {
    // przechodzimy do dekodowania przez element <img>
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (cause) {
    URL.revokeObjectURL(url);
    throw new Error(DECODE_ERROR, { cause });
  }
}

/** Downscales an image client-side (canvas) so galleries don't pull multi-MB originals for small thumbnails. */
export async function generateThumbnail(file: File, maxDim = 320, quality = 0.75): Promise<Blob> {
  const decoded = await decodeImage(file);
  try {
    if (!decoded.width || !decoded.height) throw new Error(DECODE_ERROR);
    const scale = Math.min(1, maxDim / Math.max(decoded.width, decoded.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(decoded.width * scale);
    canvas.height = Math.round(decoded.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Nie udało się wygenerować miniatury'));
      }, 'image/jpeg', quality);
    });
  } finally {
    decoded.release();
  }
}

/** Compress a meal/label photo before edge upload (vision still works at ~1 MP). */
export async function prepareVisionUpload(
  file: File,
  opts?: { maxDim?: number; quality?: number; maxBytes?: number },
): Promise<Blob> {
  const maxBytes = opts?.maxBytes ?? VISION_UPLOAD_MAX_BYTES;
  let maxDim = opts?.maxDim ?? 1280;
  let quality = opts?.quality ?? 0.78;

  for (let attempt = 0; attempt < 5; attempt++) {
    const blob = await generateThumbnail(file, maxDim, quality);
    if (blob.size <= maxBytes) return blob;
    if (quality > 0.55) quality = Math.max(0.55, quality - 0.1);
    else maxDim = Math.round(maxDim * 0.82);
  }

  const fallback = await generateThumbnail(file, 896, 0.6);
  if (fallback.size > Math.round(maxBytes * 1.35)) {
    throw new Error('Zdjęcie jest za duże — spróbuj bliższego ujęcia lub mniejszego pliku');
  }
  return fallback;
}
