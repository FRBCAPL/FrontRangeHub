import React from 'react';
import { CCV3_SETUP_STEPS, ccv3StepIndex } from './cashClimbV3SetupSteps.js';

/** Step bar: every step can be opened at any time; a mark shows what still needs attention. */
export function CashClimbV3StepBar({ step, issues, ready, onStep }) {
  return (
    <nav className="ccv3-steps" aria-label="Setup steps">
      <ol>
        {CCV3_SETUP_STEPS.map((st, i) => {
          const todo = st.key === 'review' ? !ready : (issues[st.key] || []).length > 0;
          const current = st.key === step;
          return (
            <li key={st.key}>
              <button
                type="button"
                className={`ccv3-step${current ? ' is-current' : ''}${todo ? ' is-todo' : ' is-done'}`}
                aria-current={current ? 'step' : undefined}
                onClick={() => onStep(st.key)}
              >
                <span className="ccv3-step-num" aria-hidden="true">{todo || current ? i + 1 : '\u2713'}</span>
                <span className="ccv3-step-text">
                  <strong>{st.label}</strong>
                  <small>{todo ? (st.key === 'review' ? 'Not ready yet' : 'Needs attention') : st.hint}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Back / Next under the current step, with what is still missing in it. */
export function CashClimbV3StepFooter({ step, issues, onStep }) {
  const i = ccv3StepIndex(step);
  const prev = CCV3_SETUP_STEPS[i - 1];
  const next = CCV3_SETUP_STEPS[i + 1];
  const todo = issues[step] || [];
  return (
    <div className="ccv3-step-footer">
      {todo.length ? <ul className="ccv3-step-todo" aria-label="Still to do in this step">{todo.map((p) => <li key={p}>{p}</li>)}</ul> : null}
      <div className="ccv3-step-buttons">
        {prev ? <button type="button" className="btn-secondary" onClick={() => onStep(prev.key)}>{'\u2190'} {prev.label}</button> : <span />}
        {next ? <button type="button" className="btn-primary" onClick={() => onStep(next.key)}>Next: {next.label} {'\u2192'}</button> : null}
      </div>
    </div>
  );
}
