import React from 'react';
import { useNavigate } from 'react-router-dom';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { tryDemoBar } from '../../services/itemsureDemoService.js';
import { ErrorNote } from './ItemsureUi.jsx';

/**
 * Welcome / Auth: open Demo Bar without asking for email (guest session under the hood).
 */
export default function ItemsureDemoTry({
  className = '',
  label = 'Try the Demo Bar',
  primary = true,
  block = false,
}) {
  const navigate = useNavigate();
  const { busy, error, run } = useItemsureAction();

  const go = () => {
    run(async () => {
      await tryDemoBar();
      navigate(ITEMSURE_PATH, { state: { newBusiness: 'Demo Bar' }, replace: true });
    });
  };

  const btnClass = [
    'isu-btn',
    primary ? 'isu-btn--primary' : 'isu-btn--ghost',
    block ? 'isu-btn--block' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={className || undefined}>
      <button type="button" className={btnClass} disabled={busy} onClick={go}>
        {busy ? 'Opening Demo Bar…' : label}
      </button>
      <ErrorNote message={error} />
    </div>
  );
}
