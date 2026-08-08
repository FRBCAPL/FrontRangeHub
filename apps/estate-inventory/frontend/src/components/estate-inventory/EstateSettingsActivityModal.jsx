import React, { useEffect, useState } from 'react';
import { listEstateActivityEvents } from '@shared/services/estateActivityLog.js';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { EstateSettingsShell } from './EstateSettingsShell';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso));
  } catch {
    return String(iso);
  }
}

function roleLabel(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'pr' || r === 'owner') return 'PR';
  if (r === 'admin') return 'Admin';
  if (r === 'heir' || r === 'family') return 'Heir';
  if (r === 'helper') return 'Helper';
  if (r === 'advisor' || r === 'contact') return 'Advisor';
  if (r === 'bidder') return 'Bidder';
  if (r === 'authenticated') return 'Signed-in user';
  if (r === 'anonymous') return 'Visitor';
  return role || '—';
}

/** Avoid "PR · email · email" when name and email are the same value. */
function actorIdentityBits(ev) {
  const name = String(ev?.actor_name || '').trim();
  const email = String(ev?.actor_email || '').trim();
  if (name && email && name.toLowerCase() === email.toLowerCase()) {
    return [email];
  }
  const bits = [];
  if (name) bits.push(name);
  if (email) bits.push(email);
  return bits;
}

function eventLabel(type) {
  const t = String(type || '').toLowerCase();
  const map = {
    pr_sign_in: 'PR signed in',
    pr_sign_up: 'PR created account',
    admin_unlock: 'Admin unlocked',
    heir_login: 'Heir signed in',
    helper_login: 'Helper signed in',
    advisor_login: 'Advisor signed in',
    estate_open: 'Opened estate',
    estate_create: 'Created estate',
    estate_claim: 'Claimed estate',
    item_create: 'Added item',
    item_photo_append: 'Added item photo(s)',
    helper_item_create: 'Helper added item',
    helper_scene_create: 'Helper added scene photo',
    heir_request_item: 'Heir requested item',
    auction_bid: 'Auction bid',
    settings_save: 'Saved settings',
    admin_password_changed: 'Admin PIN changed',
    admin_password_reset: 'Admin PIN reset by the executor',
    account_add: 'Added an account or debt',
    account_update: 'Updated an account or debt',
    account_delete: 'Removed an account or debt',
    creditor_claim_add: 'Added creditor claim',
    creditor_claim_update: 'Updated creditor claim',
    creditor_claim_delete: 'Removed creditor claim',
    contact_add: 'Added contact',
    contact_update: 'Updated contact',
    contact_delete: 'Removed contact',
    date_correction: 'Corrected a governing date',
    decision_note: 'Decision note',
    distribution_finalize: 'Finalized distribution',
    distribution_void: 'Voided distribution',
    family_update_publish: 'Published Family Update',
    acknowledgement_update: 'Updated acknowledgement',
    inventory_marked_complete: 'Marked inventory complete',
    inventory_reopened: 'Reopened inventory',
    court_pack_export: 'Exported court evidence pack',
    court_pack_exported: 'Exported court evidence pack',
    formal_accounting_export: 'Exported formal accounting',
    estate_closed: 'Closed estate for records',
    estate_reopened: 'Reopened estate for work'
  };
  return map[t] || t.replace(/_/g, ' ');
}

/**
 * PR-only activity / usage trail for the active estate.
 */
const EstateSettingsActivityModal = ({ open, onClose }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const caseNumber = estateInventoryService.getActiveEstateCase?.() || null;
      const result = await listEstateActivityEvents(caseNumber, 150);
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setError(result.error || 'Could not load activity.');
        setEvents([]);
        return;
      }
      setEvents(result.data || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <EstateSettingsShell
      open={open}
      onClose={onClose}
      title="Activity log"
      titleId="ei-settings-activity-title"
      wide
      foot={
        <button type="button" className="ei-btn" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="ei-modal-body">
        <p className="ei-settings-hint" style={{ marginTop: 0 }}>
          Sign-ins and key actions for this estate (who, when, what). Each entry’s identity comes
          from the session that performed it, not from anything the browser claimed. Item edit
          history still lives on each item’s change trail.
        </p>
        {loading ? <p className="ei-settings-hint">Loading…</p> : null}
        {error ? <div className="ei-error">{error}</div> : null}
        {!loading && !error && events.length === 0 ? (
          <p className="ei-settings-hint">No activity recorded yet for this estate.</p>
        ) : null}
        {events.length > 0 ? (
          <ul className="ei-activity-list" aria-label="Activity events">
            {events.map((ev) => (
              <li key={ev.id} className="ei-activity-row">
                <div className="ei-activity-main">
                  <span className="ei-activity-type">{eventLabel(ev.event_type)}</span>
                  <span className="ei-activity-when">{formatWhen(ev.created_at)}</span>
                </div>
                <div className="ei-activity-meta">
                  <span>{roleLabel(ev.actor_role)}</span>
                  {actorIdentityBits(ev).map((bit) => (
                    <span key={bit}>· {bit}</span>
                  ))}
                </div>
                {ev.summary ? <p className="ei-activity-summary">{ev.summary}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </EstateSettingsShell>
  );
};

export default EstateSettingsActivityModal;
