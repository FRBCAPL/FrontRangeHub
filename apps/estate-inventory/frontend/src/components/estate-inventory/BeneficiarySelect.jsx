import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import {
  BENEFICIARY_OPTIONS,
  HEIR_ACCESS_TIER,
  generateHeirInviteCode,
  heirAdminLabel
} from '@shared/utils/estateInventoryConstants.js';
import { useEstateCase } from './EstateCaseContext';

const ADD_PERSON = '__add_person__';

/**
 * Memorandum beneficiary picker — loads estate people, plus Other, plus inline Add person.
 */
const BeneficiarySelect = ({
  id,
  value = '',
  onChange,
  onPersonAdded,
  required = false,
  disabled = false,
  className,
  caseNumber = null
}) => {
  const { caseNumber: ctxCase } = useEstateCase();
  const caseLabel = caseNumber || ctxCase;
  const [names, setNames] = useState([]);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');

  const load = async () => {
    if (!caseLabel) return;
    const result = await estateInventoryService.listSiblingAccounts(caseLabel);
    if (!result.success) return;
    const labels = (result.data || [])
      .map((row) => heirAdminLabel(row))
      .map((label) => String(label || '').trim())
      .filter(Boolean);
    setNames([...new Set(labels)]);
  };

  useEffect(() => {
    load();
  }, [caseLabel]);

  const options = [...names];
  const current = String(value || '').trim();
  if (current && current !== 'Other' && !options.includes(current)) {
    options.unshift(current);
  }
  for (const preset of BENEFICIARY_OPTIONS) {
    if (!options.includes(preset)) options.push(preset);
  }

  const handleChange = async (event) => {
    const next = event.target.value;
    if (next !== ADD_PERSON) {
      setHint('');
      onChange?.(next);
      return;
    }

    const name = window.prompt(
      'Name for this person (admin label for the estate record):'
    );
    if (!name || name.trim().length < 2) {
      event.target.value = value || '';
      return;
    }

    setBusy(true);
    setHint('');
    const invite = generateHeirInviteCode();
    const result = await estateInventoryService.addHeir(
      name.trim(),
      HEIR_ACCESS_TIER.residual,
      invite,
      caseLabel
    );
    setBusy(false);
    if (!result.success) {
      setHint(result.error || 'Could not add person.');
      event.target.value = value || '';
      return;
    }

    const label = heirAdminLabel(result.data) || name.trim();
    await load();
    onChange?.(label);
    onPersonAdded?.(result.data);
    setHint(`Added ${label}. PIN: ${invite}`);
  };

  return (
    <>
      <select
        id={id}
        className={className}
        value={value || ''}
        onChange={handleChange}
        required={required}
        disabled={disabled || busy}
      >
        <option value="">Select…</option>
        {options.map((nameOpt) => (
          <option key={nameOpt} value={nameOpt}>
            {nameOpt}
          </option>
        ))}
        <option value={ADD_PERSON}>+ Add person…</option>
      </select>
      {names.length === 0 && !current ? (
        <p className="ei-settings-hint" style={{ marginTop: '0.35rem' }}>
          No family yet — add a person here, or use Settings → People first.
        </p>
      ) : null}
      {hint ? (
        <p className="ei-status" style={{ marginTop: '0.35rem' }}>
          {hint}
        </p>
      ) : null}
    </>
  );
};

export default BeneficiarySelect;
