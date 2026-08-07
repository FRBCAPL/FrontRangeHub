import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { getPrProfile } from '@shared/services/estatePrIdentityService.js';
import {
  PROBATE_DURATION_UNIT_OPTIONS,
  PROBATE_WINDOW_DAYS,
  PROBATE_WINDOW_MODE,
  FAMILY_FINANCIAL_VISIBILITY_OPTIONS,
  addProbateDuration,
  estateDisplayName,
  formatEstateLocalDate,
  normalizeEstateCaseNumber,
  normalizeFamilyFinancialVisibility,
  normalizeHeirAccessTier,
  normalizeProbateDurationUnit,
  normalizeProbateWindowAmount,
  normalizeProbateWindowMode,
  heirAdminLabel,
  isMemorandumOnlyHeir,
  ESTATEIT_PATH
} from '@shared/utils/estateInventoryConstants.js';
import {
  normalizeVisibilitySections,
  visibilitySectionsForPreset
} from '@shared/utils/estateVisibilitySections.js';
import { EstateSettingsShell } from './EstateSettingsShell';
import GlossaryTerm from './GlossaryTerm';
import HeirVisibilitySectionsEditor from './HeirVisibilitySectionsEditor';

const CASE_STEPS = [
  { id: 'estate', label: 'Estate' },
  { id: 'clock', label: 'Clock' },
  { id: 'family', label: 'Family' },
  { id: 'will', label: 'Will notes' }
];

const EstateSettingsCaseModal = ({ open, onClose, initialSettings, onSaved }) => {
  const [step, setStep] = useState(0);
  const [estateName, setEstateName] = useState('');
  const [courtCaseNumber, setCourtCaseNumber] = useState('');
  const [lettersIssuedAt, setLettersIssuedAt] = useState('');
  const [windowMode, setWindowMode] = useState(PROBATE_WINDOW_MODE.duration);
  const [durationAmount, setDurationAmount] = useState(String(PROBATE_WINDOW_DAYS));
  const [durationUnit, setDurationUnit] = useState('days');
  const [endDate, setEndDate] = useState('');
  const [familyVisibility, setFamilyVisibility] = useState('minimal');
  const [willReference, setWillReference] = useState('');
  const [memorandumReference, setMemorandumReference] = useState('');
  const [residualNotes, setResidualNotes] = useState('');
  const [equalizationNotes, setEqualizationNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [prLegalName, setPrLegalName] = useState('');
  const [heirAccounts, setHeirAccounts] = useState([]);
  const [heirVisSavingKey, setHeirVisSavingKey] = useState('');

  const portalKey = initialSettings?.case_number || '';
  const ownerEmail = initialSettings?.owner_email || '';
  const isFirst = step === 0;
  const isLast = step === CASE_STEPS.length - 1;

  const refreshHeirs = async () => {
    if (!portalKey) {
      setHeirAccounts([]);
      return;
    }
    const result = await estateInventoryService.listSiblingAccounts(portalKey);
    if (result.success) setHeirAccounts(result.data || []);
  };

  useEffect(() => {
    if (!open) return;
    setStep(0);
    getPrProfile().then((result) => {
      if (result.success && result.data?.legal_name) {
        setPrLegalName(result.data.legal_name);
      } else {
        setPrLegalName('');
      }
    });
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
    setFamilyVisibility(
      normalizeFamilyFinancialVisibility(initialSettings?.family_financial_visibility)
    );
    setWillReference(initialSettings?.will_reference || '');
    setMemorandumReference(initialSettings?.memorandum_reference || '');
    setResidualNotes(initialSettings?.residual_notes || '');
    setEqualizationNotes(initialSettings?.equalization_notes || '');
    setSaving(false);
    setError('');
    setInfo('');
    setHeirVisSavingKey('');
    refreshHeirs();
  }, [open, initialSettings]);

  useEffect(() => {
    if (open && step === 2) refreshHeirs();
  }, [open, step, portalKey]);

  const previewEnd =
    windowMode === PROBATE_WINDOW_MODE.date
      ? endDate || null
      : formatEstateLocalDate(
          addProbateDuration(lettersIssuedAt, durationAmount, durationUnit)
        );

  const validateForSave = () => {
    const name = estateName.trim();
    if (name.length < 2) {
      setStep(0);
      setError('Enter an estate name (at least 2 characters).');
      return null;
    }
    const mode = normalizeProbateWindowMode(windowMode);
    const amount = normalizeProbateWindowAmount(durationAmount);
    if (mode === PROBATE_WINDOW_MODE.duration) {
      if (!Number.isFinite(Number(durationAmount)) || Number(durationAmount) < 1) {
        setStep(1);
        setError('Enter a probate window length of at least 1.');
        return null;
      }
    } else if (!endDate) {
      setStep(1);
      setError('Select a probate end date.');
      return null;
    }
    return { name, mode, amount };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const checked = validateForSave();
    if (!checked) return;

    setSaving(true);
    setError('');
    setInfo('');
    const result = await estateInventoryService.saveSettings({
      caseNumber: portalKey,
      estateName: checked.name,
      courtCaseNumber: courtCaseNumber.trim(),
      lettersIssuedAt: lettersIssuedAt || null,
      probateWindowMode: checked.mode,
      probateWindowAmount: checked.amount,
      probateWindowUnit: normalizeProbateDurationUnit(durationUnit),
      probateWindowEndDate: checked.mode === PROBATE_WINDOW_MODE.date ? endDate : null,
      familyFinancialVisibility: normalizeFamilyFinancialVisibility(familyVisibility),
      willReference,
      memorandumReference,
      residualNotes,
      equalizationNotes
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'Could not save case settings.');
      return;
    }
    setInfo('Estate settings saved.');
    onSaved?.(result.data);
  };

  const goNext = () => {
    setError('');
    setInfo('');
    if (step === 0 && estateName.trim().length < 2) {
      setError('Enter an estate name (at least 2 characters).');
      return;
    }
    setStep((s) => Math.min(s + 1, CASE_STEPS.length - 1));
  };

  const goPrev = () => {
    setError('');
    setInfo('');
    setStep((s) => Math.max(s - 1, 0));
  };

  const applyHeirVisibilityResult = (siblingKey, result, fallbackVis) => {
    const saved = normalizeFamilyFinancialVisibility(
      result.data?.financial_visibility || fallbackVis
    );
    const sections = normalizeVisibilitySections(result.data?.visibility_sections, {
      tier: saved,
      accessTier: result.data?.access_tier
    });
    setHeirAccounts((prev) =>
      prev.map((h) =>
        h.sibling_key === siblingKey
          ? {
              ...h,
              financial_visibility: saved,
              visibility_sections: sections,
              can_browse_rooms:
                result.data?.can_browse_rooms != null
                  ? Boolean(result.data.can_browse_rooms)
                  : Boolean(sections.rooms_inventory)
            }
          : h
      )
    );
  };

  const handleHeirVisibilityChange = async (siblingKey, label, nextVisibility, memoOnly) => {
    if (memoOnly) return;
    setError('');
    setInfo('');
    setHeirVisSavingKey(siblingKey);
    const result = await estateInventoryService.setHeirFinancialVisibility(
      siblingKey,
      nextVisibility,
      portalKey
    );
    setHeirVisSavingKey('');
    if (!result.success) {
      setError(result.error || `Could not update disclosure for ${label}.`);
      await refreshHeirs();
      return;
    }
    applyHeirVisibilityResult(siblingKey, result, nextVisibility);
    setInfo(`Updated disclosure preset for ${label}.`);
  };

  const handleHeirSectionsChange = async (siblingKey, label, nextSections, financialVisibility, accessTier) => {
    setError('');
    setInfo('');
    setHeirVisSavingKey(siblingKey);
    const result = await estateInventoryService.setHeirVisibilitySections(
      siblingKey,
      nextSections,
      portalKey,
      financialVisibility
    );
    setHeirVisSavingKey('');
    if (!result.success) {
      setError(result.error || `Could not update sections for ${label}.`);
      await refreshHeirs();
      return;
    }
    applyHeirVisibilityResult(siblingKey, result, financialVisibility);
    setInfo(`Updated sections for ${label}.`);
  };

  const defaultVisibilityHint = FAMILY_FINANCIAL_VISIBILITY_OPTIONS.find(
    (o) => o.value === familyVisibility
  )?.hint;

  return (
    <EstateSettingsShell
      open={open}
      onClose={onClose}
      title="Case settings"
      titleId="ei-settings-case-title"
      foot={
        <>
          <button type="button" className="ei-btn ei-btn-secondary" onClick={onClose} disabled={saving}>
            Close
          </button>
          {!isFirst ? (
            <button type="button" className="ei-btn ei-btn-secondary" onClick={goPrev} disabled={saving}>
              Previous
            </button>
          ) : null}
          {!isLast ? (
            <button type="button" className="ei-btn ei-btn-secondary" onClick={goNext} disabled={saving}>
              Next
            </button>
          ) : null}
          <button type="submit" form="ei-settings-case-form" className="ei-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="ei-settings-case-form" className="ei-modal-form" onSubmit={handleSubmit}>
        <div className="ei-modal-body ei-case-step-body">
          <nav className="ei-case-steps" aria-label="Case settings steps">
            {CASE_STEPS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`ei-case-step${index === step ? ' is-active' : ''}${
                  index < step ? ' is-done' : ''
                }`}
                onClick={() => {
                  setError('');
                  setInfo('');
                  setStep(index);
                }}
                aria-current={index === step ? 'step' : undefined}
              >
                <span className="ei-case-step-num">{index + 1}</span>
                <span className="ei-case-step-label">{item.label}</span>
              </button>
            ))}
          </nav>

          {step === 0 ? (
            <section className="ei-case-panel" aria-labelledby="ei-case-estate-heading">
              <h4 id="ei-case-estate-heading" className="ei-case-section-title">
                This estate
              </h4>
              <p className="ei-settings-hint ei-case-section-hint">
                Name the estate. Case number must be unique.
              </p>

              {ownerEmail || prLegalName ? (
                <div className="ei-case-identity">
                  <div className="ei-case-identity-rows">
                    {ownerEmail ? (
                      <div className="ei-case-identity-row">
                        <span className="ei-case-identity-label">PR email</span>
                        <span className="ei-case-identity-value">{ownerEmail}</span>
                      </div>
                    ) : null}
                    {prLegalName ? (
                      <div className="ei-case-identity-row">
                        <span className="ei-case-identity-label">Legal name</span>
                        <span className="ei-case-identity-value">{prLegalName}</span>
                      </div>
                    ) : null}
                  </div>
                  <p className="ei-case-identity-meta">
                    Read-only here.{' '}
                    <Link to={`${ESTATEIT_PATH}/owner`}>Change on My Estates</Link>
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
                  minLength={2}
                  maxLength={120}
                />
              </div>
              <div className="ei-field">
                <label htmlFor="ei-court-case">Court case number</label>
                <input
                  id="ei-court-case"
                  value={courtCaseNumber}
                  onChange={(e) => setCourtCaseNumber(e.target.value)}
                  placeholder="e.g. 25PR09999"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="ei-case-panel" aria-labelledby="ei-case-clock-heading">
              <h4 id="ei-case-clock-heading" className="ei-case-section-title">
                Probate clock
              </h4>
              <p className="ei-settings-hint ei-case-section-hint">
                Letters date and countdown window for this estate.
              </p>
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

              <div className="ei-case-mode-row" role="radiogroup" aria-label="Probate window type">
                <label
                  className={`ei-case-mode-choice${
                    windowMode === PROBATE_WINDOW_MODE.duration ? ' is-selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="ei-probate-mode"
                    checked={windowMode === PROBATE_WINDOW_MODE.duration}
                    onChange={() => setWindowMode(PROBATE_WINDOW_MODE.duration)}
                  />
                  <span>Length from Letters</span>
                </label>
                <label
                  className={`ei-case-mode-choice${
                    windowMode === PROBATE_WINDOW_MODE.date ? ' is-selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="ei-probate-mode"
                    checked={windowMode === PROBATE_WINDOW_MODE.date}
                    onChange={() => setWindowMode(PROBATE_WINDOW_MODE.date)}
                  />
                  <span>Fixed end date</span>
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
                    ? ' (set Letters date to start the clock)'
                    : null}
                </p>
              ) : windowMode === PROBATE_WINDOW_MODE.duration && !lettersIssuedAt ? (
                <p className="ei-settings-hint ei-probate-preview">
                  Set Letters issued date to calculate the end date.
                </p>
              ) : null}
            </section>
          ) : null}

          {step === 2 ? (
            <section className="ei-case-panel" aria-labelledby="ei-case-family-heading">
              <h4 id="ei-case-family-heading" className="ei-case-section-title">
                Who can see finances
              </h4>
              <p className="ei-settings-hint ei-case-section-hint">
                Choose a{' '}
                <GlossaryTerm termKey="family_financial_visibility">preset</GlossaryTerm>, then
                turn individual sections on or off for each person. Specific Gift Recipients stay
                on Minimal finance.
              </p>

              <div className="ei-field">
                <label htmlFor="ei-family-visibility-default">Default for new people</label>
                <select
                  id="ei-family-visibility-default"
                  value={familyVisibility}
                  onChange={(e) =>
                    setFamilyVisibility(normalizeFamilyFinancialVisibility(e.target.value))
                  }
                >
                  {FAMILY_FINANCIAL_VISIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {defaultVisibilityHint ? (
                  <p className="ei-field-hint">{defaultVisibilityHint}</p>
                ) : null}
                <p className="ei-settings-hint ei-case-section-hint">
                  Saved with Case settings Save. New people start at this level.
                </p>
              </div>

              <h5 className="ei-case-people-heading">People</h5>
              {heirAccounts.length === 0 ? (
                <p className="ei-settings-hint">
                  No people yet. Add them in Settings → People / Heirs, then set each person here.
                </p>
              ) : (
                <ul className="ei-case-heir-vis-list" aria-label="Per-person financial disclosure">
                  {heirAccounts.map((h) => {
                    const label = heirAdminLabel(h);
                    const tier = normalizeHeirAccessTier(h.access_tier);
                    const memoOnly = isMemorandumOnlyHeir(tier);
                    const vis = memoOnly
                      ? 'minimal'
                      : normalizeFamilyFinancialVisibility(h.financial_visibility);
                    const sections =
                      h.visibility_sections ||
                      visibilitySectionsForPreset(vis, tier);
                    return (
                      <li key={h.sibling_key} className="ei-case-heir-vis-row ei-case-heir-vis-row--stack">
                        <div className="ei-case-heir-vis-top">
                          <div className="ei-case-heir-vis-meta">
                            <span className="ei-case-heir-vis-name">{label}</span>
                            {memoOnly ? (
                              <span className="ei-settings-hint">
                                Specific Gift — Minimal finance
                              </span>
                            ) : null}
                          </div>
                          <label
                            className="ei-case-heir-vis-label"
                            htmlFor={`ei-vis-${h.sibling_key}`}
                          >
                            <span className="ei-sr-only">Disclosure preset for {label}</span>
                            <select
                              id={`ei-vis-${h.sibling_key}`}
                              value={vis}
                              disabled={memoOnly || heirVisSavingKey === h.sibling_key}
                              onChange={(e) =>
                                handleHeirVisibilityChange(
                                  h.sibling_key,
                                  label,
                                  e.target.value,
                                  memoOnly
                                )
                              }
                            >
                              {FAMILY_FINANCIAL_VISIBILITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <HeirVisibilitySectionsEditor
                          siblingKey={h.sibling_key}
                          sections={sections}
                          accessTier={tier}
                          financialVisibility={vis}
                          memoOnly={memoOnly}
                          disabled={heirVisSavingKey === h.sibling_key}
                          onChange={(next) =>
                            handleHeirSectionsChange(
                              h.sibling_key,
                              label,
                              next,
                              vis,
                              tier
                            )
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}

          {step === 3 ? (
            <section className="ei-case-panel" aria-labelledby="ei-case-will-heading">
              <h4 id="ei-case-will-heading" className="ei-case-section-title">
                Will notes
              </h4>
              <p className="ei-settings-hint ei-case-section-hint">
                Optional citations for schedules — not a filing and not legal advice.
              </p>
              <div className="ei-field">
                <label htmlFor="ei-will-ref">Will / Letters reference</label>
                <input
                  id="ei-will-ref"
                  value={willReference}
                  onChange={(e) => setWillReference(e.target.value)}
                  placeholder="e.g. Last Will dated 2019-03-12, Art. IV"
                  maxLength={240}
                />
              </div>
              <div className="ei-field">
                <label htmlFor="ei-memo-ref">Memorandum reference</label>
                <input
                  id="ei-memo-ref"
                  value={memorandumReference}
                  onChange={(e) => setMemorandumReference(e.target.value)}
                  placeholder="e.g. Personal property memorandum dated …"
                  maxLength={240}
                />
              </div>
              <div className="ei-field">
                <label htmlFor="ei-residual-notes">Residual / share notes</label>
                <textarea
                  id="ei-residual-notes"
                  rows={2}
                  value={residualNotes}
                  onChange={(e) => setResidualNotes(e.target.value)}
                  placeholder="e.g. Residue equally to three children after specific gifts"
                  maxLength={500}
                />
              </div>
              <div className="ei-field">
                <label htmlFor="ei-equalization-notes">Equalization notes</label>
                <textarea
                  id="ei-equalization-notes"
                  rows={2}
                  value={equalizationNotes}
                  onChange={(e) => setEqualizationNotes(e.target.value)}
                  placeholder="Advances, loans, or equalization adjustments counsel should know"
                  maxLength={500}
                />
              </div>
            </section>
          ) : null}

          {error ? <div className="ei-error">{error}</div> : null}
          {info ? <p className="ei-status">{info}</p> : null}
        </div>
      </form>
    </EstateSettingsShell>
  );
};

export default EstateSettingsCaseModal;
