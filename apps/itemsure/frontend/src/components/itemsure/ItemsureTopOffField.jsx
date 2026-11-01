import React from 'react';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { checkTopOffPercent, topOffLine } from '../../utils/itemsureTopOff.js';

const QUICK = [50, 75, 90];
const blank = (text) => String(text ?? '').trim() === '';

/** "Top off at __% of Fill up to" for the item, with quick picks and an example from its first level. */
export default function ItemsureTopOffField({ value, onChange, example, unit }) {
  const checked = checkTopOffPercent(value);
  const percent = checked.error ? null : checked.value;
  const line = example && !blank(example.par) ? topOffLine(blank(example.minimum) ? null : example.minimum, example.par, percent) : null;
  const shown = line === null ? null : displayQuantity(String(Math.floor(line * 100) / 100));

  return (
    <div className="isu-topoff">
      <strong>Top off at</strong>
      <div className="isu-topoff-row">
        <input
          className="isu-topoff-input"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
          placeholder="Usual"
          aria-label="Top off at, percent of Fill up to"
        />
        <span>% of Fill up to</span>
      </div>
      <div className="isu-topoff-quick">
        <button type="button" className={`isu-chip isu-chip--choice${blank(value) ? ' is-selected' : ''}`} aria-pressed={blank(value)} onClick={() => onChange('')}>Usual</button>
        {QUICK.map((n) => (
          <button key={n} type="button" className={`isu-chip isu-chip--choice${percent === n ? ' is-selected' : ''}`} aria-pressed={percent === n} onClick={() => onChange(String(n))}>{n}%</button>
        ))}
      </div>
      <p className="isu-muted isu-small">
        Shows in Top Offs and on the shopping list once a spot drops this low.
        {blank(value) ? ' Usual is halfway between "Warn me at" and "Fill up to".' : ''}
        {shown !== null ? ` For example: fill up to ${displayQuantity(example.par)} means top off at ${shown} ${unit} or less.` : ''}
      </p>
      {checked.error ? <p className="isu-error" role="alert">{checked.error}</p> : null}
    </div>
  );
}
