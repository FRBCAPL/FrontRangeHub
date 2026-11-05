import React from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { shortByItem } from '../../utils/itemsurePosStock.js';
import { posTabPath } from '../../utils/itemsurePosTabs.js';

const amount = (n) => displayQuantity(String(Math.round(n * 100) / 100));

/** What one "take sales off stock" did, in plain words. */
export default function ItemsurePosTakeResult({ result, canFix, onClose }) {
  if (result.nothing) {
    return (
      <div className="isu-stack">
        <p>Nothing new to take off yet. Sales are taken off once each hour is over{result.next ? `; the next one finishes at ${formatWhen(result.next)}` : ''}.</p>
        <button type="button" className="isu-btn isu-btn--primary" onClick={onClose}>OK</button>
      </div>
    );
  }
  const short = shortByItem(result.short);
  return (
    <div className="isu-stack isu-pos-take-result">
      <p>
        <strong>Sales are taken off stock{result.to ? ` up to ${formatWhen(result.to)}` : ''}.</strong>
        {!result.taken ? <span className="isu-muted isu-small"> No matched items sold in that time.</span> : null}
      </p>
      {result.addOns ? <p className="isu-muted isu-small">Add-ons like Doubles and &ldquo;Add Red Bull&rdquo; were included.</p> : null}
      {result.counted ? (
        <p className="isu-muted isu-small">Some sales were skipped because a count after them already set the amount.</p>
      ) : null}
      {short.length ? (
        <div>
          <p><strong>Sold but not on record</strong></p>
          <p className="isu-muted isu-small">Clover sold more than ItemSure had, so these stopped at zero. Usually a delivery wasn&apos;t entered or the last count was low. The next count will sort it out.</p>
          <ul className="isu-pos-take-list">
            {short.map((s) => <li key={s.itemId}>{s.name}: {amount(s.short)} {s.unit} more than on record</li>)}
          </ul>
        </div>
      ) : null}
      {result.missing.length ? (
        <div>
          <p><strong>Not set up yet, so not taken off</strong></p>
          <p className="isu-muted isu-small">These need an amount per sale or a size first. Once they&apos;re set, their next sales will be taken off.</p>
          <ul className="isu-pos-take-list">
            {result.missing.map((m) => <li key={`${m.external_id}|${m.item_id}`}>{m.pos_name || 'Clover item'} {'\u2192'} {m.item_name}</li>)}
          </ul>
          {canFix ? <Link to={posTabPath(ITEMSURE_PATH, 'pours')} className="isu-link isu-small" onClick={onClose}>Set them up {'\u203A'}</Link> : null}
        </div>
      ) : null}
      <button type="button" className="isu-btn isu-btn--primary" onClick={onClose}>Done</button>
    </div>
  );
}
