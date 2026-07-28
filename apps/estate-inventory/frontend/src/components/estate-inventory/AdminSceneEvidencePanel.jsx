import React, { useCallback, useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import SceneCaptureForm from './SceneCaptureForm';
import SceneRoomGroups from './SceneRoomGroups';
import EditSceneCaptureModal from './EditSceneCaptureModal';
import { useEstateCase } from './EstateCaseContext';

/**
 * Admin-only: capture + browse "as we walked in" scene photos.
 * Grouped by room; tap a photo to move / edit / archive / delete (with change history).
 */
const AdminSceneEvidencePanel = ({ onCaptureScene, showCapture = false, onCloseCapture }) => {
  const { caseNumber } = useEstateCase();
  const [rows, setRows] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [scenes, rooms] = await Promise.all([
      estateInventoryService.listSceneCaptures(caseNumber, { includeArchived: showArchived }),
      estateInventoryService.listCollections(caseNumber)
    ]);
    setLoading(false);
    if (!scenes.success) {
      setError(scenes.error || 'Could not load scene photos.');
      setRows([]);
    } else {
      setRows(scenes.data || []);
    }
    if (rooms.success) {
      setCollections(rooms.data || []);
    }
  }, [caseNumber, showArchived]);

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

  const activeRows = showArchived
    ? rows
    : rows.filter((r) => !r.archived_at);
  const archivedOnly = showArchived ? rows.filter((r) => r.archived_at) : [];

  return (
    <section className="ei-scene-evidence">
      <header className="ei-scene-evidence-head">
        <div>
          <h2 className="ei-settings-subhead" style={{ marginTop: 0 }}>
            Scene documentation
          </h2>
          <p className="ei-settings-hint" style={{ margin: 0 }}>
            “What we walked into” — grouped by room. Tap a photo to move, edit notes, archive, or
            delete. Changes are logged like inventory items. Admin only.
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
            collections={collections}
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

      <div className="ei-scene-toolbar">
        <label className="ei-toggle-row ei-scene-show-archived">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          <span>Show archived</span>
        </label>
      </div>

      {message ? <p className="ei-status">{message}</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}
      {loading ? <p className="ei-status">Loading scene photos…</p> : null}

      {!loading && !activeRows.length && !showCapture ? (
        <div className="ei-empty">
          <p>
            {showArchived && archivedOnly.length
              ? 'No active scene photos — archived ones are listed below.'
              : 'No scene photos yet. Capture rooms and packed areas as you walk in.'}
          </p>
        </div>
      ) : null}

      {!loading && activeRows.filter((r) => !r.archived_at).length ? (
        <SceneRoomGroups
          rows={activeRows.filter((r) => !r.archived_at)}
          onSelectScene={setEditing}
        />
      ) : null}

      {showArchived && archivedOnly.length ? (
        <div className="ei-scene-archived-wrap">
          <h3 className="ei-settings-subhead">Archived</h3>
          <SceneRoomGroups rows={archivedOnly} onSelectScene={setEditing} />
        </div>
      ) : null}

      <EditSceneCaptureModal
        open={Boolean(editing)}
        scene={editing}
        collections={collections}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setMessage('Scene photo updated.');
          await load();
        }}
        onDeleted={async () => {
          setMessage('Scene photo permanently deleted.');
          await load();
        }}
      />
    </section>
  );
};

export default AdminSceneEvidencePanel;
