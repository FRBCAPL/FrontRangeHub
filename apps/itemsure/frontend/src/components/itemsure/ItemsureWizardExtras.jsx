import React from 'react';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemPackages from '../../hooks/useItemPackages.js';
import { Field } from './ItemsureUi.jsx';
import ItemsurePackaging from './ItemsurePackaging.jsx';
import ItemsureWizardIntro from './ItemsureWizardIntro.jsx';

/** Step 4 (optional): SKU, barcode, description, and case sizes. */
export default function ItemsureWizardExtras({ form, setForm, unitInfo, features, itemId }) {
  const { organization } = useItemsureWorkspace();
  const packaging = useItemPackages(organization.id);
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  return (
    <div className="isu-stack">
      <ItemsureWizardIntro title="Extras (optional)">Codes, notes, and case sizes. Skip this if you don&apos;t need it.</ItemsureWizardIntro>
      <div className="isu-grid-2">
        <Field label="SKU">
          <input value={form.sku} onChange={set('sku')} maxLength={64} />
        </Field>
        <Field label="Barcode">
          <input value={form.barcode} onChange={set('barcode')} maxLength={64} inputMode="numeric" />
        </Field>
      </div>
      <Field label="Description">
        <textarea value={form.description} onChange={set('description')} rows={3} maxLength={4000} />
      </Field>
      {features.packaging ? (
        itemId && packaging.ready ? (
          <ItemsurePackaging
            item={{ id: itemId, unitName: unitInfo.unitName, precision: unitInfo.precision }}
            packages={packaging.packagesFor(itemId)}
            onChanged={packaging.reload}
          />
        ) : !itemId ? (
          <p className="isu-muted isu-small">Case sizes (like &ldquo;Case = 12 bottles&rdquo;) can be added once the item is saved: open it and choose Edit, then Extras.</p>
        ) : null
      ) : null}
    </div>
  );
}
