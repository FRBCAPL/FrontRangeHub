import React from 'react';
import { Link } from 'react-router-dom';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { TARGET_STATUS } from '../../utils/itemsureTargets.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';

const q = (text, unit) => (text === null || text === undefined ? '—' : `${displayQuantity(text)} ${unit}`);

/**
 * One shortage: figures, suggested internal transfers, and what is left to get from outside.
 * With moving switched off (`showMoves` false) the whole need is shown as the amount to buy.
 */
export default function ItemsureRestockCard({ rec, canTransfer, showMoves = true, onAction }) {
  const unit = rec.unit_symbol;
  const status = TARGET_STATUS[rec.status];
  const visibleMoves = showMoves ? rec.transfers.filter((t) => !t.hidden) : [];
  const levelsLink = `${ITEMSURE_PATH}/levels?location=${rec.location_id}&area=${rec.storage_area_id || ''}&search=${encodeURIComponent(rec.item_name)}`;

  return (
    <li className={`isu-card isu-restock-card${rec.status === 'low' ? ' is-low' : ''}`}>
      <div className="isu-restock-head">
        <div>
          <strong>{rec.item_name}</strong>
          <p className="isu-muted isu-small">{rec.location_name} · {rec.area_name || NO_AREA_LABEL}{rec.sku ? ` · ${rec.sku}` : ''}</p>
        </div>
        <span className={`isu-badge isu-status--${status.tone}`}>{status.label}</span>
      </div>

      <div className="isu-restock-figures">
        <span>On hand <strong>{q(rec.on_hand, unit)}</strong></span>
        <span>Warn me at {q(rec.minimum, unit)}</span>
        <span>Fill up to {q(rec.par, unit)}</span>
        {rec.need !== null ? <span>Needed <strong>{q(rec.need, unit)}</strong></span> : null}
      </div>

      {rec.need === null ? (
        <p className="isu-restock-external isu-muted">
          No &ldquo;Fill up to&rdquo; number, so there&apos;s no suggested amount. <Link to={levelsLink}>Set one</Link>
        </p>
      ) : null}

      {visibleMoves.length ? (
        <ul className="isu-restock-moves">
          {visibleMoves.map((t) => (
            <li key={`${t.location_id}-${t.storage_area_id || ''}`} className="isu-restock-move">
              <span>
                Move <strong>{q(t.quantity, unit)}</strong> from {t.same_location ? '' : `${t.location_name} · `}{t.area_name || NO_AREA_LABEL}
                <span className="isu-muted">{t.same_location ? ' (same location)' : ' (other location)'}</span>
              </span>
              {canTransfer ? (
                <span className="isu-restock-move-actions">
                  <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={() => onAction('transfer', rec, t)}>Transfer</button>
                  {t.same_location ? null : (
                    <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onAction('plan', rec, t)}>Plan</button>
                  )}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {showMoves && rec.has_hidden_sources ? (
        <p className="isu-restock-external isu-muted">Some spare stock may be at a location you can&apos;t see. Ask an administrator.</p>
      ) : null}

      {showMoves && rec.need !== null && !rec.transfers.length ? (
        <p className="isu-restock-external isu-muted">No spare stock elsewhere.</p>
      ) : null}

      {rec.need !== null && !showMoves ? (
        <p className="isu-restock-external">Buy: <strong>{q(rec.need, unit)}</strong></p>
      ) : null}

      {rec.need !== null && showMoves ? (
        rec.external !== null ? (
          displayQuantity(rec.external) !== '0' ? (
            <p className="isu-restock-external">Buy: <strong>{q(rec.external, unit)}</strong></p>
          ) : (
            <p className="isu-restock-external isu-muted">Covered by the transfers above.</p>
          )
        ) : (
          <p className="isu-restock-external">Buy: <strong>up to {q(rec.external_at_most, unit)}</strong></p>
        )
      ) : null}
    </li>
  );
}
