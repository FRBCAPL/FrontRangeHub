import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setOrganizationArchived } from '../../services/itemsureOrgService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { sites } from '../../data/itemsureTerms.js';
import { ErrorNote, Modal } from './ItemsureUi.jsx';

/** Owner-only button + confirmation that archives the business you're working in. */
export function ArchiveBusinessButton() {
  const { organization, workspace, reload } = useItemsureWorkspace();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const { busy, error, run } = useItemsureAction();
  const close = useCallback(() => setConfirming(false), []);
  if (organization?.roleCode !== 'owner' || !workspace?.archiveAvailable) return null;

  const others = (workspace.memberships || []).filter((m) => m.organizationId !== organization.id);
  const archive = async () => {
    if (await run(() => setOrganizationArchived(organization.id, true))) {
      setConfirming(false);
      await reload();
      navigate(ITEMSURE_PATH);
    }
  };

  return (
    <>
      <button type="button" className="isu-btn isu-btn--danger-ghost isu-btn--sm" onClick={() => setConfirming(true)}>
        Archive this business
      </button>
      <Modal open={confirming} title={`Archive ${organization.name}?`} onClose={close}>
        <ErrorNote message={error} />
        <p>
          It will be hidden for <strong>everyone</strong> on its team. Nothing is deleted: its {sites}, items, stock, and history
          stay saved, and you can restore it any time from Settings &rarr; Business.
        </p>
        <p className="isu-muted isu-small">
          {others.length
            ? `You'll be switched to ${others[0].organizationName}.`
            : 'This is your only active business, so you will be taken to the setup page, where you can restore it later.'}
        </p>
        <div className="isu-quickcount-actions">
          <button type="button" className="isu-btn isu-btn--danger" onClick={archive} disabled={busy}>
            {busy ? 'Archiving\u2026' : 'Archive business'}
          </button>
          <button type="button" className="isu-btn isu-btn--ghost" onClick={close} disabled={busy}>Cancel</button>
        </div>
      </Modal>
    </>
  );
}

/** The owner's archived businesses, each with Restore. Renders nothing when there are none. */
export function ArchivedBusinesses() {
  const { workspace, switchOrganization } = useItemsureWorkspace();
  const navigate = useNavigate();
  const { busy, error, run } = useItemsureAction();
  const archived = workspace?.archived || [];
  if (!archived.length) return null;

  const restore = async (id) => {
    if (await run(() => setOrganizationArchived(id, false))) {
      await switchOrganization(id);
      navigate(ITEMSURE_PATH);
    }
  };

  return (
    <div className="isu-archived-list">
      <h3>Archived businesses</h3>
      <ErrorNote message={error} />
      {archived.map((m) => (
        <div key={m.organizationId} className="isu-archived-row">
          <span>{m.organizationName}</span>
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => restore(m.organizationId)} disabled={busy}>
            Restore
          </button>
        </div>
      ))}
      <p className="isu-muted isu-small">Restoring brings it back for its whole team, with everything it had.</p>
    </div>
  );
}
