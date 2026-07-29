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
  if (r === 'bidder') return 'Bidder';
  return role || '—';
}

function eventLabel(type) {
  const t = String(type || '').toLowerCase();
  const map = {
    pr_sign_in: 'PR signed in',
    pr_sign_up: 'PR created account',
    admin_unlock: 'Admin unlocked',
    heir_login: 'Heir signed in',
    helper_login: 'Helper signed in',
    estate_open: 'Opened estate',
    estate_create: 'Created estate',
    estate_claim: 'Claimed estate',
    item_create: 'Added item',
    helper_item_create: 'Helper added item',
    helper_scene_create: 'Helper added scene photo',
    heir_request_item: 'Heir requested item',
    auction_bid: 'Auction bid',
    settings_save: 'Saved settings'
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
          Sign-ins and key actions for this estate (who, when, what). Item edit history still lives
          on each item’s change trail.
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
                  {ev.actor_name ? <span>· {ev.actor_name}</span> : null}
                  {ev.actor_email ? <span>· {ev.actor_email}</span> : null}
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
