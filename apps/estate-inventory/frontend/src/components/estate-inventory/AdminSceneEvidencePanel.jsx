import React, { useCallback, useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { getPhotoEntries } from '@shared/utils/estatePhotoMeta.js';
import SceneCaptureForm from './SceneCaptureForm';
import { useEstateCase } from './EstateCaseContext';

/**
 * Admin-only: capture + browse "as we walked in" scene photos.
 * Not visible to heirs or auction.
 */
const AdminSceneEvidencePanel = ({ onCaptureScene, showCapture = false, onCloseCapture }) => {
  const { caseNumber } = useEstateCase();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await estateInventoryService.listSceneCaptures(caseNumber);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load scene photos.');
      setRows([]);
      return;
    }
    setRows(result.data || []);
  }, [caseNumber]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (payload) => {
    setBusy(true);
    setMessage('');
    const result = await estateInventoryService.createSceneCapture({
      ...payload,
      caseNumber
    });
    setBusy(false);
    if (!result.success) {
      return { success: false, error: result.error || 'Could not save scene.' };
    }
    setMessage(result.warning ? `Saved. ${result.warning}` : 'Scene photo saved (admin only).');
    await load();
    onCloseCapture?.();
    return { success: true };
  };

  return (
    <section className="ei-scene-evidence">
      <header className="ei-scene-evidence-head">
        <div>
          <h2 className="ei-settings-subhead" style={{ marginTop: 0 }}>
            Scene documentation
          </h2>
          <p className="ei-settings-hint" style={{ margin: 0 }}>
            “What we walked into” — rooms, walls, boxes, bags. Admin only. Not inventory items and not
            shown to heirs.
          </p>
        </div>
        {!showCapture ? (
          <button type="button" className="ei-btn" onClick={() => onCaptureScene?.()}>
            Add scene photo
          </button>
        ) : null}
      </header>

      {showCapture ? (
        <div className="ei-scene-capture-wrap">
          <SceneCaptureForm
            busy={busy}
            onSubmit={handleSubmit}
            submitLabel="Save scene photo"
          />
          <button
            type="button"
            className="ei-btn ei-btn-secondary"
            style={{ marginTop: '0.65rem' }}
            onClick={() => onCloseCapture?.()}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {message ? <p className="ei-status">{message}</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}
      {loading ? <p className="ei-status">Loading scene photos…</p> : null}

      {!loading && !rows.length && !showCapture ? (
        <div className="ei-empty">
          <p>No scene photos yet. Capture rooms and packed areas as you walk in.</p>
        </div>
      ) : null}

      <div className="ei-grid ei-scene-grid">
        {rows.map((row) => {
          const photos = getPhotoEntries(row);
          const url = photos[0]?.url || row.photo_url;
          const takenBy = photos[0]?.taken_by || row.created_by_name || '—';
          return (
            <article key={row.id} className="ei-card ei-scene-card">
              {url ? (
                <img className="ei-card-photo" src={url} alt={row.room_label} loading="lazy" />
              ) : (
                <div className="ei-card-photo-placeholder">No photo</div>
              )}
              <div className="ei-card-body">
                <strong>{row.room_label}</strong>
                <p className="ei-card-meta">
                  {row.created_by_role === 'helper' ? 'Helper' : 'PR'} · {takenBy}
                </p>
                <p className="ei-card-meta">
                  {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                </p>
                {row.notes ? <p className="ei-card-meta">{row.notes}</p> : null}
                {row.photo_gps_lat != null && row.photo_gps_lng != null ? (
                  <p className="ei-card-meta">
                    GPS {Number(row.photo_gps_lat).toFixed(5)}, {Number(row.photo_gps_lng).toFixed(5)}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AdminSceneEvidencePanel;
