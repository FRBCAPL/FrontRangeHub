import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  PROBATE_DURATION_UNIT_OPTIONS,
  PROBATE_WINDOW_DAYS,
  PROBATE_WINDOW_MODE,
  addProbateDuration,
  estateDisplayName,
  formatEstateLocalDate,
  normalizeEstateCaseNumber,
  normalizeProbateDurationUnit,
  normalizeProbateWindowAmount,
  normalizeProbateWindowMode
} from '@shared/utils/estateInventoryConstants.js';
import { EstateSettingsShell } from './EstateSettingsShell';
import GlossaryTerm from './GlossaryTerm';

const EstateSettingsCaseModal = ({ open, onClose, initialSettings, onSaved }) => {
  const [estateName, setEstateName] = useState('');
  const [courtCaseNumber, setCourtCaseNumber] = useState('');
  const [lettersIssuedAt, setLettersIssuedAt] = useState('');
  const [windowMode, setWindowMode] = useState(PROBATE_WINDOW_MODE.duration);
  const [durationAmount, setDurationAmount] = useState(String(PROBATE_WINDOW_DAYS));
  const [durationUnit, setDurationUnit] = useState('days');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const portalKey = initialSettings?.case_number || '';

  useEffect(() => {
    if (!open) return;
    setEstateName(
      estateDisplayName(initialSettings, initialSettings?.case_number || '')
    );
    setCourtCaseNumber(
      normalizeEstateCaseNumber(
        initialSettings?.court_case_number ||
          (String(initialSettings?.case_number || '').toUpperCase().startsWith('TEST')
            ? ''
            : initialSettings?.case_number)
      ) || ''
    );
    setLettersIssuedAt(initialSettings?.letters_issued_at || '');
    setWindowMode(normalizeProbateWindowMode(initialSettings?.probate_window_mode));
    setDurationAmount(
      String(normalizeProbateWindowAmount(initialSettings?.probate_window_amount))
    );
    setDurationUnit(normalizeProbateDurationUnit(initialSettings?.probate_window_unit));
    setEndDate(initialSettings?.probate_window_end_date || '');
    setSaving(false);
    setError('');
    setInfo('');
  }, [open, initialSettings]);

  const previewEnd =
    windowMode === PROBATE_WINDOW_MODE.date
      ? endDate || null
      : formatEstateLocalDate(
          addProbateDuration(lettersIssuedAt, durationAmount, durationUnit)
        );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = estateName.trim();
    if (name.length < 2) {
      setError('Enter an estate name (at least 2 characters).');
      return;
    }
    const mode = normalizeProbateWindowMode(windowMode);
    const amount = normalizeProbateWindowAmount(durationAmount);
    if (mode === PROBATE_WINDOW_MODE.duration) {
      if (!Number.isFinite(Number(durationAmount)) || Number(durationAmount) < 1) {
        setError('Enter a probate window length of at least 1.');
        return;
      }
    } else if (!endDate) {
      setError('Select a probate end date.');
      return;
    }

    setSaving(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.saveSettings({
      caseNumber: portalKey,
      estateName: name,
      courtCaseNumber: courtCaseNumber.trim(),
      lettersIssuedAt: lettersIssuedAt || null,
      probateWindowMode: mode,
      probateWindowAmount: amount,
      probateWindowUnit: normalizeProbateDurationUnit(durationUnit),
      probateWindowEndDate: mode === PROBATE_WINDOW_MODE.date ? endDate : null
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Could not save case settings.');
      return;
    }
    setInfo('Estate settings saved.');
    onSaved?.(result.data);
  };

  return (
    <EstateSettingsShell
      open={open}
      onClose={onClose}
      title="Estate & probate"
      titleId="ei-settings-case-title"
      foot={
        <>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={saving}>
            Back
          </button>
          <button type="submit" form="ei-settings-case-form" className="ei-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="ei-settings-case-form" className="ei-modal-form" onSubmit={handleSubmit}>
        <div className="ei-modal-body">
          <p className="ei-settings-hint">
            Name this Estate Vault account for the landing page. Names may match another estate — the
            case number keeps them separate. The probate window drives the countdown.
          </p>
          {initialSettings?.owner_email ? (
            <div className="ei-field">
              <label htmlFor="ei-owner-email">Primary executor (PR) email</label>
              <input
                id="ei-owner-email"
                value={initialSettings.owner_email}
                readOnly
                disabled
              />
              <p className="ei-settings-hint">
                One email per estate. Heirs and helpers use invites, not this address.
              </p>
            </div>
          ) : null}
          <div className="ei-field">
            <label htmlFor="ei-estate-name">Estate name</label>
            <input
              id="ei-estate-name"
              value={estateName}
              onChange={(e) => setEstateName(e.target.value)}
              placeholder="e.g. Estate of Jane Doe"
              autoComplete="off"
              required
              minLength={2}
              maxLength={120}
            />
            <p className="ei-settings-hint">
              Shown when heirs, helpers, and the public choose an estate. Duplicate names are allowed.
            </p>
          </div>
          <div className="ei-field">
            <label htmlFor="ei-court-case">Court case number (must be unique)</label>
            <input
              id="ei-court-case"
              value={courtCaseNumber}
              onChange={(e) => setCourtCaseNumber(e.target.value)}
              placeholder="e.g. 25PR09999"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <p className="ei-settings-hint">
              With the estate name, this identifies the case. No two estates may share the same case
              number.
            </p>
          </div>

          <div className="ei-field">
            <label htmlFor="ei-letters-date">
              <GlossaryTerm termKey="letters">Letters issued date</GlossaryTerm>
            </label>
            <input
              id="ei-letters-date"
              type="date"
              value={lettersIssuedAt || ''}
              onChange={(e) => setLettersIssuedAt(e.target.value)}
            />
          </div>

          <fieldset className="ei-fieldset ei-probate-window-fieldset">
            <legend>Probate countdown window</legend>
            <div className="ei-radio-row" role="radiogroup" aria-label="Probate window type">
              <label className="ei-radio-label">
                <input
                  type="radio"
                  name="ei-probate-mode"
                  checked={windowMode === PROBATE_WINDOW_MODE.duration}
                  onChange={() => setWindowMode(PROBATE_WINDOW_MODE.duration)}
                />
                Length from Letters date
              </label>
              <label className="ei-radio-label">
                <input
                  type="radio"
                  name="ei-probate-mode"
                  checked={windowMode === PROBATE_WINDOW_MODE.date}
                  onChange={() => setWindowMode(PROBATE_WINDOW_MODE.date)}
                />
                Fixed end date
              </label>
            </div>

            {windowMode === PROBATE_WINDOW_MODE.duration ? (
              <div className="ei-duration-row">
                <div className="ei-field">
                  <label htmlFor="ei-probate-amount">Length</label>
                  <input
                    id="ei-probate-amount"
                    type="number"
                    min={1}
                    max={3650}
                    step={1}
                    value={durationAmount}
                    onChange={(e) => setDurationAmount(e.target.value)}
                  />
                </div>
                <div className="ei-field">
                  <label htmlFor="ei-probate-unit">Unit</label>
                  <select
                    id="ei-probate-unit"
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                  >
                    {PROBATE_DURATION_UNIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="ei-field">
                <label htmlFor="ei-probate-end">End date</label>
                <input
                  id="ei-probate-end"
                  type="date"
                  value={endDate || ''}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}

            {previewEnd ? (
              <p className="ei-settings-hint ei-probate-preview">
                Countdown ends <strong>{previewEnd}</strong>
                {windowMode === PROBATE_WINDOW_MODE.duration && !lettersIssuedAt
                  ? ' (set Letters issued date to start the clock)'
                  : null}
              </p>
            ) : windowMode === PROBATE_WINDOW_MODE.duration && !lettersIssuedAt ? (
              <p className="ei-settings-hint ei-probate-preview">
                Set Letters issued date to calculate the end date.
              </p>
            ) : null}
          </fieldset>

          {error ? <div className="ei-error">{error}</div> : null}
          {info ? <p className="ei-status">{info}</p> : null}
        </div>
      </form>
    </EstateSettingsShell>
  );
};

export default EstateSettingsCaseModal;
