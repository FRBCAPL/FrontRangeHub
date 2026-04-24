import React from 'react';

const STEPS = [
  { id: 'pick', short: '1', label: 'Choose match' },
  { id: 'form', short: '2', label: 'Result & score' },
  { id: 'pay', short: '3', label: 'Pay & post' }
];

/**
 * Guided flow indicator for Report Result: pick → enter result → pay.
 * @param {0|1|2} stepIndex — 0 = pick match, 1 = score form, 2 = payment
 */
export default function ReportMatchFlowStepper({ stepIndex = 0, isMobile = false }) {
  const safe = Math.min(2, Math.max(0, Number(stepIndex) || 0));

  return (
    <nav
      aria-label="Report result steps"
      style={{
        margin: isMobile ? '0 0 8px' : '0 0 12px',
        padding: isMobile ? '6px 8px' : '8px 12px',
        borderRadius: '8px',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? '4px' : '8px'
      }}
    >
      {STEPS.map((step, i) => {
        const isCurrent = i === safe;
        const isDone = i < safe;
        return (
          <React.Fragment key={step.id}>
            {i > 0 ? (
              <span
                aria-hidden
                style={{
                  color: 'rgba(148, 163, 184, 0.5)',
                  fontSize: isMobile ? '0.7rem' : '0.8rem',
                  padding: '0 2px'
                }}
              >
                →
              </span>
            ) : null}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: isMobile ? '4px 8px' : '5px 10px',
                borderRadius: '999px',
                border: isCurrent
                  ? '1px solid rgba(16, 185, 129, 0.65)'
                  : '1px solid rgba(71, 85, 105, 0.5)',
                background: isCurrent
                  ? 'rgba(16, 185, 129, 0.2)'
                  : isDone
                    ? 'rgba(16, 185, 129, 0.08)'
                    : 'rgba(30, 41, 59, 0.6)',
                color: isCurrent ? '#ecfdf5' : isDone ? '#94a3b8' : '#64748b',
                fontSize: isMobile ? '0.72rem' : '0.8rem',
                fontWeight: isCurrent ? 700 : 600,
                lineHeight: 1.2
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'inline-flex',
                  minWidth: '1.25rem',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  background: isCurrent ? 'rgba(16,185,129,0.35)' : 'rgba(51,65,85,0.6)',
                  color: '#e2e8f0',
                  fontSize: '0.68rem',
                  padding: '1px 4px'
                }}
              >
                {isDone ? '✓' : step.short}
              </span>
              <span>{step.label}</span>
            </span>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
