import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { estatePricingBlurbShort } from '@shared/utils/estateBilling.js';
import EstateBrandLogo from './EstateBrandLogo';

const STEPS = [
  { id: 'name', label: 'Name' },
  { id: 'case', label: 'Case' },
  { id: 'summary', label: 'Review' }
];

/**
 * Create a new estate for the signed-in Google PR — stepped first-run flow.
 */
const EstateCreateEstateModal = ({ open, onClose, onCreated }) => {
  const [step, setStep] = useState(0);
  const [estateName, setEstateName] = useState('');
  const [courtCase, setCourtCase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setEstateName('');
    setCourtCase('');
    setBusy(false);
    setError('');
    setCreated(null);
    setCopied(false);
  }, [open]);

  if (!open) return null;

  const nameOk = estateName.trim().length >= 2;
  const stepMeta = STEPS[step] || STEPS[0];

  const goNext = () => {
    setError('');
    if (step === 0 && !nameOk) {
      setError('Enter an estate name (at least 2 characters).');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleCreate = async () => {
    if (!nameOk) {
      setError('Enter an estate name (at least 2 characters).');
      setStep(0);
      return;
    }
    setBusy(true);
    setError('');
    const result = await estateInventoryService.createOwnedEstate({
      estateName: estateName.trim(),
      courtCaseNumber: courtCase.trim() || null
    });
    setBusy(false);
    if (!result.success) {
      setError(result.error || 'Could not create estate.');
      return;
    }
    setCreated(result.data);
  };

  const handleCopyPin = async () => {
    const pin = String(created?.admin_password || '');
    if (!pin) return;
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy — select the PIN and copy it manually.');
    }
  };

  const handleDone = () => {
    const data = created;
    setCreated(null);
    onCreated?.(data);
    onClose?.();
  };

  return (
    <div
      className="ei-modal-backdrop"
      role="presentation"
      onClick={created ? undefined : onClose}
    >
      <div
        className={`ei-modal ei-modal-settings ei-create-estate-modal${
          created ? ' is-created' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-create-estate-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        {!created ? (
          <button
            type="button"
            className="ei-modal-close ei-create-estate-close"
            onClick={onClose}
            aria-label="Close"
          />
        ) : null}
        <header className="ei-create-estate-hero">
          <div className="ei-create-estate-hero-row">
            <EstateBrandLogo variant="icon" className="ei-create-estate-logo" alt="" />
            <div className="ei-create-estate-hero-copy">
              <p className="ei-create-estate-eyebrow">
                {created ? 'You’re in' : 'Estate Vault'}
              </p>
              <h3 id="ei-create-estate-title" className="ei-create-estate-title">
                {created ? 'Your estate is open' : 'Start your estate'}
              </h3>
            </div>
          </div>
          {!created ? (
            <>
              <nav className="ei-create-estate-progress" aria-label="Create estate steps">
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`ei-create-estate-progress-step${
                      i === step ? ' is-current' : ''
                    }${i < step ? ' is-done' : ''}`}
                    onClick={() => {
                      if (i < step || (i === 1 && nameOk) || (i === 2 && nameOk)) {
                        setError('');
                        setStep(i);
                      }
                    }}
                    aria-current={i === step ? 'step' : undefined}
                  >
                    <span className="ei-create-estate-progress-num">{i + 1}</span>
                    <span className="ei-create-estate-progress-label">{s.label}</span>
                  </button>
                ))}
              </nav>
              <p className="ei-create-estate-lede">
                Step {step + 1} of {STEPS.length} — {stepMeta.label}
              </p>
            </>
          ) : (
            <p className="ei-create-estate-lede">
              Save the one-time admin PIN below before you continue — it unlocks the Personal
              Representative portal.
            </p>
          )}
        </header>

        {created ? (
          <div className="ei-modal-form">
            <div className="ei-modal-body ei-create-estate-body">
              <div className="ei-create-estate-ready">
                <p className="ei-create-estate-ready-name">{created.estate_name}</p>
                <p className="ei-create-estate-ready-case">
                  Case <strong>{created.case_number}</strong>
                  {!created.court_case_number ? (
                    <span className="ei-create-estate-temp-badge"> Temporary</span>
                  ) : null}
                </p>
                <p className="ei-create-estate-ready-hint">
                  {!created.court_case_number
                    ? 'This is a temporary Estate Vault case number with no court affiliation. Heirs and helpers use it to sign in. Add the real court case number later in Settings → Case settings.'
                    : 'Heirs, helpers, and advisors use this case number (with the estate name) to find and sign in. Share invites from Settings after you unlock admin.'}
                </p>
              </div>

              <div className="ei-create-estate-pin-card">
                <span className="ei-create-estate-pin-label">One-time admin PIN</span>
                <code className="ei-create-estate-pin-value" id="ei-new-estate-pin">
                  {created.admin_password || '—'}
                </code>
                <div className="ei-btn-row ei-create-estate-pin-actions">
                  <button
                    type="button"
                    className="ei-btn ei-btn-secondary"
                    onClick={handleCopyPin}
                  >
                    {copied ? 'Copied' : 'Copy PIN'}
                  </button>
                </div>
                <p className="ei-create-estate-pin-warn">
                 <strong>!IMPORTANT!</strong><br />
                  Shown once — write it down or copy it now. Use it to unlock admin on your first
                  device, then you’ll be required to replace it. It is not recoverable from the app
                  later.
                </p>
              </div>
              {error ? <div className="ei-error">{error}</div> : null}
            </div>
            <div className="ei-modal-foot ei-btn-row">
              <button type="button" className="ei-btn ei-create-estate-primary" onClick={handleDone}>
                I saved the PIN — continue
              </button>
            </div>
          </div>
        ) : (
          <div className="ei-modal-form">
            <div className="ei-modal-body ei-create-estate-body">
              {step === 0 ? (
                <>
                  <div className="ei-create-estate-guide" aria-label="What happens next">
                    <p className="ei-create-estate-guide-title">What happens next</p>
                    <ul>
                      <li>
                        Your signed-in email becomes the <strong>only</strong> primary Personal
                        Representative for this estate<br />
                         (you can administer more than one estate).
                      </li>
                      <li>
                        After create, save the <strong>one-time admin PIN</strong> — use it to unlock
                        admin, then choose your own PIN/Password.
                      </li>
                      <li>
                        Invite heirs, helpers, and advisors later from Settings. They join by invite
                        code — they never use your Google login.
                      </li>
                    </ul>
                  </div>
                  <div className="ei-field">
                    <label htmlFor="ei-new-estate-name">Estate name</label>
                    <input
                      id="ei-new-estate-name"
                      value={estateName}
                      onChange={(e) => setEstateName(e.target.value)}
                      placeholder="e.g. Estate of Jane Doe"
                      required
                      minLength={2}
                      autoFocus
                    />
                    <p className="ei-settings-hint">
                      How the estate appears to family. Names may match another estate — the case
                      number keeps them separate.
                    </p>
                  </div>
                </>
              ) : null}

              {step === 1 ? (
                <div className="ei-field">
                  <label htmlFor="ei-new-court-case">
                    Court case number <span className="ei-create-estate-optional">(optional)</span>
                  </label>
                  <input
                    id="ei-new-court-case"
                    value={courtCase}
                    onChange={(e) => setCourtCase(e.target.value)}
                    placeholder="e.g. 25PR09999"
                    autoFocus
                  />
                  <p className="ei-settings-hint">
                    If you have the official court case number, enter it here. That becomes your Estate Vault ID. 
                    Users use this ID to find and sign in to this estate. It must be unique.
                  </p>
                  <p className="ei-settings-hint">
                    Leave blank and Estate Vault will assign a <strong>temporary case number</strong>{' '}
                    when you create the estate (on the next step). That temp number has{' '}
                    <strong>no affiliation to any court case</strong> — it is only an Estate Vault
                    ID. You can add the real court number later in Settings → Case settings.
                  </p>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="ei-create-estate-summary">
                  <p className="ei-create-estate-guide-title">Review before create</p>
                  <dl className="ei-create-estate-summary-dl">
                    <div>
                      <dt>Estate name</dt>
                      <dd>{estateName.trim() || '—'}</dd>
                    </div>
                    <div>
                      <dt>Case number</dt>
                      <dd>
                        {courtCase.trim() ? (
                          courtCase.trim()
                        ) : (
                          <>
                            Temporary number assigned on create
                            <span className="ei-create-estate-summary-note">
                              No court affiliation — Estate Vault login ID only. You can replace it
                              with the real court case number later.
                            </span>
                          </>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Personal Representative</dt>
                      <dd>Your signed-in email (sole primary)</dd>
                    </div>
                  </dl>
                  <p className="ei-create-estate-billing">
                    <strong>Billing:</strong> {estatePricingBlurbShort()}
                  </p>
                  <p className="ei-settings-hint" style={{ margin: 0 }}>
                    {courtCase.trim()
                      ? 'Next screen shows your one-time admin PIN once — save it before leaving.'
                      : 'When you create, the app assigns the temporary case number immediately, then shows your one-time admin PIN once — save both before leaving.'}
                  </p>
                </div>
              ) : null}

              {error ? <div className="ei-error">{error}</div> : null}
            </div>
            <div className="ei-modal-foot ei-btn-row">
              {step === 0 ? (
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary"
                  onClick={onClose}
                  disabled={busy}
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  className="ei-btn ei-btn-secondary"
                  onClick={goBack}
                  disabled={busy}
                >
                  Back
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  className="ei-btn ei-create-estate-primary"
                  onClick={goNext}
                  disabled={step === 0 && !nameOk}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  className="ei-btn ei-create-estate-primary"
                  onClick={handleCreate}
                  disabled={busy || !nameOk}
                >
                  {busy ? 'Opening estate…' : 'Create estate'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstateCreateEstateModal;
