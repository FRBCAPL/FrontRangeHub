import { supabase } from '@shared/config/supabase.js';
import { USAPL_LINKS, USAPL_TENANT_ID } from '../data/usaplConstants.js';
import { USAPL_SCHEDULE_BUCKET } from './usaplScheduleImage.js';

export const USAPL_BYLAWS_SQL =
  'Run supabase-migrations/usapl-bylaws-pdf-2026-11.sql in the Supabase SQL editor, then try again.';

export const USAPL_BYLAWS_FALLBACK = USAPL_LINKS.localBylaws;

const BYLAWS_PATH = `${USAPL_TENANT_ID}/bylaws/frusapl-bylaws.pdf`;
const MAX_BYTES = 12 * 1024 * 1024;

export function usaplBylawsStoragePath() {
  return BYLAWS_PATH;
}

export function getUsaplBylawsPublicUrl() {
  const { data } = supabase.storage.from(USAPL_SCHEDULE_BUCKET).getPublicUrl(BYLAWS_PATH);
  return String(data?.publicUrl || '').split('?')[0];
}

export function withUsaplBylawsCacheBust(url) {
  const base = String(url || '').split('?')[0];
  if (!base) return '';
  return `${base}?v=${Date.now()}`;
}

function isPdfFile(file) {
  const type = String(file?.type || '').toLowerCase();
  const name = String(file?.name || '').toLowerCase();
  return type === 'application/pdf' || name.endsWith('.pdf');
}

export async function uploadUsaplBylawsPdf(file) {
  if (!file) throw new Error('Choose a PDF first.');
  if (!isPdfFile(file)) throw new Error('Use a PDF file.');
  if (file.size > MAX_BYTES) throw new Error('Keep the by-laws PDF under 12 MB.');

  const { error } = await supabase.storage.from(USAPL_SCHEDULE_BUCKET).upload(BYLAWS_PATH, file, {
    upsert: true,
    contentType: 'application/pdf',
    cacheControl: '120',
  });
  if (error) {
    const mimeBlocked = /mime type|not supported|invalid|allowed/i.test(error.message || '');
    const missing = /bucket not found|not found/i.test(error.message || '');
    if (mimeBlocked || missing) throw new Error(USAPL_BYLAWS_SQL);
    throw new Error(error.message || 'Could not upload the by-laws PDF.');
  }

  const url = getUsaplBylawsPublicUrl();
  if (!url) throw new Error('Upload finished but no public URL came back.');
  return withUsaplBylawsCacheBust(url);
}

/** Prefer the uploaded storage PDF; fall back to the bundled public file. */
export async function resolveUsaplBylawsSrc() {
  const storageUrl = getUsaplBylawsPublicUrl();
  if (storageUrl) {
    try {
      const response = await fetch(withUsaplBylawsCacheBust(storageUrl), {
        method: 'GET',
        cache: 'no-store',
        headers: { Range: 'bytes=0-1023' },
      });
      if (response.ok || response.status === 206) {
        return withUsaplBylawsCacheBust(storageUrl);
      }
    } catch {
      /* use bundled fallback */
    }
  }
  return USAPL_BYLAWS_FALLBACK;
}
