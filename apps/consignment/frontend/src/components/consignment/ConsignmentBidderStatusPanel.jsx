import React, { useEffect, useState } from 'react';
import { bidderName, loadBidderStatuses, setBidderSuspended } from '../../services/consignmentAuctionAdminService.js';
import { formatShortDate } from '../../utils/consignmentDates.js';

export default function ConsignmentBidderStatusPanel({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const refresh = () => loadBidderStatuses().then(setRows).catch((err) => setError(err.message));
  useEffect(() => { refresh(); }, [refreshKey]);

  const toggle = (row) => {
    const next = !row.suspended;
    const who = bidderName(row.user) || 'this bidder';
    if (!window.confirm(next ? `Suspend ${who} from bidding?` : `Let ${who} bid again?`)) return;
    setBidderSuspended(row.user_id, next).then(refresh).catch((err) => setError(err.message));
  };

  if (!rows.length && !error) return null;
  return (
    <details className="cs-history cs-bidders">
      <summary>Bidders with unpaid wins ({rows.length})</summary>
      {error ? <p className="cs-error">{error}</p> : null}
      <ul>
        {rows.map((row) => (
          <li key={row.user_id}>
            <span>
              <strong>{bidderName(row.user) || 'Unknown'}</strong>
              <span className="cs-meta">
                {' '}· {row.defaults_count} unpaid win{row.defaults_count === 1 ? '' : 's'}
                {row.reason ? ` · ${row.reason}` : ''} · {formatShortDate(row.updated_at)}
              </span>
            </span>
            <button type="button" className="cs-btn-secondary" onClick={() => toggle(row)}>
              {row.suspended ? 'Unsuspend' : 'Suspend'}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
