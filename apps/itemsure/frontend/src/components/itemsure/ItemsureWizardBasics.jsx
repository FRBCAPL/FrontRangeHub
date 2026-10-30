import React from 'react';
import { Field } from './ItemsureUi.jsx';
import { categoryTree } from '../../utils/itemsureCategories.js';
import { applySuggestions, suggestExtras, trackExtraEdits } from '../../utils/itemsureCategorySuggest.js';
import ItemsureCategoryPicker from './ItemsureCategoryPicker.jsx';
import ItemsureNameClash from './ItemsureNameClash.jsx';
import ItemsureExtraCategoryPicker from './ItemsureExtraCategoryPicker.jsx';
import ItemsureUnitPicker from './ItemsureUnitPicker.jsx';
import ItemsureWizardIntro from './ItemsureWizardIntro.jsx';
import ItemsureSupplierPicker from './ItemsureSupplierPicker.jsx';
import ItemsureItemDetailsFields from './ItemsureItemDetailsFields.jsx';

/** Step 1: name, what it's counted in, category, and supplier (once suppliers are set up). */
export default function ItemsureWizardBasics({ form, setForm, organizationId, categories, units, items = [], itemId, nameClash, renamingArchived, onRestored, canManageCategories, onCategoryAdded, canManageUnits, onUnitAdded, editing, suppliers, canAddSupplier, onSupplierAdded, variantLabel }) {
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const extras = 'extra_category_ids' in form;
  const chooseMain = (id) => setForm((f) => {
    if (!extras || id === f.category_id) return { ...f, category_id: id };
    return { ...f, category_id: id, ...applySuggestions(f, suggestExtras(categoryTree(categories), items, id, itemId)) };
  });
  return (
    <div className="isu-stack">
      <ItemsureWizardIntro title="What is the item?">Its name, what you count it in, and where it belongs in your list.</ItemsureWizardIntro>
      <Field label="Item name">
        <input value={form.name} onChange={set('name')} maxLength={160} placeholder="For example: Well Rum" />
      </Field>
      <ItemsureNameClash
        clash={nameClash}
        items={items}
        organizationId={organizationId}
        renaming={renamingArchived}
        onRenameChange={(on) => setForm((f) => ({ ...f, rename_archived_id: on ? nameClash.item.id : null }))}
        onRestored={onRestored}
      />
      {'brand' in form ? <ItemsureItemDetailsFields form={form} setForm={setForm} items={items} variantLabel={variantLabel} /> : null}
      <ItemsureUnitPicker
        organizationId={organizationId}
        units={units}
        value={form.base_unit_id}
        onChange={(id) => setForm((f) => ({ ...f, base_unit_id: id }))}
        canManage={canManageUnits}
        onAdded={onUnitAdded}
        hint={editing
          ? 'Can only change while the item has no stock history and no warning levels.'
          : `What you count this item in, for example each, bottle, or kilogram.${canManageUnits ? ' Not listed? Pick "Other" to name your own.' : ''} Case sizes come later, under Extras.`}
      />
      <ItemsureCategoryPicker
        organizationId={organizationId}
        categories={categories}
        value={form.category_id}
        onChange={chooseMain}
        canManage={canManageCategories}
        onAdded={onCategoryAdded}
      />
      {extras ? (
        <ItemsureExtraCategoryPicker
          organizationId={organizationId}
          categories={categories}
          mainId={form.category_id}
          value={form.extra_category_ids}
          suggested={form.suggested_extra_ids || []}
          onChange={(ids) => setForm((f) => ({ ...f, ...trackExtraEdits(f, ids) }))}
          canManage={canManageCategories}
          onAdded={onCategoryAdded}
        />
      ) : null}
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
