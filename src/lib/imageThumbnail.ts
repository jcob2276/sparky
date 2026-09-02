/** Target ~1.1 MB JPEG so base64 JSON stays under edge gateway limits. */
export const VISION_UPLOAD_MAX_BYTES = 1_100_000;

/** Downscales an image client-side (canvas) so galleries don't pull multi-MB originals for small thumbnails. */
export async function generateThumbnail(file: File, maxDim = 320, quality = 0.75): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Nie udało się wygenerować miniatury'));
    }, 'image/jpeg', quality);
  });
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
