import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  ESTATE_CASE_STORAGE_KEY,
  ESTATEIT_PATH,
  estateitCasePath,
  isOpenEstateCase,
  normalizeEstateCaseNumber
} from '@shared/utils/estateInventoryConstants.js';
import EstateBrandTitle from './EstateBrandTitle';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
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
  const [accessCode, setAccessCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() =>
    unknownFromRedirect && !isOpenEstateCase(unknownFromRedirect)
      ? 'That estate is not open yet. Enter the estate name below, or ask the Personal Representative.'
      : ''
  );

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
    setAccessCode('');
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
      code: accessCode
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not sign in.');
      return;
    }
    rememberCase(matchedEstate.caseNumber);
    const role = result.data?.role || 'family';
    navigate(estateitCasePath(matchedEstate.caseNumber, role));
  };

  const handleBackToName = () => {
    setStep('name');
    setMatchedEstate(null);
    setAccessCode('');
    setError('');
  };

  return (
    <div className="estate-inventory ei-landing ei-case-entry ei-family-signin">
      <header className="ei-landing-hero">
        <p className="ei-eyebrow">Family · heirs · helpers</p>
        <EstateBrandTitle />
        <p className="ei-lede">
          {step === 'name'
            ? 'Enter the estate name, then your invite code or helper password.'
            : 'Enter the access code the Personal Representative gave you.'}
        </p>
      </header>

      {step === 'name' ? (
        <form className="ei-portal-card ei-case-entry-card" onSubmit={handleFindEstate}>
          <div className="ei-field">
            <label htmlFor="ei-estate-name-entry">Estate name</label>
            <input
              id="ei-estate-name-entry"
              value={estateNameInput}
              onChange={(e) => {
                setEstateNameInput(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter Estate Name"
              autoComplete="organization"
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
        <form className="ei-portal-card ei-case-entry-card" onSubmit={handleAccessCode}>
          <p className="ei-settings-hint" style={{ marginTop: 0 }}>
            Signing into <strong>{matchedEstate?.estateName}</strong>
          </p>
          <div className="ei-field">
            <label htmlFor="ei-entry-code">Access code</label>
            <div className="ei-password-row">
              <input
                id="ei-entry-code"
                type={showCode ? 'text' : 'password'}
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Your unique code for this estate"
                autoComplete="current-password"
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
              Heirs use their PIN. Helpers use the helper password. Personal Representatives sign in
              from the home page (Google or email).
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
  );
};

export default EstateFamilySignIn;
