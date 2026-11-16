import React, { useId } from 'react';
import { formatPrice } from '../../utils/itemsureSupplierPrices.js';

/**
 * "Buy from this trip": switches which of the item's suppliers it is listed under, for everyone,
 * until it is received or its tick is cleared. `choice` is { options (main first), current,
 * defaultId, prices (Map supplierId -> number|null, optional), onChoose }.
 */
export default function ItemsureShoppingTripSupplier({ choice }) {
  const id = useId();
  const [main] = choice.options;
  const def = choice.defaultId || main?.id;
  return (
    <div className="isu-shop-trip-pick">
      <label htmlFor={id}>Buy from this trip</label>
      <select id={id} value={choice.current || ''} onChange={(e) => choice.onChoose(e.target.value)}>
        {choice.options.map((s) => {
          const price = choice.prices?.get(s.id);
          const bits = [];
          if (s.id === def) bits.push('default');
          else if (s.id === main.id) bits.push('usual');
          if (price != null) bits.push(formatPrice(price));
          return (
            <option key={s.id} value={s.id}>
              {s.name}{bits.length ? ` (${bits.join(' · ')})` : ''}
            </option>
          );
        })}
      </select>
    </div>
  );
}
