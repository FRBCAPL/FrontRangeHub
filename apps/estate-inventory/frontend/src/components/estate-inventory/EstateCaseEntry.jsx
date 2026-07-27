import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  APP_NAME,
  ESTATE_CASE_STORAGE_KEY,
  estateitCasePath,
  isOpenEstateCase,
  normalizeEstateCaseNumber
} from '@shared/utils/estateInventoryConstants.js';
import EstateSystemDisclaimer from './EstateSystemDisclaimer';
import './EstateInventoryApp.css';

function readLastCase() {
  try {
    return normalizeEstateCaseNumber(sessionStorage.getItem(ESTATE_CASE_STORAGE_KEY) || '');
  } catch {
    return '';
  }
}

/**
 * SaaS gateway — enter a court case number to open that estate’s EstateIt shell.
 */
const EstateCaseEntry = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const unknownFromRedirect = location.state?.unknownCase
    ? normalizeEstateCaseNumber(location.state.unknownCase)
    : '';

  const [caseInput, setCaseInput] = useState(() => unknownFromRedirect || readLastCase());
  const [error, setError] = useState(() =>
    unknownFromRedirect && !isOpenEstateCase(unknownFromRedirect)
      ? 'Case not found or not open yet. Check the number and try again.'
      : ''
  );

  const hint = useMemo(
    () => 'Enter the probate case number provided by the Personal Representative.',
    []
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalized = normalizeEstateCaseNumber(caseInput);
    if (!normalized) {
      setError('Enter a case number to continue.');
      return;
    }
    if (!isOpenEstateCase(normalized)) {
      setError('Case not found or not open yet. Check the number and try again.');
      return;
    }
    try {
      sessionStorage.setItem(ESTATE_CASE_STORAGE_KEY, normalized);
    } catch {
      /* ignore */
    }
    setError('');
    navigate(estateitCasePath(normalized));
  };

  return (
    <div className="estate-inventory ei-landing ei-case-entry">
      <header className="ei-landing-hero">
        <p className="ei-eyebrow">Estate inventory · Fiduciary portal</p>
        <h1>{APP_NAME}</h1>
        <p className="ei-lede">
          Enter your court case number to open the estate portal.
          <br />
          Heirs, helpers, and the Personal Representative use the same case entry.
        </p>
      </header>

      <form className="ei-portal-card ei-case-entry-card" onSubmit={handleSubmit}>
        <div className="ei-field">
          <label htmlFor="ei-case-entry">Case number</label>
          <input
            id="ei-case-entry"
            value={caseInput}
            onChange={(e) => {
              setCaseInput(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. 26PR00440"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus
          />
          <p className="ei-settings-hint" style={{ marginTop: '0.35rem' }}>
            {hint}
          </p>
        </div>
        {error ? <div className="ei-error">{error}</div> : null}
        <button type="submit" className="ei-btn">
          Continue
        </button>
      </form>

      <EstateSystemDisclaimer generic />
    </div>
  );
};

export default EstateCaseEntry;
