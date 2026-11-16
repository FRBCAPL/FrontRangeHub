import React, { useEffect, useId, useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { formatPrice, supplierPriceRows } from '../../utils/itemsureSupplierPrices.js';
import { ErrorNote } from './ItemsureUi.jsx';

/**
 * Compare as-ordered prices across an item's suppliers, and (when allowed) edit price + product code.
 * `suppliers` is the list for this item (main first); `mainId` is Buy from; `prices` is Map
 * supplierId -> { price, code }; `onSave(supplierId, { priceText, code })` when canManage.
 */
export default function ItemsureSupplierPrices({ suppliers, mainId, prices, canManage, onSave }) {
  const rows = supplierPriceRows(suppliers, mainId, prices);
  if (!rows.length) return null;
  const anyPrice = rows.some((r) => r.price != null);
  const cheapest = anyPrice ? rows.find((r) => r.price != null)?.id : null;

  return (
    <div className="isu-supplier-prices">
      <p className="isu-muted isu-small">
        {anyPrice
          ? 'As ordered — shopping list defaults to the cheapest unless you pick another for this trip.'
          : 'As ordered — enter what each supplier charges so the shopping list can default to the cheapest.'}
      </p>
      <ul className="isu-supplier-price-list" aria-label="Supplier prices">
        {rows.map((row) => (
          <li key={row.id} className={row.id === cheapest ? 'isu-supplier-price-list__best' : undefined}>
            {canManage && onSave ? (
              <PriceEdit row={row} cheapest={row.id === cheapest} onSave={onSave} />
            ) : (
              <PriceView row={row} cheapest={row.id === cheapest} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PriceView({ row, cheapest }) {
  return (
    <div className="isu-supplier-price-row">
      <span className="isu-supplier-price-name">
        {row.icon ? `${row.icon} ` : ''}{row.name}
        {row.isMain ? <span className="isu-muted isu-small"> · usual</span> : null}
        {cheapest ? <span className="isu-supplier-price-tag">cheapest</span> : null}
        {!row.is_active ? <span className="isu-muted isu-small"> (archived)</span> : null}
      </span>
      <span className="isu-supplier-price-amount">{formatPrice(row.price) || '—'}</span>
      {row.code ? <span className="isu-muted isu-small isu-supplier-price-code">{row.code}</span> : null}
    </div>
  );
}

function PriceEdit({ row, cheapest, onSave }) {
  const id = useId();
  const savedPrice = row.price != null ? String(row.price) : '';
  const savedCode = row.code || '';
  const [priceText, setPriceText] = useState(savedPrice);
  const [code, setCode] = useState(savedCode);
  const { busy, error, run } = useItemsureAction();
  useEffect(() => {
    setPriceText(savedPrice);
    setCode(savedCode);
  }, [savedPrice, savedCode]);
  const dirty = priceText !== savedPrice || code !== savedCode;

  return (
    <form
      className="isu-supplier-price-edit"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => onSave(row.id, { priceText, code }));
      }}
    >
      <div className="isu-supplier-price-name">
        {row.icon ? `${row.icon} ` : ''}{row.name}
        {row.isMain ? <span className="isu-muted isu-small"> · usual</span> : null}
        {cheapest ? <span className="isu-supplier-price-tag">cheapest</span> : null}
        {!row.is_active ? <span className="isu-muted isu-small"> (archived)</span> : null}
      </div>
      <label className="isu-supplier-price-field" htmlFor={`${id}-price`}>
        <span className="isu-muted isu-small">Price</span>
        <input
          id={`${id}-price`}
          type="text"
          inputMode="decimal"
          placeholder="e.g. 12.50"
          value={priceText}
          onChange={(e) => setPriceText(e.target.value)}
          disabled={busy}
        />
      </label>
      <label className="isu-supplier-price-field" htmlFor={`${id}-code`}>
        <span className="isu-muted isu-small">Their code</span>
        <input
          id={`${id}-code`}
          type="text"
          maxLength={80}
          placeholder="optional"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={busy}
        />
      </label>
      <button type="submit" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy || !dirty}>
        Save
      </button>
      <ErrorNote message={error} />
    </form>
  );
}
