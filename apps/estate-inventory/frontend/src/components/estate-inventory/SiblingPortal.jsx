import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  CASE_NUMBER,
  heirFacingLegalStatusLabel,
  valueTierLabel,
  isClaimedMemorandum
} from '@shared/utils/estateInventoryConstants.js';
import EstateNav from './EstateNav';
import HeirChangePasswordModal from './HeirChangePasswordModal';
import HeirRequestReasonModal from './HeirRequestReasonModal';
import HeirMyRequestsModal from './HeirMyRequestsModal';
import HeirInventoryFilters from './HeirInventoryFilters';
import './EstateInventoryApp.css';

const SiblingPortal = () => {
  const [session, setSession] = useState(() => estateInventoryService.getStoredSiblingSession());
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(
    () => Boolean(estateInventoryService.getStoredSiblingSession()?.must_change_password)
  );
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [roomFilter, setRoomFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadItems = async (activeSession = session) => {
    if (!activeSession?.token) return;
    setLoading(true);
    setError('');
    const result = await estateInventoryService.siblingListItems(activeSession.token);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Could not load inventory.');
      if (/expired|sign in/i.test(result.error || '')) {
        estateInventoryService.clearSiblingSession();
        setSession(null);
        setMustChangePassword(false);
      }
      return;
    }
    setItems(result.data.items || []);
  };

  useEffect(() => {
    if (session?.token) loadItems(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await estateInventoryService.siblingLogin(CASE_NUMBER, displayName.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Login failed.');
      return;
    }
    setSession(result.data);
    setPassword('');
    const needsChange = Boolean(result.data.must_change_password);
    setMustChangePassword(needsChange);
    setShowChangePassword(needsChange);
    await loadItems(result.data);
  };

  const handleLogout = () => {
    estateInventoryService.clearSiblingSession();
    setSession(null);
    setItems([]);
    setMessage('');
    setMustChangePassword(false);
    setShowChangePassword(false);
  };

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
    setShowChangePassword(false);
    setMessage('Password saved. Use your name and this password next time you sign in.');
    setSession((prev) => (prev ? { ...prev, must_change_password: false } : prev));
  };

  const handleRequestClick = (item) => {
    setError('');
    setMessage('');
    setRequestTarget(item);
  };

  const handleRequestSubmit = async (reason) => {
    if (!requestTarget?.id) return;
    setRequestBusy(true);
    const result = await estateInventoryService.siblingRequestItem(requestTarget.id, reason);
    setRequestBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not submit request.');
      return;
    }
    setRequestTarget(null);
    setError('');
    setMessage(
      result.data?.disputed
        ? 'Request logged. Multiple heirs want this item — it is now flagged Disputed for the Personal Representative.'
        : 'Request logged. The Personal Representative can see your claim.'
    );
    await loadItems();
  };

  const getClaims = (item) =>
    Array.isArray(item.sibling_claims) ? item.sibling_claims : [];

  const youRequested = (item) =>
    getClaims(item).some((c) => c.sibling_key === session?.sibling_key);

  const othersRequested = (item) =>
    getClaims(item).some((c) => c.sibling_key !== session?.sibling_key);

  const requestButtonLabel = (item) => {
    if (youRequested(item)) return 'You have requested this item';
    if (othersRequested(item)) return 'Item requested';
    return 'Request This Item';
  };

  const myRequestedItems = items
    .map((item) => {
      const claim = getClaims(item).find((c) => c.sibling_key === session?.sibling_key);
      return claim ? { item, claim } : null;
    })
    .filter(Boolean);

  const roomOptions = useMemo(() => {
    const counts = new Map();
    items.forEach((item) => {
      const name = item.room?.trim() || 'Unassigned';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const room = item.room?.trim() || 'Unassigned';
      if (roomFilter && room !== roomFilter) return false;
      if (!q) return true;
      const haystack = [
        item.name,
        item.notes,
        room,
        item.assigned_beneficiary,
        heirFacingLegalStatusLabel(item.legal_status),
        valueTierLabel(item.value_tier)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, roomFilter, searchQuery]);

  if (!session) {
    return (
      <div className="estate-inventory ei-portal">
        <EstateNav
          variant="heir"
          title="Family portal"
          crumbs={[
            { label: 'Roles', to: '/estate-inventory' },
            { label: 'Heir login' }
          ]}
        />
        <p className="ei-lede" style={{ marginBottom: '1rem' }}>
          Use the name the Personal Representative added for you, plus the invite password they gave you
          (or your personal password if you already set one). Read-only — request items only.
        </p>
        <form className="ei-portal-card" onSubmit={handleLogin}>
          <div className="ei-field">
            <label htmlFor="sib-case">Case number</label>
            <input id="sib-case" value={CASE_NUMBER} readOnly tabIndex={-1} className="ei-input-readonly" />
            <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
              Set by the Personal Representative only.
            </p>
          </div>
          <div className="ei-field">
            <label htmlFor="sib-name">Your name</label>
            <input
              id="sib-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Exact name from the Personal Representative"
              autoComplete="name"
            />
          </div>
          <div className="ei-field">
            <label htmlFor="sib-pass">Password</label>
            <div className="ei-password-row">
              <input
                id="sib-pass"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="ei-btn ei-btn-secondary ei-btn-small ei-see-password"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {error ? <div className="ei-error">{error}</div> : null}
          <button type="submit" className="ei-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="estate-inventory ei-portal">
      <EstateNav
        variant="heir"
        title={`Hello, ${session.display_name}`}
        crumbs={[
          { label: 'Roles', to: '/estate-inventory' },
          { label: 'Heir portal' },
          { label: 'Inventory' }
        ]}
        onChangePassword={() => setShowChangePassword(true)}
        extraRight={
          <button type="button" className="ei-nav-icon-btn" onClick={handleLogout}>
            Sign out
          </button>
        }
      />
      <div className="ei-heir-toolbar">
        <button
          type="button"
          className="ei-btn ei-btn-secondary"
          onClick={() => setShowMyRequests(true)}
        >
          My requests{myRequestedItems.length ? ` (${myRequestedItems.length})` : ''}
        </button>
      </div>

      <HeirInventoryFilters
        rooms={roomOptions}
        roomFilter={roomFilter}
        onRoomChange={setRoomFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        resultCount={filteredItems.length}
        totalCount={items.length}
      />

      {message ? <p className="ei-status">{message}</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}
      {loading ? <p className="ei-status">Loading…</p> : null}

      {!loading && filteredItems.length === 0 ? (
        <div className="ei-empty">
          <p>
            {items.length === 0
              ? 'No inventory items to show yet.'
              : 'No items match this room or search. Try All rooms or clear the search.'}
          </p>
        </div>
      ) : null}

      <div className="ei-grid">
        {filteredItems.map((item) => {
          const claimed = isClaimedMemorandum(item.legal_status);
          const mine = youRequested(item);
          const others = othersRequested(item);
          const myClaim = getClaims(item).find((c) => c.sibling_key === session?.sibling_key);
          return (
            <article
              key={item.id}
              className={`ei-card${claimed ? ' ei-card-claimed' : ''}${item.legal_status === 'disputed' ? ' ei-card-disputed' : ''}`}
            >
              {item.photo_url ? (
                <img className="ei-card-photo" src={item.photo_url} alt={item.name} loading="lazy" />
              ) : (
                <div className="ei-card-photo-placeholder">No photo</div>
              )}
              <div className="ei-card-body">
                <strong>{item.name}</strong>
                <p className="ei-card-meta">
                  {item.room || '—'} · {valueTierLabel(item.value_tier)}
                </p>
                <p className="ei-card-status-tag">{heirFacingLegalStatusLabel(item.legal_status)}</p>
                {myClaim?.reason ? (
                  <p className="ei-card-meta">Your reason: {myClaim.reason}</p>
                ) : null}
                {claimed ? (
                  <p className="ei-card-memo">Memorandum — not requestable</p>
                ) : (
                  <button
                    type="button"
                    className={`ei-btn ei-btn-small${mine || others ? ' ei-btn-requested' : ''}`}
                    style={{ marginTop: '0.55rem', width: '100%' }}
                    disabled={mine || item.legal_status === 'distributed' || mustChangePassword}
                    onClick={() => handleRequestClick(item)}
                  >
                    {requestButtonLabel(item)}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <HeirMyRequestsModal
        open={showMyRequests}
        onClose={() => setShowMyRequests(false)}
        items={myRequestedItems}
      />

      <HeirRequestReasonModal
        open={Boolean(requestTarget)}
        itemName={requestTarget?.name}
        busy={requestBusy}
        onClose={() => {
          if (!requestBusy) setRequestTarget(null);
        }}
        onSubmit={handleRequestSubmit}
      />

      <HeirChangePasswordModal
        open={showChangePassword || mustChangePassword}
        required={mustChangePassword}
        onClose={() => {
          if (!mustChangePassword) setShowChangePassword(false);
        }}
        onChanged={handlePasswordChanged}
      />
    </div>
  );
};

export default SiblingPortal;
