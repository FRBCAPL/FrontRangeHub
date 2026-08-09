import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  ESTATE_CASE_STORAGE_KEY,
  ESTATEIT_PATH,
  estateitCasePath,
  isOpenEstateCase,
  normalizeEstateCaseNumber
} from '@shared/utils/estateInventoryConstants.js';
import { mapEstatePortalClosedError } from '@shared/utils/estatePortalClosedCopy.js';
import EstateBrandTitle from './EstateBrandTitle';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import EstateLegalDisclaimerGate from './EstateLegalDisclaimerGate';
import {
  EstateAuthPinInput,
  EstateAuthTextInput,
  EstateAutofillTrap
} from './EstateAuthField';
import './EstateInventoryApp.css';

function rememberCase(caseNumber) {
  try {
    sessionStorage.setItem(ESTATE_CASE_STORAGE_KEY, caseNumber);
  } catch {
    /* ignore */
  }
}

/**
 * Family / heir / helper sign-in — estate name, then invite code or role password.
 */
const EstateFamilySignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const unknownFromRedirect = location.state?.unknownCase
    ? normalizeEstateCaseNumber(location.state.unknownCase)
    : '';

  const [step, setStep] = useState('name'); // 'name' | 'code'
  const [estateNameInput, setEstateNameInput] = useState('');
  const [matchedEstate, setMatchedEstate] = useState(null);
  const [personName, setPersonName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() =>
    unknownFromRedirect && !isOpenEstateCase(unknownFromRedirect)
      ? 'That estate is not open yet. Enter the estate name below, or ask the Personal Representative.'
      : ''
  );

  // Chrome may paint saved credentials after mount — wipe them if user has not typed.
  useEffect(() => {
    if (step !== 'code') return undefined;
    let touched = false;
    const markTouched = () => {
      touched = true;
    };
    const wipeChromeAutofill = () => {
      if (touched) return;
      setPersonName('');
      setAccessCode('');
    };
    const t1 = window.setTimeout(wipeChromeAutofill, 50);
    const t2 = window.setTimeout(wipeChromeAutofill, 300);
    window.addEventListener('pointerdown', markTouched, { once: true, capture: true });
    window.addEventListener('keydown', markTouched, { once: true, capture: true });
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('pointerdown', markTouched, { capture: true });
      window.removeEventListener('keydown', markTouched, { capture: true });
    };
  }, [step, matchedEstate?.caseNumber]);

  const handleFindEstate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const result = await estateInventoryService.findPublicEstateByName(estateNameInput);
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not find that estate.');
      return;
    }
    setMatchedEstate(result.data);
    setPersonName('');
    setAccessCode('');
    setShowCode(false);
    setStep('code');
  };

  const handleAccessCode = async (e) => {
    e.preventDefault();
    if (!matchedEstate?.caseNumber) return;
    setBusy(true);
    setError('');
    estateInventoryService.setActiveEstateCase(matchedEstate.caseNumber);
    const result = await estateInventoryService.loginWithEstateAccessCode({
      caseNumber: matchedEstate.caseNumber,
      code: accessCode,
      displayName: personName
    });
    setBusy(false);
    if (!result.success) {
      setError(
        mapEstatePortalClosedError(result.error, result.data?.role || 'family') ||
          result.error ||
          'Could not sign in.'
      );
      return;
    }
    rememberCase(matchedEstate.caseNumber);
    const role = result.data?.role || 'family';
    navigate(estateitCasePath(matchedEstate.caseNumber, role));
  };

  const handleBackToName = () => {
    setStep('name');
    setMatchedEstate(null);
    setPersonName('');
    setAccessCode('');
    setError('');
  };

  return (
    <EstateLegalDisclaimerGate>
    <div className="estate-inventory ei-landing ei-case-entry ei-family-signin">
      <header className="ei-landing-hero">
        <p className="ei-eyebrow">Family · heirs · helpers · advisors</p>
        <EstateBrandTitle />
        <p className="ei-lede">
          {step === 'name'
            ? 'Enter the estate name, then your name and access code.'
            : 'Heirs: enter your PIN. Helpers: enter your name and PIN. Advisors: invite PIN (first time) or your personal password.'}
        </p>
        <p className="ei-settings-hint ei-family-access-hint">
          Your role determines what you can see and do — residual beneficiary, specific-gift
          recipient, helper, or read-only advisor.
        </p>
        <p className="ei-settings-hint ei-family-access-hint">
          Lost your invite code, or unsure which role you have? Ask the Personal Representative —
          they can help you get back in or confirm your role.
        </p>
      </header>

      {step === 'name' ? (
        <form
          className="ei-portal-card ei-case-entry-card"
          onSubmit={handleFindEstate}
          autoComplete="off"
        >
          <EstateAutofillTrap />
          <div className="ei-field">
            <label htmlFor="ei-estate-name-entry">Estate name</label>
            <EstateAuthTextInput
              id="ei-estate-name-entry"
              name="estate_vault_estate_name"
              value={estateNameInput}
              onChange={(e) => {
                setEstateNameInput(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter Estate Name"
              autoFocus
              required
              minLength={2}
            />
            <p className="ei-settings-hint" style={{ marginTop: '0.35rem' }}>
              Next you will enter your personal access code for this estate.
            </p>
          </div>
          {error ? <div className="ei-error">{error}</div> : null}
          <button type="submit" className="ei-btn" disabled={busy || estateNameInput.trim().length < 2}>
            {busy ? 'Looking up…' : 'Continue'}
          </button>
        </form>
      ) : (
        <form
          className="ei-portal-card ei-case-entry-card"
          onSubmit={handleAccessCode}
          autoComplete="off"
        >
          <EstateAutofillTrap />
          <p className="ei-settings-hint" style={{ marginTop: 0 }}>
            Signing into <strong>{matchedEstate?.estateName}</strong>
          </p>
          <div className="ei-field">
            <label htmlFor="ei-person-name">Your name (required for helpers)</label>
            <EstateAuthTextInput
              id="ei-person-name"
              name="estate_vault_display_name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Helpers: exact name the PR set"
            />
          </div>
          <div className="ei-field">
            <label htmlFor="ei-entry-code">Access code / PIN</label>
            <div className="ei-password-row">
              <EstateAuthPinInput
                id="ei-entry-code"
                name="estate_vault_access_pin"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Your unique code for this estate"
                revealed={showCode}
                required
                autoFocus
              />
              <button
                type="button"
                className="ei-btn ei-btn-secondary ei-btn-small ei-see-password"
                onClick={() => setShowCode((v) => !v)}
              >
                {showCode ? 'Hide' : 'See'}
              </button>
            </div>
            <p className="ei-settings-hint" style={{ marginTop: '0.35rem' }}>
              Heirs: enter your PIN (name optional). Helpers: enter the name the Personal
              Representative set plus your PIN.
            </p>
          </div>
          {error ? <div className="ei-error">{error}</div> : null}
          <div className="ei-btn-row" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="ei-btn ei-btn-secondary" onClick={handleBackToName} disabled={busy}>
              Back
            </button>
            <button type="submit" className="ei-btn" disabled={busy || !accessCode.trim()}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      )}

      <p className="ei-settings-hint" style={{ marginTop: '1rem' }}>
        <Link to={ESTATEIT_PATH}>Back to home</Link>
        {' · '}
        <Link to={`${ESTATEIT_PATH}/owner`}>Personal Representative sign in</Link>
      </p>

      <EstateSystemDisclaimer generic />
    </div>
    </EstateLegalDisclaimerGate>
  );
};

export default EstateFamilySignIn;
