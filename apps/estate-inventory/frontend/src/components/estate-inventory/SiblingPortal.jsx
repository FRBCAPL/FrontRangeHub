import React, { useEffect, useMemo, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  valueTierLabel,
  heirFacingLegalStatusLabel,
  isClaimedMemorandum,
  isUnauthorizedRemoval,
  youReleasedItem,
  normalizeFamilyReleases,
  estateitCasePath,
  isMemorandumOnlyHeir,
  normalizeHeirAccessTier
} from '@shared/utils/estateInventoryConstants.js';
import { PAPER_PATH_HEIR_NOTICE } from '@shared/utils/estateLegalOps.js';
import { useEstateCase } from './EstateCaseContext';
import EstateNav from './EstateNav';
import HeirChangePasswordModal from './HeirChangePasswordModal';
import HeirRequestReasonModal from './HeirRequestReasonModal';
import HeirMyRequestsModal from './HeirMyRequestsModal';
import HeirInventoryFilters from './HeirInventoryFilters';
import ProbateCountdown from './ProbateCountdown';
import HeirRoomBrowseModal from './HeirRoomBrowseModal';
import StatusPill from './StatusPill';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import './EstateInventoryApp.css';

const SiblingPortal = () => {
  const { caseNumber: routeCase } = useEstateCase();
  const caseHome = estateitCasePath(routeCase);
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
  const [cancelBusyId, setCancelBusyId] = useState(null);
  const [releaseBusyId, setReleaseBusyId] = useState(null);
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [roomFilter, setRoomFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [browseOpen, setBrowseOpen] = useState(false);
  const [lettersIssuedAt, setLettersIssuedAt] = useState(null);
  const [probateWindow, setProbateWindow] = useState({
    mode: 'duration',
    amount: 90,
    unit: 'days',
    endDate: null
  });
  const [caseNumber, setCaseNumber] = useState(routeCase);
  const [heirNames, setHeirNames] = useState([]);
  const [heirsLoading, setHeirsLoading] = useState(false);

  const loadHeirNames = async () => {
    setHeirsLoading(true);
    const result = await estateInventoryService.listHeirNamesForCase(routeCase);
    setHeirsLoading(false);
    if (result.success) {
      setHeirNames(result.data.names || []);
    }
  };

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
    if (result.data.letters_issued_at != null) setLettersIssuedAt(result.data.letters_issued_at);
    setProbateWindow({
      mode: result.data.probate_window_mode || 'duration',
      amount: result.data.probate_window_amount ?? 90,
      unit: result.data.probate_window_unit || 'days',
      endDate: result.data.probate_window_end_date || null
    });
    if (result.data.case_number) setCaseNumber(result.data.case_number);
    if (result.data.access_tier) {
      const tier = normalizeHeirAccessTier(result.data.access_tier);
      setSession((prev) => {
        if (!prev) return prev;
        return { ...prev, access_tier: tier };
      });
    }
  };

  useEffect(() => {
    setCaseNumber(routeCase);
    if (session?.token) loadItems(session);
    else loadHeirNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCase]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await estateInventoryService.siblingLogin(routeCase, displayName.trim(), password);
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

  const handleCancelRequest = async (item) => {
    if (!item?.id) return;
    const label = item.name || 'this item';
    if (!window.confirm(`Withdraw your request for “${label}”?`)) {
      return;
    }
    setCancelBusyId(item.id);
    setError('');
    setMessage('');
    const result = await estateInventoryService.siblingCancelRequest(item.id);
    setCancelBusyId(null);
    if (!result.success) {
      setError(result.error || 'Could not cancel request.');
      return;
    }
    setMessage('Request withdrawn.');
    await loadItems();
  };

  const handleReleaseForSale = async (item) => {
    if (!item?.id) return;
    const label = item.name || 'this item';
    const okConfirm = window.confirm(
      `Mark “${label}” as no interest / approve for public sale?\n\n` +
        'This means you do not wish to retain it for personal use and authorize the estate to liquidate it to fund estate expenses.\n\n' +
        'This early path lists the item for public sale only after all named heirs also approve. ' +
        'The Personal Representative may still approve leftover unclaimed items for sale later under the estate process.'
    );
    if (!okConfirm) return;
    setReleaseBusyId(item.id);
    setError('');
    setMessage('');
    const result = await estateInventoryService.siblingReleaseForSale(item.id);
    setReleaseBusyId(null);
    if (!result.success) {
      setError(result.error || 'Could not record release.');
      return;
    }
    setMessage(
      result.data?.unanimous
        ? 'Recorded. All heirs released interest — item is now flagged for public sale.'
        : 'Recorded. Family early-release needs every named heir before it auto-flags for sale. The Personal Representative can still approve unclaimed items later.'
    );
    await loadItems();
  };

  const getClaims = (item) =>
    Array.isArray(item.sibling_claims) ? item.sibling_claims : [];

  const youRequested = (item) =>
    getClaims(item).some((c) => c.sibling_key === session?.sibling_key);

  const othersRequested = (item) =>
    getClaims(item).some((c) => c.sibling_key !== session?.sibling_key);

  const youReleased = (item) => youReleasedItem(item, session?.sibling_key);

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
        heirFacingLegalStatusLabel(item.legal_status, item),
        valueTierLabel(item.value_tier)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, roomFilter, searchQuery]);

  const browseTitle = roomFilter
    ? roomFilter
    : searchQuery.trim()
      ? `Search: “${searchQuery.trim()}”`
      : 'Browse';

  const handleRoomChange = (room) => {
    setRoomFilter(room);
    setSearchQuery('');
    setBrowseOpen(Boolean(room));
  };

  const handleSearchChange = (q) => {
    setSearchQuery(q);
    if (q.trim()) {
      setRoomFilter('');
      setBrowseOpen(true);
    } else {
      setBrowseOpen(false);
    }
  };

  const closeBrowse = () => {
    setBrowseOpen(false);
    setRoomFilter('');
    setSearchQuery('');
  };

  const renderHeirItem = (item) => {
    const claimed = isClaimedMemorandum(item.legal_status);
    const unauthorized = isUnauthorizedRemoval(item.legal_status);
    const mine = youRequested(item);
    const others = othersRequested(item);
    const claimers = getClaims(item).reduce((set, c) => {
      const id = String(c?.sibling_key || c?.display_name || '')
        .trim()
        .toLowerCase();
      if (id) set.add(id);
      return set;
    }, new Set()).size;
    const showDisputed = item.legal_status === 'disputed' && claimers >= 2;
    const myClaim = getClaims(item).find((c) => c.sibling_key === session?.sibling_key);
    const memorandumOnly = isMemorandumOnlyHeir(session?.access_tier);
    return (
      <article
        key={item.id}
        className={`ei-card${claimed ? ' ei-card-claimed' : ''}${showDisputed ? ' ei-card-disputed' : ''}${unauthorized ? ' ei-card-unauthorized' : ''}`}
      >
        {item.photo_url ? (
          <img className="ei-card-photo" src={item.photo_url} alt={item.name} loading="lazy" />
        ) : (
          <div className="ei-card-photo-placeholder">No photo</div>
        )}
        <div className="ei-card-body">
          <strong>{item.name}</strong>
          <p className="ei-card-meta">{valueTierLabel(item.value_tier)}</p>
          <StatusPill
            status={item.legal_status}
            heirFacing
            item={item}
            viewerSiblingKey={session?.sibling_key}
          />
          {item.assigned_beneficiary ? (
            <p className="ei-card-meta">Named for: {item.assigned_beneficiary}</p>
          ) : null}
          {myClaim?.reason ? (
            <p className="ei-card-meta">Your reason: {myClaim.reason}</p>
          ) : null}
          {memorandumOnly ? (
            <p className="ei-card-memo">Named for you in the will / memorandum — view only</p>
          ) : claimed || unauthorized ? (
            <p className="ei-card-memo">
              {unauthorized ? 'Tracked as missing — not requestable' : 'Memorandum — not requestable'}
            </p>
          ) : (
            <>
              {item.approved_for_sale ? (
                <p className="ei-card-meta" style={{ marginTop: '0.45rem' }}>
                  Approved for public sale (family release complete or PR flagged).
                </p>
              ) : null}
              {youReleased(item) ? (
                <p className="ei-card-meta" style={{ marginTop: '0.45rem' }}>
                  You marked no interest / approved for public sale
                  {normalizeFamilyReleases(item.family_releases).length
                    ? ` (${normalizeFamilyReleases(item.family_releases).length} heir release${
                        normalizeFamilyReleases(item.family_releases).length === 1 ? '' : 's'
                      } on file)`
                    : ''}
                  .
                </p>
              ) : null}
              {mine ? (
                <div className="ei-btn-row" style={{ marginTop: '0.55rem', flexDirection: 'column', gap: '0.4rem' }}>
                  <button type="button" className="ei-btn ei-btn-small ei-btn-requested" disabled>
                    You have requested this item
                  </button>
                  <button
                    type="button"
                    className="ei-btn ei-btn-small ei-btn-secondary"
                    disabled={
                      cancelBusyId === item.id ||
                      item.legal_status === 'distributed' ||
                      mustChangePassword
                    }
                    onClick={() => handleCancelRequest(item)}
                  >
                    {cancelBusyId === item.id ? 'Cancelling…' : 'Cancel my request'}
                  </button>
                </div>
              ) : !youReleased(item) ? (
                <button
                  type="button"
                  className={`ei-btn ei-btn-small${others ? ' ei-btn-requested' : ''}`}
                  style={{ marginTop: '0.55rem', width: '100%' }}
                  disabled={item.legal_status === 'distributed' || mustChangePassword}
                  onClick={() => handleRequestClick(item)}
                >
                  {requestButtonLabel(item)}
                </button>
              ) : null}
              {!youReleased(item) && !item.is_memorandum_asset && item.legal_status !== 'distributed' ? (
                <div style={{ marginTop: '0.55rem' }}>
                  <button
                    type="button"
                    className="ei-btn ei-btn-small ei-btn-secondary"
                    style={{ width: '100%' }}
                    disabled={releaseBusyId === item.id || mustChangePassword || item.approved_for_sale}
                    onClick={() => handleReleaseForSale(item)}
                  >
                    {releaseBusyId === item.id
                      ? 'Saving…'
                      : 'No Interest / Approve for Public Sale'}
                  </button>
                  <p className="ei-settings-hint" style={{ marginTop: '0.35rem' }}>
                    Clicking this indicates you do not wish to retain this item for personal use and
                    authorize the estate to liquidate it to fund estate expenses. This early path
                    auto-flags for public sale only after all residual heirs approve. Unclaimed items
                    may still be approved for sale later by the Personal Representative under the
                    estate process (including after the request window).
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </article>
    );
  };

  if (!session) {
    return (
      <div className="estate-inventory ei-portal">
        <EstateNav
          variant="heir"
          title="Family portal"
          crumbs={[
            { label: 'Home', to: caseHome },
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
            <input id="sib-case" value={routeCase} readOnly tabIndex={-1} className="ei-input-readonly" />
            <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
              Set by the Personal Representative only.
            </p>
          </div>
          <div className="ei-field">
            <label htmlFor="sib-name">Your name</label>
            {heirNames.length ? (
              <select
                id="sib-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={heirsLoading}
              >
                <option value="">{heirsLoading ? 'Loading…' : 'Select…'}</option>
                {heirNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="sib-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder={heirsLoading ? 'Loading names…' : 'Exact name from the Personal Representative'}
                autoComplete="name"
                disabled={heirsLoading}
              />
            )}
            <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
              Names come from the estate Settings list — not hardcoded in the app.
            </p>
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
        <EstateSystemDisclaimer />
      </div>
    );
  }

  return (
    <div className="estate-inventory ei-portal">
      <EstateNav
        variant="heir"
        title={`Hello, ${session.display_name}`}
        crumbs={[
          { label: 'Home', to: caseHome },
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
      <ProbateCountdown
        lettersIssuedAt={lettersIssuedAt}
        caseNumber={caseNumber}
        probateWindowMode={probateWindow.mode}
        probateWindowAmount={probateWindow.amount}
        probateWindowUnit={probateWindow.unit}
        probateWindowEndDate={probateWindow.endDate}
        readOnly
      />

      <p className="ei-settings-hint ei-paper-path-notice">{PAPER_PATH_HEIR_NOTICE}</p>

      {isMemorandumOnlyHeir(session?.access_tier) ? (
        <p className="ei-settings-hint ei-memorandum-access-banner">
          Memorandum access — you only see items named for you. This view is read-only (no requests
          or public-sale releases).
        </p>
      ) : null}

      <div className="ei-heir-toolbar">
        {isMemorandumOnlyHeir(session?.access_tier) ? null : (
          <button
            type="button"
            className="ei-btn ei-btn-secondary"
            onClick={() => setShowMyRequests(true)}
          >
            My requests{myRequestedItems.length ? ` (${myRequestedItems.length})` : ''}
          </button>
        )}
      </div>

      <HeirInventoryFilters
        rooms={roomOptions}
        roomFilter={roomFilter}
        onRoomChange={handleRoomChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        totalCount={items.length}
      />

      {message ? <p className="ei-status">{message}</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}
      {loading ? <p className="ei-status">Loading…</p> : null}

      {!loading && items.length === 0 ? (
        <div className="ei-empty">
          <p>No inventory items to show yet.</p>
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="ei-empty">
          <p>Select a room or collection to open it. Search finds items across all rooms.</p>
        </div>
      ) : null}

      <HeirRoomBrowseModal
        open={browseOpen}
        onClose={closeBrowse}
        title={browseTitle}
        itemCount={filteredItems.length}
      >
        {filteredItems.map((item) => renderHeirItem(item))}
      </HeirRoomBrowseModal>

      <HeirMyRequestsModal
        open={showMyRequests}
        onClose={() => setShowMyRequests(false)}
        items={myRequestedItems}
        viewerSiblingKey={session?.sibling_key}
        cancelBusyId={cancelBusyId}
        onCancelRequest={async (item) => {
          await handleCancelRequest(item);
        }}
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

      <EstateSystemDisclaimer />
    </div>
  );
};

export default SiblingPortal;
