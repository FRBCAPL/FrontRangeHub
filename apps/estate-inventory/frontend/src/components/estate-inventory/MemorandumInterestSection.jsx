import React from 'react';
import { BENEFICIARY_OPTIONS } from '@shared/utils/estateInventoryConstants.js';
import DescendantsInterestField from './DescendantsInterestField';

/**
 * Clear PR choice: memorandum gift vs residual descendants' interest %.
 * Memorandum path: beneficiary + optional interest %.
 * Residual path: optional descendants' interest %.
 */
const MemorandumInterestSection = ({
  idPrefix = 'ei-own',
  isMemorandum,
  onMemorandumChange,
  assignedBeneficiary = '',
  onBeneficiaryChange,
  descendantsInterestPct = null,
  onDescendantsInterestPctChange,
  compact = false
}) => {
  const memoId = `${idPrefix}-memo`;
  const residualId = `${idPrefix}-residual`;
  const benId = `${idPrefix}-ben`;

  return (
    <fieldset className={`ei-ownership-block${isMemorandum ? ' is-memo' : ' is-residual'}`}>
      <legend className="ei-ownership-legend">Who has an interest in this item?</legend>
      <p className="ei-ownership-lede">
        Pick one path. Memorandum gifts name a person and can note an interest share;
        everything else can note a descendants&apos; residual share.
      </p>

      <div className="ei-ownership-choices" role="radiogroup" aria-label="Interest type">
        <label
          className={`ei-ownership-choice${isMemorandum ? ' is-selected' : ''}`}
          htmlFor={memoId}
        >
          <input
            id={memoId}
            type="radio"
            name={`${idPrefix}-interest-type`}
            checked={Boolean(isMemorandum)}
            onChange={() => onMemorandumChange?.(true)}
          />
          <span className="ei-ownership-choice-body">
            <span className="ei-ownership-choice-title">Memorandum / will gift</span>
            <span className="ei-ownership-choice-hint">
              Named for a specific person in a memorandum or will set-aside.
            </span>
          </span>
        </label>

        <label
          className={`ei-ownership-choice${!isMemorandum ? ' is-selected' : ''}`}
          htmlFor={residualId}
        >
          <input
            id={residualId}
            type="radio"
            name={`${idPrefix}-interest-type`}
            checked={!isMemorandum}
            onChange={() => onMemorandumChange?.(false)}
          />
          <span className="ei-ownership-choice-body">
            <span className="ei-ownership-choice-title">Not a memorandum gift</span>
            <span className="ei-ownership-choice-hint">
              Residual estate — optionally mark descendants&apos; interest %.
            </span>
          </span>
        </label>
      </div>

      {isMemorandum ? (
        <div className="ei-ownership-followup">
          <div className="ei-field ei-field-tight">
            <label htmlFor={benId}>Assigned beneficiary</label>
            <select
              id={benId}
              className={compact ? 'ei-inline-select' : undefined}
              value={assignedBeneficiary || ''}
              onChange={(e) => onBeneficiaryChange?.(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {BENEFICIARY_OPTIONS.map((nameOpt) => (
                <option key={nameOpt} value={nameOpt}>
                  {nameOpt}
                </option>
              ))}
            </select>
          </div>
          <DescendantsInterestField
            id={`${idPrefix}-memo-pct`}
            label="Interest share"
            value={descendantsInterestPct}
            compact={compact}
            hint={!compact}
            hintText="Optional percent of this item set aside for the named beneficiary."
            onChange={onDescendantsInterestPctChange}
          />
        </div>
      ) : (
        <DescendantsInterestField
          id={`${idPrefix}-descendants-pct`}
          value={descendantsInterestPct}
          compact={compact}
          hint={!compact}
          onChange={onDescendantsInterestPctChange}
        />
      )}
    </fieldset>
  );
};

export default MemorandumInterestSection;
