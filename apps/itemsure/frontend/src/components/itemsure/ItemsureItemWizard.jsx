import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { listCatalog } from '../../services/itemsureItemService.js';
import { saveItemWizard } from '../../services/itemsureItemWizardSave.js';
import { addShoppingExtra } from '../../services/itemsureShoppingExtrasService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { variantLabelFor } from '../../utils/itemsureItemDetails.js';
import useItemPlaces from '../../hooks/useItemPlaces.js';
import useItemStock from '../../hooks/useItemStock.js';
import useItemUsage from '../../hooks/useItemUsage.js';
import useSuppliers from '../../hooks/useSuppliers.js';
import useSupplierPrices from '../../hooks/useSupplierPrices.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { itemAddress } from '../../hooks/useItemModal.js';
import { SITE } from '../../data/itemsureTerms.js';
import { posTabPath } from '../../utils/itemsurePosTabs.js';
import { addPosLink } from '../../services/itemsurePosService.js';
import { visibleSlots } from '../../utils/itemsureItemStock.js';
import { NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { checkAmounts, checkLevels, entriesFromGroups, STEPS, wizardSteps } from '../../utils/itemsureItemWizard.js';
import { mergeUnits } from '../../utils/itemsureUnits.js';
import { findNameClash } from '../../utils/itemsureItemNames.js';
import { checkTopOffPercent } from '../../utils/itemsureTopOff.js';
import { checkContent, checkPieces, unitAsks } from '../../utils/itemsureItemContent.js';
import { emptyForm } from '../../utils/itemsureItemWizardForm.js';
import { ErrorNote, LoadFailed, PageHead } from './ItemsureUi.jsx';
import ItemsureWizardProgress from './ItemsureWizardProgress.jsx';
import ItemsureWizardBasics, { basicsPanelForError, basicsPanels } from './ItemsureWizardBasics.jsx';
import ItemsureWizardWhere from './ItemsureWizardWhere.jsx';
import ItemsureWizardLevels from './ItemsureWizardLevels.jsx';
import ItemsureWizardExtras from './ItemsureWizardExtras.jsx';
import ItemsureWizardReview from './ItemsureWizardReview.jsx';
import ItemsureWizardArchive from './ItemsureWizardArchive.jsx';

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
  const [basicsPanel, setBasicsPanel] = useState('about');
  const [visited, setVisited] = useState(() => new Set(['basics']));
  const [stepError, setStepError] = useState('');
  const [problems, setProblems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [addedCategories, setAddedCategories] = useState([]);
  const [addedUnits, setAddedUnits] = useState([]);
  const places = useItemPlaces(organization.id);
  const suppliers = useSuppliers(organization.id);
  const supplierPrices = useSupplierPrices(organization.id);
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
  // Opened from Suppliers, Shopping list, or Clover matching: Back/Cancel/Save return there.
  // From Shopping, the new item is also put on the list (?amount=). From Clover, it is linked to that button.
  const fromSuppliers = params.get('from') === 'suppliers';
  const fromShopping = params.get('from') === 'shopping' && !editing;
  const fromPos = params.get('from') === 'pos' && !editing;
  const cloverExternalId = fromPos ? (params.get('clover') || '').trim() : '';
  const leaveTo = fromSuppliers
    ? `${ITEMSURE_PATH}/suppliers`
    : fromShopping
      ? `${ITEMSURE_PATH}/restock`
      : fromPos
        ? posTabPath(ITEMSURE_PATH, 'buttons')
        : editing
          ? itemAddress(routeItemId)
          : `${ITEMSURE_PATH}/items`;
  const leaveLabel = fromSuppliers
    ? 'Suppliers'
    : fromShopping
      ? 'Shopping list'
      : fromPos
        ? 'Clover buttons'
        : editing
          ? (item?.name || 'Inventory')
          : 'Inventory';

  // Fill the form and places once everything has loaded; later reloads never overwrite typing.
  useEffect(() => {
    if (started.current || !catalog || (editing && !item) || !places.ready || !suppliers.ready || (canView && !stock)) return;
    started.current = true;
    const fresh = emptyForm(item, catalog.units, suppliers, catalog.extrasAvailable, params.get('supplier'), catalog.detailsAvailable && features.details, catalog.topOffAvailable, catalog.contentsAvailable, catalog.piecesAvailable);
    const typedName = editing ? '' : (params.get('name') || '').trim();
    setForm(typedName ? { ...fresh, name: typedName } : fresh);
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
      if ('content_size' in form && unitAsks(unit) === 'size') {
        const size = checkContent(form.content_size, form.content_unit);
        if (size.error) return size.error;
      }
      if ('pieces' in form && unitAsks(unit) === 'pieces') {
        const count = checkPieces(form.pieces);
        if (count.error) return count.error;
      }
    }
    if (id === 'where' && allowed.amounts) {
      const p = checkAmounts(entries, unitInfo.precision, unitInfo.unitName);
      if (p) return `${labelFor(entries.find((e) => e.key === p.key))}: ${p.error}`;
    }
    if (id === 'levels') {
      const p = checkLevels(entries, unitInfo.precision, unitInfo.unitName);
      if (p) return `${labelFor(entries.find((e) => e.key === p.key))}: ${p.error}`;
      if ('topoff_percent' in form) {
        const topOff = checkTopOffPercent(form.topoff_percent);
        if (topOff.error) return topOff.error;
      }
    }
    return '';
  };

  const showBuy = form ? 'supplier_id' in form : false;
  const panelOrder = basicsPanels(showBuy);

  const goTo = (target) => {
    const here = steps.indexOf(step);
    const there = steps.indexOf(target);
    if (there > here) {
      for (const id of steps.slice(here, there)) {
        const p = problemFor(id);
        if (p) {
          setStep(id);
          setStepError(p);
          if (id === 'basics') setBasicsPanel(basicsPanelForError(p));
          return;
        }
      }
    }
    setStepError('');
    setStep(target);
    if (target === 'basics' && there < here) setBasicsPanel(panelOrder[panelOrder.length - 1] || 'about');
    setVisited((v) => new Set([...v, target]));
    window.scrollTo?.(0, 0);
  };

  /** On the Item step, Next/Back walk About → Counted in → Suppliers before leaving. */
  const moveBasics = (dir) => {
    const i = panelOrder.indexOf(basicsPanel);
    if (dir > 0) {
      const p = problemFor('basics');
      if (p && basicsPanelForError(p) === basicsPanel) {
        setStepError(p);
        return true;
      }
      if (i >= 0 && i < panelOrder.length - 1) {
        setStepError('');
        setBasicsPanel(panelOrder[i + 1]);
        window.scrollTo?.(0, 0);
        return true;
      }
      return false;
    }
    if (i > 0) {
      setStepError('');
      setBasicsPanel(panelOrder[i - 1]);
      window.scrollTo?.(0, 0);
      return true;
    }
    return false;
  };

  const index = steps.indexOf(step);
  const nextBasicsLabel = step === 'basics' && basicsPanel === 'about'
    ? 'Next: Counted in'
    : step === 'basics' && basicsPanel === 'count' && showBuy
      ? 'Next: Suppliers'
      : null;

  const save = async () => {
    for (const id of steps) {
      const p = problemFor(id);
      if (p) {
        setStep(id);
        setStepError(p);
        if (id === 'basics') setBasicsPanel(basicsPanelForError(p));
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
      if (fromShopping) {
        await addShoppingExtra(organization.id, { itemId: result.itemId, supplierId: form.supplier_id, name: form.name, amount: params.get('amount') || '' }).catch(() => {});
      }
      if (cloverExternalId) {
        await addPosLink(organization.id, cloverExternalId, result.itemId).catch(() => {});
      }
      navigate(fromSuppliers || fromShopping || fromPos ? leaveTo : itemAddress(result.itemId));
      return;
    }
    setProblems(result.problems);
    setStep('review');
  };

  const typedName = form.name.trim();
  const title = editing ? `Edit ${typedName || item.name}` : typedName ? `Add item: ${typedName}` : 'Add item';
  const shared = { form, setForm, entries, setEntries, labelFor, unitInfo, allowed, features, variantLabel: variantLabelFor(organization) };

  const fitStep = step === 'levels' || step === 'review';

  return (
    <div className={`isu-page isu-wizard${fitStep ? ' isu-wizard--fit' : ''}`}>
      <Link to={leaveTo} className="isu-link isu-small">
        {'\u2190'} {leaveLabel}
      </Link>
      <PageHead title={title} description={fitStep ? null : `Step ${index + 1} of ${steps.length}: ${STEPS[step]}`} />
      <ItemsureWizardProgress steps={steps} current={step} reachable={(id) => editing || visited.has(id)} onPick={goTo} />
      <ErrorNote message={stepError} />

      <section className="isu-card isu-wizard-body">
        {step === 'basics' ? (
          <ItemsureWizardBasics
            {...shared}
            panel={basicsPanel}
            onPanel={setBasicsPanel}
            stepError={stepError}
            organizationId={organization.id}
            categories={categories}
            categoryDefaults={catalog.categoryDefaults}
            units={units}
            items={catalog.items}
            itemId={itemId}
            nameClash={nameClash}
            renamingArchived={renamingArchived}
            onRestored={(id) => navigate(itemAddress(id))}
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
            supplierPrices={supplierPrices}
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
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => navigate(leaveTo)}
          >
            Cancel
          </button>
          {index > 0 || (step === 'basics' && panelOrder.indexOf(basicsPanel) > 0) ? (
            <button
              type="button"
              className="isu-btn isu-btn--ghost"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (step === 'basics' && moveBasics(-1)) return;
                goTo(steps[index - 1]);
              }}
            >
              Back
            </button>
          ) : null}
        </div>
        <div className="isu-wizard-nav-group">
          {step === 'review' || editing ? (
            <button
              type="button"
              className="isu-btn isu-btn--primary"
              disabled={saving}
              onMouseDown={(e) => e.preventDefault()}
              onClick={save}
            >
              {saving ? 'Saving…' : problems.length ? 'Save again' : editing ? 'Save changes' : 'Save item'}
            </button>
          ) : null}
          {step !== 'review' ? (
            <button
              type="button"
              className={`isu-btn ${editing ? 'isu-btn--ghost' : 'isu-btn--primary'}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (step === 'basics' && moveBasics(1)) return;
                goTo(steps[index + 1]);
              }}
            >
              {nextBasicsLabel || 'Next'}
            </button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <ItemsureWizardArchive
          organizationId={organization.id}
          item={item}
          onDone={(active) => navigate(active ? itemAddress(item.id) : `${ITEMSURE_PATH}/items`)}
        />
      ) : null}
    </div>
  );
}
