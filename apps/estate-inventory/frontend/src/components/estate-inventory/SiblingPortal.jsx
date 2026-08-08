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
  estateitPortalHomePath,
  estateDisplayName,
  normalizeEstateCaseNumber,
  heirCanBrowseRooms,
  heirCanRequestItems,
  heirPublicName,
  heirAccessTierLabel,
  heirRolePortalGuide,
  normalizeHeirAccessTier,
  isMemorandumOnlyHeir,
  resolveProbateWindow,
  formatEstateLocalDate,
  isSettledOrClaimedInventoryItem,
  canAccessClaimedInventoryFilter
} from '@shared/utils/estateInventoryConstants.js';
import { formatItemRefLabel, roomTitleWithCode } from '@shared/utils/estateInventoryRefCode.js';
import {
  normalizeVisibilitySections,
  visibilitySectionEnabled
} from '@shared/utils/estateVisibilitySections.js';
import { useEstateCase } from './EstateCaseContext';
import EstateNav from './EstateNav';
import HeirPreferredNameModal from './HeirPreferredNameModal';
import HeirRequestReasonModal from './HeirRequestReasonModal';
import HeirNoInterestModal from './HeirNoInterestModal';
import HeirBulkNoInterestModal from './HeirBulkNoInterestModal';
import HeirCancelRequestModal from './HeirCancelRequestModal';
import HeirMessagesModal from './HeirMessagesModal';
import HeirMyRequestsModal from './HeirMyRequestsModal';
import EstateWhatsNewModal from './EstateWhatsNewModal';
import EstateWhatIsVaultModal from './EstateWhatIsVaultModal';
import EstateLegalDisclaimerModal from './EstateLegalDisclaimerModal';
import EstateFaqModal from './EstateFaqModal';
import HeirRoomBrowseModal from './HeirRoomBrowseModal';
import {
  EstateAuthPinInput,
  EstateAutofillTrap
} from './EstateAuthField';
import HeirRoomsMenuModal from './HeirRoomsMenuModal';
import ItemPhotoGallery from './ItemPhotoGallery';
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
  buildFamilyCoachSteps,
  hasSeenFamilyCoach,
  markFamilyCoachSeen
} from '@shared/utils/estateFamilyCoach.js';
import './EstateInventoryApp.css';
import EstatePanelErrorBoundary from './EstatePanelErrorBoundary';

const SiblingPortal = () => {
  const navigate = useNavigate();
  const { caseNumber: routeCase } = useEstateCase();
  const caseHome = estateitCasePath(routeCase);
  const familyHome = estateitPortalHomePath(routeCase, 'family');
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
  const [bulkNoInterestOpen, setBulkNoInterestOpen] = useState(false);
  const [bulkNoInterestBusy, setBulkNoInterestBusy] = useState(false);
  const [bulkProgressText, setBulkProgressText] = useState('');
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showRoomsMenu, setShowRoomsMenu] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [roomFilter, setRoomFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [browseOpen, setBrowseOpen] = useState(false);
  const [showClaimedOnly, setShowClaimedOnly] = useState(false);
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

  const loadEstateLabel = async (activeSession = null) => {
    const sess =
      activeSession ||
      session ||
      estateInventoryService.getStoredSiblingSession(routeCase);

    // Heirs cannot use PR getSettings — resolve the friendly name from the sibling session.
    if (sess?.token) {
      const labelResult = await estateInventoryService.getSiblingEstateLabel(sess.token);
      if (labelResult.success) {
        setEstateLabel(estateDisplayName(labelResult.data, routeCase));
        setEstateSettings((prev) => ({
          ...prev,
          estate_name: labelResult.data?.estate_name || prev.estate_name,
          case_number: labelResult.data?.case_number || prev.case_number || routeCase,
          court_case_number:
            labelResult.data?.court_case_number ?? prev.court_case_number
        }));
        return;
      }
    }

    const result = await estateInventoryService.getSettings(routeCase);
    if (result.success) {
      setEstateLabel(estateDisplayName(result.data, routeCase));
      setEstateSettings(result.data || {});
      return;
    }

    const listed = await estateInventoryService.listPublicEstates();
    if (listed.success) {
      const want = normalizeEstateCaseNumber(routeCase);
      const match = (listed.data || []).find(
        (e) => normalizeEstateCaseNumber(e.caseNumber) === want
      );
      if (match?.estateName) {
        setEstateLabel(estateDisplayName(match.estateName, routeCase));
        return;
      }
    }

    setEstateLabel(routeCase);
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
      estate_name: result.data.estate_name || prev.estate_name,
      court_case_number: result.data.court_case_number ?? prev.court_case_number
    }));
    if (result.data.estate_name) {
      setEstateLabel(estateDisplayName(result.data, routeCase));
    } else {
      void loadEstateLabel(activeSession);
    }
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
            : prev.can_browse_rooms,
        financial_visibility:
          result.data.financial_visibility || prev.financial_visibility,
        visibility_sections:
          result.data.visibility_sections || prev.visibility_sections
      };
    });
    applySessionFlags(activeSession, result.data);
    loadUnreadMessages(activeSession);
    loadInheritance();
  };

  useEffect(() => {
    setCaseNumber(routeCase);
    setEstateLabel(routeCase);
    const stored = estateInventoryService.getStoredSiblingSession(routeCase);
    void loadEstateLabel(stored);
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
        ? 'Recorded. All heirs released interest — item is now flagged for the sale inventory.'
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

  /** Remaining releasable items in the open room only (excludes this heir’s requests). */
  const roomRemainingNoInterestItems = useMemo(() => {
    if (!session?.sibling_key || !roomFilter) return [];
    return (items || []).filter((item) => {
      if (!item?.id) return false;
      const roomName = item.room?.trim() || 'Unassigned';
      if (roomName !== roomFilter) return false;
      if (item.is_memorandum_asset) return false;
      if (isClaimedMemorandum(item.legal_status)) return false;
      if (isUnauthorizedRemoval(item.legal_status)) return false;
      if (item.legal_status === 'distributed' || item.legal_status === 'archived') return false;
      if (item.approved_for_sale) return false;
      if (youReleasedItem(item, session.sibling_key)) return false;
      const claims = Array.isArray(item.sibling_claims) ? item.sibling_claims : [];
      if (claims.some((c) => c.sibling_key === session.sibling_key)) return false;
      return true;
    });
  }, [items, session?.sibling_key, roomFilter]);

  const handleBulkNoInterestConfirm = async () => {
    const targets = roomRemainingNoInterestItems;
    if (!targets.length) {
      setBulkNoInterestOpen(false);
      return;
    }
    setBulkNoInterestBusy(true);
    setError('');
    setMessage('');
    let okCount = 0;
    let failCount = 0;
    for (let i = 0; i < targets.length; i += 1) {
      const item = targets[i];
      setBulkProgressText(`Saving ${i + 1} of ${targets.length}…`);
      const result = await estateInventoryService.siblingReleaseForSale(item.id);
      if (result.success) okCount += 1;
      else failCount += 1;
    }
    setBulkNoInterestBusy(false);
    setBulkProgressText('');
    setBulkNoInterestOpen(false);
    await loadItems();
    const roomLabel = roomFilter || 'this room';
    if (failCount && !okCount) {
      setError(
        `Could not record no interest for remaining items in ${roomLabel}. Try again or mark items one at a time.`
      );
      return;
    }
    if (failCount) {
      setMessage(
        `Recorded no interest on ${okCount} item${okCount === 1 ? '' : 's'} in ${roomLabel}. ${failCount} could not be updated.`
      );
      return;
    }
    setMessage(
      `Recorded no interest on ${okCount} remaining item${okCount === 1 ? '' : 's'} in ${roomLabel}. Your requested items were left unchanged.`
    );
  };

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
    const byName = new Map();
    items.forEach((item) => {
      const name = item.room?.trim() || 'Unassigned';
      const prev = byName.get(name) || { name, count: 0, collection_number: null };
      prev.count += 1;
      // Prefer live collection #; fall back to stamped room_number on the item.
      if (prev.collection_number == null) {
        const n = Number(item.collection_number ?? item.room_number);
        if (Number.isFinite(n) && n >= 1) prev.collection_number = n;
      }
      byName.set(name, prev);
    });
    return [...byName.values()].sort((a, b) => {
      const an = Number(a.collection_number);
      const bn = Number(b.collection_number);
      if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
      return a.name.localeCompare(b.name);
    });
  }, [items]);

  const activeRoomMeta = useMemo(
    () => roomOptions.find((r) => r.name === roomFilter) || null,
    [roomOptions, roomFilter]
  );

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

  const allowClaimedFilter = canAccessClaimedInventoryFilter({
    role: 'heir',
    access_tier: session?.access_tier,
    can_browse_rooms: session?.can_browse_rooms
  });

  const browseClaimedCount = useMemo(
    () => filteredItems.filter(isSettledOrClaimedInventoryItem).length,
    [filteredItems]
  );

  const browseItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      const an = Number(a?.item_number);
      const bn = Number(b?.item_number);
      const ak = Number.isFinite(an) && an >= 1 ? an : Number.POSITIVE_INFINITY;
      const bk = Number.isFinite(bn) && bn >= 1 ? bn : Number.POSITIVE_INFINITY;
      if (ak !== bk) return ak - bk;
      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });
    if (!allowClaimedFilter) return list;
    if (showClaimedOnly) return list.filter(isSettledOrClaimedInventoryItem);
    return list.filter((item) => !isSettledOrClaimedInventoryItem(item));
  }, [filteredItems, allowClaimedFilter, showClaimedOnly]);

  const familyRoleGuide = useMemo(
    () =>
      heirRolePortalGuide(session?.access_tier, {
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
    ? roomTitleWithCode(roomFilter, activeRoomMeta?.collection_number)
    : searchQuery.trim()
      ? `Search: “${searchQuery.trim()}”`
      : 'Browse';

  const handleRoomChange = (roomName) => {
    const name = String(roomName || '').trim();
    if (!name) return;
    setRoomFilter(name);
    setSearchQuery('');
    setShowClaimedOnly(false);
    setBrowseOpen(true);
  };

  const handleSearchChange = (q) => {
    setSearchQuery(q);
    setShowClaimedOnly(false);
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
    setShowClaimedOnly(false);
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
        <ItemPhotoGallery item={item} alt={item.name} />
        <div className="ei-card-body">
          {formatItemRefLabel(item.room_number, item.item_number) ? (
            <p className="ei-item-ref-label">
              {formatItemRefLabel(item.room_number, item.item_number)}
            </p>
          ) : null}
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
                  Approved for sale (family release complete or PR flagged).
                </p>
              ) : null}
              {youReleased(item) ? (
                <p className="ei-card-meta" style={{ marginTop: '0.45rem' }}>
                  You marked no interest / approved for sale
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
                      : 'No Interest / Approve for Sale'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </article>
    );
  };

  const helloName = heirPublicName(session) || session?.display_name || 'Heir';
  const roleLabel = heirAccessTierLabel(session?.access_tier);
  const canRequestItems = heirCanRequestItems(session?.access_tier);
  const canBrowseFullRooms = heirCanBrowseRooms(session);
  const memorandumOnly = isMemorandumOnlyHeir(session?.access_tier);
  const visibilitySections = normalizeVisibilitySections(session?.visibility_sections, {
    tier: session?.financial_visibility,
    accessTier: session?.access_tier
  });
  const sectionOn = (key) => visibilitySectionEnabled(visibilitySections, key);
  const showRoomsTile =
    sectionOn('rooms_inventory') && (canBrowseFullRooms || items.length > 0);

  // Must stay above the !session early return — otherwise first login trips React #310
  // ("Rendered more hooks than during the previous render").
  const familyCoachSteps = useMemo(() => {
    const sections = normalizeVisibilitySections(session?.visibility_sections, {
      tier: session?.financial_visibility,
      accessTier: session?.access_tier
    });
    const on = (key) => visibilitySectionEnabled(sections, key);
    return buildFamilyCoachSteps({
      accessTier: session?.access_tier,
      canBrowseRooms: session?.can_browse_rooms,
      showRooms: on('rooms_inventory') && (canBrowseFullRooms || items.length > 0),
      showRequests: canRequestItems && on('my_requests'),
      showMessages: on('messages'),
      showUpdates: on('family_updates'),
      showOverview: on('estate_overview'),
      showInheritance: on('my_inheritance'),
      showAuction: on('sale_auction')
    });
  }, [
    session?.access_tier,
    session?.can_browse_rooms,
    session?.financial_visibility,
    session?.visibility_sections,
    canBrowseFullRooms,
    items.length,
    canRequestItems
  ]);
  const coachTargetId = showCoach ? familyCoachSteps[coachStep]?.targetId || '' : '';

  useEffect(() => {
    if (!showCoach) return;
    if (coachStep > familyCoachSteps.length - 1) {
      setCoachStep(Math.max(0, familyCoachSteps.length - 1));
    }
  }, [showCoach, coachStep, familyCoachSteps.length]);

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
            { label: 'Home', to: familyHome },
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
        <form className="ei-portal-card ei-family-signin-card" onSubmit={handleLogin} autoComplete="off">
          <EstateAutofillTrap />
          <div className="ei-field">
            <label htmlFor="sib-estate">Estate</label>
            <input id="sib-estate" value={estateLabel} readOnly tabIndex={-1} className="ei-input-readonly" />
          </div>
          <div className="ei-field">
            <label htmlFor="sib-pin">Your PIN / invite code</label>
            <div className="ei-password-row">
              <EstateAuthPinInput
                id="sib-pin"
                name="estate_vault_family_pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                revealed={showPassword}
                required
                inputMode="numeric"
                placeholder="6-digit PIN"
                autoFocus
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

  return (
    <EstatePanelErrorBoundary title="Family portal failed to render." label="family">
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
        displayCaseNumber={estateSettings?.court_case_number || null}
        crumbs={[
          { label: 'Home', to: familyHome },
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
        <div className="ei-family-welcome-role-stack">
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
          {!showCoach ? (
            <button type="button" className="ei-family-tour-link" onClick={startCoach}>
              Show me around
            </button>
          ) : null}
        </div>
      </header>

      {message ? <p className="ei-status ei-family-home-status">{message}</p> : null}
      {error ? <div className="ei-error ei-family-home-status">{error}</div> : null}

      <nav
        id="ei-family-coach-menu"
        className={`ei-family-menu ei-family-coach-target${
          coachTargetId === 'ei-family-coach-menu' ? ' is-coach-spotlight' : ''
        }`}
        aria-label="Family portal menu"
      >
        <div className="ei-family-action-grid" role="group" aria-label="Open a section">
          {sectionOn('messages') ? (
          <button
            type="button"
            id="ei-family-coach-messages"
            className={`ei-family-action-tile ei-family-action-tile--messages ei-family-coach-target${
              coachTargetId === 'ei-family-coach-messages' ? ' is-coach-spotlight' : ''
            }`}
            onClick={() => setShowMessages(true)}
          >
            <span className="ei-family-action-label">Messages</span>
            <span className="ei-family-action-meta">
              {unreadMessages
                ? `${unreadMessages} unread`
                : 'Talk with the Personal Representative'}
            </span>
          </button>
          ) : null}

          {sectionOn('my_inheritance') ? (
          <HeirInheritancePanel
            asMenuTile
            caseNumber={caseNumber}
            estateName={estateLabel}
            recipientName={helloName}
          />
          ) : null}

          {canRequestItems && sectionOn('my_requests') ? (
            <button
              type="button"
              id="ei-family-coach-requests"
              className={`ei-family-action-tile ei-family-action-tile--requests ei-family-coach-target${
                coachTargetId === 'ei-family-coach-requests' ? ' is-coach-spotlight' : ''
              }`}
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

          {sectionOn('family_updates') ? (
            <HeirFamilyUpdatesPanel asMenuTile caseNumber={caseNumber} />
          ) : null}
          {sectionOn('estate_overview') ? (
            <HeirTransparencyPanel asMenuTile caseNumber={caseNumber} />
          ) : null}

          {showRoomsTile ? (
            <button
              type="button"
              id="ei-family-coach-rooms"
              className={`ei-family-action-tile ei-family-action-tile--rooms ei-family-coach-target${
                coachTargetId === 'ei-family-coach-rooms' ? ' is-coach-spotlight' : ''
              }`}
              onClick={() => setShowRoomsMenu(true)}
              aria-haspopup="dialog"
            >
              <span className="ei-family-action-label">
                {canBrowseFullRooms ? 'Rooms & inventory' : 'My gifts & rooms'}
              </span>
              <span className="ei-family-action-meta">
                {loading
                  ? 'Loading…'
                  : items.length
                    ? `${roomOptions.length} room${roomOptions.length === 1 ? '' : 's'} · ${items.length} item${items.length === 1 ? '' : 's'}`
                    : 'Browse rooms and items'}
              </span>
            </button>
          ) : null}

          <HeirDisclosureTimeline
            asMenuTile
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

          {sectionOn('sale_auction') ? (
          <Link
            id="ei-family-coach-auction"
            to={estateitCasePath(routeCase, 'auction')}
            className={`ei-family-action-tile ei-family-action-tile--auction ei-family-coach-target${
              coachTargetId === 'ei-family-coach-auction' ? ' is-coach-spotlight' : ''
            }`}
          >
            <span className="ei-family-action-label">Sale inventory</span>
            <span className="ei-family-action-meta">Browse items listed for sale</span>
          </Link>
          ) : null}

          <button
            type="button"
            id="ei-family-coach-help"
            className={`ei-family-action-tile ei-family-action-tile--help ei-family-coach-target${
              coachTargetId === 'ei-family-coach-help' ? ' is-coach-spotlight' : ''
            }`}
            onClick={() => setShowFaq(true)}
            aria-haspopup="dialog"
          >
            <span className="ei-family-action-label">Help / FAQ</span>
            <span className="ei-family-action-meta">Common questions about this portal</span>
          </button>
        </div>
      </nav>

      {probateFootnote ? (
        <p className="ei-family-footnote ei-family-home-status ei-family-probate-bar">
          {probateFootnote}
        </p>
      ) : null}

      <HeirRoomsMenuModal
        open={showRoomsMenu}
        onClose={() => setShowRoomsMenu(false)}
        rooms={roomOptions}
        roomFilter={roomFilter}
        onRoomChange={handleRoomChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        totalCount={items.length}
        loading={loading}
        emptyMessage={
          memorandumOnly && !canBrowseFullRooms
            ? 'No specific gifts are listed for you yet, and full room browsing is not enabled.'
            : 'No inventory items to show yet.'
        }
      />

      <HeirRoomBrowseModal
        open={browseOpen}
        onClose={closeBrowse}
        title={browseTitle}
        itemCount={browseItems.length}
        allowClaimedFilter={allowClaimedFilter}
        showClaimedOnly={showClaimedOnly}
        claimedCount={browseClaimedCount}
        onToggleClaimedFilter={() => setShowClaimedOnly((v) => !v)}
        showBulkNoInterest={
          Boolean(canRequestItems && roomFilter && !needsPreferredName && !searchQuery.trim())
        }
        roomRemainingCount={roomRemainingNoInterestItems.length}
        bulkNoInterestBusy={bulkNoInterestBusy}
        onBulkNoInterest={() => {
          setError('');
          setMessage('');
          setBulkNoInterestOpen(true);
        }}
      >
        {browseItems.map((item) => renderHeirItem(item))}
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

      <HeirBulkNoInterestModal
        open={bulkNoInterestOpen}
        roomName={roomFilter}
        remainingCount={roomRemainingNoInterestItems.length}
        keptClaimCount={
          roomFilter
            ? myRequestedItems.filter(
                ({ item }) => (item.room?.trim() || 'Unassigned') === roomFilter
              ).length
            : 0
        }
        busy={bulkNoInterestBusy}
        progressText={bulkProgressText}
        onClose={() => {
          if (!bulkNoInterestBusy) setBulkNoInterestOpen(false);
        }}
        onConfirm={handleBulkNoInterestConfirm}
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
        steps={familyCoachSteps}
        onStepChange={setCoachStep}
        onSkip={() => finishCoach(true)}
        onDone={() => finishCoach(true)}
        helloName={helloName}
      />

      <EstateRoleGuideModal
        open={showRoleGuide}
        title={familyRoleGuide?.title || 'Your role'}
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
    </EstatePanelErrorBoundary>
  );
};

export default SiblingPortal;
