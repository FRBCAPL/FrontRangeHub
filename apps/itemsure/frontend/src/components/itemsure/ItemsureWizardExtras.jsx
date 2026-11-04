import React from 'react';
import { Field } from './ItemsureUi.jsx';
import ItemsureWizardIntro from './ItemsureWizardIntro.jsx';

/** Step 4 (optional): SKU, barcode, and description. Size and packaging live on Basics. */
export default function ItemsureWizardExtras({ form, setForm }) {
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  return (
    <div className="isu-stack">
      <ItemsureWizardIntro title="Extras (optional)">Codes and notes. Skip this if you don&apos;t need it.</ItemsureWizardIntro>
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
    </div>
  );
}
