import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { getEstateOwnerSession, signOutEstateOwner } from '@shared/services/estateVaultAuth.js';
import { leaveCurrentEstate } from '@shared/services/estateVaultSession.js';
import {
  superMe,
  isStayOnPrHome,
  clearStayOnPrHome
} from '@shared/services/estateSuperAdminService.js';
import {
  getPrProfile,
  listMyIdentityRequests,
  openIdentityRequestStatus
} from '@shared/services/estatePrIdentityService.js';
import {
  ESTATEIT_PATH,
  estateDisplayCaseNumber,
  estateDisplayName,
  estateitCasePath
} from '@shared/utils/estateInventoryConstants.js';
import { estatePricingBlurbShort } from '@shared/utils/estateBilling.js';
import EstateCreateEstateModal from './EstateCreateEstateModal';
import EstateClaimEstateModal from './EstateClaimEstateModal';
import EstateOwnerSignIn from './EstateOwnerSignIn';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import EstatePrLegalNameModal from './EstatePrLegalNameModal';
import EstatePrIdentityRequestModal from './EstatePrIdentityRequestModal';
import GlossaryTerm from './GlossaryTerm';
import EstateBrandTitle from './EstateBrandTitle';
import './EstateInventoryApp.css';

/**
 * Signed-in PR home — list / create / claim estates.
 */
const EstateOwnerHome = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [session, setSession] = useState(null);
  const [estates, setEstates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [prProfile, setPrProfile] = useState(null);
  const [identityRequests, setIdentityRequests] = useState([]);
  const [showLegalName, setShowLegalName] = useState(false);
  const [showIdentityRequest, setShowIdentityRequest] = useState(false);

  const openIdentityRequest = identityRequests.find((r) =>
    ['pending_super_review', 'pending_pr_confirm'].includes(r.status)
  );

  const loadProfileAndRequests = useCallback(async () => {
    const [profileResult, requestsResult] = await Promise.all([
      getPrProfile(),
      listMyIdentityRequests()
    ]);
    if (profileResult.success) {
      setPrProfile(profileResult.data);
      setShowLegalName(Boolean(profileResult.data?.needs_legal_name));
    }
    if (requestsResult.success) {
      setIdentityRequests(requestsResult.data || []);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const owner = await getEstateOwnerSession();
    if (!owner.success) {
      setSession(null);
      setEstates([]);
      setLoading(false);
      return;
    }
    setSession(owner.data);

    if (!isStayOnPrHome()) {
      const me = await superMe();
      if (me.success) {
        setRedirecting(true);
        navigate(`${ESTATEIT_PATH}/super`, { replace: true });
        return;
      }
    }

    await loadProfileAndRequests();

    const listed = await estateInventoryService.listOwnedEstates();
    setLoading(false);
    if (!listed.success) {
      setError(listed.error || 'Could not load your estates.');
      setEstates([]);
      return;
    }
    setEstates(listed.data || []);
  }, [navigate, loadProfileAndRequests]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const identity = searchParams.get('identity');
    if (!identity) return;
    if (identity === 'confirmed') {
      const pinsEmailed = searchParams.get('pins_emailed') === '1';
      setMessage(
        pinsEmailed
          ? 'Identity change confirmed. Sign in with your new email — new case admin PINs were sent there (old PINs no longer work). You must set a personal PIN on first unlock.'
          : 'Identity change confirmed. Sign in with your new email to see transferred estates.'
      );
    } else if (identity === 'error') {
      const detail = searchParams.get('message');
      setError(detail ? decodeURIComponent(detail.replace(/\+/g, ' ')) : 'Could not confirm identity change.');
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const needsLegalName = Boolean(prProfile?.needs_legal_name);
  const estateActionsBlocked = needsLegalName;

  const handleSignOut = async () => {
    leaveCurrentEstate();
    clearStayOnPrHome();
    await signOutEstateOwner();
    setSession(null);
    setEstates([]);
  };

  if (redirecting) {
    return (
      <div className="estate-inventory ei-landing ei-owner-home">
        <p className="ei-status">Opening Super Admin console…</p>
      </div>
    );
  }

  if (!loading && !session) {
    return <EstateOwnerSignIn onSignedIn={() => load()} />;
  }

  return (
    <div className="estate-inventory ei-landing ei-owner-home">
      <header className="ei-landing-hero">
        <EstateBrandTitle size="compact" />
        <p className="ei-eyebrow">
          <GlossaryTerm termKey="personal_representative">Personal Representative</GlossaryTerm>
        </p>
        <h1>My Estates</h1>
        <p className="ei-lede">
          {session?.email ? (
            <>
              Primary executor: <strong>{session.email}</strong>
              {prProfile?.legal_name ? (
                <>
                  <br />
                  Legal name: <strong>{prProfile.legal_name}</strong>
                </>
              ) : null}
              <br />
              One email per estate — you can be PR for several estates.
            </>
          ) : (
            'Your Estates'
          )}
        </p>
        <div className="ei-landing-hero-actions">
          <button
            type="button"
            className="ei-btn"
            onClick={() => setShowCreate(true)}
            disabled={estateActionsBlocked}
            title={estateActionsBlocked ? 'Set your legal name first' : undefined}
          >
            Start new estate
          </button>
          <button
            type="button"
            className="ei-btn ei-btn-secondary"
            onClick={() => setShowClaim(true)}
            disabled={estateActionsBlocked}
            title={estateActionsBlocked ? 'Set your legal name first' : undefined}
          >
            Link existing estate
          </button>
          <button
            type="button"
            className="ei-btn ei-btn-secondary"
            onClick={() => setShowIdentityRequest(true)}
            disabled={needsLegalName}
            title={
              needsLegalName
                ? 'Set your legal name before requesting an identity change'
                : 'Request legal name or email transfer'
            }
          >
            Account identity
          </button>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={handleSignOut}>
            Sign out of Estate Vault
          </button>
        </div>
        <p className="ei-settings-hint" style={{ marginTop: '0.75rem', maxWidth: '36rem' }}>
          {estatePricingBlurbShort()} See FAQ → Pricing &amp; billing for details.
        </p>
      </header>

      {loading ? <p className="ei-status">Loading…</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}
      {message ? <p className="ei-status">{message}</p> : null}

      {prProfile?.recent_identity_transfer ? (
        <div className="ei-notice ei-portal-card" style={{ marginBottom: '1rem' }}>
          <strong>Estates moved to this login.</strong>
          {prProfile.recent_identity_transfer.admin_pins_rotated !== false ? (
            <>
              {' '}
              New case admin PINs were emailed to this address when the transfer completed. Old PINs
              no longer work. Check your inbox, then set a personal PIN on first unlock.
            </>
          ) : (
            <>
              {' '}
              Sign in with this email to open your estates. If you completed a transfer before PIN
              rotation was enabled, ask Super Admin to force a PIN reset.
            </>
          )}
        </div>
      ) : null}

      {openIdentityRequest ? (
        <div className="ei-notice ei-portal-card" style={{ marginBottom: '1rem' }}>
          <strong>Identity change in progress:</strong>{' '}
          {openIdentityRequestStatus(openIdentityRequest)}
          {openIdentityRequest.status === 'pending_pr_confirm' ? (
            <>
              {' '}
              Check <strong>{openIdentityRequest.current_email}</strong> for the confirmation link
              (expires{' '}
              {openIdentityRequest.confirm_expires_at
                ? new Date(openIdentityRequest.confirm_expires_at).toLocaleString()
                : 'soon'}
              ).
            </>
          ) : null}
          <button
            type="button"
            className="ei-linkish"
            style={{ marginLeft: '0.5rem' }}
            onClick={() => setShowIdentityRequest(true)}
          >
            View request
          </button>
        </div>
      ) : null}

      {needsLegalName && !loading ? (
        <div className="ei-notice ei-portal-card" style={{ marginBottom: '1rem' }}>
          Set your legal name as Personal Representative before creating or opening estates.{' '}
          <button type="button" className="ei-linkish" onClick={() => setShowLegalName(true)}>
            Enter legal name
          </button>
        </div>
      ) : null}

      {!loading && !estates.length ? (
        <div className="ei-empty ei-portal-card">
          <p>
            No estates on this account yet. Start a new one, or link an existing case with the admin
            PIN you already use.
          </p>
          <div className="ei-btn-row" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="ei-btn"
              onClick={() => setShowCreate(true)}
              disabled={estateActionsBlocked}
            >
              Start new estate
            </button>
            <button
              type="button"
              className="ei-btn ei-btn-secondary"
              onClick={() => setShowClaim(true)}
              disabled={estateActionsBlocked}
            >
              Link existing estate
            </button>
          </div>
        </div>
      ) : null}

      <div className="ei-list">
        {estates.map((row) => {
          const cn = row.case_number || row.caseNumber;
          const label = estateDisplayName(row, cn);
          const caseLabel = estateDisplayCaseNumber(row, cn);
          return (
            <div key={row.id || cn} className="ei-list-row">
              <button
                type="button"
                className="ei-list-item"
                onClick={() => {
                  if (estateActionsBlocked) {
                    setShowLegalName(true);
                    return;
                  }
                  estateInventoryService.setActiveEstateCase(cn);
                  navigate(estateitCasePath(cn, 'admin'));
                }}
                disabled={estateActionsBlocked}
              >
                <div>
                  <strong>{label}</strong>
                  <span>
                    Case {caseLabel}
                    {row.owner_email ? ` · PR ${row.owner_email}` : ''}
                    {row.is_published === false ? ' · Private' : ''}
                  </span>
                </div>
                <span className="ei-list-chevron" aria-hidden="true">
                  →
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <p className="ei-settings-hint" style={{ marginTop: '1rem' }}>
        Opening an estate still requires the <strong>case admin PIN</strong> on this device.
      </p>
      <p className="ei-settings-hint">
        <Link to={ESTATEIT_PATH}>Home</Link>
        {' · '}
        <Link to={`${ESTATEIT_PATH}/enter`}>Family / helper sign in</Link>
      </p>

      <EstateSystemDisclaimer generic />

      <EstateCreateEstateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(data) => {
          load();
          const cn = data?.case_number;
          if (cn) {
            estateInventoryService.setActiveEstateCase(cn);
            navigate(estateitCasePath(cn, 'admin'));
          }
        }}
      />

      <EstateClaimEstateModal
        open={showClaim}
        onClose={() => setShowClaim(false)}
        onClaimed={(data) => {
          setMessage(
            data?.claimed
              ? `Linked ${data.estate_name || data.case_number} to your account.`
              : `${data?.estate_name || data?.case_number || 'Estate'} is already on your account.`
          );
          load();
          const cn = data?.case_number;
          if (cn) {
            estateInventoryService.setActiveEstateCase(cn);
          }
        }}
      />

      <EstatePrLegalNameModal
        open={showLegalName}
        required={needsLegalName}
        initialName={prProfile?.legal_name || ''}
        onSaved={(profile) => {
          setPrProfile(profile);
          setShowLegalName(false);
          setMessage('Legal name saved.');
        }}
      />

      <EstatePrIdentityRequestModal
        open={showIdentityRequest}
        onClose={() => setShowIdentityRequest(false)}
        profile={prProfile}
        sessionEmail={session?.email}
        openRequest={openIdentityRequest}
        onSubmitted={() => {
          setMessage('Identity change submitted for operator review.');
          loadProfileAndRequests();
        }}
        onCancelled={() => {
          setMessage('Identity change request cancelled.');
          loadProfileAndRequests();
        }}
      />
    </div>
  );
};

export default EstateOwnerHome;
