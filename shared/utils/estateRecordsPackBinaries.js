/**
 * Bundle scene / expense photo URLs into a records-pack subfolder.
 */

import { getPhotoEntries } from './estatePhotoMeta.js';

function extFromBlobOrUrl(blob, url) {
  const type = String(blob?.type || '').toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  if (type.includes('pdf')) return 'pdf';
  const fromUrl = String(url || '')
    .split('?')[0]
    .split('#')[0]
    .match(/\.([a-z0-9]+)$/i);
  if (fromUrl) return fromUrl[1].toLowerCase().slice(0, 5);
  return 'jpg';
}

function safeId(value) {
  return (
    String(value || 'file')
      .trim()
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'file'
  );
}

/**
 * @param {object[]} rows - scenes (photo_urls) or expenses (receipt_url)
 * @param {object} opts
 * @param {string} opts.folderPrefix - e.g. '12-scene-captures'
 * @param {(url: string) => Promise<Blob>} opts.downloadBlob
 * @param {(label: string) => void} [opts.onProgress]
 * @param {string} [opts.progressLabel]
 * @param {'scene'|'expense'} [opts.kind]
 */
export async function bundleRowPhotos(rows, opts = {}) {
  const {
    folderPrefix = 'media',
    downloadBlob,
    onProgress,
    progressLabel = 'Bundling media',
    kind = 'scene'
  } = opts;

  const urlToLocal = new Map();
  const files = [];
  const failed = [];
  const seen = new Set();
  const queue = [];

  for (const row of rows || []) {
    if (kind === 'expense') {
      const url = String(row?.receipt_url || '').trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      queue.push({ url, id: row.id, slot: 0 });
    } else {
      getPhotoEntries(row).forEach((entry, slot) => {
        const url = String(entry?.url || '').trim();
        if (!url || seen.has(url)) return;
        seen.add(url);
        queue.push({ url, id: row.id, slot });
      });
    }
  }

  for (let i = 0; i < queue.length; i += 1) {
    const { url, id, slot } = queue[i];
    onProgress?.(`${progressLabel} ${i + 1} of ${queue.length}…`);
    try {
      const blob = await downloadBlob(url);
      if (!blob) throw new Error('empty file');
      const ext = extFromBlobOrUrl(blob, url);
      const relative = `${safeId(id)}-${slot}.${ext}`;
      const path = `${folderPrefix}/${relative}`;
      files.push({ path, blob, relative });
      urlToLocal.set(url, relative);
    } catch (err) {
      failed.push(`${url.slice(0, 80)} — ${err?.message || 'download failed'}`);
    }
  }

  const rewritten =
    kind === 'expense'
      ? (rows || []).map((row) => {
          const url = String(row?.receipt_url || '').trim();
          const local = url ? urlToLocal.get(url) : null;
          return {
            ...row,
            receipt_url: local || '',
            remote_receipt_url: url || null,
            offline_missing: Boolean(url && !local)
          };
        })
      : (rows || []).map((row) => {
          const entries = getPhotoEntries(row).map((entry) => {
            const local = urlToLocal.get(entry.url);
            if (!local) {
              return {
                ...entry,
                url: '',
                offline_missing: true,
                remote_url: entry.url || null
              };
            }
            return { ...entry, url: local, remote_url: entry.url || null };
          });
          const primary = entries.find((e) => e.url)?.url || null;
          return {
            ...row,
            photo_url: primary,
            photo_urls: entries,
            offline_missing: entries.some((e) => e.offline_missing)
          };
        });

  return { files, urlToLocal, rewritten, failed };
}

export default { bundleRowPhotos };
