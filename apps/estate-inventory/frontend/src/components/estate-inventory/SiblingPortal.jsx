import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  valueTierLabel,
  heirFacingLegalStatusLabel,
  isClaimedMemorandum,
  isUnauthorizedRemoval,
  youReleasedItem,
  normalizeFamilyReleases,
  estateitCasePath,
  estateDisplayName,
  isMemorandumOnlyHeir,
  normalizeHeirAccessTier,
  heirPublicName,
  heirAccessTierLabel,
  heirRoleGuide
} from '@shared/utils/estateInventoryConstants.js';
import { paperPathHeirNotice } from '@shared/utils/estateLegalOps.js';
import { useEstateCase } from './EstateCaseContext';
import EstateNav from './EstateNav';
import HeirPreferredNameModal from './HeirPreferredNameModal';
import HeirRequestReasonModal from './HeirRequestReasonModal';
import HeirNoInterestModal from './HeirNoInterestModal';
import HeirCancelRequestModal from './HeirCancelRequestModal';
import HeirMessagesModal from './HeirMessagesModal';
import HeirMyRequestsModal from './HeirMyRequestsModal';
import HeirInventoryFilters from './HeirInventoryFilters';
import ProbateCountdown from './ProbateCountdown';
import EstateRoleGuide from './EstateRoleGuide';
import HeirRoomBrowseModal from './HeirRoomBrowseModal';
import StatusPill from './StatusPill';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import './EstateInventoryApp.css';

const SiblingPortal = () => {
  const { caseNumber: routeCase } = useEstateCase();
  const caseHome = estateitCasePath(routeCase);
  const [session, setSession] = useState(() => estateInventoryService.getStoredSiblingSession());
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showPreferredName, setShowPreferredName] = useState(false);
  const [needsPreferredName, setNeedsPreferredName] = useState(
    () => Boolean(estateInventoryService.getStoredSiblingSession()?.needs_preferred_name)
  );
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelBusyId, setCancelBusyId] = useState(null);
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [releaseBusyId, setReleaseBusyId] = useState(null);
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
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
  const [estateLabel, setEstateLabel] = useState(routeCase);

  const loadEstateLabel = async () => {
    const result = await estateInventoryService.getSettings(routeCase);
    if (result.success) {
      setEstateLabel(estateDisplayName(result.data, routeCase));
    } else {
      setEstateLabel(routeCase);
    }
  };

  const applySessionFlags = (activeSession, listPayload) => {
    const needs =
      listPayload?.needs_preferred_name != null
        ? Boolean(listPayload.needs_preferred_name)
        : Boolean(activeSession?.needs_preferred_name);
    setNeedsPreferredName(needs);
    if (needs) setShowPreferredName(true);
  };

  const loadUnreadMessages = async (activeSession = session) => {
    if (!activeSession?.token) {
      setUnreadMessages(0);
      return;
    }
    const result = await estateInventoryService.siblingListMessages(activeSession.token);
    if (!result.success) {
      setUnreadMessages(0);
      return;
    }
    setUnreadMessages(Number(result.data?.unread_count) || 0);
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
        setNeedsPreferredName(false);
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
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        display_name: result.data.display_name || prev.display_name,
        admin_label: result.data.admin_label || prev.admin_label,
        preferred_name: result.data.preferred_name,
        needs_preferred_name: result.data.needs_preferred_name,
        access_tier: normalizeHeirAccessTier(result.data.access_tier || prev.access_tier)
      };
    });
    applySessionFlags(activeSession, result.data);
    loadUnreadMessages(activeSession);
  };

  useEffect(() => {
    setCaseNumber(routeCase);
    setEstateLabel(routeCase);
    loadEstateLabel();
    const stored = estateInventoryService.getStoredSiblingSession();
    if (stored?.token) {
      setSession(stored);
      setNeedsPreferredName(Boolean(stored.needs_preferred_name));
      if (stored.needs_preferred_name) setShowPreferredName(true);
      loadItems(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCase]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    estateInventoryService.setActiveEstateCase(routeCase);
    const result = await estateInventoryService.loginWithEstateAccessCode({
      caseNumber: routeCase,
      code: pin
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Login failed.');
      return;
    }
    if (result.data?.role && result.data.role !== 'family') {
      setError('That code belongs to a different portal. Use EstateIt home to sign in.');
      return;
    }
    setSession(result.data);
    setPin('');
    const needs = Boolean(result.data.needs_preferred_name);
    setNeedsPreferredName(needs);
    setShowPreferredName(needs);
    await loadItems(result.data);
  };

  const handleLogout = () => {
    estateInventoryService.clearSiblingSession();
    setSession(null);
    setItems([]);
    setMessage('');
    setNeedsPreferredName(false);
    setShowPreferredName(false);
  };

  const handlePreferredNameSaved = (data) => {
    setNeedsPreferredName(false);
    setShowPreferredName(false);
    setMessage('Name saved. Family will see this name on your requests.');
    setSession((prev) =>
      prev
        ? {
            ...prev,
            preferred_name: data?.preferred_name || prev.preferred_name,
            display_name: data?.display_name || data?.preferred_name || prev.display_name,
            needs_preferred_name: false
          }
        : prev
    );
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

  const handleCancelRequest = (item) => {
    if (!item?.id) return;
    setCancelTarget(item);
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget?.id) return;
    setCancelBusyId(cancelTarget.id);
    setError('');
    setMessage('');
    const result = await estateInventoryService.siblingCancelRequest(cancelTarget.id);
    setCancelBusyId(null);
    if (!result.success) {
      setError(result.error || 'Could not cancel request.');
      return;
    }
    setCancelTarget(null);
    setMessage('Request withdrawn.');
    await loadItems();
  };

  const handleReleaseForSale = (item) => {
    if (!item?.id) return;
    setReleaseTarget(item);
  };

  const handleReleaseConfirm = async () => {
    if (!releaseTarget?.id) return;
    setReleaseBusyId(releaseTarget.id);
    setError('');
    setMessage('');
    const result = await estateInventoryService.siblingReleaseForSale(releaseTarget.id);
    setReleaseBusyId(null);
    if (!result.success) {
      setError(result.error || 'Could not record release.');
      return;
    }
    setReleaseTarget(null);
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
                      needsPreferredName
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
                  disabled={item.legal_status === 'distributed' || needsPreferredName}
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
                    disabled={releaseBusyId === item.id || needsPreferredName || item.approved_for_sale}
                    onClick={() => handleReleaseForSale(item)}
                  >
                    {releaseBusyId === item.id
                      ? 'Saving…'
                      : 'No Interest / Approve for Public Sale'}
                  </button>
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
          Enter the PIN the Personal Representative gave you. The app knows who you are from that
          code — no name required. Prefer signing in from the EstateIt home page when you can.
        </p>
        <form className="ei-portal-card" onSubmit={handleLogin}>
          <div className="ei-field">
            <label htmlFor="sib-estate">Estate</label>
            <input id="sib-estate" value={estateLabel} readOnly tabIndex={-1} className="ei-input-readonly" />
          </div>
          <div className="ei-field">
            <label htmlFor="sib-pin">Your PIN / invite code</label>
            <div className="ei-password-row">
              <input
                id="sib-pin"
                type={showPassword ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                placeholder="6-digit PIN"
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
          <button type="submit" className="ei-btn" disabled={loading || !pin.trim()}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <EstateSystemDisclaimer />
      </div>
    );
  }

  const helloName = heirPublicName(session) || session.display_name || 'Heir';
  const roleLabel = heirAccessTierLabel(session?.access_tier);

  return (
    <div className="estate-inventory ei-portal">
      <EstateNav
        variant="heir"
        title={`Hello, ${helloName}`}
        subtitle={roleLabel}
        estateName={estateLabel}
        crumbs={[
          { label: 'Home', to: caseHome },
          { label: 'Heir portal' },
          { label: 'Inventory' }
        ]}
        onChangeDisplayName={() => setShowPreferredName(true)}
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

      <section className="ei-paper-path-notice ei-heir-portal-notes" aria-label="Portal notes">
        <EstateRoleGuide guide={heirRoleGuide(session?.access_tier)} />
        <p className="ei-paper-path-body">{paperPathHeirNotice(session?.access_tier, caseNumber)}</p>
      </section>

      <div className="ei-heir-toolbar ei-heir-toolbar--center">
        <Link to={estateitCasePath(routeCase, 'auction')} className="ei-btn">
          Follow auction
        </Link>
        {isMemorandumOnlyHeir(session?.access_tier) ? null : (
          <button
            type="button"
            className="ei-btn ei-btn-secondary"
            onClick={() => setShowMyRequests(true)}
          >
            My requests{myRequestedItems.length ? ` (${myRequestedItems.length})` : ''}
          </button>
        )}
        <button
          type="button"
          className="ei-btn ei-btn-secondary"
          onClick={() => setShowMessages(true)}
        >
          Messages{unreadMessages ? ` (${unreadMessages})` : ''}
        </button>
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
        onCancelRequest={(item) => handleCancelRequest(item)}
      />

      <HeirMessagesModal
        open={showMessages}
        onClose={() => {
          setShowMessages(false);
          loadUnreadMessages(session);
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

      <HeirCancelRequestModal
        open={Boolean(cancelTarget)}
        itemName={cancelTarget?.name}
        busy={Boolean(cancelTarget && cancelBusyId === cancelTarget.id)}
        onClose={() => {
          if (!cancelBusyId) setCancelTarget(null);
        }}
        onConfirm={handleCancelConfirm}
      />

      <HeirNoInterestModal
        open={Boolean(releaseTarget)}
        itemName={releaseTarget?.name}
        busy={Boolean(releaseTarget && releaseBusyId === releaseTarget.id)}
        onClose={() => {
          if (!releaseBusyId) setReleaseTarget(null);
        }}
        onConfirm={handleReleaseConfirm}
      />

      <HeirPreferredNameModal
        open={showPreferredName || needsPreferredName}
        required={needsPreferredName}
        initialName={session?.preferred_name || ''}
        onClose={() => {
          if (!needsPreferredName) setShowPreferredName(false);
        }}
        onSaved={handlePreferredNameSaved}
      />

      <EstateSystemDisclaimer />
    </div>
  );
};

export default SiblingPortal;
