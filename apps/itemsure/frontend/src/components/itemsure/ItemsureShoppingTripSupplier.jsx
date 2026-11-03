import React, { useId } from 'react';

/**
 * "Buy from this trip": switches which of the item's suppliers it is listed under, for everyone,
 * until it is received or its tick is cleared. `choice` is { options (main first), current, onChoose }.
 */
export default function ItemsureShoppingTripSupplier({ choice }) {
  const id = useId();
  const [main] = choice.options;
  return (
    <div className="isu-shop-trip-pick">
      <label htmlFor={id}>Buy from this trip</label>
      <select id={id} value={choice.current || ''} onChange={(e) => choice.onChoose(e.target.value)}>
        {choice.options.map((s) => (
          <option key={s.id} value={s.id}>{s.name}{s.id === main.id ? ' (usual)' : ''}</option>
        ))}
      </select>
    </div>
  );
}
