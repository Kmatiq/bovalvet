export interface ProcessedImage {
  base64ForGemini: string;
  previewUrl: string;
  mimeType: string;
}

export async function sanitizeAndCompressImage(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Kunde inte läsa bildfilen"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Kunde inte avkoda bild"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Kunde inte starta Canvas"));
          return;
        }

        // 1024px är optimalt för snabb AI-analys och håller filstorleken under 150 KB
        const MAX_DIMENSION = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const outputMimeType = "image/jpeg";
        const dataUrl = canvas.toDataURL(outputMimeType, 0.7);
        const base64Data = dataUrl.split(",")[1];

        resolve({
          base64ForGemini: base64Data,
          previewUrl: dataUrl,
          mimeType: outputMimeType,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}