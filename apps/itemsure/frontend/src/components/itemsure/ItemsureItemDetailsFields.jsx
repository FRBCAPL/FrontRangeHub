import React, { useMemo } from 'react';
import { Field } from './ItemsureUi.jsx';
import { knownBrands, matchBrand } from '../../utils/itemsureItemDetails.js';

/** Brand (suggests brands already used) and the business's own second detail, e.g. Model or Style. */
export default function ItemsureItemDetailsFields({ form, setForm, items, variantLabel }) {
  const brands = useMemo(() => knownBrands(items), [items]);
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const tidyBrand = () => setForm((f) => ({ ...f, brand: matchBrand(brands, f.brand) }));

  return (
    <div className="isu-details-pair">
      <Field label="Brand (optional)">
        <input value={form.brand} onChange={set('brand')} onBlur={tidyBrand} maxLength={80} list="isu-known-brands" placeholder="For example: Bacardi" autoComplete="off" />
      </Field>
      <datalist id="isu-known-brands">
        {brands.map((b) => <option key={b} value={b} />)}
      </datalist>
      <Field label={`${variantLabel} (optional)`}>
        <input value={form.variant} onChange={set('variant')} maxLength={80} autoComplete="off" />
      </Field>
    </div>
  );
}
