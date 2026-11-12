import React, { useState } from 'react';
import { hasRecordedEntry } from '../../utils/duezyCorrection.js';
import DuezyRecordPayment from './DuezyRecordPayment.jsx';

/**
 * Under the week's buttons: a week with money shows its entry (correct / add payment); otherwise
 * "Other amount…" opens the amount / method / note form only when the buttons aren't enough.
 */
export default function DuezyMorePayment(props) {
  const [open, setOpen] = useState(false);
  if (hasRecordedEntry(props.payment) || open) return <DuezyRecordPayment {...props} />;
  return (
    <button type="button" className="dz-link dz-small dz-more-pay" onClick={() => setOpen(true)}>
      Other amount, partial or note…
    </button>
  );
}
