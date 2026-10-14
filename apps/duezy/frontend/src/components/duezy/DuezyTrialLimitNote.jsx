import React from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import { TRIAL_DIVISIONS } from '../../utils/duezyPricing.js';
import { deletionNote } from '../../utils/duezyBillingText.js';

/** Shown when an action would go past what the trial (or a locked account) allows. */
export default function DuezyTrialLimitNote({ access }) {
  const locked = access?.can_write === false;
  return (
    <div className="dz-bill-note">
      <span aria-hidden="true">{locked ? '🔒' : '⭐'}</span>
      <p>
        {locked
          ? deletionNote(access) || 'Your leagues are read-only until you choose a plan.'
          : `The free trial covers up to ${TRIAL_DIVISIONS} divisions in total (you're using ${access?.divisions_used ?? 0}).`}{' '}
        <Link to={`${DUEZY_PATH}/billing`} className="dz-link">See plans</Link>
      </p>
    </div>
  );
}
