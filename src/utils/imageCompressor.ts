/**
 * Utility to compress and resize images client-side before sending to server / AI.
 * Ensures fast upload, no network timeouts, and prevents CORS or memory overflow.
 */
export async function compressAndResizeImage(
  fileOrUrl: File | string,
  maxWidth = 720,
  maxHeight = 720,
  quality = 0.72
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          maxHeight = maxHeight;
          height = Math.round((img.height * maxHeight) / img.width);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to original
        if (typeof fileOrUrl === 'string') {
          resolve({ base64: fileOrUrl, mimeType: 'image/jpeg' });
        } else {
          const reader = new FileReader();
          reader.onload = () => resolve({ base64: reader.result as string, mimeType: fileOrUrl.type || 'image/jpeg' });
          reader.onerror = reject;
          reader.readAsDataURL(fileOrUrl);
        }
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const mimeType = 'image/jpeg';
      const base64 = canvas.toDataURL(mimeType, quality);
      resolve({ base64, mimeType });
    };

    img.onerror = () => {
      // If image loading fails (e.g. CORS on external URL), fallback gracefully
      if (typeof fileOrUrl === 'string') {
        resolve({ base64: fileOrUrl, mimeType: 'image/jpeg' });
      } else {
        const reader = new FileReader();
        reader.onload = () => resolve({ base64: reader.result as string, mimeType: fileOrUrl.type || 'image/jpeg' });
        reader.onerror = reject;
        reader.readAsDataURL(fileOrUrl);
      }
    };

    if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl;
    } else {
      img.src = URL.createObjectURL(fileOrUrl);
    }
  });
}
