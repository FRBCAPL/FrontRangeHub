import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { resetDemo } from '../../services/itemsureDemoService.js';
import { ErrorNote } from './ItemsureUi.jsx';

/**
 * Shown while working in the private Demo Bar: reset sample data or create a real business.
 */
export default function ItemsureDemoBanner() {
  const { organization, reload } = useItemsureWorkspace();
  const navigate = useNavigate();
  const { busy, error, run } = useItemsureAction();
  if (!organization?.isDemo) return null;

  const onReset = async () => {
    if (!window.confirm('Reset the Demo Bar to the original sample? Your changes in this demo will be replaced.')) return;
    if (await run(() => resetDemo(organization.id))) {
      await reload();
      navigate(ITEMSURE_PATH);
    }
  };

  return (
    <div className="isu-demo-banner" role="status">
      <p>
        <strong>Demo Bar</strong>
        <span className="isu-muted"> — private sample data for you (inventory, counts, and Demo Clover).</span>
      </p>
      <div className="isu-demo-banner-actions">
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onReset}>
          {busy ? 'Resetting…' : 'Reset sample'}
        </button>
        <Link to={`${ITEMSURE_PATH}/setup`} className="isu-btn isu-btn--primary isu-btn--sm">
          Create your own business
        </Link>
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
