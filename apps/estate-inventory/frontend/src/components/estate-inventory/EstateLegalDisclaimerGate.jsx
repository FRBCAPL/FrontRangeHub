import React, { useState } from 'react';
import { hasAcknowledgedLegalDisclaimer } from '@shared/utils/estateLegalDisclaimer.js';
import EstateLegalDisclaimerModal from './EstateLegalDisclaimerModal.jsx';

/**
 * Blocks Estate Vault entry flows until the legal disclaimer is acknowledged
 * (this browser). Used on home, PR sign-in/create, and family/helper entry.
 */
const EstateLegalDisclaimerGate = ({ children }) => {
  const [acked, setAcked] = useState(() => hasAcknowledgedLegalDisclaimer());

  return (
    <>
      {children}
      <EstateLegalDisclaimerModal
        open={!acked}
        required
        onClose={() => {}}
        onAcknowledge={() => setAcked(true)}
      />
    </>
  );
};

export default EstateLegalDisclaimerGate;
