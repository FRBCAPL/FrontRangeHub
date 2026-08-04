import React, { useEffect, useState } from 'react';
import { getPublicBillingStatus } from '@shared/services/estateBillingService.js';
import { isBillingLocked, lockedPortalMessage } from '@shared/utils/estateBilling.js';

/**
 * Hard pause screen for family / helper / auction when the estate is locked.
 */
const EstateBillingLockedGate = ({ caseNumber, roleLabel = 'this portal', children }) => {
  const [state, setState] = useState({ loading: true, locked: false, message: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getPublicBillingStatus(caseNumber);
      if (cancelled) return;
      if (!result.success || result.data?.migrationMissing) {
        setState({ loading: false, locked: false, message: '' });
        return;
      }
      const locked = isBillingLocked(result.data);
      setState({
        loading: false,
        locked,
        message: lockedPortalMessage(result.data)
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [caseNumber]);

  if (state.loading) {
    return <p className="ei-status">Checking estate access…</p>;
  }
  if (!state.locked) return children;

  return (
    <section className="ei-billing-locked" aria-labelledby="ei-billing-locked-title">
      <h2 id="ei-billing-locked-title">Estate paused</h2>
      <p>{state.message}</p>
      <p className="ei-settings-hint">
        {roleLabel} cannot be used until the Personal Representative renews Estate Vault for this
        case.
      </p>
    </section>
  );
};

export default EstateBillingLockedGate;
