import React, { useEffect, useRef, useState } from 'react';
import { joinLoose, splitLoose } from '../../utils/itemsureLoose.js';
import { pluralUnit, singularUnit } from '../../utils/itemsureItemLook.js';
import ItemsureStepper from './ItemsureStepper.jsx';

const fromValue = (value, pieces) => {
  if (String(value ?? '').trim() === '') return { cases: '', loose: '' };
  const split = splitLoose(value, pieces);
  return split ? { cases: split.cases, loose: split.loose === '0' ? '' : split.loose } : { cases: String(value), loose: '' };
};

/**
 * "[2] cases + [7] loose" for things counted in cases but sold one at a time. value and
 * onChange use the stored amount in cases (2.291667), like a plain quantity box; blank both
 * means blank. Leaving loose blank is fine.
 */
export default function ItemsureLooseInput({ id, value, onChange, pieces, precision, unitName, label, onBlur, disabled = false, describedBy }) {
  const [typed, setTyped] = useState(() => fromValue(value, pieces));
  const [problem, setProblem] = useState('');
  const sent = useRef(String(value ?? ''));
  const plural = pluralUnit(singularUnit(unitName || 'case')).toLowerCase();

  useEffect(() => {
    const now = String(value ?? '');
    if (now === sent.current) return;
    sent.current = now;
    setTyped(fromValue(now, pieces));
    setProblem('');
  }, [value, pieces]);

  const change = (patch) => {
    const next = { ...typed, ...patch };
    setTyped(next);
    const result = joinLoose(next.cases, next.loose, pieces, precision, unitName);
    if (result.error) {
      setProblem(result.error);
      return;
    }
    setProblem('');
    const text = result.empty ? '' : result.value;
    sent.current = text;
    onChange(text);
  };

  return (
    <div className="isu-loose" onBlur={onBlur}>
      <span className="isu-loose-part">
        <ItemsureStepper
          id={id}
          label={`${label} full ${plural}`}
          inputMode="numeric"
          placeholder="—"
          value={typed.cases}
          disabled={disabled}
          aria-describedby={describedBy}
          onChange={(v) => change({ cases: v })}
        />
        <span className="isu-count-unit">{plural}</span>
      </span>
      <span className="isu-loose-plus" aria-hidden="true">+</span>
      <span className="isu-loose-part">
        <ItemsureStepper
          label={`${label} loose`}
          inputMode="numeric"
          placeholder="0"
          value={typed.loose}
          disabled={disabled}
          aria-label={`${label}: loose`}
          onChange={(v) => change({ loose: v })}
        />
        <span className="isu-count-unit">loose</span>
      </span>
      {problem ? <span className="isu-count-state is-problem isu-loose-problem" role="alert">{problem}</span> : null}
    </div>
  );
}
