import React from 'react';
import { Field } from './ItemsureUi.jsx';
import ItemsureCategoryPicker from './ItemsureCategoryPicker.jsx';
import ItemsureWizardIntro from './ItemsureWizardIntro.jsx';
import ItemsureSupplierPicker from './ItemsureSupplierPicker.jsx';

/** Step 1: name, what it's counted in, category, and supplier (once suppliers are set up). */
export default function ItemsureWizardBasics({ form, setForm, organizationId, categories, units, canManageCategories, onCategoryAdded, editing, suppliers, canAddSupplier, onSupplierAdded }) {
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  return (
    <div className="isu-stack">
      <ItemsureWizardIntro title="What is the item?">Its name, what you count it in, and where it belongs in your list.</ItemsureWizardIntro>
      <Field label="Item name">
        <input value={form.name} onChange={set('name')} maxLength={160} placeholder="For example: Well Rum" />
      </Field>
      <Field
        label="Counted in"
        hint={editing
          ? 'Can only change while the item has no stock history and no warning levels.'
          : 'What you count this item in, for example each, bottle, or kilogram. Case sizes come later, under Extras.'}
      >
        <select value={form.base_unit_id} onChange={set('base_unit_id')}>
          {units.map((u) => (
            <option key={u.id} value={u.id}>{u.name}{u.symbol ? ` (${u.symbol})` : ''}</option>
          ))}
        </select>
      </Field>
      <ItemsureCategoryPicker
        organizationId={organizationId}
        categories={categories}
        value={form.category_id}
        onChange={(id) => setForm((f) => ({ ...f, category_id: id }))}
        canManage={canManageCategories}
        onAdded={onCategoryAdded}
      />
      {'supplier_id' in form ? (
        <ItemsureSupplierPicker
          organizationId={organizationId}
          suppliers={suppliers}
          value={form.supplier_id}
          onChange={(id) => setForm((f) => ({ ...f, supplier_id: id }))}
          canAdd={canAddSupplier}
          onAdded={onSupplierAdded}
        />
      ) : null}
    </div>
  );
}
