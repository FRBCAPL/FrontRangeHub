import React from 'react';
import {
  ITEM_CONDITION,
  ITEM_CONDITION_OPTIONS
} from '@shared/utils/estateInventoryConstants.js';

/**
 * Shared condition dropdown + optional notes for PR / helper capture.
 */
const ItemConditionFields = ({
  idPrefix = 'ei-cond',
  condition,
  onConditionChange,
  conditionNotes,
  onConditionNotesChange,
  disabled = false,
  compact = false
}) => {
  const fieldClass = compact ? 'ei-field ei-field-tight' : 'ei-field';
  return (
    <>
      <div className={fieldClass}>
        <label htmlFor={`${idPrefix}-condition`}>Condition</label>
        <select
          id={`${idPrefix}-condition`}
          value={condition || ITEM_CONDITION.good}
          onChange={(e) => onConditionChange?.(e.target.value)}
          disabled={disabled}
        >
          {ITEM_CONDITION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className={fieldClass}>
        <label htmlFor={`${idPrefix}-condition-notes`}>Condition notes (optional)</label>
        <textarea
          id={`${idPrefix}-condition-notes`}
          rows={compact ? 2 : 3}
          value={conditionNotes || ''}
          onChange={(e) => onConditionNotesChange?.(e.target.value)}
          placeholder="e.g. Minor scratches on left side, chip on rim"
          disabled={disabled}
        />
        <p className="ei-settings-hint">Factual wear only — no value opinions.</p>
      </div>
    </>
  );
};

export default ItemConditionFields;
