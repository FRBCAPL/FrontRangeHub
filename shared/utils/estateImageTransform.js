/**
 * Client-side rotate / crop for estate photos (canvas → JPEG blob).
 * No new dependencies — matches compressImageFile patterns.
 */

async function sourceToBitmap(source) {
  if (source instanceof ImageBitmap) return { bitmap: source, close: false };
  // Match how <img> displays phone photos (EXIF orientation). Without this,
  // CSS rotate preview and baked pixels disagree — save looks like a no-op.
  try {
    const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
    return { bitmap, close: true };
  } catch {
    const bitmap = await createImageBitmap(source);
    return { bitmap, close: true };
  }
}

/**
 * @param {Blob|File|ImageBitmap} source
 * @param {{
 *   rotateDeg?: number,
 *   cropNorm?: { x: number, y: number, w: number, h: number } | null
 * }} [options]
 * cropNorm is in the *rotated* image, each value 0–1.
 * @returns {Promise<Blob>}
 */
export async function transformImageSource(source, { rotateDeg = 0, cropNorm = null } = {}) {
  const { bitmap, close } = await sourceToBitmap(source);
  try {
    const deg = ((Number(rotateDeg) || 0) % 360 + 360) % 360;
    const rad = (deg * Math.PI) / 180;
    const swap = deg === 90 || deg === 270;
    const rw = swap ? bitmap.height : bitmap.width;
    const rh = swap ? bitmap.width : bitmap.height;

    const rotated = document.createElement('canvas');
    rotated.width = rw;
    rotated.height = rh;
    const rctx = rotated.getContext('2d');
    if (!rctx) throw new Error('Could not prepare image canvas.');
    rctx.translate(rw / 2, rh / 2);
    rctx.rotate(rad);
    rctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

    let sx = 0;
    let sy = 0;
    let sw = rw;
    let sh = rh;
    if (cropNorm && cropNorm.w > 0 && cropNorm.h > 0) {
      sx = Math.max(0, Math.round(cropNorm.x * rw));
      sy = Math.max(0, Math.round(cropNorm.y * rh));
      sw = Math.max(1, Math.round(cropNorm.w * rw));
      sh = Math.max(1, Math.round(cropNorm.h * rh));
      if (sx + sw > rw) sw = rw - sx;
      if (sy + sh > rh) sh = rh - sy;
    }

    const out = document.createElement('canvas');
    out.width = Math.max(1, sw);
    out.height = Math.max(1, sh);
    const octx = out.getContext('2d');
    if (!octx) throw new Error('Could not crop image canvas.');
    octx.drawImage(rotated, sx, sy, sw, sh, 0, 0, out.width, out.height);

    const blob = await new Promise((resolve, reject) => {
      out.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not encode photo.'))),
        'image/jpeg',
        0.92
      );
    });
    return blob;
  } finally {
    if (close) bitmap.close?.();
  }
}

/**
 * Fetch a public photo URL into a Blob (CORS must allow the bucket).
 * Prefer Storage download via the estate service when possible.
 * @param {string} url
 * @returns {Promise<Blob>}
 */
export async function fetchImageBlob(url) {
  const raw = String(url || '').trim();
  if (!raw) throw new Error('Could not load photo for editing.');
  const clean = raw.split('#')[0].split('?')[0] || raw;
  const res = await fetch(clean, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) throw new Error('Could not load photo for editing.');
  return res.blob();
}

/**
 * Build a crop rectangle from independent side insets (0–1 each).
 * left/right/top/bottom are fractions trimmed from that side.
 * Remaining area must stay at least minKeep on each axis.
 */
export function insetsToCropNorm(
  { left = 0, right = 0, top = 0, bottom = 0 } = {},
  minKeep = 0.15
) {
  let l = Math.max(0, Math.min(0.85, Number(left) || 0));
  let r = Math.max(0, Math.min(0.85, Number(right) || 0));
  let t = Math.max(0, Math.min(0.85, Number(top) || 0));
  let b = Math.max(0, Math.min(0.85, Number(bottom) || 0));

  if (l + r > 1 - minKeep) {
    const scale = (1 - minKeep) / (l + r);
    l *= scale;
    r *= scale;
  }
  if (t + b > 1 - minKeep) {
    const scale = (1 - minKeep) / (t + b);
    t *= scale;
    b *= scale;
  }

  return {
    x: l,
    y: t,
    w: Math.max(minKeep, 1 - l - r),
    h: Math.max(minKeep, 1 - t - b)
  };
}

export default {
  transformImageSource,
  fetchImageBlob,
  insetsToCropNorm
};
