/**
 * Offline scene-capture index for the full documentation records pack.
 */

import { APP_NAME } from './estateInventoryConstants.js';
import { getPhotoEntries } from './estatePhotoMeta.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildSceneCapturesJson({
  caseNumber,
  estateName,
  scenes = [],
  generatedAt
}) {
  return JSON.stringify(
    {
      export_kind: 'scene_captures',
      note: 'As-found scene documentation. Photo paths are relative when bundled for USB.',
      estate_name: estateName || 'Estate',
      case_number: caseNumber || 'estate',
      generated_at: generatedAt || new Date().toISOString(),
      scene_count: (scenes || []).length,
      scenes: (scenes || []).map((scene) => ({
        id: scene.id,
        room_label: scene.room_label,
        notes: scene.notes,
        archived_at: scene.archived_at || null,
        photo_captured_at: scene.photo_captured_at,
        photo_received_at: scene.photo_received_at,
        photo_gps_lat: scene.photo_gps_lat,
        photo_gps_lng: scene.photo_gps_lng,
        created_by_name: scene.created_by_name,
        created_by_role: scene.created_by_role,
        photos: getPhotoEntries(scene),
        created_at: scene.created_at
      }))
    },
    null,
    2
  );
}

export function buildSceneCapturesHtml({
  caseNumber,
  estateName,
  scenes = [],
  generatedAt
}) {
  const cards = (scenes || [])
    .map((scene) => {
      const photos = getPhotoEntries(scene).filter((p) => p?.url);
      const thumbs = photos.length
        ? photos
            .map(
              (p) =>
                `<img src="${escapeHtml(p.url)}" alt="" style="width:120px;height:120px;object-fit:cover;border-radius:6px;margin:0 0.4rem 0.4rem 0;" />`
            )
            .join('')
        : scene.offline_missing || getPhotoEntries(scene).some((p) => p?.offline_missing)
          ? '<span style="color:#9a3412">Photo not bundled</span>'
          : '—';
      const when = scene.photo_captured_at || scene.created_at;
      const gps =
        scene.photo_gps_lat != null && scene.photo_gps_lng != null
          ? `${scene.photo_gps_lat}, ${scene.photo_gps_lng}`
          : '—';
      return `<section style="border:1px solid #e7e5e4;background:#fff;padding:1rem;margin:0 0 1rem;border-radius:8px">
        <h2 style="font-size:1.1rem;margin:0 0 0.35rem">${escapeHtml(scene.room_label || 'Scene')}</h2>
        <p style="color:#57534e;font-size:0.85rem;margin:0 0 0.75rem">
          ${when ? escapeHtml(new Date(when).toLocaleString()) : '—'}
          · By ${escapeHtml(scene.created_by_name || '—')}
          (${escapeHtml(scene.created_by_role || '—')})
          · GPS ${escapeHtml(gps)}
          ${scene.archived_at ? ' · Archived' : ''}
        </p>
        <div>${thumbs}</div>
        ${
          scene.notes
            ? `<p style="white-space:pre-wrap;margin:0.75rem 0 0">${escapeHtml(scene.notes)}</p>`
            : ''
        }
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(APP_NAME)} — Scene captures</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #1c1917; margin: 1.5rem; background: #fafaf9; }
    h1 { font-size: 1.45rem; margin: 0 0 0.25rem; }
    .meta { color: #57534e; font-size: 0.9rem; margin-bottom: 1.25rem; }
  </style>
</head>
<body>
  <h1>Scene captures</h1>
  <p class="meta">${escapeHtml(estateName || 'Estate')} · Case ${escapeHtml(caseNumber || 'estate')} · Generated ${escapeHtml(generatedAt || '')} · ${(scenes || []).length} scene(s) · Photos load from this folder · Supporting record — not a filing</p>
  ${cards || '<p>No scene captures in this estate.</p>'}
</body>
</html>`;
}

export default {
  buildSceneCapturesHtml,
  buildSceneCapturesJson
};
