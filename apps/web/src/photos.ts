// Preparazione e invio delle foto: il telefono riduce l'immagine prima di caricarla.

import { ApiError } from './api';

/**
 * Ridimensiona (lato lungo max 2000 px) e ricodifica in JPEG.
 * La ricodifica rimuove anche i metadati della foto, posizione GPS compresa.
 */
export async function compressImage(file: File, maxSide = 2000, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Impossibile elaborare la foto'))), 'image/jpeg', quality),
  );
}

export async function uploadImage<T>(path: string, image: Blob): Promise<T> {
  const form = new FormData();
  form.append('file', image, 'foto.jpg');
  const res = await fetch(path, { method: 'POST', body: form, credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? 'Caricamento non riuscito');
  return data as T;
}
