import type { Area } from "react-easy-crop";

/** Stay under API body limit for base64 image strings (see app/api/profile). */
const MAX_DATA_URL_CHARS = 1_400_000;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    if (url.startsWith("https://") || url.startsWith("http://")) {
      image.crossOrigin = "anonymous";
    }
    image.src = url;
  });
}

/**
 * Renders the cropped square to a JPEG data URL, downscaling or lowering quality until under size budget.
 */
export async function renderCroppedAvatarDataUrl(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await loadImage(imageSrc);
  let outSize = 512;

  while (outSize >= 96) {
    const canvas = document.createElement("canvas");
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outSize,
      outSize,
    );
    for (let q = 0.92; q >= 0.42; q -= 0.06) {
      const dataUrl = canvas.toDataURL("image/jpeg", q);
      if (dataUrl.length <= MAX_DATA_URL_CHARS) return dataUrl;
    }
    outSize = Math.floor(outSize * 0.72);
  }

  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    96,
    96,
  );
  return canvas.toDataURL("image/jpeg", 0.42);
}
