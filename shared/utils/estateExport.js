import {
  APP_NAME,
    legalStatusLabel,
  valueTierLabel,
  normalizeDescendantsInterestPct
} from './estateInventoryConstants.js';
import { getPhotoEntries } from './estatePhotoMeta.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function catalogTableHtml(items, { offlinePack = false } = {}) {
  const rows = (items || [])
    .map((item) => {
      const photos = getPhotoEntries(item).filter((p) => p?.url);
      const missingOffline = offlinePack && getPhotoEntries(item).some((p) => p?.offline_missing);
      let thumb = '—';
      if (photos[0]) {
        thumb = `<img src="${escapeHtml(photos[0].url)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:6px;" />`;
      } else if (missingOffline) {
        thumb = '<span style="color:#9a3412;font-size:0.8rem">Photo not bundled</span>';
      }
      const takenBy =
        [...new Set(getPhotoEntries(item).map((p) => p.taken_by).filter(Boolean))].join(', ') ||
        '—';
      return `<tr>
        <td>${thumb}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.room)}</td>
        <td>${escapeHtml(valueTierLabel(item.value_tier))}</td>
        <td>${escapeHtml(legalStatusLabel(item.legal_status))}</td>
        <td>${escapeHtml(item.assigned_beneficiary || '—')}</td>
        <td>${escapeHtml(takenBy)}</td>
      </tr>`;
    })
    .join('');

  return `<table>
    <thead>
      <tr>
        <th>Photo</th>
        <th>Title</th>
        <th>Room</th>
        <th>Value Tier</th>
        <th>Legal Status</th>
        <th>Beneficiary</th>
        <th>Photo by</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7">No items yet.</td></tr>'}
    </tbody>
  </table>`;
}

const CATALOG_CSS = `
  body { font-family: Georgia, "Times New Roman", serif; color: #1c1917; margin: 1.5rem; background: #fafaf9; }
  h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
  .meta { color: #57534e; font-size: 0.9rem; margin-bottom: 1.25rem; }
  .banner { background: #fff7ed; border: 1px solid #fdba74; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; background: #fff; }
  th, td { border: 1px solid #e7e5e4; padding: 0.55rem 0.6rem; text-align: left; vertical-align: middle; font-size: 0.9rem; }
  th { background: #f5f5f4; font-family: system-ui, sans-serif; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
  @media print {
    .no-print { display: none !important; }
    body { margin: 0.5in; background: #fff; }
  }
  .toolbar { margin-bottom: 1rem; display: flex; gap: 0.5rem; }
  button { font: inherit; padding: 0.5rem 0.9rem; cursor: pointer; }
`;

export function buildCatalogJson({ caseNumber, items, generatedAt, offlinePack = false }) {
  return JSON.stringify(
    {
      export_kind: 'inventory_catalog_backup',
      note: offlinePack
        ? 'Catalog backup for USB/offline use. Photo URLs are relative paths under photos/ when bundled. remote_url retains the original cloud URL when present.'
        : 'Catalog-only backup of inventory items. Does not include Needs attention / completeness status — use Evidence Pack or Formal Accounting for supporting exports.',
      case_number: caseNumber || 'estate',
      offline_pack: Boolean(offlinePack),
      generated_at: generatedAt,
      read_only: true,
      item_count: (items || []).length,
      items: (items || []).map((item) => ({
        id: item.id,
        title: item.name,
        description: item.notes,
        room: item.room,
        value_tier: item.value_tier,
        value_tier_label: valueTierLabel(item.value_tier),
        legal_status: item.legal_status,
        legal_status_label: legalStatusLabel(item.legal_status),
        is_memorandum_asset: item.is_memorandum_asset,
        assigned_beneficiary: item.assigned_beneficiary,
        descendants_interest: Boolean(
          normalizeDescendantsInterestPct(item.descendants_interest_pct) ??
            item.descendants_interest
        ),
        descendants_interest_pct: normalizeDescendantsInterestPct(item.descendants_interest_pct),
        main_photo: item.photo_url,
        photos: getPhotoEntries(item),
        photo_captured_at: item.photo_captured_at,
        photo_gps_lat: item.photo_gps_lat,
        photo_gps_lng: item.photo_gps_lng,
        created_by_name: item.created_by_name || null,
        created_by_role: item.created_by_role || null
      }))
    },
    null,
    2
  );
}

export function buildReadOnlyHtml({ caseNumber, items, generatedAt }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(APP_NAME)} — Case ${escapeHtml(caseNumber || 'estate')} (Read-only)</title>
  <style>${CATALOG_CSS}</style>
</head>
<body>
  <div class="banner"><strong>Read-only review copy.</strong> Edits are not available on this page.</div>
  <h1>${escapeHtml(APP_NAME)} Catalog</h1>
  <p class="meta">Case ${escapeHtml(caseNumber || 'estate')} · Generated ${escapeHtml(generatedAt || '')} · ${(items || []).length} items</p>
  ${catalogTableHtml(items)}
</body>
</html>`;
}

/** Print-ready catalog HTML (preview / download — not a filing). */
export function buildPrintableCatalogHtml({
  caseNumber,
  items,
  generatedAt,
  certificateHtml = '',
  offlinePack = false
}) {
  const offlineNote = offlinePack
    ? `<p class="meta">Offline pack copy — photos load from the local <code>photos/</code> folder next to this file.</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(APP_NAME)} Catalog — Case ${escapeHtml(caseNumber || 'estate')}</title>
  <style>${CATALOG_CSS}</style>
</head>
<body>
  <h1>${escapeHtml(APP_NAME)} Catalog</h1>
  <p class="meta">Case ${escapeHtml(caseNumber || 'estate')} · Generated ${escapeHtml(generatedAt || '')} · ${(items || []).length} items · Supporting document — not a filing</p>
  ${offlineNote}
  ${certificateHtml || ''}
  ${catalogTableHtml(items, { offlinePack })}
</body>
</html>`;
}

/** Opens a print-ready catalog window (use browser Print → Save as PDF). */
export function openPrintablePdfCatalog({
  caseNumber,
  items,
  generatedAt,
  certificateHtml = ''
}) {
  const html = buildPrintableCatalogHtml({
    caseNumber,
    items,
    generatedAt,
    certificateHtml
  });

  // Blob URL avoids blank tabs caused by window.open(..., 'noopener') + document.write
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      URL.revokeObjectURL(url);
      return { success: false, error: 'Pop-up blocked. Allow pop-ups to export the PDF catalog.' };
    }
    // Revoke after the tab has a chance to load
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || 'Could not open the court PDF window.' };
  }
}

export function downloadJsonFile({ caseNumber, items, generatedAt }) {
  const json = buildCatalogJson({ caseNumber, items, generatedAt });
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `estateit-${caseNumber || 'estate'}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return { success: true };
}
