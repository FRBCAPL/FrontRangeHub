import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { saveItemBasics } from '../../services/itemsureItemWizardSave.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { variantLabelFor } from '../../utils/itemsureItemDetails.js';
import { findNameClash } from '../../utils/itemsureItemNames.js';
import { checkContent, checkPieces, unitAsks } from '../../utils/itemsureItemContent.js';
import { emptyForm } from '../../utils/itemsureItemWizardForm.js';
import { mergeUnits } from '../../utils/itemsureUnits.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { ErrorNote, Modal } from './ItemsureUi.jsx';
import ItemsureWizardBasics from './ItemsureWizardBasics.jsx';

/**
 * Quick edit of catalog fields over the item window — About / Counted in / Suppliers —
 * without navigating to the full guided page. Reuses the item modal's catalog + suppliers.
 * Parent should remount with `key={item.id}` each open so the form starts clean.
 */
export default function ItemsureItemEditModal({
  item,
  catalog,
  suppliers,
  supplierPrices,
  onClose,
  onSaved,
  onCatalogChanged,
}) {
  const { organization, features, can } = useItemsureWorkspace();
  const [addedCategories, setAddedCategories] = useState([]);
  const [addedUnits, setAddedUnits] = useState([]);
  const [form, setForm] = useState(null);
  const [stepError, setStepError] = useState('');
  const [problems, setProblems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!suppliers.ready || form) return;
    setForm(emptyForm(
      item,
      catalog.units,
      suppliers,
      catalog.extrasAvailable,
      null,
      catalog.detailsAvailable && features.details,
      catalog.topOffAvailable,
      catalog.contentsAvailable,
      catalog.piecesAvailable,
    ));
  }, [suppliers, form, item, catalog, features.details]);

  const knownCategories = new Set(catalog.categories.map((c) => c.id));
  const categories = [...catalog.categories, ...addedCategories.filter((c) => !knownCategories.has(c.id))];
  const units = mergeUnits(catalog.units, addedUnits);
  const unit = form ? units.find((u) => u.id === form.base_unit_id) : null;
  const unitInfo = { precision: unit?.precision_scale ?? 0, unitName: unit?.name || 'This unit', unitSymbol: unit?.symbol || unit?.name || '' };
  const nameClash = form ? findNameClash(catalog.items, form.name, { itemId: item.id, originalName: item.name }) : null;
  const renamingArchived = Boolean(nameClash?.archived && form?.rename_archived_id === nameClash.item.id);

  const validate = () => {
    if (!form.name.trim()) return 'Give the item a name.';
    if (nameClash && !nameClash.archived) return `You already have an item called "${nameClash.item.name}". Use a different name.`;
    if (nameClash && !renamingArchived) return `You have an archived item called "${nameClash.item.name}". Restore it, or choose "Create a new one".`;
    if (!form.base_unit_id) return 'Choose what it is counted in.';
    if ('content_size' in form && unitAsks(unit) === 'size') {
      const size = checkContent(form.content_size, form.content_unit);
      if (size.error) return size.error;
    }
    if ('pieces' in form && unitAsks(unit) === 'pieces') {
      const count = checkPieces(form.pieces);
      if (count.error) return count.error;
    }
    return '';
  };

  const save = async () => {
    const error = validate();
    if (error) {
      setStepError(error);
      return;
    }
    setSaving(true);
    setStepError('');
    setProblems([]);
    const result = await saveItemBasics({
      organizationId: organization.id,
      item,
      itemId: item.id,
      form,
      unit,
      renameArchivedId: renamingArchived ? nameClash.item.id : null,
    });
    setSaving(false);
    if (result.problems.length) {
      setProblems(result.problems.map((p) => p.message));
      return;
    }
    await onSaved?.();
    onClose();
  };

  return (
    <Modal
      nested
      open
      title="Edit details"
      subtitle={item.name}
      onClose={saving ? () => {} : onClose}
      className="isu-modal--item-edit"
      ariaLabel={`Edit details for ${item.name}`}
    >
      <div className="isu-stack isu-item-edit">
        {!form ? (
          <p className="isu-muted">Loading…</p>
        ) : (
          <>
            <ErrorNote message={stepError} />
            {problems.length ? (
              <ul className="isu-problem-list" aria-label="Save problems">
                {problems.map((message) => <li key={message}>{message}</li>)}
              </ul>
            ) : null}

            <ItemsureWizardBasics
              form={form}
              setForm={setForm}
              stepError={stepError}
              unitInfo={unitInfo}
              features={features}
              organizationId={organization.id}
              categories={categories}
              categoryDefaults={catalog.categoryDefaults}
              units={units}
              items={catalog.items}
              itemId={item.id}
              nameClash={nameClash}
              renamingArchived={renamingArchived}
              onRestored={onClose}
              canManageCategories={can('categories.manage')}
              onCategoryAdded={(row) => {
                setAddedCategories((list) => [...list, row]);
                onCatalogChanged?.();
              }}
              canManageUnits={can('units.manage')}
              onUnitAdded={(row) => {
                setAddedUnits((list) => [...list, row]);
                onCatalogChanged?.();
              }}
              editing
              suppliers={suppliers.suppliers}
              canAddSupplier={can('suppliers.manage')}
              onSupplierAdded={async (id) => {
                await suppliers.reload();
                setForm((f) => ({ ...f, supplier_id: id }));
              }}
              variantLabel={variantLabelFor(organization)}
              supplierPrices={supplierPrices}
            />

            <div className="isu-item-edit-nav">
              <button type="button" className="isu-btn isu-btn--ghost" disabled={saving} onClick={onClose}>Cancel</button>
              <button type="button" className="isu-btn isu-btn--primary" disabled={saving} onClick={save}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            <p className="isu-muted isu-small isu-item-edit-more">
              On hand, warn levels, SKU, or archive?{' '}
              <Link to={`${ITEMSURE_PATH}/items/${item.id}/edit`}>Open full edit</Link>
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
