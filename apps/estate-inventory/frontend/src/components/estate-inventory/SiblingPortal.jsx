import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { leaveCurrentEstateDestination } from '@shared/services/estateVaultSession.js';
import {
  valueTierLabel,
  heirFacingLegalStatusLabel,
  isClaimedMemorandum,
  isUnauthorizedRemoval,
  youReleasedItem,
  normalizeFamilyReleases,
  estateitCasePath,
  estateDisplayName,
  heirCanBrowseRooms,
  heirCanRequestItems,
  heirPublicName,
  heirAccessTierLabel,
  heirRoleMeaning,
  heirRolePortalGuide,
  normalizeHeirAccessTier,
  isMemorandumOnlyHeir,
  resolveProbateWindow,
  formatEstateLocalDate
} from '@shared/utils/estateInventoryConstants.js';
import { useEstateCase } from './EstateCaseContext';
import EstateNav from './EstateNav';
import HeirPreferredNameModal from './HeirPreferredNameModal';
import HeirRequestReasonModal from './HeirRequestReasonModal';
import HeirNoInterestModal from './HeirNoInterestModal';
import HeirCancelRequestModal from './HeirCancelRequestModal';
import HeirMessagesModal from './HeirMessagesModal';
import HeirMyRequestsModal from './HeirMyRequestsModal';
import HeirInventoryFilters from './HeirInventoryFilters';
import EstateWhatsNewModal from './EstateWhatsNewModal';
import EstateWhatIsVaultModal from './EstateWhatIsVaultModal';
import EstateLegalDisclaimerModal from './EstateLegalDisclaimerModal';
import EstateFaqModal from './EstateFaqModal';
import HeirRoomBrowseModal from './HeirRoomBrowseModal';
import StatusPill from './StatusPill';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import HeirInheritancePanel from './HeirInheritancePanel';
import HeirTransparencyPanel from './HeirTransparencyPanel';
import HeirDisclosureTimeline from './HeirDisclosureTimeline';
import HeirFamilyUpdatesPanel from './HeirFamilyUpdatesPanel';
import HeirFamilyCoachMarks from './HeirFamilyCoachMarks';
import EstateRoleGuideModal from './EstateRoleGuideModal';
import EstateBillingLockedGate from './EstateBillingLockedGate';
import {
  FAMILY_COACH_STEPS,
  hasSeenFamilyCoach,
  markFamilyCoachSeen
} from '@shared/utils/estateFamilyCoach.js';
import './EstateInventoryApp.css';

const SiblingPortal = () => {
  const navigate = useNavigate();
  const { caseNumber: routeCase } = useEstateCase();
  const caseHome = estateitCasePath(routeCase);
  const [session, setSession] = useState(() =>
    estateInventoryService.getStoredSiblingSession(routeCase)
  );
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showWhatIsVault, setShowWhatIsVault] = useState(false);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [coachStep, setCoachStep] = useState(0);
  const [showRoleGuide, setShowRoleGuide] = useState(false);
  const [needsPreferredName, setNeedsPreferredName] = useState(
    () => Boolean(estateInventoryService.getStoredSiblingSession(routeCase)?.needs_preferred_name)
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
  const [estateSettings, setEstateSettings] = useState({});
  const [inheritanceRows, setInheritanceRows] = useState([]);

  const loadEstateLabel = async () => {
    const result = await estateInventoryService.getSettings(routeCase);
    if (result.success) {
      setEstateLabel(estateDisplayName(result.data, routeCase));
      setEstateSettings(result.data || {});
    } else {
      setEstateLabel(routeCase);
    }
  };

  const loadInheritance = async () => {
    const result = await estateInventoryService.listMyInheritance(routeCase);
    if (result.success) setInheritanceRows(result.data || []);
    else setInheritanceRows([]);
  };

  const applySessionFlags = (activeSession, listPayload) => {
    const needs =
      listPayload?.needs_preferred_name != null
        ? Boolean(listPayload.needs_preferred_name)
        : Boolean(activeSession?.needs_preferred_name);
    setNeedsPreferredName(needs);
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
    setEstateSettings((prev) => ({
      ...prev,
      case_number: result.data.case_number || prev.case_number || routeCase,
      letters_issued_at: result.data.letters_issued_at ?? prev.letters_issued_at,
      probate_window_mode: result.data.probate_window_mode || prev.probate_window_mode,
      probate_window_amount: result.data.probate_window_amount ?? prev.probate_window_amount,
      probate_window_unit: result.data.probate_window_unit || prev.probate_window_unit,
      probate_window_end_date:
        result.data.probate_window_end_date ?? prev.probate_window_end_date,
      auction_start_date: result.data.auction_start_date ?? prev.auction_start_date,
      auction_end_date: result.data.auction_end_date ?? prev.auction_end_date,
      inventory_completed_at:
        result.data.inventory_completed_at ?? prev.inventory_completed_at,
      closed_at: result.data.closed_at ?? prev.closed_at,
      created_at: result.data.created_at ?? prev.created_at,
      estate_name: result.data.estate_name || prev.estate_name
    }));
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        display_name: result.data.display_name || prev.display_name,
        admin_label: result.data.admin_label || prev.admin_label,
        preferred_name: result.data.preferred_name,
        needs_preferred_name: result.data.needs_preferred_name,
        access_tier: normalizeHeirAccessTier(result.data.access_tier || prev.access_tier),
        can_browse_rooms:
          result.data.can_browse_rooms != null
            ? Boolean(result.data.can_browse_rooms)
            : prev.can_browse_rooms
      };
    });
    applySessionFlags(activeSession, result.data);
    loadUnreadMessages(activeSession);
    loadInheritance();
  };

  useEffect(() => {
    setCaseNumber(routeCase);
    setEstateLabel(routeCase);
    loadEstateLabel();
    const stored = estateInventoryService.getStoredSiblingSession(routeCase);
    if (stored?.token) {
      setSession(stored);
      setNeedsPreferredName(Boolean(stored.needs_preferred_name));
      loadItems(stored);
    } else {
      setSession(null);
      setNeedsPreferredName(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCase]);

  const startCoach = () => {
    setCoachStep(0);
    setShowCoach(true);
  };

  const finishCoach = (markSeen = true) => {
    if (markSeen) {
      markFamilyCoachSeen(caseNumber || routeCase, session?.sibling_key);
    }
    setShowCoach(false);
    setCoachStep(0);
  };

  useEffect(() => {
    if (!session?.token || needsPreferredName || showCoach) return undefined;
    if (hasSeenFamilyCoach(caseNumber || routeCase, session.sibling_key)) return undefined;
    const t = window.setTimeout(() => {
      setCoachStep(0);
      setShowCoach(true);
    }, 700);
    return () => window.clearTimeout(t);
  }, [
    session?.token,
    session?.sibling_key,
    needsPreferredName,
    caseNumber,
    routeCase,
    showCoach
  ]);

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
      setError('That code belongs to a different portal. Use Estate Vault home to sign in.');
      return;
    }
    setSession(result.data);
    setPin('');
    const needs = Boolean(result.data.needs_preferred_name);
    setNeedsPreferredName(needs);
    await loadItems(result.data);
  };

  const handleLogout = async () => {
    setShowCoach(false);
    setShowRoleGuide(false);
    const path = await leaveCurrentEstateDestination();
    navigate(path || '/estateit/enter', { replace: true });
  };

  const handlePreferredNameSaved = (data) => {
    setNeedsPreferredName(false);
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

  const familyRoleGuide = useMemo(
    () =>
      heirRolePortalGuide(session?.access_tier, {
        canBrowseRooms: session?.can_browse_rooms
      }),
    [session?.access_tier, session?.can_browse_rooms]
  );
  const familyRoleMeaning = useMemo(
    () =>
      heirRoleMeaning(session?.access_tier, {
        canBrowseRooms: session?.can_browse_rooms
      }),
    [session?.access_tier, session?.can_browse_rooms]
  );
  const probateFootnote = useMemo(() => {
    const resolved = resolveProbateWindow({
      letters_issued_at: lettersIssuedAt,
      probate_window_mode: probateWindow.mode,
      probate_window_amount: probateWindow.amount,
      probate_window_unit: probateWindow.unit,
      probate_window_end_date: probateWindow.endDate
    });
    if (resolved.needsEndDate) return 'Probate end date has not been set yet.';
    if (resolved.needsLetters) return 'Claims window starts when letters are issued.';
    if (resolved.end) {
      return `Claims / probate window through ${formatEstateLocalDate(resolved.end)}.`;
    }
    return resolved.label || '';
  }, [lettersIssuedAt, probateWindow]);

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
    const memorandumOnly = !heirCanRequestItems(session?.access_tier);
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
      <EstateBillingLockedGate caseNumber={routeCase || caseNumber} roleLabel="The family portal">
      <div className="estate-inventory ei-portal ei-portal--family">
        <div className="ei-family-atmosphere" aria-hidden="true">
          <span className="ei-family-glow ei-family-glow-a" />
          <span className="ei-family-glow ei-family-glow-b" />
        </div>
        <EstateNav
          variant="heir"
          title="Family portal"
          crumbs={[
            { label: 'Home', to: caseHome },
            { label: 'Sign in' }
          ]}
          onOpenWhatsNew={() => setShowWhatsNew(true)}
          onOpenWhatIsVault={() => setShowWhatIsVault(true)}
          onOpenLegalDisclaimer={() => setShowLegalDisclaimer(true)}
          onOpenFaq={() => setShowFaq(true)}
        />
        <header className="ei-family-welcome ei-family-welcome--signin">
          <p className="ei-family-welcome-eyebrow">Family portal</p>
          <h1 className="ei-family-welcome-title">{estateLabel}</h1>
          <p className="ei-family-welcome-lede">
            Enter the PIN the Personal Representative gave you. The app knows who you are from that
            code — no name required.
          </p>
        </header>
        <form className="ei-portal-card ei-family-signin-card" onSubmit={handleLogin}>
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
        <EstateWhatsNewModal
          role="heir"
          enabled={false}
          open={showWhatsNew}
          onOpenChange={setShowWhatsNew}
        />
        <EstateWhatIsVaultModal
          open={showWhatIsVault}
          onClose={() => setShowWhatIsVault(false)}
        />
        <EstateLegalDisclaimerModal
          open={showLegalDisclaimer}
          onClose={() => setShowLegalDisclaimer(false)}
        />
        <EstateFaqModal open={showFaq} onClose={() => setShowFaq(false)} />
        <EstateSystemDisclaimer />
      </div>
      </EstateBillingLockedGate>
    );
  }

  const helloName = heirPublicName(session) || session.display_name || 'Heir';
  const roleLabel = heirAccessTierLabel(session?.access_tier);
  const canRequestItems = heirCanRequestItems(session?.access_tier);
  const canBrowseFullRooms = heirCanBrowseRooms(session);
  const memorandumOnly = isMemorandumOnlyHeir(session?.access_tier);
  const coachTargetId = showCoach ? FAMILY_COACH_STEPS[coachStep]?.targetId || '' : '';

  return (
    <EstateBillingLockedGate caseNumber={routeCase || caseNumber} roleLabel="The family portal">
    <div
      className={`estate-inventory ei-portal ei-portal--family${showCoach ? ' is-coaching' : ''}`}
    >
      <div className="ei-family-atmosphere" aria-hidden="true">
        <span className="ei-family-glow ei-family-glow-a" />
        <span className="ei-family-glow ei-family-glow-b" />
      </div>
      <EstateNav
        variant="heir"
        roleGuide={familyRoleGuide}
        title="Family portal"
        subtitle={estateLabel}
        estateName={estateLabel}
        crumbs={[
          { label: 'Home', to: caseHome },
          { label: 'Family' }
        ]}
        onOpenWhatsNew={() => setShowWhatsNew(true)}
        onOpenWhatIsVault={() => setShowWhatIsVault(true)}
        onOpenLegalDisclaimer={() => setShowLegalDisclaimer(true)}
        onOpenFaq={() => setShowFaq(true)}
        onOpenPageTour={startCoach}
        extraRight={
          <button type="button" className="ei-nav-icon-btn" onClick={handleLogout}>
            Leave estate
          </button>
        }
      />

      <header
        id="ei-family-coach-welcome"
        className={`ei-family-welcome ei-family-coach-target${
          coachTargetId === 'ei-family-coach-welcome' ? ' is-coach-spotlight' : ''
        }`}
      >
        <p className="ei-family-welcome-eyebrow">Welcome to the family portal</p>
        <h1 className="ei-family-welcome-title">Hello, {helloName}</h1>
        <button
          type="button"
          className="ei-family-welcome-role"
          onClick={() => setShowRoleGuide(true)}
          aria-haspopup="dialog"
          title="What your role means"
        >
          {roleLabel}
          <span className="ei-family-welcome-role-hint">Your role · tap to explain</span>
        </button>
        {familyRoleMeaning?.summary ? (
          <p className="ei-family-welcome-role-summary">{familyRoleMeaning.summary}</p>
        ) : null}
        <p className="ei-family-welcome-lede">
          Start with what applies to you, then review the wider estate picture, then browse
          property when you are ready.
        </p>
        {!showCoach ? (
          <button type="button" className="ei-family-tour-link" onClick={startCoach}>
            Show me around
          </button>
        ) : null}
      </header>

      <section
        id="ei-family-coach-you"
        className={`ei-family-section ei-family-coach-target${
          coachTargetId === 'ei-family-coach-you' ? ' is-coach-spotlight' : ''
        }`}
        aria-labelledby="ei-family-you-heading"
      >
        <div className="ei-family-section-head">
          <p className="ei-family-section-kicker">Step 1</p>
          <h2 id="ei-family-you-heading" className="ei-family-section-title">
            For you
          </h2>
          <p className="ei-family-section-hint">
            Your distributions, family updates, and quick ways to stay in touch.
          </p>
        </div>
        <div className="ei-family-stack">
          <HeirInheritancePanel
            caseNumber={caseNumber}
            estateName={estateLabel}
            recipientName={helloName}
          />
          <HeirFamilyUpdatesPanel caseNumber={caseNumber} />
          <div className="ei-family-action-grid" role="group" aria-label="Quick actions">
            {canRequestItems ? (
              <button
                type="button"
                className="ei-family-action-tile ei-family-action-tile--requests"
                onClick={() => setShowMyRequests(true)}
              >
                <span className="ei-family-action-label">My requests</span>
                <span className="ei-family-action-meta">
                  {myRequestedItems.length
                    ? `${myRequestedItems.length} item${myRequestedItems.length === 1 ? '' : 's'}`
                    : 'Items you asked for'}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              className="ei-family-action-tile ei-family-action-tile--messages"
              onClick={() => setShowMessages(true)}
            >
              <span className="ei-family-action-label">Messages</span>
              <span className="ei-family-action-meta">
                {unreadMessages
                  ? `${unreadMessages} unread`
                  : 'Talk with the Personal Representative'}
              </span>
            </button>
            <Link
              to={estateitCasePath(routeCase, 'auction')}
              className="ei-family-action-tile ei-family-action-tile--auction"
            >
              <span className="ei-family-action-label">Sale & auction</span>
              <span className="ei-family-action-meta">Follow items headed to sale</span>
            </Link>
          </div>
        </div>
      </section>

      <section
        id="ei-family-coach-overview"
        className={`ei-family-section ei-family-coach-target${
          coachTargetId === 'ei-family-coach-overview' ? ' is-coach-spotlight' : ''
        }`}
        aria-labelledby="ei-family-estate-heading"
      >
        <div className="ei-family-section-head">
          <p className="ei-family-section-kicker">Step 2</p>
          <h2 id="ei-family-estate-heading" className="ei-family-section-title">
            Estate Overview
          </h2>
          <p className="ei-family-section-hint">
            Numbers and milestones.
          </p>
        </div>
        <div className="ei-family-stack">
          <HeirTransparencyPanel caseNumber={caseNumber} />
          <HeirDisclosureTimeline
            caseNumber={caseNumber}
            settings={{
              ...estateSettings,
              case_number: caseNumber,
              letters_issued_at: lettersIssuedAt || estateSettings.letters_issued_at,
              probate_window_mode: probateWindow.mode,
              probate_window_amount: probateWindow.amount,
              probate_window_unit: probateWindow.unit,
              probate_window_end_date: probateWindow.endDate
            }}
            items={items}
            distributions={inheritanceRows}
          />
          {probateFootnote ? (
            <p className="ei-family-footnote">{probateFootnote}</p>
          ) : null}
        </div>
      </section>

      <section
        id="ei-family-coach-property"
        className={`ei-family-section ei-family-section--inventory ei-family-coach-target${
          coachTargetId === 'ei-family-coach-property' ? ' is-coach-spotlight' : ''
        }`}
        aria-labelledby="ei-family-property-heading"
      >
        <div className="ei-family-section-head">
          <p className="ei-family-section-kicker">Step 3</p>
          <h2 id="ei-family-property-heading" className="ei-family-section-title">
            Estate Inventory
          </h2>
          <p className="ei-family-section-hint">
            {canRequestItems
              ? 'Open a room to view items. Request or release only where your role allows.'
              : canBrowseFullRooms
                ? 'Open a room to browse items. Your access is view-only — you cannot request items.'
                : 'Specific gifts named for you appear here.'}
          </p>
        </div>
        {message ? <p className="ei-status">{message}</p> : null}
        {error ? <div className="ei-error">{error}</div> : null}
        {loading ? <p className="ei-status">Loading…</p> : null}
        {!loading && items.length === 0 ? (
          <div className="ei-empty">
            <p>
              {memorandumOnly && !canBrowseFullRooms
                ? 'No specific gifts are listed for you yet, and full room browsing is not enabled.'
                : 'No inventory items to show yet.'}
            </p>
          </div>
        ) : (
          <HeirInventoryFilters
            rooms={roomOptions}
            roomFilter={roomFilter}
            onRoomChange={handleRoomChange}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            totalCount={items.length}
          />
        )}
      </section>

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
        open={needsPreferredName}
        required
        initialName={session?.preferred_name || ''}
        onClose={() => {}}
        onSaved={handlePreferredNameSaved}
      />

      <HeirFamilyCoachMarks
        open={showCoach}
        stepIndex={coachStep}
        onStepChange={setCoachStep}
        onSkip={() => finishCoach(true)}
        onDone={() => finishCoach(true)}
        helloName={helloName}
      />

      <EstateRoleGuideModal
        open={showRoleGuide}
        title={familyRoleGuide?.title || 'Your role'}
        eyebrow="Your role"
        guide={familyRoleGuide}
        onClose={() => setShowRoleGuide(false)}
      />

      <EstateWhatsNewModal
        role="heir"
        enabled={Boolean(session) && !needsPreferredName && !showCoach}
        open={showWhatsNew}
        onOpenChange={setShowWhatsNew}
      />
      <EstateWhatIsVaultModal
        open={showWhatIsVault}
        onClose={() => setShowWhatIsVault(false)}
      />
      <EstateLegalDisclaimerModal
        open={showLegalDisclaimer}
        onClose={() => setShowLegalDisclaimer(false)}
      />
      <EstateFaqModal open={showFaq} onClose={() => setShowFaq(false)} />

      <EstateSystemDisclaimer />
    </div>
    </EstateBillingLockedGate>
  );
};

export default SiblingPortal;
