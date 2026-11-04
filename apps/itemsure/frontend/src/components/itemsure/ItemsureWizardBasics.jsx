import React from 'react';
import { Field } from './ItemsureUi.jsx';
import { categoryTree } from '../../utils/itemsureCategories.js';
import { categoryPieces, categorySize } from '../../utils/itemsureCategoryDefaults.js';
import { applySuggestions, suggestExtras, trackExtraEdits } from '../../utils/itemsureCategorySuggest.js';
import ItemsureCategoryPicker from './ItemsureCategoryPicker.jsx';
import ItemsureNameClash from './ItemsureNameClash.jsx';
import ItemsureExtraCategoryPicker from './ItemsureExtraCategoryPicker.jsx';
import ItemsureUnitPicker from './ItemsureUnitPicker.jsx';
import ItemsureSupplierPicker from './ItemsureSupplierPicker.jsx';
import ItemsureOtherSuppliersPicker from './ItemsureOtherSuppliersPicker.jsx';
import ItemsureItemDetailsFields from './ItemsureItemDetailsFields.jsx';
import ItemsureItemSizePackaging from './ItemsureItemSizePackaging.jsx';

/** Step 1: name, what it's counted in (with size and packaging), category, and supplier. */
export default function ItemsureWizardBasics({ form, setForm, unitInfo, features, organizationId, categories, categoryDefaults = null, units, items = [], itemId, nameClash, renamingArchived, onRestored, canManageCategories, onCategoryAdded, canManageUnits, onUnitAdded, editing, suppliers, canAddSupplier, onSupplierAdded, variantLabel }) {
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const extras = 'extra_category_ids' in form;
  const byId = new Map(categories.map((c) => [c.id, c]));
  const cat = byId.get(form.category_id);
  const sizeHint = [form.name, cat?.name, byId.get(cat?.parent_category_id)?.name].filter(Boolean).join(' ');
  const chooseMain = (id) => setForm((f) => {
    if (!extras || id === f.category_id) return { ...f, category_id: id };
    return { ...f, category_id: id, ...applySuggestions(f, suggestExtras(categoryTree(categories), items, id, itemId)) };
  });
  return (
    <div className="isu-stack">
      <div className="isu-wizard-name-row">
        <Field label="Item name">
          <input value={form.name} onChange={set('name')} maxLength={160} placeholder="For example: Well Rum" />
        </Field>
        {'brand' in form ? <ItemsureItemDetailsFields form={form} setForm={setForm} items={items} variantLabel={variantLabel} /> : null}
      </div>
      <ItemsureNameClash
        clash={nameClash}
        items={items}
        organizationId={organizationId}
        renaming={renamingArchived}
        onRenameChange={(on) => setForm((f) => ({ ...f, rename_archived_id: on ? nameClash.item.id : null }))}
        onRestored={onRestored}
      />
      <div className="isu-wizard-pair">
        <ItemsureUnitPicker
          organizationId={organizationId}
          units={units}
          items={items.filter((i) => i.is_active && i.id !== itemId)}
          value={form.base_unit_id}
          onChange={(id) => setForm((f) => ({ ...f, base_unit_id: id }))}
          canManage={canManageUnits}
          onAdded={onUnitAdded}
          hint={editing
            ? 'Can only change while the item has no stock history and no warning levels.'
            : 'Like each, bottle, or keg. Sizes and case packs go just below.'}
        />
        <ItemsureCategoryPicker
          organizationId={organizationId}
          categories={categories}
          value={form.category_id}
          onChange={chooseMain}
          canManage={canManageCategories}
          onAdded={onCategoryAdded}
        />
      </div>
      <ItemsureItemSizePackaging
        form={form}
        setForm={setForm}
        unit={units.find((u) => u.id === form.base_unit_id)}
        unitInfo={unitInfo}
        features={features}
        itemId={itemId}
        categorySize={categorySize(form, byId, categoryDefaults)}
        categoryPieces={categoryPieces(form, byId, categoryDefaults)}
        sizeHint={sizeHint}
      />
      <div className="isu-wizard-pair">
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
          <div className="isu-stack isu-wizard-suppliers">
            <ItemsureSupplierPicker
              organizationId={organizationId}
              suppliers={suppliers}
              value={form.supplier_id}
              onChange={(id) => setForm((f) => ({ ...f, supplier_id: id }))}
              canAdd={canAddSupplier}
              onAdded={onSupplierAdded}
            />
            {'other_supplier_ids' in form ? (
              <ItemsureOtherSuppliersPicker
                suppliers={suppliers}
                mainId={form.supplier_id}
                value={form.other_supplier_ids}
                onChange={(ids) => setForm((f) => ({ ...f, other_supplier_ids: ids }))}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
