import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SELL_STEPS, sellStepError } from '../../utils/consignmentSellSteps.js';
import { StepContact, StepItem, StepMethod, StepPrice } from './ConsignmentSellSteps.jsx';
import { StepAgree, StepDetails, StepReview } from './ConsignmentSellReviewSteps.jsx';

/**
 * Guided sell-an-item modal. Form state lives in the parent, so closing and reopening keeps progress.
 * props: form, set, setMethod, files, setFiles, policy, days, agreementText, busy, submitError, onSubmit, onClose,
 * onCancel (clears the listing so it isn't offered again)
 */
export default function ConsignmentSellWizard(props) {
  const { form, busy, submitError, onSubmit, onClose, onCancel } = props;
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const bodyRef = useRef(null);
  const step = SELL_STEPS[index];
  const last = index === SELL_STEPS.length - 1;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  useEffect(() => {
    bodyRef.current?.scrollTo?.(0, 0);
  }, [index]);

  useEffect(() => {
    setError('');
  }, [form]);

  const goTo = (id) => {
    setError('');
    setIndex(Math.max(0, SELL_STEPS.findIndex((s) => s.id === id)));
  };

  const next = (e) => {
    e.preventDefault();
    const problem = sellStepError(step.id, form);
    if (problem) { setError(problem); return; }
    setError('');
    if (last) onSubmit();
    else setIndex((i) => i + 1);
  };

  const back = () => {
    setError('');
    setIndex((i) => Math.max(0, i - 1));
  };

  const shared = { ...props, goTo };
  const shownError = error || (last ? submitError : '');

  return createPortal(
    <div className="cs-portal">
      <div className="cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-wiz-title" onClick={busy ? undefined : onClose}>
        <form className="cs-modal-card cs-wiz" onClick={(e) => e.stopPropagation()} onSubmit={next} noValidate>
          <div className="cs-how-head">
            <div>
              <p className="cs-wiz-count">Step {index + 1} of {SELL_STEPS.length}</p>
              <h2 id="cs-wiz-title">{step.title}</h2>
            </div>
            <button type="button" className="cs-how-close" onClick={onClose} disabled={busy} aria-label="Close">×</button>
          </div>

          <ol className="cs-wiz-progress" aria-label="Progress">
            {SELL_STEPS.map((s, i) => (
              <li key={s.id} className={i < index ? 'done' : i === index ? 'current' : ''}>
                <button type="button" onClick={() => i < index && goTo(s.id)} disabled={i >= index || busy} aria-label={s.title}>
                  <span />
                </button>
              </li>
            ))}
          </ol>

          <div className="cs-wiz-body" ref={bodyRef}>
            {step.id === 'method' ? <StepMethod {...shared} /> : null}
            {step.id === 'contact' ? <StepContact {...shared} /> : null}
            {step.id === 'item' ? <StepItem {...shared} /> : null}
            {step.id === 'details' ? <StepDetails {...shared} /> : null}
            {step.id === 'price' ? <StepPrice {...shared} /> : null}
            {step.id === 'review' ? <StepReview {...shared} /> : null}
            {step.id === 'agree' ? <StepAgree {...shared} /> : null}
          </div>

          {shownError ? <p className="cs-error" role="alert">{shownError}</p> : null}

          <div className="cs-wiz-nav">
            {index > 0 ? (
              <button type="button" className="cs-btn cs-btn-secondary" onClick={back} disabled={busy}>Back</button>
            ) : <span />}
            <div className="cs-wiz-nav-end">
              {onCancel ? (
                <button type="button" className="cs-wiz-cancel" onClick={onCancel} disabled={busy}>Cancel listing</button>
              ) : null}
              <button type="submit" className="cs-btn" disabled={busy}>
                {last ? (busy ? 'Submitting…' : 'Submit for review') : 'Next'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
