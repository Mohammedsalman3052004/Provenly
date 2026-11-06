/** Resize + re-encode to WebP in the browser before upload (keeps Storage small, no paid CDN needed). */
export async function compressImage(file: File, maxDim = 1280, quality = 0.82): Promise<Blob> {
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) throw new Error('Use a PNG, JPG or WebP image.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Image is larger than 12 MB.');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', quality));
  if (!blob) throw new Error('Could not process image.');
  if (blob.size > 2 * 1024 * 1024) throw new Error('Image is still over 2 MB after compression. Try a smaller one.');
  return blob;
}
