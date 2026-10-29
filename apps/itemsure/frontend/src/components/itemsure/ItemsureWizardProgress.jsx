import React from 'react';
import { STEPS } from '../../utils/itemsureItemWizard.js';

/** "1 Basics · 2 Where · …". Steps you can jump to are buttons. */
export default function ItemsureWizardProgress({ steps, current, reachable, onPick }) {
  const at = steps.indexOf(current);
  return (
    <ol className="isu-wizard-steps" aria-label="Steps">
      {steps.map((id, i) => {
        const state = id === current ? 'is-current' : i < at ? 'is-done' : '';
        const label = (
          <>
            <span className="isu-wizard-num">{i + 1}</span>
            <span className="isu-wizard-label">{STEPS[id]}</span>
          </>
        );
        return (
          <li key={id} className={`isu-wizard-step ${state}`} aria-current={id === current ? 'step' : undefined}>
            {id !== current && reachable(id) ? (
              <button type="button" onClick={() => onPick(id)}>{label}</button>
            ) : (
              <span>{label}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
