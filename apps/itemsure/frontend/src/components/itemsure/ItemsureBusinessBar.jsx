import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { sites } from '../../data/itemsureTerms.js';
import ItemsureLevelsExplainer from './ItemsureLevelsExplainer.jsx';

/**
 * Top of every page: the business you're working in. With more than one, tap it to switch.
 * Right after a new business is created (navigation state `newBusiness`), says so.
 */
export default function ItemsureBusinessBar() {
  const { organization, workspace, switchOrganization } = useItemsureWorkspace();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const memberships = workspace?.memberships || [];
  const several = memberships.length > 1;
  if (!organization) return null;

  const pick = async (id) => {
    setOpen(false);
    if (id === organization.id) return;
    setSwitching(true);
    await switchOrganization(id);
    setSwitching(false);
    navigate(ITEMSURE_PATH);
  };

  return (
    <div className="isu-business-bar">
      {several ? (
        <button type="button" className="isu-business-name is-button" onClick={() => setOpen((o) => !o)} aria-expanded={open} disabled={switching}>
          <span aria-hidden="true">{'\u{1F3E2}'}</span> {switching ? 'Switching\u2026' : organization.name} <span aria-hidden="true">{open ? '\u25B4' : '\u25BE'}</span>
        </button>
      ) : (
        <span className="isu-business-name"><span aria-hidden="true">{'\u{1F3E2}'}</span> {organization.name}</span>
      )}

      {open ? (
        <div className="isu-business-menu" role="group" aria-label="Switch business">
          <p className="isu-muted isu-small">Each business has its own {sites}, items, and stock.</p>
          <ItemsureLevelsExplainer focus="business" />
          {memberships.map((m) => (
            <button key={m.organizationId} type="button" className={`isu-business-option${m.organizationId === organization.id ? ' is-current' : ''}`} onClick={() => pick(m.organizationId)}>
              <span>{m.organizationId === organization.id ? '\u2713 ' : ''}{m.organizationName}</span>
              <span className="isu-muted isu-small">{m.roleName}</span>
            </button>
          ))}
        </div>
      ) : null}

      {state?.newBusiness && state.newBusiness === organization.name ? (
        <p className="isu-notice isu-business-new" role="status">
          You&apos;re now working in <strong>{organization.name}</strong>, a separate business with its own {sites} and items.
          {several ? ' Switch back any time by tapping its name above.' : ''}
        </p>
      ) : null}

      {state?.joinedBusiness && state.joinedBusiness === organization.name ? (
        <p className="isu-notice isu-business-new" role="status">
          Welcome to <strong>{organization.name}</strong>! You joined as {organization.roleName}.
        </p>
      ) : null}
    </div>
  );
}
