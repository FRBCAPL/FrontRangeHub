import React from 'react';
import { CASH_AVAILABLE_RECONCILIATION } from '@shared/utils/estateCashCopy.js';

/**
 * Shared Cash available reconciliation sentence for money surfaces.
 */
const CashAvailableHint = ({ className = 'ei-settings-hint ei-money-reconcile-hint' }) => (
  <p className={className}>{CASH_AVAILABLE_RECONCILIATION}</p>
);

export default CashAvailableHint;
