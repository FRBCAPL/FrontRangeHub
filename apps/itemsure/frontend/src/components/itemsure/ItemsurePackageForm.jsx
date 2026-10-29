import React, { useState } from 'react';
import { savePackage } from '../../services/itemsurePackageService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { checkPackageSize, describePackage } from '../../utils/itemsurePackages.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

/** Add or edit one packaging size. `pkg` is null when adding. */
export default function ItemsurePackageForm({ item, pkg, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: pkg?.name || '',
    size: pkg?.size || '',
    sku: pkg?.sku || '',
    barcode: pkg?.barcode || '',
    isDefault: pkg ? pkg.is_purchase_unit : false,
  });
  const { busy, error, run } = useItemsureAction();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const size = form.size.trim() ? checkPackageSize(form.size, item.unitName, item.precision) : null;
  const preview = size?.value && form.name.trim() ? describePackage({ name: form.name.trim(), size: size.value }, item.unitName) : '';

  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      await savePackage(item, pkg, form);
      await onSaved();
    });
  };

  return (
    <form className="isu-stack isu-package-form" onSubmit={submit}>
      <Field label="Package name" hint="For example Case, Sleeve, or Box of 50.">
        <input maxLength={80} value={form.name} onChange={set('name')} autoComplete="off" />
      </Field>
      <Field
        label={`${item.unitName} in one package`}
        hint={pkg ? 'Once a package is used in a stock change its size is fixed. Archive it and add a new one if the size changes.' : undefined}
      >
        <input inputMode="decimal" autoComplete="off" value={form.size} onChange={set('size')} />
      </Field>
      {size?.error ? <p className="isu-hint isu-package-problem">{size.error}</p> : null}
      {preview ? <p className="isu-package-preview">{preview}</p> : null}
      <div className="isu-package-ids">
        <Field label="Package SKU" hint="Optional.">
          <input maxLength={64} value={form.sku} onChange={set('sku')} autoComplete="off" />
        </Field>
        <Field label="Package barcode" hint="Optional.">
          <input maxLength={64} value={form.barcode} onChange={set('barcode')} autoComplete="off" />
        </Field>
      </div>
      {!pkg || pkg.is_active ? (
        <label className="isu-check">
          <input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} /> Default package for purchasing
        </label>
      ) : null}
      <ErrorNote message={error} />
      <div className="isu-card-actions">
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy || Boolean(size?.error)}>
          {busy ? 'Saving…' : pkg ? 'Save package' : 'Add package'}
        </button>
      </div>
    </form>
  );
}
