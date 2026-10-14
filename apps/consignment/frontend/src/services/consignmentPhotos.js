import { supabase } from '@shared/config/supabase.js';
import { CONSIGNMENT_BUCKET, MAX_PHOTOS } from '../data/consignmentConstants.js';
import { resizeConsignmentPhoto } from './consignmentImageResize.js';

const PUBLIC_MARKER = `/object/public/${CONSIGNMENT_BUCKET}/`;

function fileExt(file) {
  const type = String(file?.type || '').toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  return 'jpg';
}

/** Same File → same URL, so retrying a failed submit doesn't upload every photo again. */
const uploadedUrls = new WeakMap();
/** Files that already went through prepareConsignmentPhoto (re-encoding again would lose quality). */
const preparedFiles = new WeakSet();

/** Checks type, strips metadata and shrinks the photo. Throws a seller-friendly message. */
export async function prepareConsignmentPhoto(original) {
  if (!original) throw new Error('Choose a photo first.');
  if (preparedFiles.has(original)) return original;
  const okType = /^image\/(jpeg|jpg|pjpeg|png|webp)$/i.test(original.type)
    || /\.(jpe?g|png|webp)$/i.test(original.name || '');
  if (!okType) throw new Error('Use a JPG, PNG, or WebP picture.');
  const file = await resizeConsignmentPhoto(original);
  if (file.size > 8 * 1024 * 1024) throw new Error('Keep each photo under 8 MB.');
  preparedFiles.add(file);
  return file;
}

async function signedInUserId() {
  const { data } = await supabase.auth.getSession();
  const id = data?.session?.user?.id;
  if (!id) throw new Error('Log in to upload photos.');
  return id;
}

export async function uploadConsignmentPhoto(original) {
  if (!original) throw new Error('Choose a photo first.');
  const cached = uploadedUrls.get(original);
  if (cached) return cached;
  const file = await prepareConsignmentPhoto(original);

  const userId = await signedInUserId();
  const path = `submissions/${userId}/${crypto.randomUUID()}.${fileExt(file)}`;
  const { error } = await supabase.storage.from(CONSIGNMENT_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || 'image/jpeg',
    cacheControl: '3600',
  });
  if (error) {
    const missing = /bucket not found|not found/i.test(error.message || '');
    throw new Error(
      missing
        ? 'Run supabase-migrations/consignment-2026-10.sql in the Supabase SQL editor, then try again.'
        : /row-level security|unauthorized|403/i.test(error.message || '')
          ? 'Only approved sellers can upload photos. Request seller access first.'
          : (error.message || 'Could not upload the photo.')
    );
  }
  const { data } = supabase.storage.from(CONSIGNMENT_BUCKET).getPublicUrl(path);
  const url = String(data?.publicUrl || '').trim();
  if (!url) throw new Error('Upload finished but no public URL came back.');
  const clean = url.split('?')[0];
  uploadedUrls.set(original, clean);
  return clean;
}

/** `onProgress(done, total)` fires before each upload and once at the end. */
export async function uploadConsignmentPhotos(files, onProgress) {
  const list = [...(files || [])].slice(0, MAX_PHOTOS);
  const urls = [];
  for (const [i, file] of list.entries()) {
    onProgress?.(i, list.length);
    urls.push(await uploadConsignmentPhoto(file));
  }
  onProgress?.(list.length, list.length);
  return urls;
}

function storagePathFromUrl(url) {
  const s = String(url || '');
  const i = s.indexOf(PUBLIC_MARKER);
  if (i < 0) return null;
  return decodeURIComponent(s.slice(i + PUBLIC_MARKER.length).split('?')[0]);
}

/** Admins delete any photo; sellers only their own uploads (storage RLS). Ignores URLs outside the bucket. */
export async function deleteConsignmentPhotos(urls) {
  const paths = [...new Set((urls || []).map(storagePathFromUrl).filter(Boolean))];
  if (!paths.length) return;
  const { error } = await supabase.storage.from(CONSIGNMENT_BUCKET).remove(paths);
  if (error) throw new Error(error.message || 'Could not delete photos.');
}
