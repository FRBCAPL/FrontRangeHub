import React, { useEffect, useState } from 'react';
import { USAPL_DEFAULT_FARGO_CAP, slugUsaplDivisionId } from '../../data/usaplDivisions.js';
import { composeUsaplFormat, parseUsaplFormat } from '../../data/usaplFormat.js';
import {
  joinUsaplFargoIds,
  parseUsaplFargoIds,
  USAPL_REPORT_BLURB,
  USAPL_REPORT_HEADING,
} from '../../data/usaplPublicReports.js';
import UsaplDivisionEditNight from './UsaplDivisionEditNight.jsx';
import UsaplDivisionEditPlay from './UsaplDivisionEditPlay.jsx';
import UsaplDivisionEditReport from './UsaplDivisionEditReport.jsx';
import UsaplDivisionEditSchedule from './UsaplDivisionEditSchedule.jsx';

const STEPS = ['Night', 'Play', 'Report'];

function withPrefill(draft) {
  const ids = parseUsaplFargoIds(draft?.fargoDivisionId);
  const next = { ...draft, ...parseUsaplFormat(draft?.format) };
  next.fargoReportA = draft?.fargoReportA || ids[0] || '';
  next.fargoReportB = draft?.fargoReportB || ids[1] || '';
  if (next.combinedFargoCap === '' || next.combinedFargoCap == null) {
    next.combinedFargoCap = USAPL_DEFAULT_FARGO_CAP;
  }
  if (!String(next.reportHeading || '').trim()) next.reportHeading = USAPL_REPORT_HEADING;
  if (!String(next.reportBlurb || '').trim()) next.reportBlurb = USAPL_REPORT_BLURB;
  return next;
}

function stepError(step, form) {
  if (step === 0) {
    if (!String(form.name || '').trim() || !String(form.shortName || '').trim()) {
      return 'Name and short name are required.';
    }
    if (!String(form.locationNote || '').trim()) {
      return 'Location is required so this night lists like the others.';
    }
  }
  return '';
}

export default function UsaplDivisionEditModal({ draft, isNew, locationOptions = [], onClose, onSave }) {
  const [form, setForm] = useState(() => withPrefill(draft));
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(withPrefill(draft));
    setStep(0);
    setError('');
  }, [draft]);

  const setField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (isNew && (key === 'shortName' || key === 'name') && !prev.idLocked) {
        next.id = slugUsaplDivisionId(key === 'shortName' ? value : next.shortName || value);
      }
      if (isNew && key === 'shortName' && !String(prev.locationNote || '').trim()) {
        next.locationNote = value;
      }
      return next;
    });
  };

  const goNext = () => {
    const message = stepError(step, form);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      goNext();
      return;
    }
    setError('');
    const id = slugUsaplDivisionId(form.id || form.shortName || form.name);
    const locationNote = String(form.locationNote || '').trim() || String(form.shortName || '').trim();
    const message = stepError(0, { ...form, locationNote });
    if (message) {
      setError(message);
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        id,
        locationNote,
        format: composeUsaplFormat(form),
        fargoDivisionId: joinUsaplFargoIds([form.fargoReportA, form.fargoReportB]),
        duesPerPlayer: form.duesPerPlayer === '' || form.duesPerPlayer == null ? 10 : form.duesPerPlayer,
        combinedFargoCap: form.combinedFargoCap === '' || form.combinedFargoCap == null ? USAPL_DEFAULT_FARGO_CAP : form.combinedFargoCap,
        teamSize: form.teamSize === '' || form.teamSize == null ? 5 : form.teamSize,
        rosterMax: form.rosterMax === '' || form.rosterMax == null ? 8 : form.rosterMax,
        notes: String(form.notesText ?? (form.notes || []).join('\n'))
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      });
    } catch (err) {
      setError(err?.message || 'Could not save division.');
      setSaving(false);
    }
  };

  const notesText = form.notesText ?? (form.notes || []).join('\n');
  const lastStep = step === STEPS.length - 1;

  return (
    <div className="usapl-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="usapl-modal"
        role="dialog"
        aria-labelledby="usapl-division-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="usapl-division-edit-title">{isNew ? 'Add division' : 'Edit division'}</h2>
        <ol className="usapl-stepper">
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={`usapl-step${index === step ? ' is-active' : ''}${index < step ? ' is-done' : ''}`}
            >
              <button type="button" onClick={() => { setError(''); setStep(index); }}>
                {index + 1}. {label}
              </button>
            </li>
          ))}
        </ol>
        <form className="usapl-form" onSubmit={handleSubmit}>
          {step === 0 ? (
            <UsaplDivisionEditNight form={form} setField={setField} locationOptions={locationOptions} />
          ) : null}
          {step === 1 ? (
            <UsaplDivisionEditPlay form={form} setField={setField} setForm={setForm} notesText={notesText} />
          ) : null}
          {step === 2 ? (
            <>
              <UsaplDivisionEditReport form={form} setField={setField} />
              <UsaplDivisionEditSchedule form={form} setField={setField} />
            </>
          ) : null}
          {error ? <div className="usapl-error">{error}</div> : null}
          <div className="usapl-actions">
            {step > 0 ? (
              <button className="usapl-btn-secondary" type="button" onClick={() => { setError(''); setStep((current) => current - 1); }}>
                Back
              </button>
            ) : (
              <button className="usapl-btn-secondary" type="button" onClick={onClose}>Cancel</button>
            )}
            {lastStep ? (
              <button className="usapl-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save division'}</button>
            ) : (
              <button className="usapl-btn" type="submit">Next</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
