import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { leaveCurrentEstateDestination } from '@shared/services/estateVaultSession.js';
import {
  estateitCasePath,
  estateitPortalHomePath,
  HELPER_ROLE_GUIDE
} from '@shared/utils/estateInventoryConstants.js';
import { mapEstatePortalClosedError } from '@shared/utils/estatePortalClosedCopy.js';
import { useEstateCase } from './EstateCaseContext';
import EstateNav from './EstateNav';
import ProbateCountdown from './ProbateCountdown';
import EstateRoleGuide from './EstateRoleGuide';
import HelperAddItemFlow from './HelperAddItemFlow';
import SceneCaptureForm from './SceneCaptureForm';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import EstateWhatsNewModal from './EstateWhatsNewModal';
import EstateWhatIsVaultModal from './EstateWhatIsVaultModal';
import EstateLegalDisclaimerModal from './EstateLegalDisclaimerModal';
import EstateFaqModal from './EstateFaqModal';
import EstateBillingLockedGate from './EstateBillingLockedGate';
import {
  EstateAuthPinInput,
  EstateAuthTextInput,
  EstateAutofillTrap
} from './EstateAuthField';
import './EstateInventoryApp.css';

const HelperPortal = () => {
  const navigate = useNavigate();
  const { caseNumber } = useEstateCase();
  const caseHome = estateitCasePath(caseNumber);
  const helperHome = estateitPortalHomePath(caseNumber, 'helper');
  const [session, setSession] = useState(() =>
    estateInventoryService.getStoredHelperSession(caseNumber)
  );
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState('item'); // 'item' | 'scene'
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showWhatIsVault, setShowWhatIsVault] = useState(false);
  const [showLegalDisclaimer, setShowLegalDisclaimer] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [collections, setCollections] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [probateWindow, setProbateWindow] = useState(null);

  const loadCollections = async (active = session) => {
    if (!active?.token) return;
    const result = await estateInventoryService.helperListCollections(active.token);
    if (!result.success) {
      setError(result.error || 'Could not load rooms.');
      if (/expired|sign in/i.test(result.error || '')) {
        estateInventoryService.clearHelperSession();
        setSession(null);
      }
      return;
    }
    setCollections(result.data.collections || []);
  };

  const loadProbate = async () => {
    const result = await estateInventoryService.getSettings(caseNumber);
    if (!result.success) {
      setProbateWindow(null);
      return;
    }
    setProbateWindow({
      lettersIssuedAt: result.data.letters_issued_at || null,
      mode: result.data.probate_window_mode || 'duration',
      amount: result.data.probate_window_amount ?? 90,
      unit: result.data.probate_window_unit || 'days',
      endDate: result.data.probate_window_end_date || null
    });
  };

  useEffect(() => {
    const stored = estateInventoryService.getStoredHelperSession(caseNumber);
    if (stored?.token) {
      setSession(stored);
      loadCollections(stored);
    } else {
      setSession(null);
    }
    loadProbate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseNumber]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (displayName.trim().length < 2) {
      setError('Enter your name so the Personal Representative knows who took each photo.');
      return;
    }
    setBusy(true);
    setError('');
    const result = await estateInventoryService.helperLogin(caseNumber, password, displayName.trim());
    setBusy(false);
    if (!result.success) {
      setError(
        mapEstatePortalClosedError(result.error, 'helper') ||
          result.error ||
          'Login failed.'
      );
      return;
    }
    setSession(result.data);
    setPassword('');
    await loadCollections(result.data);
  };

  const handleLogout = async () => {
    estateInventoryService.clearHelperSession();
    setSession(null);
    setCollections([]);
    setMessage('');
    const path = await leaveCurrentEstateDestination();
    navigate(path);
  };

  const handleHelperItemSubmit = async (payload) => {
    setBusy(true);
    setError('');
    setMessage('');
    const result = await estateInventoryService.helperCreateItem(payload);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not save item.');
      return { success: false, error: result.error || 'Could not save item.' };
    }
    if (!payload.collectionId) await loadCollections();
    return {
      success: true,
      data: result.data,
      warning: result.warning || ''
    };
  };

  if (!session) {
    return (
      <EstateBillingLockedGate caseNumber={caseNumber} roleLabel="The helper portal">
      <div className="estate-inventory ei-portal">
        <EstateNav
          variant="helper"
          roleGuide={HELPER_ROLE_GUIDE}
          title="Helper login"
          crumbs={[
            { label: 'Home', to: helperHome },
            { label: 'Helper' }
          ]}
          onOpenWhatsNew={() => setShowWhatsNew(true)}
          onOpenWhatIsVault={() => setShowWhatIsVault(true)}
          onOpenLegalDisclaimer={() => setShowLegalDisclaimer(true)}
          onOpenFaq={() => setShowFaq(true)}
        />
        <p className="ei-lede" style={{ marginBottom: '1rem' }}>
          Sign in with the <strong>name</strong> and <strong>PIN</strong> the Personal Representative
          set for you under Settings → Helpers. Your name is stamped on every photo you take.
        </p>
        <form className="ei-portal-card" onSubmit={handleLogin} autoComplete="off">
          <EstateAutofillTrap />
          <div className="ei-field">
            <label htmlFor="help-case">Case number</label>
            <input id="help-case" value={caseNumber} readOnly tabIndex={-1} className="ei-input-readonly" />
            <p className="ei-settings-hint" style={{ marginTop: '0.25rem' }}>
              Set by the Personal Representative only.
            </p>
          </div>
          <div className="ei-field">
            <label htmlFor="help-name">Your name</label>
            <EstateAuthTextInput
              id="help-name"
              name="estate_vault_helper_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Exact name the PR set for you"
              required
              minLength={2}
            />
          </div>
          <div className="ei-field">
            <label htmlFor="help-pass">Your PIN</label>
            <div className="ei-password-row">
              <EstateAuthPinInput
                id="help-pass"
                name="estate_vault_helper_pin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                inputMode="numeric"
                revealed={showPassword}
                required
              />
              <button
                type="button"
                className="ei-btn ei-btn-secondary ei-btn-small"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Hide' : 'See PIN'}
              </button>
            </div>
          </div>
          {error ? <div className="ei-error">{error}</div> : null}
          <button type="submit" className="ei-btn" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="ei-settings-hint" style={{ marginTop: '0.85rem' }}>
            <Link to={helperHome}>Back to helper home</Link>
          </p>
        </form>
        <EstateWhatsNewModal
          role="helper"
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
    <EstateBillingLockedGate caseNumber={caseNumber} roleLabel="The helper portal">
    <div className="estate-inventory ei-portal ei-helper-capture">
      <EstateNav
        variant="helper"
        roleGuide={HELPER_ROLE_GUIDE}
        title={`Helper · ${session.display_name}`}
        crumbs={[]}
        onOpenWhatsNew={() => setShowWhatsNew(true)}
          onOpenWhatIsVault={() => setShowWhatIsVault(true)}
          onOpenLegalDisclaimer={() => setShowLegalDisclaimer(true)}
          onOpenFaq={() => setShowFaq(true)}
        extraRight={
          <button type="button" className="ei-nav-icon-btn" onClick={handleLogout}>
            Leave estate
          </button>
        }
      />
      {probateWindow ? (
        <ProbateCountdown
          lettersIssuedAt={probateWindow.lettersIssuedAt}
          caseNumber={caseNumber}
          probateWindowMode={probateWindow.mode}
          probateWindowAmount={probateWindow.amount}
          probateWindowUnit={probateWindow.unit}
          probateWindowEndDate={probateWindow.endDate}
          readOnly
          roleGuide={HELPER_ROLE_GUIDE}
        />
      ) : (
        <section className="ei-countdown ei-countdown--guide-only" aria-label="Helper capabilities">
          <EstateRoleGuide guide={HELPER_ROLE_GUIDE} />
        </section>
      )}
      {message ? <p className="ei-status ei-helper-flash">{message}</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}

      <div className="ei-helper-mode-tabs" role="tablist" aria-label="Helper mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'item'}
          className={`ei-helper-mode-tab${mode === 'item' ? ' is-active' : ''}`}
          onClick={() => {
            setMode('item');
            setError('');
            setMessage('');
          }}
        >
          Add inventory item
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'scene'}
          className={`ei-helper-mode-tab${mode === 'scene' ? ' is-active' : ''}`}
          onClick={() => {
            setMode('scene');
            setError('');
            setMessage('');
          }}
        >
          Document scene
        </button>
      </div>

      {mode === 'scene' ? (
        <SceneCaptureForm
          busy={busy}
          allowGallery={false}
          collections={collections}
          submitLabel="Save scene photo"
          hint="Photograph rooms, walls, boxes, or bags as you found them — use Take photo at the house. Pick the same room names as inventory so the PR gallery groups cleanly. Admin only — not an inventory item and not shown to heirs."
          onSubmit={async (payload) => {
            setBusy(true);
            setError('');
            setMessage('');
            const result = await estateInventoryService.helperCreateScene(payload);
            setBusy(false);
            if (!result.success) {
              setError(result.error || 'Could not save scene.');
              return { success: false, error: result.error };
            }
            setMessage(
              result.warning
                ? `Scene saved for PR. ${result.warning}`
                : 'Scene photo saved for the Personal Representative only.'
            );
            return { success: true };
          }}
        />
      ) : (
        <HelperAddItemFlow
          collections={collections}
          displayName={session.display_name}
          busy={busy}
          onSubmit={handleHelperItemSubmit}
        />
      )}

      <EstateWhatsNewModal
        role="helper"
        enabled={Boolean(session)}
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
    </div>
    </EstateBillingLockedGate>
  );
};

export default HelperPortal;
