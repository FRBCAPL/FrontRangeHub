import React from 'react';
import { Link } from 'react-router-dom';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';

const q = (text, unit) => (text === null || text === undefined ? '—' : `${displayQuantity(text)} ${unit}`);

/** One place that needs something, on the owner's All needs page. */
export default function ItemsureNeedRow({ row, onOpen = null }) {
  const status = TARGET_STATUS[row.status];
  const pending = row.status === 'not_set_up';
  return (
    <li className={`isu-card isu-restock-card${row.status === 'low' ? ' is-low' : ''}`}>
      <div className="isu-restock-head">
        <div>
          <strong>{row.item_name}</strong>
          <p className="isu-muted isu-small">{row.area_name || NO_AREA_LABEL}{row.sku ? ` · ${row.sku}` : ''}</p>
        </div>
        <span className={`isu-badge isu-status--${status.tone}`}>{status.label}</span>
      </div>
      <div className="isu-restock-figures">
        {pending ? null : <span>On hand <strong>{q(row.on_hand_text, row.unit_symbol)}</strong></span>}
        {row.shortage_text ? <span>Needs <strong>{q(row.shortage_text, row.unit_symbol)}</strong></span> : null}
        <span>Warn me at {q(row.minimum_text, row.unit_symbol)}</span>
        <span>Fill up to {q(row.par_text, row.unit_symbol)}</span>
      </div>
      <div className="isu-restock-move-actions">
        {onOpen ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={onOpen}>
            Switch business &amp; open item
          </button>
        ) : (
          <Link className="isu-btn isu-btn--ghost isu-btn--sm" to={`${ITEMSURE_PATH}/items/${row.item_id}`}>
            {pending ? 'Set amount' : 'Open item'}
          </Link>
        )}
      </div>
    </li>
  );
}
