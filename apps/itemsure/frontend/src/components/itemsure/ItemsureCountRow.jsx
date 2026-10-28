import React, { useId } from 'react';
import { entryKey } from '../../services/itemsureCountService.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';

const STATUS_TEXT = {
  pending: 'Not saved yet',
  saving: 'Saving…',
  offline: 'Offline · will retry',
};

function RowStatus({ draft, saved }) {
  if (draft?.status === 'invalid' || draft?.status === 'error') {
    return <span className="isu-count-state is-problem" role="alert">{draft.message}</span>;
  }
  if (draft && STATUS_TEXT[draft.status]) {
    return <span className={`isu-count-state is-${draft.status}`}>{STATUS_TEXT[draft.status]}</span>;
  }
  if (saved) return <span className="isu-count-state is-saved">Saved</span>;
  return <span className="isu-count-state">Not counted</span>;
}

/** One item in the selected storage area. Blank means not counted; 0 means counted, none on hand. */
export default function ItemsureCountRow({ item, storageAreaId, autosave, otherAreaNames }) {
  const inputId = useId();
  const key = entryKey(item.item_id, storageAreaId);
  const draft = autosave.drafts[key];
  const saved = autosave.entries[key];
  const value = autosave.valueFor(item.item_id, storageAreaId);
  const unit = item.base_unit_symbol || item.base_unit_name;
  const decimals = item.base_precision_scale;

  const setValue = (text) => autosave.setValue(item.item_id, storageAreaId, text);

  return (
    <li className={`isu-card isu-count-row${draft?.status === 'conflict' ? ' has-conflict' : ''}`}>
      <div className="isu-count-row-main">
        <label htmlFor={inputId} className="isu-count-name">
          <strong>{item.item_name}</strong>
          <span className="isu-muted isu-small">
            {[item.category_name, item.sku && `SKU ${item.sku}`, item.added_after_start && 'Added during count'].filter(Boolean).join(' · ')}
          </span>
        </label>
        <div className="isu-count-input">
          <input
            id={inputId}
            inputMode={decimals > 0 ? 'decimal' : 'numeric'}
            autoComplete="off"
            placeholder="—"
            value={value}
            aria-describedby={`${inputId}-hint`}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => autosave.flush(item.item_id, storageAreaId)}
          />
          <span className="isu-count-unit">{unit}</span>
        </div>
      </div>

      <div className="isu-count-row-foot">
        <span id={`${inputId}-hint`} className="isu-muted isu-small">
          {decimals > 0 ? `Up to ${decimals} decimal place${decimals === 1 ? '' : 's'}` : 'Whole numbers'}
          {otherAreaNames.length ? ` · Also counted in ${otherAreaNames.join(', ')}` : ''}
        </span>
        <RowStatus draft={draft} saved={saved} />
        <div className="isu-count-quick">
          <button type="button" className="isu-link" onClick={() => setValue('0')}>Zero</button>
          {value !== '' ? <button type="button" className="isu-link" onClick={() => setValue('')}>Clear</button> : null}
        </div>
      </div>

      {draft?.status === 'conflict' ? (
        <div className="isu-count-conflict" role="alert">
          <p>
            Someone else changed this while you were counting. Saved value:{' '}
            <strong>{saved ? `${displayQuantity(saved.quantity_text)} ${unit}` : 'not counted'}</strong>. Yours:{' '}
            <strong>{draft.text.trim() === '' ? 'not counted' : `${draft.text} ${unit}`}</strong>.
          </p>
          <div className="isu-card-actions">
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => autosave.resolveConflict(item.item_id, storageAreaId, 'theirs')}>
              Keep saved
            </button>
            <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={() => autosave.resolveConflict(item.item_id, storageAreaId, 'mine')}>
              Use mine
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
