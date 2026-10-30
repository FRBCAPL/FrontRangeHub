import React, { useCallback, useEffect, useState } from 'react';
import { listLocations, setLocationActive, setStorageAreaActive } from '../../services/itemsureLocationService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { site, sites, SITES } from '../../data/itemsureTerms.js';
import { ErrorNote, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsureLocationCard from './ItemsureLocationCard.jsx';
import ItemsureLocationForm from './ItemsureLocationForm.jsx';
import ItemsureStorageAreaForm from './ItemsureStorageAreaForm.jsx';
import ItemsureLevelsExplainer from './ItemsureLevelsExplainer.jsx';
export default function ItemsureLocations() {
  const { organization, features, can } = useItemsureWorkspace();
  const [locations, setLocations] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [areaForm, setAreaForm] = useState(null);
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

  const closeAdding = useCallback(() => {
    setAdding(false);
    setEditing(null);
  }, []);
  const closeArea = useCallback(() => setAreaForm(null), []);
  const savedLocation = async () => {
    closeAdding();
    await refresh();
  };

  return (
    <div className="isu-page">
      <PageHead
        title={SITES}
        description={`Your ${sites} (like a bar, a store, a warehouse, or a van) and any spots inside them.`}
        action={canManageLocations ? (
          <button type="button" className="isu-btn isu-btn--primary" onClick={() => setAdding(true)}>Add {site}</button>
        ) : null}
      />
      <ItemsureLevelsExplainer focus="site" />
      <ErrorNote message={error} />

      {locations === null ? <p className="isu-muted">Loading…</p> : null}
      {locations?.length === 0 ? (
        <div className="isu-card isu-empty">
          <h2>No {sites} yet</h2>
          <p className="isu-muted">
            {canManageLocations ? `Add your first ${site} to start organizing storage.` : `No ${sites} are shared with you yet.`}
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
            showSpots={features.spots}
            busy={busy}
            onToggle={toggleLocation}
            onEdit={setEditing}
            onAddArea={(loc) => setAreaForm({ location: loc, area: null })}
            onEditArea={(loc, area) => setAreaForm({ location: loc, area })}
            onToggleArea={toggleArea}
          />
        ))}
      </div>

      <Modal open={adding} title={`Add ${site}`} onClose={closeAdding}>
        <ItemsureLocationForm organizationId={organization.id} onSaved={savedLocation} />
      </Modal>

      <Modal open={Boolean(editing)} title={editing ? `Edit ${editing.name}` : `Edit ${site}`} onClose={closeAdding}>
        {editing ? (
          <ItemsureLocationForm key={editing.id} organizationId={organization.id} location={editing} onSaved={savedLocation} />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(areaForm)}
        title={areaForm?.area ? `Edit ${areaForm.area.name}` : 'Add spot'}
        onClose={closeArea}
      >
        {areaForm ? (
          <ItemsureStorageAreaForm
            key={areaForm.area?.id || areaForm.location.id}
            organizationId={organization.id}
            location={areaForm.location}
            area={areaForm.area}
            onSaved={async () => {
              setAreaForm(null);
              await refresh();
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}
