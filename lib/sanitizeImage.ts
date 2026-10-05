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

        // Höjd maxdimension till 2048px för att säkerställa hög detaljrikedom vid utskärning av enskilda föremål
        const MAX_DIMENSION = 2048;
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

        // Skarpare nerskalning
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, 0, 0, width, height);

        const outputMimeType = "image/jpeg";
        // Höjd kvalitet från 0.7 till 0.88 så att detaljer behålls intakta
        const dataUrl = canvas.toDataURL(outputMimeType, 0.88);
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