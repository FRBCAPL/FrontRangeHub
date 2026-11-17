import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { tryDemoBar } from '../../services/itemsureDemoService.js';
import { ErrorNote } from './ItemsureUi.jsx';

/**
 * Button to open this person's private Demo Bar. Used on Setup (and anywhere we offer try-demo).
 */
export default function ItemsureDemoEnter({ className = '', label = 'Try the Demo Bar' }) {
  const { reload, workspace } = useItemsureWorkspace();
  const navigate = useNavigate();
  const { busy, error, run } = useItemsureAction();
  const already = (workspace?.memberships || []).some((m) => m.isDemo);

  const go = async () => {
    if (await run(() => tryDemoBar())) {
      await reload();
      navigate(ITEMSURE_PATH, { state: { newBusiness: 'Demo Bar' } });
    }
  };

  return (
    <div className={className || undefined}>
      <button type="button" className="isu-btn isu-btn--primary" disabled={busy} onClick={go}>
        {busy ? 'Opening Demo Bar…' : already ? 'Open Demo Bar' : label}
      </button>
      <ErrorNote message={error} />
    </div>
  );
}
