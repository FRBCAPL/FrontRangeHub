import React from 'react';
import { describePackage } from '../../utils/itemsurePackages.js';
import { Field } from './ItemsureUi.jsx';
import ItemsureStepper from './ItemsureStepper.jsx';

/**
 * Quantity input that can be typed in the base unit (the default) or in one of
 * the item's active packages. Changing the package clears the quantity so a
 * number meant for one size is never sent as another.
 */
export default function ItemsurePackageQuantity({ item, packages, packageId, onPackageChange, quantity, onQuantityChange, entry }) {
  const pkg = packages.find((p) => p.id === packageId) || null;
  const choosePackage = (id) => {
    onPackageChange(id);
    onQuantityChange('');
  };

  return (
    <>
      {packages.length ? (
        <Field label="Enter amount in">
          <select value={packageId} onChange={(e) => choosePackage(e.target.value)}>
            <option value="">{item.unitName}</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>{describePackage(p, item.unitName)}</option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field label={`Quantity (${pkg ? pkg.name : item.unitName})`}>
        <ItemsureStepper label={pkg ? pkg.name : item.unitName} value={quantity} onChange={onQuantityChange} />
      </Field>
      {pkg && entry?.base ? (
        <p className="isu-package-preview" aria-live="polite">= {entry.base} {item.unitName}</p>
      ) : null}
      {pkg && entry?.error && !entry.empty ? <p className="isu-hint isu-package-problem" aria-live="polite">{entry.error}</p> : null}
    </>
  );
}
