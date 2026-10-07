import React, { useEffect, useState } from 'react';
import supabaseDataService from '@shared/services/services/supabaseDataService.js';
import { bidderName } from '../../services/consignmentAuctionAdminService.js';
import { setAccountApproval } from '../../services/consignmentAccountsService.js';
import { formatShortDate } from '../../utils/consignmentDates.js';

/**
 * New FRPL accounts waiting for approval. Only approved accounts can sign in and bid.
 * Ladder applicants are listed but approved in Ladder admin, which also places them on a ladder.
 */
export default function ConsignmentAccountRequestsPanel() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const refresh = async () => {
    const result = await supabaseDataService.getPendingUsers();
    if (result.success) setUsers(result.users);
    else setError(result.error || 'Could not load account requests.');
  };
  useEffect(() => { refresh(); }, []);

  const decide = async (user, approve) => {
    const who = bidderName(user) || 'this account';
    const ask = approve
      ? `Approve ${who}? They can sign in and bid on auctions.`
      : `Decline ${who}? They won't be able to sign in.`;
    if (!window.confirm(ask)) return;
    setBusyId(user.id);
    setError('');
    try {
      await setAccountApproval(user.id, approve);
    } catch (err) {
      setError(err.message);
    }
    setBusyId(null);
    refresh();
  };

  if (!users.length && !error) return null;
  return (
    <details className="cs-history cs-bidders" open>
      <summary>New account requests ({users.length})</summary>
      <p className="cs-hint">Approved accounts can sign in and bid. Ladder applicants are approved in Ladder admin.</p>
      {error ? <p className="cs-error">{error}</p> : null}
      <ul>
        {users.map((user) => {
          const ladderApplicant = Boolean(user.ladder_profiles?.length);
          return (
            <li key={user.id}>
              <span>
                <strong>{bidderName(user) || 'Unknown'}</strong>
                <span className="cs-meta">
                  {user.email ? ` · ${user.email}` : ''}
                  {user.phone ? ` · ${user.phone}` : ''}
                  {user.created_at ? ` · ${formatShortDate(user.created_at)}` : ''}
                  {ladderApplicant ? ' · Ladder applicant' : ''}
                </span>
              </span>
              {ladderApplicant ? null : (
                <span className="cs-actions">
                  <button type="button" className="cs-btn" disabled={busyId === user.id} onClick={() => decide(user, true)}>
                    Approve
                  </button>
                  <button type="button" className="cs-btn-secondary" disabled={busyId === user.id} onClick={() => decide(user, false)}>
                    Decline
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
