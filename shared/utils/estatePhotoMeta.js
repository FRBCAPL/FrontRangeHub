/**
 * Extract capture timestamp + GPS from a photo File (JPEG EXIF when present).
 * Falls back to file.lastModified / now. GPS may be absent (common on some phones).
 */

function readUint16(view, offset, little) {
  return little ? view.getUint16(offset, true) : view.getUint16(offset, false);
}

function readUint32(view, offset, little) {
  return little ? view.getUint32(offset, true) : view.getUint32(offset, false);
}

function parseExifAscii(view, offset, length) {
  let s = '';
  for (let i = 0; i < length; i += 1) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.trim();
}

function exifDateToIso(exifDate) {
  // "YYYY:MM:DD HH:MM:SS"
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(exifDate || '');
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function readRational(view, offset, little) {
  const num = readUint32(view, offset, little);
  const den = readUint32(view, offset + 4, little);
  if (!den) return null;
  return num / den;
}

function dmsToDecimal(view, offset, little, ref) {
  const d = readRational(view, offset, little);
  const m = readRational(view, offset + 8, little);
  const s = readRational(view, offset + 16, little);
  if (d == null || m == null || s == null) return null;
  let dec = d + m / 60 + s / 3600;
  if (ref === 'S' || ref === 'W') dec = -dec;
  return dec;
}

function parseJpegExif(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return null;
  }

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    const size = view.getUint16(offset + 2);
    if (marker === 0xe1) {
      const start = offset + 4;
      if (parseExifAscii(view, start, 4) !== 'Exif') return null;
      const tiff = start + 6;
      const little = view.getUint16(tiff) === 0x4949;
      if (!little && view.getUint16(tiff) !== 0x4d4d) return null;

      const ifd0 = tiff + readUint32(view, tiff + 4, little);
      const result = { datetime: null, lat: null, lng: null };

      const readIfd = (ifdOffset) => {
        if (ifdOffset <= 0 || ifdOffset + 2 > view.byteLength) return {};
        const entries = readUint16(view, ifdOffset, little);
        const map = {};
        for (let i = 0; i < entries; i += 1) {
          const e = ifdOffset + 2 + i * 12;
          if (e + 12 > view.byteLength) break;
          const tag = readUint16(view, e, little);
          const type = readUint16(view, e + 2, little);
          const count = readUint32(view, e + 4, little);
          const valueOffset = e + 8;
          let dataPos = valueOffset;
          const typeSize = type === 3 ? 2 : type === 4 || type === 9 ? 4 : type === 5 || type === 10 ? 8 : 1;
          const byteLen = count * typeSize;
          if (byteLen > 4) {
            dataPos = tiff + readUint32(view, valueOffset, little);
          }
          map[tag] = { type, count, dataPos };
        }
        return map;
      };

      const ifd0map = readIfd(ifd0);
      // DateTimeOriginal 0x9003 is usually in Exif IFD (tag 0x8769)
      if (ifd0map[0x8769]) {
        const exifIfd = tiff + readUint32(view, ifd0map[0x8769].dataPos, little);
        const exifMap = readIfd(exifIfd);
        const dtTag = exifMap[0x9003] || exifMap[0x9004] || exifMap[0x0132];
        if (dtTag) {
          result.datetime = exifDateToIso(parseExifAscii(view, dtTag.dataPos, 20));
        }
      }
      if (!result.datetime && ifd0map[0x0132]) {
        result.datetime = exifDateToIso(parseExifAscii(view, ifd0map[0x0132].dataPos, 20));
      }

      // GPS IFD pointer 0x8825
      if (ifd0map[0x8825]) {
        const gpsIfd = tiff + readUint32(view, ifd0map[0x8825].dataPos, little);
        const gpsMap = readIfd(gpsIfd);
        const latRef = gpsMap[0x0001] ? parseExifAscii(view, gpsMap[0x0001].dataPos, 2) : 'N';
        const lngRef = gpsMap[0x0003] ? parseExifAscii(view, gpsMap[0x0003].dataPos, 2) : 'E';
        if (gpsMap[0x0002]) {
          result.lat = dmsToDecimal(view, gpsMap[0x0002].dataPos, little, latRef);
        }
        if (gpsMap[0x0004]) {
          result.lng = dmsToDecimal(view, gpsMap[0x0004].dataPos, little, lngRef);
        }
      }

      return result;
    }
    if (marker === 0xda) break; // SOS
    offset += 2 + size;
  }
  return null;
}

/**
 * @param {File|Blob} file
 * @returns {Promise<{ photo_captured_at: string, photo_gps_lat: number|null, photo_gps_lng: number|null }>}
 */
export async function extractPhotoMetadata(file) {
  const fallbackAt = file?.lastModified
    ? new Date(file.lastModified).toISOString()
    : new Date().toISOString();

  const meta = {
    photo_captured_at: fallbackAt,
    photo_gps_lat: null,
    photo_gps_lng: null
  };

  if (!file || typeof file.arrayBuffer !== 'function') {
    return meta;
  }

  try {
    const buffer = await file.arrayBuffer();
    const exif = parseJpegExif(buffer);
    if (exif?.datetime) meta.photo_captured_at = exif.datetime;
    if (typeof exif?.lat === 'number' && Number.isFinite(exif.lat)) meta.photo_gps_lat = exif.lat;
    if (typeof exif?.lng === 'number' && Number.isFinite(exif.lng)) meta.photo_gps_lng = exif.lng;
  } catch {
    // keep fallbacks
  }

  return meta;
}

/**
 * Normalize photo_urls (string or { url, taken_by, ... }) for display/export.
 * Falls back to photo_url and item-level photographer / GPS fields.
 */
export function getPhotoEntries(item) {
  const raw =
    Array.isArray(item?.photo_urls) && item.photo_urls.length
      ? item.photo_urls
      : item?.photo_url
        ? [item.photo_url]
        : [];

  return raw
    .map((entry) => {
      if (typeof entry === 'string') {
        return {
          url: entry,
          taken_by: item?.created_by_name || null,
          captured_at: item?.photo_captured_at || null,
          gps_lat: item?.photo_gps_lat ?? null,
          gps_lng: item?.photo_gps_lng ?? null
        };
      }
      if (!entry || typeof entry !== 'object') return null;
      const url = entry.url || entry.href || '';
      if (!url) return null;
      return {
        url,
        taken_by: entry.taken_by || item?.created_by_name || null,
        captured_at: entry.captured_at || item?.photo_captured_at || null,
        gps_lat: entry.gps_lat ?? item?.photo_gps_lat ?? null,
        gps_lng: entry.gps_lng ?? item?.photo_gps_lng ?? null
      };
    })
    .filter(Boolean);
}

/**
 * Build a per-photo metadata object for storage in photo_urls JSONB.
 */
export function buildPhotoEntry(url, { takenBy, capturedAt, gpsLat, gpsLng } = {}) {
  return {
    url,
    taken_by: takenBy || null,
    captured_at: capturedAt || null,
    gps_lat: gpsLat ?? null,
    gps_lng: gpsLng ?? null
  };
}

/**
 * Best-effort device GPS when camera is used (phones may still omit EXIF GPS).
 */
export function requestDeviceGeolocation() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ lat: null, lng: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      () => resolve({ lat: null, lng: null }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}
