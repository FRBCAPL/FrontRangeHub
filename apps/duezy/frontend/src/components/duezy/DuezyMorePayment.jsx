import React, { useState } from 'react';
import { hasRecordedEntry } from '../../utils/duezyCorrection.js';
import DuezyRecordPayment from './DuezyRecordPayment.jsx';

/**
 * Recorded weeks: Correct / Add (WeekPanel places this under the date). Unpaid weeks: "Other
 * amount…" under the pay buttons when chips aren't enough. Cancel closes that form again.
 */
export default function DuezyMorePayment(props) {
  const [open, setOpen] = useState(false);
  if (hasRecordedEntry(props.payment) || open) {
    return (
      <DuezyRecordPayment
        {...props}
        onCancel={hasRecordedEntry(props.payment) ? undefined : () => setOpen(false)}
      />
    );
  }
  return (
    <button type="button" className="dz-link dz-small dz-more-pay" onClick={() => setOpen(true)}>
      Other amount, partial or note…
    </button>
  );
}
