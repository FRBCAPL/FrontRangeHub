import React from 'react';
import { MAX_OPTION_NAMES, blankRow } from '../../utils/consignmentGearForm.js';
import useConsignmentConfirm from '../../hooks/useConsignmentConfirm.js';

/**
 * Option names (Weight, Tip, …) plus one row per combination with its own stock, SKU and optional price.
 * Controlled: optionNames / rows come from the product modal; onChange(optionNames, rows, removedId?).
 */
export default function ConsignmentGearVariantsEditor({ optionNames, rows, basePrice, onChange, disabled }) {
  const { confirm } = useConsignmentConfirm();
  const setNames = (names, nextRows) => onChange(names, nextRows);
  const setRow = (i, patch) => onChange(optionNames, rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const addOption = () => setNames([...optionNames, ''], rows.map((r) => ({ ...r, values: [...r.values, ''] })));
  const renameOption = (i, name) => setNames(optionNames.map((n, j) => (j === i ? name : n)), rows);
  const removeOption = async (i) => {
    const ok = await confirm({ title: `Remove the “${optionNames[i] || 'new'}” option from every row?`, confirmLabel: 'Remove' });
    if (!ok) return;
    setNames(optionNames.filter((_, j) => j !== i), rows.map((r) => ({ ...r, values: r.values.filter((_, j) => j !== i) })));
  };
  const addRow = () => onChange(optionNames, [...rows, blankRow(optionNames.length, rows[rows.length - 1])]);
  const removeRow = (i) => onChange(optionNames, rows.filter((_, j) => j !== i), rows[i].id || null);

  return (
    <fieldset className="cs-field" disabled={disabled}>
      <legend>Options &amp; stock</legend>
      <p className="cs-hint">
        Add options like Weight, Shaft or Tip size, then one row for each combination you sell.
        No options? Just set the stock on the single row. Leave a row’s price blank to use the product price.
      </p>
      <div className="cs-gear-option-names">
        {optionNames.map((name, i) => (
          <div key={i} className="cs-gear-option-name">
            <input type="text" value={name} maxLength={30} placeholder="e.g. Weight" aria-label={`Option ${i + 1} name`}
              onChange={(e) => renameOption(i, e.target.value)} />
            <button type="button" className="cs-btn-secondary" onClick={() => removeOption(i)} aria-label={`Remove option ${name}`}>✕</button>
          </div>
        ))}
        {optionNames.length < MAX_OPTION_NAMES ? (
          <button type="button" className="cs-btn-secondary" onClick={addOption}>+ Add an option</button>
        ) : null}
      </div>
      <table className="cs-gear-variants">
        <thead>
          <tr>
            {optionNames.map((n, i) => <th key={i}>{n || `Option ${i + 1}`}</th>)}
            <th>SKU</th>
            <th>Price</th>
            <th>Stock</th>
            <th title="Shown in the shop">On</th>
            <th aria-label="Remove" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || `new-${i}`}>
              {optionNames.map((n, j) => (
                <td key={j}>
                  <input type="text" value={r.values[j] ?? ''} maxLength={40} aria-label={`Row ${i + 1} ${n || `option ${j + 1}`}`}
                    onChange={(e) => setRow(i, { values: r.values.map((v, k) => (k === j ? e.target.value : v)) })} />
                </td>
              ))}
              <td><input type="text" value={r.sku} maxLength={60} aria-label={`Row ${i + 1} SKU`} onChange={(e) => setRow(i, { sku: e.target.value })} /></td>
              <td>
                <input type="number" step="0.01" min="0" value={r.price} placeholder={basePrice || ''} aria-label={`Row ${i + 1} price`}
                  onChange={(e) => setRow(i, { price: e.target.value })} />
              </td>
              <td>
                <input type="number" step="1" min="0" value={r.stock} aria-label={`Row ${i + 1} stock`}
                  onChange={(e) => setRow(i, { stock: e.target.value })} />
              </td>
              <td>
                <input type="checkbox" checked={r.active} aria-label={`Row ${i + 1} shown in the shop`}
                  onChange={(e) => setRow(i, { active: e.target.checked })} />
              </td>
              <td>
                {rows.length > 1 ? (
                  <button type="button" className="cs-btn-secondary" onClick={() => removeRow(i)} aria-label={`Remove row ${i + 1}`}>✕</button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {optionNames.length ? (
        <div className="cs-actions"><button type="button" className="cs-btn-secondary" onClick={addRow}>+ Add a row</button></div>
      ) : null}
    </fieldset>
  );
}
