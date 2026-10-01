/**
 * AI Thumbnail Composer for Blogger Video & Post Containers.
 * 
 * Dimensions: Exactly 1200 × 675 (16:9 aspect ratio)
 * Matches the existing Blogger master template:
 * .video-container { width: 100%; height: 450px; background-color: #000; }
 * inside body { max-width: 800px; } -> 800:450 = 16:9 ratio.
 * 
 * Preserves the original image completely as a separate asset.
 */

export type CompositionStyle =
  | 'cinematic_focus'
  | 'dramatic_close'
  | 'rule_of_thirds'
  | 'vivid_editorial';

export interface ThumbnailCompositionOptions {
  focalPoint?: {
    xPercent: number; // 0 to 100
    yPercent: number; // 0 to 100
    recommendedZoom?: number;
  };
  style?: CompositionStyle;
  targetWidth?: number; // Default 1200
  targetHeight?: number; // Default 675
}

export interface ComposedThumbnailResult {
  dataUrl: string;
  width: number;
  height: number;
  style: CompositionStyle;
  styleLabel: string;
}

export const COMPOSITION_STYLES: Array<{
  id: CompositionStyle;
  label: string;
  description: string;
}> = [
  {
    id: 'cinematic_focus',
    label: 'Cinematic Focus',
    description: 'Perfect 16:9 framing centered on the main subject with soft edge vignette.',
  },
  {
    id: 'dramatic_close',
    label: 'Dramatic Close-Up',
    description: 'Tighter framing focusing on the core action with subtle bottom depth gradient.',
  },
  {
    id: 'rule_of_thirds',
    label: 'Rule of Thirds',
    description: 'Editorial framing aligning the subject along natural visual guidelines.',
  },
  {
    id: 'vivid_editorial',
    label: 'Vivid Cover',
    description: 'High-clarity vibrant contrast designed to grab attention on mobile feeds.',
  },
];

/**
 * Loads an image from URL or dataUrl into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for thumbnail composition.'));
    img.src = src;
  });
}

/**
 * Composes a professional 1200×675 (16:9) thumbnail from the source image
 */
export async function composeAiThumbnail(
  sourceImageSrc: string,
  options: ThumbnailCompositionOptions = {}
): Promise<ComposedThumbnailResult> {
  const {
    focalPoint = { xPercent: 50, yPercent: 50, recommendedZoom: 1.0 },
    style = 'cinematic_focus',
    targetWidth = 1200,
    targetHeight = 675, // Exact 16:9
  } = options;

  const img = await loadImage(sourceImageSrc);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }

  // Target aspect ratio (16:9 = 1.7777...)
  const targetRatio = targetWidth / targetHeight;
  const srcRatio = srcW / srcH;

  // Determine base crop size preserving 16:9 ratio
  let cropW: number;
  let cropH: number;

  if (srcRatio > targetRatio) {
    // Source is wider than 16:9
    cropH = srcH;
    cropW = Math.round(srcH * targetRatio);
  } else {
    // Source is taller than 16:9
    cropW = srcW;
    cropH = Math.round(srcW / targetRatio);
  }

  // Adjust zoom according to style
  let zoomFactor = options.focalPoint?.recommendedZoom || 1.0;
  if (style === 'dramatic_close') {
    zoomFactor = Math.min(1.25, Math.max(1.15, zoomFactor * 1.15));
  } else if (style === 'rule_of_thirds') {
    zoomFactor = Math.max(1.0, zoomFactor);
  }

  // Apply zoom factor by shrinking crop rectangle
  cropW = Math.round(cropW / zoomFactor);
  cropH = Math.round(cropH / zoomFactor);

  // Calculate focal anchor with central safe-zone clamping (30%-70%)
  // Ensures important subject remains visible when object-fit: cover crops outer margins on mobile viewports
  const safeXPercent = Math.max(30, Math.min(70, focalPoint.xPercent));
  const safeYPercent = Math.max(30, Math.min(70, focalPoint.yPercent));
  let focalX = (safeXPercent / 100) * srcW;
  let focalY = (safeYPercent / 100) * srcH;

  if (style === 'rule_of_thirds') {
    // Shift focal point towards 38% or 62% for rule of thirds
    if (focalPoint.xPercent > 50) {
      focalX = Math.min(srcW - cropW / 2, focalX + cropW * 0.1);
    } else {
      focalX = Math.max(cropW / 2, focalX - cropW * 0.1);
    }
  }

  // Calculate source crop top-left coordinate (clamped so we don't go outside image)
  let srcX = Math.round(focalX - cropW / 2);
  let srcY = Math.round(focalY - cropH / 2);

  srcX = Math.max(0, Math.min(srcW - cropW, srcX));
  srcY = Math.max(0, Math.min(srcH - cropH, srcY));

  // High quality resampling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Apply subtle filter improvements per style
  if (style === 'vivid_editorial') {
    ctx.filter = 'contrast(106%) saturate(108%) brightness(102%)';
  } else if (style === 'dramatic_close') {
    ctx.filter = 'contrast(108%) saturate(105%)';
  } else {
    ctx.filter = 'contrast(103%) saturate(104%)';
  }

  // Draw the cropped source image onto the 1200x675 canvas
  ctx.drawImage(img, srcX, srcY, cropW, cropH, 0, 0, targetWidth, targetHeight);

  // Reset filter for overlays
  ctx.filter = 'none';

  // Apply subtle cinematic overlays to match Blogger video container aesthetic
  if (style === 'cinematic_focus' || style === 'dramatic_close') {
    // Subtle radial edge vignette
    const gradient = ctx.createRadialGradient(
      targetWidth / 2,
      targetHeight / 2,
      targetWidth * 0.35,
      targetWidth / 2,
      targetHeight / 2,
      targetWidth * 0.65
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  // Subtle bottom gradient for readability and play button contrast
  const bottomGradient = ctx.createLinearGradient(0, targetHeight * 0.7, 0, targetHeight);
  bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const styleMeta = COMPOSITION_STYLES.find((s) => s.id === style) || COMPOSITION_STYLES[0];
  const outputDataUrl = canvas.toDataURL('image/jpeg', 0.92);

  return {
    dataUrl: outputDataUrl,
    width: targetWidth,
    height: targetHeight,
    style,
    styleLabel: styleMeta.label,
  };
}
