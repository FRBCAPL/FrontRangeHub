import React, { useEffect, useState } from 'react';
import {
  DESCENDANTS_INTEREST_PRESETS,
  normalizeDescendantsInterestPct
} from '@shared/utils/estateInventoryConstants.js';

/**
 * PR field: none | 100% | 75% | 50% | 25% | custom 1–100.
 * value is number|null (null = not marked).
 */
const DescendantsInterestField = ({
  id = 'ei-descendants-pct',
  label = "Descendants' interest",
  value = null,
  onChange,
  compact = false,
  hint = true,
  hintText = 'Residual heirs / descendants may have an interest (not a memorandum gift). Choose a percentage share.'
}) => {
  const normalized = normalizeDescendantsInterestPct(value);
  const isPreset =
    normalized != null && DESCENDANTS_INTEREST_PRESETS.includes(normalized);
  const [mode, setMode] = useState(() => {
    if (normalized == null) return '';
    if (isPreset) return String(normalized);
    return 'custom';
  });
  const [customText, setCustomText] = useState(() =>
    normalized != null && !isPreset ? String(normalized) : ''
  );

  useEffect(() => {
    const next = normalizeDescendantsInterestPct(value);
    if (next == null) {
      setMode('');
      setCustomText('');
      return;
    }
    if (DESCENDANTS_INTEREST_PRESETS.includes(next)) {
      setMode(String(next));
      setCustomText('');
    } else {
      setMode('custom');
      setCustomText(String(next));
    }
  }, [value]);

  const emit = (pct) => onChange?.(normalizeDescendantsInterestPct(pct));

  const FieldWrap = compact ? 'div' : 'div';
  const fieldClass = compact ? 'ei-field ei-field-tight' : 'ei-field ei-field-tight';

  return (
    <FieldWrap className={fieldClass}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className={compact ? 'ei-inline-select' : undefined}
        value={mode}
        onChange={(e) => {
          const next = e.target.value;
          setMode(next);
          if (!next) {
            setCustomText('');
            emit(null);
            return;
          }
          if (next === 'custom') {
            const customPct = normalizeDescendantsInterestPct(customText);
            emit(customPct);
            return;
          }
          setCustomText('');
          emit(Number(next));
        }}
      >
        <option value="">None</option>
        {DESCENDANTS_INTEREST_PRESETS.map((pct) => (
          <option key={pct} value={String(pct)}>
            {pct}%
          </option>
        ))}
        <option value="custom">Custom…</option>
      </select>

      {mode === 'custom' ? (
        <div className="ei-field ei-field-tight" style={{ marginTop: '0.45rem' }}>
          <label htmlFor={`${id}-custom`}>Custom percent (1–100)</label>
          <input
            id={`${id}-custom`}
            type="number"
            min={1}
            max={100}
            step={1}
            inputMode="numeric"
            value={customText}
            placeholder="e.g. 33"
            onChange={(e) => {
              const raw = e.target.value;
              setCustomText(raw);
              emit(raw === '' ? null : Number(raw));
            }}
          />
        </div>
      ) : null}

      {hint && hintText ? (
        <p className="ei-settings-hint" style={{ marginTop: '0.35rem' }}>
          {hintText}
        </p>
      ) : null}
    </FieldWrap>
  );
};

export default DescendantsInterestField;
