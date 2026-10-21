import React from 'react';
import { SETUP_STEPS, stepIndex } from './showdownSetupSteps.js';

/** Step bar: every step can be opened at any time; a mark shows what still needs attention. */
export function SetupStepBar({ step, issues, ready, onStep }) {
  return (
    <nav className="sd-steps" aria-label="Setup steps">
      <ol>
        {SETUP_STEPS.map((st, i) => {
          const todo = st.key === 'review' ? !ready : (issues[st.key] || []).length > 0;
          const current = st.key === step;
          return (
            <li key={st.key}>
              <button
                type="button"
                className={`sd-step${current ? ' is-current' : ''}${todo ? ' is-todo' : ' is-done'}`}
                aria-current={current ? 'step' : undefined}
                onClick={() => onStep(st.key)}
              >
                <span className="sd-step-num" aria-hidden="true">{todo || current ? i + 1 : '\u2713'}</span>
                <span className="sd-step-text">
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
export function SetupStepFooter({ step, issues, onStep }) {
  const i = stepIndex(step);
  const prev = SETUP_STEPS[i - 1];
  const next = SETUP_STEPS[i + 1];
  const todo = issues[step] || [];
  return (
    <div className="sd-step-footer">
      {todo.length ? <ul className="sd-problems" aria-label="Still to do in this step">{todo.map((p) => <li key={p}>{p}</li>)}</ul> : null}
      <div className="sd-step-buttons">
        {prev ? <button type="button" className="tb-btn-new" onClick={() => onStep(prev.key)}>{'\u2190'} {prev.label}</button> : <span />}
        {next ? <button type="button" className="sd-btn sd-btn-primary" onClick={() => onStep(next.key)}>Next: {next.label} {'\u2192'}</button> : null}
      </div>
    </div>
  );
}
