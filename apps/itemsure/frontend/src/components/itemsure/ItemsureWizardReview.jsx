import React from 'react';
import { categoryPath, categoryTree, extraCategoryNames } from '../../utils/itemsureCategories.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { hasSavedStock } from '../../utils/itemsureItemWizard.js';
import ItemsureWizardIntro from './ItemsureWizardIntro.jsx';

const show = (text, unit) => (String(text ?? '').trim() === '' ? null : `${displayQuantity(text)} ${unit}`);
const dash = (text, unit) => show(text, unit) || '—';

function Section({ title, step, steps, onEdit, children }) {
  return (
    <section className="isu-wizard-section">
      <div className="isu-wizard-section-head">
        <h3>{title}</h3>
        {steps.includes(step) ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onMouseDown={(e) => e.preventDefault()} onClick={() => onEdit(step)}>Change</button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Step 5: a plain summary in sections, and anything that didn't save last time. */
export default function ItemsureWizardReview({ form, entries, labelFor, unitInfo, allowed, categories, suppliers = [], problems, editing, steps, onEdit, variantLabel }) {
  const unit = unitInfo.unitSymbol || unitInfo.unitName;
  const tree = categoryTree(categories);
  const category = categoryPath(tree, form.category_id) || 'No category';
  const alsoIn = extraCategoryNames(tree, { category_id: form.category_id, extraCategoryIds: form.extra_category_ids });
  const otherNames = (form.other_supplier_ids || [])
    .filter((id) => id !== form.supplier_id)
    .map((id) => suppliers.find((s) => s.id === id)?.name)
    .filter(Boolean);
  const section = { steps, onEdit };
  const buyFrom = 'supplier_id' in form ? (suppliers.find((s) => s.id === form.supplier_id)?.name || 'No supplier') : null;

  return (
    <div className="isu-stack isu-wizard-fit-step">
      <ItemsureWizardIntro title="Check & save">Look it over, tap Change to fix, then Save.</ItemsureWizardIntro>
      {problems.length ? (
        <div className="isu-wizard-problems" role="alert">
          <strong>Some things didn&apos;t save:</strong>
          <ul>
            {problems.map((p, i) => <li key={`${p.key}-${i}`}>{p.message}</li>)}
          </ul>
          <p className="isu-small">Everything else is saved. Fix these, then Save again.</p>
        </div>
      ) : null}

      <Section title="Item" step="basics" {...section}>
        <dl className="isu-wizard-summary isu-wizard-summary--dense">
          <dt>Name</dt>
          <dd><strong>{form.name || 'No name yet'}</strong></dd>
          <dt>Counted in</dt>
          <dd>{unitInfo.unitName}</dd>
          <dt>Category</dt>
          <dd>{category}</dd>
          {form.brand?.trim() ? <><dt>Brand</dt><dd>{form.brand.trim()}</dd></> : null}
          {form.variant?.trim() ? <><dt>{variantLabel}</dt><dd>{form.variant.trim()}</dd></> : null}
          {alsoIn.length ? <><dt>Also under</dt><dd>{alsoIn.join(', ')}</dd></> : null}
          {buyFrom ? <><dt>Buy from</dt><dd>{buyFrom}</dd></> : null}
          {otherNames.length ? <><dt>Also from</dt><dd>{otherNames.join(', ')}</dd></> : null}
        </dl>
      </Section>

      {allowed.view ? (
        <Section title="Places & levels" step="where" {...section}>
          {entries.length ? (
            <ul className="isu-wizard-places">
              {entries.map((e) => e.remove ? (
                <li key={e.key} className="isu-wizard-place is-removing">
                  <strong>{labelFor(e)}</strong>
                  <p className="isu-wizard-removing">
                    Will be removed{hasSavedStock(e) ? ` (on hand ${dash(e.quantity, unit)} → 0)` : ''}.
                  </p>
                </li>
              ) : (
                <li key={e.key} className="isu-wizard-place isu-wizard-place--line">
                  <strong>{labelFor(e)}</strong>
                  <p className="isu-wizard-place-line">
                    On hand {dash(e.amount, unit)}
                    <span aria-hidden="true"> · </span>
                    Warn {dash(e.minimum, unit)}
                    <span aria-hidden="true"> · </span>
                    Fill to {dash(e.par, unit)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="isu-muted">Not kept anywhere yet.{editing ? '' : ' You can add places later.'}</p>
          )}
          {entries.length && steps.includes('levels') ? (
            <button type="button" className="isu-link isu-small" onMouseDown={(e) => e.preventDefault()} onClick={() => onEdit('levels')}>
              Change warn & restock levels
            </button>
          ) : null}
        </Section>
      ) : null}

      {form.sku || form.barcode || form.description ? (
        <Section title="Extras" step="extras" {...section}>
          <dl className="isu-wizard-summary isu-wizard-summary--dense">
            {form.sku ? <><dt>SKU</dt><dd>{form.sku}</dd></> : null}
            {form.barcode ? <><dt>Barcode</dt><dd>{form.barcode}</dd></> : null}
            {form.description ? <><dt>Description</dt><dd>{form.description}</dd></> : null}
          </dl>
        </Section>
      ) : null}
    </div>
  );
}
