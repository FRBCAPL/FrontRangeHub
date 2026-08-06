import React from 'react';
import { CASH_AVAILABLE_RECONCILIATION } from '@shared/utils/estateCashCopy.js';

/**
 * Shared Cash available reconciliation copy for money surfaces.
 * Newlines in the shared string render as line breaks.
 */
const CashAvailableHint = ({ className = 'ei-settings-hint ei-money-reconcile-hint' }) => (
  <p className={className} style={{ whiteSpace: 'pre-line' }}>
    {CASH_AVAILABLE_RECONCILIATION}
  </p>
);

export default CashAvailableHint;
