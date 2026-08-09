/**
 * Bundle inventory photos into a records-pack ZIP for offline/USB use.
 */

import { getPhotoEntries } from './estatePhotoMeta.js';

function extFromBlobOrUrl(blob, url) {
  const type = String(blob?.type || '').toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  const fromUrl = String(url || '')
    .split('?')[0]
    .split('#')[0]
    .match(/\.([a-z0-9]+)$/i);
  if (fromUrl) return fromUrl[1].toLowerCase().slice(0, 5);
  return 'jpg';
}

function safeId(value) {
  return (
    String(value || 'item')
      .trim()
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'item'
  );
}

/**
 * Download unique item photos and map remote URLs → relative ZIP paths.
 *
 * @param {object[]} items
 * @param {(url: string) => Promise<Blob>} downloadBlob
 * @param {(label: string) => void} [onProgress]
 * @returns {Promise<{
 *   files: Array<{ path: string, blob: Blob }>,
 *   urlToLocal: Map<string, string>,
 *   rewrittenItems: object[],
 *   failed: string[]
 * }>}
 */
export async function bundleCatalogPhotos(items, downloadBlob, onProgress) {
  const urlToLocal = new Map();
  const files = [];
  const failed = [];
  const seen = new Set();
  const queue = [];

  for (const item of items || []) {
    const entries = getPhotoEntries(item);
    entries.forEach((entry, slot) => {
      const url = String(entry?.url || '').trim();
      if (!url || seen.has(url)) return;
      seen.add(url);
      queue.push({ url, itemId: item.id, slot });
    });
  }

  for (let i = 0; i < queue.length; i += 1) {
    const { url, itemId, slot } = queue[i];
    onProgress?.(`Bundling photo ${i + 1} of ${queue.length}…`);
    try {
      const blob = await downloadBlob(url);
      if (!blob) throw new Error('empty photo');
      const ext = extFromBlobOrUrl(blob, url);
      const path = `photos/${safeId(itemId)}-${slot}.${ext}`;
      files.push({ path, blob });
      urlToLocal.set(url, path);
    } catch (err) {
      failed.push(`${url.slice(0, 80)} — ${err?.message || 'download failed'}`);
    }
  }

  const rewrittenItems = (items || []).map((item) => {
    const entries = getPhotoEntries(item).map((entry) => {
      const local = urlToLocal.get(entry.url);
      if (!local) {
        return {
          ...entry,
          url: '',
          offline_missing: true,
          remote_url: entry.url || null
        };
      }
      return {
        ...entry,
        url: local,
        remote_url: entry.url || null
      };
    });
    const primary = entries.find((e) => e.url)?.url || null;
    return {
      ...item,
      photo_url: primary,
      photo_urls: entries
    };
  });

  return { files, urlToLocal, rewrittenItems, failed };
}

export default { bundleCatalogPhotos };
