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

export async function uploadConsignmentPhoto(original) {
  if (!original) throw new Error('Choose a photo first.');
  const okType = /^image\/(jpeg|jpg|pjpeg|png|webp)$/i.test(original.type)
    || /\.(jpe?g|png|webp)$/i.test(original.name || '');
  if (!okType) throw new Error('Use a JPG, PNG, or WebP picture.');
  const file = await resizeConsignmentPhoto(original);
  if (file.size > 8 * 1024 * 1024) throw new Error('Keep each photo under 8 MB.');

  const path = `submissions/${crypto.randomUUID()}.${fileExt(file)}`;
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
        : (error.message || 'Could not upload the photo.')
    );
  }
  const { data } = supabase.storage.from(CONSIGNMENT_BUCKET).getPublicUrl(path);
  const url = String(data?.publicUrl || '').trim();
  if (!url) throw new Error('Upload finished but no public URL came back.');
  return url.split('?')[0];
}

export async function uploadConsignmentPhotos(files) {
  const list = [...(files || [])].slice(0, MAX_PHOTOS);
  const urls = [];
  for (const file of list) {
    urls.push(await uploadConsignmentPhoto(file));
  }
  return urls;
}

function storagePathFromUrl(url) {
  const s = String(url || '');
  const i = s.indexOf(PUBLIC_MARKER);
  if (i < 0) return null;
  return decodeURIComponent(s.slice(i + PUBLIC_MARKER.length).split('?')[0]);
}

/** Admin only (storage RLS). Ignores URLs that aren't in the consignment bucket. */
export async function deleteConsignmentPhotos(urls) {
  const paths = [...new Set((urls || []).map(storagePathFromUrl).filter(Boolean))];
  if (!paths.length) return;
  const { error } = await supabase.storage.from(CONSIGNMENT_BUCKET).remove(paths);
  if (error) throw new Error(error.message || 'Could not delete photos.');
}
