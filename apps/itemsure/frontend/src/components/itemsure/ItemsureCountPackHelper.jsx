import React, { useState } from 'react';
import { convertPackageQuantity, describePackage } from '../../utils/itemsurePackages.js';
import ItemsureStepper from './ItemsureStepper.jsx';

/**
 * Works out a count from packages ("3 cases") and fills in the base-unit total.
 * Only the base quantity is saved; the count itself is unchanged.
 */
export default function ItemsureCountPackHelper({ packages, unitName, precision, onUse, onClose }) {
  const [packageId, setPackageId] = useState(packages[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const pkg = packages.find((p) => p.id === packageId) || null;
  const result = pkg ? convertPackageQuantity(quantity, pkg, unitName, precision) : { empty: true };

  return (
    <div className="isu-count-packs">
      <select aria-label="Package" value={packageId} onChange={(e) => { setPackageId(e.target.value); setQuantity(''); }}>
        {packages.map((p) => <option key={p.id} value={p.id}>{describePackage(p, unitName)}</option>)}
      </select>
      <ItemsureStepper
        label={pkg?.name || 'packages'}
        aria-label={`How many ${pkg?.name || 'packages'}`}
        placeholder={`How many ${pkg?.name || 'packages'}`}
        value={quantity}
        onChange={setQuantity}
      />
      {result.base ? <span className="isu-package-preview" aria-live="polite">= {result.base} {unitName}</span> : null}
      {result.error ? <span className="isu-package-problem isu-small" aria-live="polite">{result.error}</span> : null}
      <div className="isu-count-quick">
        <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" disabled={!result.base} onClick={() => onUse(result.base)}>
          {result.base ? `Use ${result.base}` : 'Use'}
        </button>
        <button type="button" className="isu-link" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
