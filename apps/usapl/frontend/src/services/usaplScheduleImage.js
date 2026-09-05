import { supabase } from '@shared/config/supabase.js';
import { USAPL_TENANT_ID } from '../data/usaplConstants.js';
import { slugUsaplDivisionId } from '../data/usaplDivisions.js';

export const USAPL_SCHEDULE_BUCKET = 'usapl-public';

function fileExt(file) {
  const type = String(file?.type || '').toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  return 'jpg';
}

async function uploadUsaplPublicImage(folder, divisionId, file, label) {
  if (!file) throw new Error(`Choose a ${label} first.`);
  const okType = /^image\/(jpeg|jpg|pjpeg|png|webp)$/i.test(file.type)
    || /\.(jpe?g|png|webp)$/i.test(file.name || '');
  if (!okType) throw new Error('Use a JPG, PNG, or WebP picture.');
  if (file.size > 8 * 1024 * 1024) throw new Error(`Keep the ${label} under 8 MB.`);

  const id = slugUsaplDivisionId(divisionId) || `${folder}-${Date.now()}`;
  const path = `${USAPL_TENANT_ID}/${folder}/${id}.${fileExt(file)}`;
  const { error } = await supabase.storage.from(USAPL_SCHEDULE_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
    cacheControl: '3600',
  });
  if (error) {
    const missing = /bucket not found|not found/i.test(error.message || '');
    throw new Error(
      missing
        ? 'Run supabase-migrations/usapl-schedule-images-2026-09.sql in the Supabase SQL editor, then try the upload again.'
        : (error.message || `Could not upload the ${label}.`)
    );
  }
  const { data } = supabase.storage.from(USAPL_SCHEDULE_BUCKET).getPublicUrl(path);
  const url = String(data?.publicUrl || '').trim();
  if (!url) throw new Error('Upload finished but no public URL came back.');
  return `${url.split('?')[0]}?v=${Date.now()}`;
}

export async function uploadUsaplScheduleImage(divisionId, file) {
  return uploadUsaplPublicImage('schedules', divisionId, file, 'schedule picture');
}

export async function uploadUsaplFlyerImage(divisionId, file) {
  return uploadUsaplPublicImage('flyers', divisionId, file, 'division flyer');
}
