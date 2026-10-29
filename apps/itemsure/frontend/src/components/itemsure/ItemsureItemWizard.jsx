import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { listCatalog } from '../../services/itemsureItemService.js';
import { saveItemWizard } from '../../services/itemsureItemWizardSave.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemPlaces from '../../hooks/useItemPlaces.js';
import useItemStock from '../../hooks/useItemStock.js';
import useItemUsage from '../../hooks/useItemUsage.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { visibleSlots } from '../../utils/itemsureItemStock.js';
import { NO_AREA_LABEL } from '../../utils/itemsureStock.js';
import { checkAmounts, checkLevels, entriesFromGroups, STEPS, wizardSteps } from '../../utils/itemsureItemWizard.js';
import { ErrorNote, LoadFailed, PageHead } from './ItemsureUi.jsx';
import ItemsureWizardProgress from './ItemsureWizardProgress.jsx';
import ItemsureWizardBasics from './ItemsureWizardBasics.jsx';
import ItemsureWizardWhere from './ItemsureWizardWhere.jsx';
import ItemsureWizardLevels from './ItemsureWizardLevels.jsx';
import ItemsureWizardExtras from './ItemsureWizardExtras.jsx';
import ItemsureWizardReview from './ItemsureWizardReview.jsx';

const emptyForm = (item, units) => ({
  name: item?.name || '',
  description: item?.description || '',
  sku: item?.sku || '',
  barcode: item?.barcode || '',
  category_id: item?.category_id || '',
  base_unit_id: item?.base_unit_id || units.find((u) => u.code === 'each' && !u.organization_id)?.id || units[0]?.id || '',
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
  const places = useItemPlaces(organization.id);
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

  // Fill the form and places once everything has loaded; later reloads never overwrite typing.
  useEffect(() => {
    if (started.current || !catalog || (editing && !item) || !places.ready || (canView && !stock)) return;
    started.current = true;
    setForm(emptyForm(item, catalog.units));
    const sources = { places: places.placesFor(routeItemId) || [], balances: stock?.balances || [], targets: stock?.targets || [], locations: places.locations };
    setEntries(editing ? entriesFromGroups(visibleSlots(routeItemId, sources)) : []);
  }, [catalog, item, editing, places, stock, canView, routeItemId]);

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
  const unit = catalog.units.find((u) => u.id === form.base_unit_id);
  const unitInfo = { precision: unit?.precision_scale ?? 0, unitName: unit?.name || 'This unit', unitSymbol: unit?.symbol || unit?.name || '' };
  const labelFor = (e) => {
    const location = places.locations.find((l) => l.id === e.locationId);
    if (e.storageAreaId) return `${location?.name} \u00b7 ${location?.storageAreas.find((a) => a.id === e.storageAreaId)?.name || 'Spot'}`;
    const hasSpots = features.spots && (location?.storageAreas || []).some((a) => a.is_active);
    return hasSpots ? `${location?.name} \u00b7 ${NO_AREA_LABEL}` : location?.name || 'Location';
  };

  const problemFor = (id) => {
    if (id === 'basics') {
      if (!form.name.trim()) return 'Give the item a name.';
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
      canAmounts: allowed.amounts,
      canLevels: allowed.levels,
    });
    setSaving(false);
    setItemId(result.itemId);
    setEntries(result.entries);
    if (!result.problems.length) {
      navigate(`${ITEMSURE_PATH}/items/${result.itemId}`);
      return;
    }
    setProblems(result.problems);
    setStep('review');
  };

  const shared = { form, setForm, entries, setEntries, labelFor, unitInfo, allowed, features };

  return (
    <div className="isu-page isu-wizard">
      <Link to={editing ? `${ITEMSURE_PATH}/items/${routeItemId}` : `${ITEMSURE_PATH}/items`} className="isu-link isu-small">
        {'\u2190'} {editing ? item.name : 'Inventory'}
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
            units={catalog.units}
            canManageCategories={can('categories.manage')}
            onCategoryAdded={(row) => {
              setAddedCategories((list) => [...list, row]);
              load();
            }}
            editing={editing}
          />
        ) : null}
        {step === 'where' ? <ItemsureWizardWhere {...shared} locations={places.locations} /> : null}
        {step === 'levels' ? <ItemsureWizardLevels {...shared} usage={usage} /> : null}
        {step === 'extras' ? <ItemsureWizardExtras {...shared} organizationId={organization.id} itemId={itemId} /> : null}
        {step === 'review' ? <ItemsureWizardReview {...shared} categories={categories} problems={problems} editing={editing} steps={steps} onEdit={goTo} /> : null}
      </section>

      <div className="isu-wizard-nav">
        {index > 0 ? <button type="button" className="isu-btn isu-btn--ghost" onClick={() => goTo(steps[index - 1])}>Back</button> : <span />}
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
  );
}
