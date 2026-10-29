import React, { useState } from 'react';
import { savePackage, setPackageActive } from '../../services/itemsurePackageService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { describePackage } from '../../utils/itemsurePackages.js';
import { ErrorNote } from './ItemsureUi.jsx';
import ItemsurePackageForm from './ItemsurePackageForm.jsx';

/** Packaging sizes for one item, inside the Edit item window. Stock itself stays in the base unit. */
export default function ItemsurePackaging({ item, packages, onChanged }) {
  const [editing, setEditing] = useState(null);
  const { busy, error, run } = useItemsureAction();
  const sorted = [...packages].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name));

  const saved = async () => {
    setEditing(null);
    await onChanged();
  };
  const toggle = (pkg) =>
    run(async () => {
      await setPackageActive(pkg.id, !pkg.is_active);
      await onChanged();
    });
  const makeDefault = (pkg) =>
    run(async () => {
      await savePackage(item, pkg, { name: pkg.name, size: pkg.size, sku: pkg.sku, barcode: pkg.barcode, isDefault: true });
      await onChanged();
    });

  return (
    <section className="isu-packaging" aria-label="Packaging sizes">
      <div className="isu-card-head">
        <h3>Packaging sizes</h3>
        {editing === null ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setEditing('new')}>Add package</button>
        ) : null}
      </div>
      <p className="isu-muted isu-small">
        Stock is always kept in {item.unitName}. Packages let people enter amounts like &ldquo;2 cases&rdquo; and see the {item.unitName} total.
      </p>
      <ErrorNote message={error} />

      {editing === 'new' ? <ItemsurePackageForm item={item} pkg={null} onSaved={saved} onCancel={() => setEditing(null)} /> : null}

      {sorted.length === 0 && editing === null ? <p className="isu-muted isu-small">No packaging sizes yet.</p> : null}
      <ul className="isu-package-list">
        {sorted.map((pkg) =>
          editing?.id === pkg.id ? (
            <li key={pkg.id}>
              <ItemsurePackageForm item={item} pkg={pkg} onSaved={saved} onCancel={() => setEditing(null)} />
            </li>
          ) : (
            <li key={pkg.id} className={`isu-package${pkg.is_active ? '' : ' is-archived'}`}>
              <div>
                <strong>{pkg.name}</strong>
                {pkg.is_purchase_unit ? <span className="isu-badge">Default</span> : null}
                {!pkg.is_active ? <span className="isu-badge">Archived</span> : null}
                <p className="isu-small">{describePackage(pkg, item.unitName)}</p>
                {pkg.sku || pkg.barcode ? (
                  <p className="isu-muted isu-small">{[pkg.sku && `SKU ${pkg.sku}`, pkg.barcode && `Barcode ${pkg.barcode}`].filter(Boolean).join(' \u00b7 ')}</p>
                ) : null}
              </div>
              <div className="isu-item-actions">
                <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy || editing !== null} onClick={() => setEditing(pkg)}>Edit</button>
                {pkg.is_active && !pkg.is_purchase_unit ? (
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy || editing !== null} onClick={() => makeDefault(pkg)}>Make default</button>
                ) : null}
                <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy || editing !== null} onClick={() => toggle(pkg)}>
                  {pkg.is_active ? 'Archive' : 'Reactivate'}
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
