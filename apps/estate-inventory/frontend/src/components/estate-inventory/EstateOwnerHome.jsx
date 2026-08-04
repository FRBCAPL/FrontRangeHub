import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { getEstateOwnerSession, signOutEstateOwner } from '@shared/services/estateVaultAuth.js';
import { leaveCurrentEstate } from '@shared/services/estateVaultSession.js';
import {
  superMe,
  isStayOnPrHome,
  clearStayOnPrHome
} from '@shared/services/estateSuperAdminService.js';
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
import GlossaryTerm from './GlossaryTerm';
import './EstateInventoryApp.css';

/**
 * Signed-in PR home — list / create / claim estates.
 */
const EstateOwnerHome = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [estates, setEstates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

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

    const listed = await estateInventoryService.listOwnedEstates();
    setLoading(false);
    if (!listed.success) {
      setError(listed.error || 'Could not load your estates.');
      setEstates([]);
      return;
    }
    setEstates(listed.data || []);
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

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
        <p className="ei-eyebrow">
          <GlossaryTerm termKey="personal_representative">Personal Representative</GlossaryTerm>
        </p>
        <h1>My Estates</h1>
        <p className="ei-lede">
          {session?.email ? (
            <>
              Primary executor: <strong>{session.email}</strong>
              <br />
              One email per estate — you can be PR for several estates.
            </>
          ) : (
            'Your Estates'
          )}
        </p>
        <div className="ei-landing-hero-actions">
          <button type="button" className="ei-btn" onClick={() => setShowCreate(true)}>
            Start new estate
          </button>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={() => setShowClaim(true)}>
            Link existing estate
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

      {!loading && !estates.length ? (
        <div className="ei-empty ei-portal-card">
          <p>
            No estates on this account yet. Start a new one, or link an existing case with the admin
            PIN you already use.
          </p>
          <div className="ei-btn-row" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="ei-btn" onClick={() => setShowCreate(true)}>
              Start new estate
            </button>
            <button type="button" className="ei-btn ei-btn-secondary" onClick={() => setShowClaim(true)}>
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
                  estateInventoryService.setActiveEstateCase(cn);
                  navigate(estateitCasePath(cn, 'admin'));
                }}
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
    </div>
  );
};

export default EstateOwnerHome;
