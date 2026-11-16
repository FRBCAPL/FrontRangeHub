import React from 'react';
import { STEPS } from '../../utils/itemsureItemWizard.js';
import Tip from './ItemsureTip.jsx';

const STEP_TIP = {
  basics: 'Name, category, how it’s counted, suppliers',
  where: 'Where you keep it and starting amounts',
  levels: 'Warn-at and fill-up-to for each place',
  extras: 'SKU, barcode, notes, and more',
  review: 'Check everything before saving',
};

/** "1 Basics · 2 Where · …". Steps you can jump to are buttons. */
export default function ItemsureWizardProgress({ steps, current, reachable, onPick }) {
  const at = steps.indexOf(current);
  return (
    <ol className="isu-wizard-steps" aria-label="Steps">
      {steps.map((id, i) => {
        const state = id === current ? 'is-current' : i < at ? 'is-done' : '';
        const tip = STEP_TIP[id] || STEPS[id];
        const label = (
          <>
            <span className="isu-wizard-num">{i + 1}</span>
            <span className="isu-wizard-label">{STEPS[id]}</span>
          </>
        );
        const body = id !== current && reachable(id) ? (
          <button type="button" className="isu-wizard-step-hit" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(id)}>{label}</button>
        ) : (
          <span className="isu-wizard-step-hit">{label}</span>
        );
        return (
          <li key={id} className={`isu-wizard-step ${state}`} aria-current={id === current ? 'step' : undefined}>
            <Tip label={tip} side="bottom">{body}</Tip>
          </li>
        );
      })}
    </ol>
  );
}
