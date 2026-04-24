import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const STEPS = [
  {
    title: 'Start here',
    body:
      'The “Your Next Step” card shows what to do first. The purple button is your main action — for example Find Opponent opens a choice between browsing the ladder and Smart Match. The other buttons cover reporting a result and your match history or the standings.'
  },
  {
    title: 'After you win',
    body:
      "Use Report Result to enter the score and finish the winner's reporting step. You can open it from this card anytime, or from the menu."
  },
  {
    title: 'Rules & payments',
    body:
      'Default match rules are CSI — open Ladder Rules in the menu for the full details. Use Payment Dashboard for credits, cards, and purchase history when you need it.'
  }
];

/**
 * Lightweight 3-step coach overlay (no external tour library).
 * @param {(suppressFutureAuto: boolean) => void} onDismiss — `suppressFutureAuto` when the user checked “do not show again”.
 */
const LadderQuickTour = ({
  isOpen,
  onDismiss,
  onOpenRules,
  onOpenPaymentDashboard
}) => {
  const [step, setStep] = useState(0);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const doNotShowAgainRef = useRef(false);

  useEffect(() => {
    doNotShowAgainRef.current = doNotShowAgain;
  }, [doNotShowAgain]);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setDoNotShowAgain(false);
      doNotShowAgainRef.current = false;
    }
  }, [isOpen]);

  const dismiss = (suppressFutureAuto) => {
    onDismiss?.(!!suppressFutureAuto);
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss(!!doNotShowAgainRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  const isLast = step >= STEPS.length - 1;
  const { title, body } = STEPS[step];

  const node = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding:
          'max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) max(12px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px))',
        boxSizing: 'border-box',
        pointerEvents: 'auto'
      }}
    >
      <div
        aria-hidden="true"
        onClick={() => dismiss(doNotShowAgainRef.current)}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)'
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ladder-quick-tour-title"
        style={{
          position: 'relative',
          width: 'min(420px, 100%)',
          maxHeight: 'min(88vh, 640px)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          borderRadius: '14px',
          border: '1px solid rgba(139,92,246,0.45)',
          background: 'rgba(15,23,42,0.97)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          padding: '14px 16px 16px',
          color: '#e2e8f0',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div id="ladder-quick-tour-title" style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
              {title}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', marginTop: '4px' }}>
              Step {step + 1} of {STEPS.length}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismiss(doNotShowAgainRef.current)}
            style={{
              flex: '0 0 auto',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(148,163,184,0.45)',
              background: 'rgba(51,65,85,0.55)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.82rem',
              whiteSpace: 'nowrap'
            }}
          >
            Dismiss
          </button>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: '0.9rem', lineHeight: 1.45, color: '#cbd5e1' }}>{body}</p>

        {isLast ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => {
                onOpenRules?.();
                dismiss(false);
              }}
              style={{
                flex: '1 1 140px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(59,130,246,0.55)',
                background: 'rgba(37,99,235,0.2)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.82rem'
              }}
            >
              Open Ladder Rules
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenPaymentDashboard?.();
                dismiss(false);
              }}
              style={{
                flex: '1 1 140px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid rgba(16,185,129,0.45)',
                background: 'rgba(16,185,129,0.15)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.82rem'
              }}
            >
              Open Payment Dashboard
            </button>
          </div>
        ) : null}

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '12px',
            cursor: 'pointer',
            fontSize: '0.82rem',
            color: '#cbd5e1',
            lineHeight: 1.35
          }}
        >
          <input
            type="checkbox"
            checked={doNotShowAgain}
            onChange={(e) => setDoNotShowAgain(e.target.checked)}
            style={{ marginTop: '3px', width: '16px', height: '16px', flexShrink: 0 }}
          />
          <span>
            Do not show this intro automatically again
            <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.74rem', marginTop: '4px' }}>
              You can open it again under <strong style={{ color: '#e2e8f0' }}>Your Next Step</strong> → <strong style={{ color: '#e2e8f0' }}>Replay intro</strong> (bottom-right).
            </span>
          </span>
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(148,163,184,0.45)',
                background: 'rgba(51,65,85,0.35)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.82rem',
                marginRight: 'auto'
              }}
            >
              Back
            </button>
          ) : null}
          {!isLast ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(139,92,246,0.75)',
                background: 'rgba(139,92,246,0.45)',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={() => dismiss(doNotShowAgainRef.current)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(139,92,246,0.75)',
                background: 'rgba(139,92,246,0.45)',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
};

export default LadderQuickTour;
