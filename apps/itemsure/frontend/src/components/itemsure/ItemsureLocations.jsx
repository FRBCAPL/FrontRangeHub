import React, { useCallback, useEffect, useState } from 'react';
import { listLocations, setLocationActive, setStorageAreaActive } from '../../services/itemsureLocationService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ErrorNote, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsureLocationCard from './ItemsureLocationCard.jsx';
import ItemsureLocationForm from './ItemsureLocationForm.jsx';
import ItemsureStorageAreaForm from './ItemsureStorageAreaForm.jsx';

export default function ItemsureLocations() {
  const { organization, can } = useItemsureWorkspace();
  const [locations, setLocations] = useState(null);
  const [adding, setAdding] = useState(false);
  const [areaFor, setAreaFor] = useState(null);
  const { busy, error, setError, run } = useItemsureAction();
  const canManageLocations = can('locations.manage');
  const canManageStorage = can('storage.manage');

  const refresh = useCallback(async () => {
    try {
      setLocations(await listLocations(organization.id));
    } catch (e) {
      setLocations([]);
      setError(e.message);
    }
  }, [organization.id, setError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleLocation = (location) =>
    run(async () => {
      await setLocationActive(organization.id, location.id, !location.is_active);
      await refresh();
    });

  const toggleArea = (area) =>
    run(async () => {
      await setStorageAreaActive(organization.id, area.id, !area.is_active);
      await refresh();
    });

  const closeAdding = useCallback(() => setAdding(false), []);
  const closeArea = useCallback(() => setAreaFor(null), []);

  return (
    <div className="isu-page">
      <PageHead
        title="Locations"
        description="Physical sites and the storage areas inside them."
        action={canManageLocations ? (
          <button type="button" className="isu-btn isu-btn--primary" onClick={() => setAdding(true)}>Add location</button>
        ) : null}
      />
      <ErrorNote message={error} />

      {locations === null ? <p className="isu-muted">Loading…</p> : null}
      {locations?.length === 0 ? (
        <div className="isu-card isu-empty">
          <h2>No locations yet</h2>
          <p className="isu-muted">
            {canManageLocations ? 'Add your first site to start organizing storage.' : 'No locations are shared with you yet.'}
          </p>
        </div>
      ) : null}

      <div className="isu-stack">
        {(locations || []).map((location) => (
          <ItemsureLocationCard
            key={location.id}
            location={location}
            canManageLocation={canManageLocations}
            canManageStorage={canManageStorage}
            busy={busy}
            onToggle={toggleLocation}
            onAddArea={setAreaFor}
            onToggleArea={toggleArea}
          />
        ))}
      </div>

      <Modal open={adding} title="Add location" onClose={closeAdding}>
        <ItemsureLocationForm
          organizationId={organization.id}
          onSaved={async () => {
            setAdding(false);
            await refresh();
          }}
        />
      </Modal>

      <Modal open={Boolean(areaFor)} title="Add storage area" onClose={closeArea}>
        {areaFor ? (
          <ItemsureStorageAreaForm
            organizationId={organization.id}
            location={areaFor}
            onSaved={async () => {
              setAreaFor(null);
              await refresh();
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}
