import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { listCatalog } from '../../services/itemsureItemService.js';
import { saveItemWizard } from '../../services/itemsureItemWizardSave.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { variantLabelFor } from '../../utils/itemsureItemDetails.js';
import useItemPlaces from '../../hooks/useItemPlaces.js';
import useItemStock from '../../hooks/useItemStock.js';
import useItemUsage from '../../hooks/useItemUsage.js';
import useSuppliers from '../../hooks/useSuppliers.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { SITE } from '../../data/itemsureTerms.js';
import { visibleSlots } from '../../utils/itemsureItemStock.js';
import { NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { checkAmounts, checkLevels, entriesFromGroups, STEPS, wizardSteps } from '../../utils/itemsureItemWizard.js';
import { mergeUnits } from '../../utils/itemsureUnits.js';
import { findNameClash } from '../../utils/itemsureItemNames.js';
import { ErrorNote, LoadFailed, PageHead } from './ItemsureUi.jsx';
import ItemsureWizardProgress from './ItemsureWizardProgress.jsx';
import ItemsureWizardBasics from './ItemsureWizardBasics.jsx';
import ItemsureWizardWhere from './ItemsureWizardWhere.jsx';
import ItemsureWizardLevels from './ItemsureWizardLevels.jsx';
import ItemsureWizardExtras from './ItemsureWizardExtras.jsx';
import ItemsureWizardReview from './ItemsureWizardReview.jsx';
import ItemsureWizardArchive from './ItemsureWizardArchive.jsx';

/** ?supplier=<id> (from a supplier card) pre-selects it for a new item, if it is an active supplier. */
const startingSupplier = (suppliers, wanted) =>
  (wanted && suppliers.suppliers.some((s) => s.id === wanted && s.is_active) ? wanted : '');

const emptyForm = (item, units, suppliers, extrasAvailable, wantedSupplier, detailsOn) => ({
  name: item?.name || '',
  description: item?.description || '',
  sku: item?.sku || '',
  barcode: item?.barcode || '',
  category_id: item?.category_id || '',
  base_unit_id: item?.base_unit_id || units.find((u) => u.code === 'each' && !u.organization_id)?.id || units[0]?.id || '',
  // Only once suppliers are set up in the database, so saving never sends an unknown column.
  ...(suppliers.available
    ? { supplier_id: item ? suppliers.supplierIdFor(item.id) || '' : startingSupplier(suppliers, wantedSupplier) }
    : {}),
  ...(extrasAvailable ? { extra_category_ids: item?.extraCategoryIds || [] } : {}),
  // Only when brand and details are set up and switched on, so a hidden value is never cleared.
  ...(detailsOn ? { brand: item?.brand || '', variant: item?.variant || '' } : {}),
});

/** Guided Add item (/items/new) and Edit item (/items/:itemId/edit, ?step=levels to jump). */
export default function ItemsureItemWizard() {
  const { itemId: routeItemId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { organization, features, can } = useItemsureWorkspace();
  const canView = can('inventory.view');
  const allowed = { view: canView, levels: can('inventory.targets.manage'), amounts: can('inventory.adjust') && can('counts.approve') };
  const steps = wizardSteps({ canView, canLevels: allowed.levels });

  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [itemId, setItemId] = useState(routeItemId || null);
  const [form, setForm] = useState(null);
  const [entries, setEntries] = useState(null);
  const [step, setStep] = useState(() => (steps.includes(params.get('step')) ? params.get('step') : 'basics'));
  const [visited, setVisited] = useState(() => new Set(['basics']));
  const [stepError, setStepError] = useState('');
  const [problems, setProblems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [addedCategories, setAddedCategories] = useState([]);
  const [addedUnits, setAddedUnits] = useState([]);
  const places = useItemPlaces(organization.id);
  const suppliers = useSuppliers(organization.id);
  const { stock } = useItemStock(organization.id, canView);
  const usage = useItemUsage(organization.id, routeItemId, Boolean(routeItemId) && canView && can('inventory.activity'));
  const started = useRef(false);

  const load = useCallback(async () => {
    try {
      setCatalog(await listCatalog(organization.id));
      setLoadError('');
    } catch (e) {
      setLoadError(e.message);
    }
  }, [organization.id]);
  useEffect(() => {
    load();
  }, [load]);

  const item = catalog?.items.find((i) => i.id === routeItemId) || null;
  const editing = Boolean(routeItemId);
  // Opened from the Suppliers page: Back, Cancel, and Save return there.
  const fromSuppliers = params.get('from') === 'suppliers';
  const leaveTo = fromSuppliers ? `${ITEMSURE_PATH}/suppliers` : editing ? `${ITEMSURE_PATH}/items/${routeItemId}` : `${ITEMSURE_PATH}/items`;

  // Fill the form and places once everything has loaded; later reloads never overwrite typing.
  useEffect(() => {
    if (started.current || !catalog || (editing && !item) || !places.ready || !suppliers.ready || (canView && !stock)) return;
    started.current = true;
    setForm(emptyForm(item, catalog.units, suppliers, catalog.extrasAvailable, params.get('supplier'), catalog.detailsAvailable && features.details));
    const sources = { places: places.placesFor(routeItemId) || [], balances: stock?.balances || [], targets: stock?.targets || [], locations: places.locations };
    setEntries(editing ? entriesFromGroups(visibleSlots(routeItemId, sources)) : []);
  }, [catalog, item, editing, places, suppliers, stock, canView, routeItemId, params, features.details]);

  if (!can('items.manage')) return <p className="isu-muted">Your role doesn&apos;t include adding or changing items.</p>;
  if (loadError) return <LoadFailed message={loadError} onRetry={load} />;
  if (catalog && editing && !item) {
    return (
      <div className="isu-card isu-empty">
        <h2>Item not found</h2>
        <Link to={`${ITEMSURE_PATH}/items`}>Back to items</Link>
      </div>
    );
  }
  if (!form || !entries) return <p className="isu-muted">Loading…</p>;

  const knownCategories = new Set(catalog.categories.map((c) => c.id));
  const categories = [...catalog.categories, ...addedCategories.filter((c) => !knownCategories.has(c.id))];
  const units = mergeUnits(catalog.units, addedUnits);
  const unit = units.find((u) => u.id === form.base_unit_id);
  const unitInfo = { precision: unit?.precision_scale ?? 0, unitName: unit?.name || 'This unit', unitSymbol: unit?.symbol || unit?.name || '' };
  const labelFor = (e) => {
    const location = places.locations.find((l) => l.id === e.locationId);
    if (e.storageAreaId) return `${location?.name} \u00b7 ${location?.storageAreas.find((a) => a.id === e.storageAreaId)?.name || 'Spot'}`;
    const hasSpots = features.spots && (location?.storageAreas || []).some((a) => a.is_active);
    return hasSpots ? `${location?.name} \u00b7 ${NO_AREA_LABEL}` : location?.name || SITE;
  };

  const nameClash = findNameClash(catalog.items, form.name, { itemId, originalName: item?.name ?? null });
  const renamingArchived = Boolean(nameClash?.archived && form.rename_archived_id === nameClash.item.id);

  const problemFor = (id) => {
    if (id === 'basics') {
      if (!form.name.trim()) return 'Give the item a name.';
      if (nameClash && !nameClash.archived) return `You already have an item called "${nameClash.item.name}". Use a different name.`;
      if (nameClash && !renamingArchived) return `You have an archived item called "${nameClash.item.name}". Restore it, or choose "Create a new one".`;
      if (!form.base_unit_id) return 'Choose what it is counted in.';
    }
    if (id === 'where' && allowed.amounts) {
      const p = checkAmounts(entries, unitInfo.precision, unitInfo.unitName);
      if (p) return `${labelFor(entries.find((e) => e.key === p.key))}: ${p.error}`;
    }
    if (id === 'levels') {
      const p = checkLevels(entries, unitInfo.precision, unitInfo.unitName);
      if (p) return `${labelFor(entries.find((e) => e.key === p.key))}: ${p.error}`;
    }
    return '';
  };

  const goTo = (target) => {
    const here = steps.indexOf(step);
    const there = steps.indexOf(target);
    if (there > here) {
      for (const id of steps.slice(here, there)) {
        const p = problemFor(id);
        if (p) {
          setStep(id);
          setStepError(p);
          return;
        }
      }
    }
    setStepError('');
    setStep(target);
    setVisited((v) => new Set([...v, target]));
    window.scrollTo?.(0, 0);
  };
  const index = steps.indexOf(step);

  const save = async () => {
    for (const id of steps) {
      const p = problemFor(id);
      if (p) {
        setStep(id);
        setStepError(p);
        return;
      }
    }
    setSaving(true);
    setProblems([]);
    const result = await saveItemWizard({
      organizationId: organization.id,
      item,
      itemId,
      form,
      entries,
      unit,
      labelFor,
      renameArchivedId: renamingArchived ? nameClash.item.id : null,
      canAmounts: allowed.amounts,
      canLevels: allowed.levels,
    });
    setSaving(false);
    setItemId(result.itemId);
    setEntries(result.entries);
    if (!result.problems.length) {
      navigate(fromSuppliers ? leaveTo : `${ITEMSURE_PATH}/items/${result.itemId}`);
      return;
    }
    setProblems(result.problems);
    setStep('review');
  };

  const shared = { form, setForm, entries, setEntries, labelFor, unitInfo, allowed, features, variantLabel: variantLabelFor(organization) };

  return (
    <div className="isu-page isu-wizard">
      <Link to={leaveTo} className="isu-link isu-small">
        {'\u2190'} {fromSuppliers ? 'Suppliers' : editing ? item.name : 'Inventory'}
      </Link>
      <PageHead title={editing ? `Edit ${item.name}` : 'Add item'} description={`Step ${index + 1} of ${steps.length}: ${STEPS[step]}`} />
      <ItemsureWizardProgress steps={steps} current={step} reachable={(id) => editing || visited.has(id)} onPick={goTo} />
      <ErrorNote message={stepError} />

      <section className="isu-card isu-wizard-body">
        {step === 'basics' ? (
          <ItemsureWizardBasics
            {...shared}
            organizationId={organization.id}
            categories={categories}
            units={units}
            items={catalog.items}
            itemId={itemId}
            nameClash={nameClash}
            renamingArchived={renamingArchived}
            onRestored={(id) => navigate(`${ITEMSURE_PATH}/items/${id}`)}
            canManageCategories={can('categories.manage')}
            onCategoryAdded={(row) => {
              setAddedCategories((list) => [...list, row]);
              load();
            }}
            canManageUnits={can('units.manage')}
            onUnitAdded={(row) => {
              setAddedUnits((list) => [...list, row]);
              load();
            }}
            editing={editing}
            suppliers={suppliers.suppliers}
            canAddSupplier={can('suppliers.manage')}
            onSupplierAdded={async (id) => {
              await suppliers.reload();
              setForm((f) => ({ ...f, supplier_id: id }));
            }}
          />
        ) : null}
        {step === 'where' ? <ItemsureWizardWhere {...shared} locations={places.locations} /> : null}
        {step === 'levels' ? <ItemsureWizardLevels {...shared} usage={usage} /> : null}
        {step === 'extras' ? <ItemsureWizardExtras {...shared} organizationId={organization.id} itemId={itemId} /> : null}
        {step === 'review' ? <ItemsureWizardReview {...shared} categories={categories} suppliers={suppliers.suppliers} problems={problems} editing={editing} steps={steps} onEdit={goTo} /> : null}
      </section>

      <div className="isu-wizard-nav">
        <div className="isu-wizard-nav-group">
          <button
            type="button"
            className="isu-btn isu-btn--ghost"
            disabled={saving}
            onClick={() => navigate(leaveTo)}
          >
            Cancel
          </button>
          {index > 0 ? <button type="button" className="isu-btn isu-btn--ghost" onClick={() => goTo(steps[index - 1])}>Back</button> : null}
        </div>
        <div className="isu-wizard-nav-group">
          {step === 'review' || editing ? (
            <button type="button" className="isu-btn isu-btn--primary" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : problems.length ? 'Save again' : editing ? 'Save changes' : 'Save item'}
            </button>
          ) : null}
          {step !== 'review' ? (
            <button type="button" className={`isu-btn ${editing ? 'isu-btn--ghost' : 'isu-btn--primary'}`} onClick={() => goTo(steps[index + 1])}>Next</button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <ItemsureWizardArchive
          organizationId={organization.id}
          item={item}
          onDone={(active) => navigate(active ? `${ITEMSURE_PATH}/items/${item.id}` : `${ITEMSURE_PATH}/items`)}
        />
      ) : null}
    </div>
  );
}
