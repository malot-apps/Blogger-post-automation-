/**
 * Mobile-first image optimization, resizing, and compression utility.
 * Optimizes photos taken on phone cameras (often 5MB - 20MB) down to crisp ~100-300KB web-ready images.
 */

export interface ImageProcessingResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  mimeType: string;
  name: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function processAndCompressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<ImageProcessingResult> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = options;

  return new Promise((resolve, reject) => {
    // Basic file validation
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate scaling preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Failed to get canvas 2D context.'));
        }

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Determine best output format (prefer image/jpeg for photos, image/png for transparent/graphics)
        const outputMime = file.type === 'image/png' ? 'image/jpeg' : file.type;
        const compressedDataUrl = canvas.toDataURL(outputMime, quality);

        // Calculate compressed size in bytes from dataUrl length
        const head = `data:${outputMime};base64,`;
        const base64Data = compressedDataUrl.startsWith(head)
          ? compressedDataUrl.slice(head.length)
          : compressedDataUrl;
        const compressedBytes = Math.round((base64Data.length * 3) / 4);

        resolve({
          dataUrl: compressedDataUrl,
          originalSize: file.size,
          compressedSize: compressedBytes,
          width,
          height,
          mimeType: outputMime,
          name: file.name,
        });
      };

      img.onerror = () => {
        reject(new Error('Could not load image. The file might be corrupted.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file from device storage.'));
    };

    reader.readAsDataURL(file);
  });
}
