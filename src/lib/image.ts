"use client";

// Card pictures are stored inside localStorage with everything else, which
// only holds a few megabytes. Shrinking them to a small WebP (or JPEG where
// WebP isn't supported) keeps each one around 10–30 KB.

const MAX_SIDE = 320;
const QUALITY = 0.8;
const MAX_INPUT = 15 * 1024 * 1024;

export class ImageError extends Error {
  constructor(readonly reason: "type" | "size" | "decode") {
    super(reason);
  }
}

export async function toThumbnail(file: Blob): Promise<string> {
  if (!file.type.startsWith("image/")) throw new ImageError("type");
  if (file.size > MAX_INPUT) throw new ImageError("size");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageError("decode");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("decode");
  // Transparent areas become white, since JPEG has no transparency.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const webp = canvas.toDataURL("image/webp", QUALITY);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", QUALITY);
}
