import React, { useEffect, useState } from 'react';
import { loadBiddingEmails, saveBiddingEmails } from '../../services/consignmentAlertPrefsService.js';

/** "Email me bidding alerts" (outbid + ending soon). Hidden until the setting loads. */
export default function ConsignmentBidAlertsToggle({ userId }) {
  const [on, setOn] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    loadBiddingEmails(userId).then((value) => { if (alive) setOn(value); });
    return () => { alive = false; };
  }, [userId]);

  if (on === null) return null;

  const toggle = async (e) => {
    const next = e.target.checked;
    setOn(next);
    setError('');
    try {
      await saveBiddingEmails(userId, next);
    } catch (err) {
      setOn(!next);
      setError(err.message);
    }
  };

  return (
    <>
      <label className="cs-check cs-bid-alerts">
        <input type="checkbox" checked={on} onChange={toggle} />
        Email me bidding alerts (outbid, ending soon)
      </label>
      {error ? <p className="cs-error">{error}</p> : null}
    </>
  );
}
