import React from 'react';
import { categoryPath, categoryTree } from '../../utils/itemsureCategories.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { hasSavedStock } from '../../utils/itemsureItemWizard.js';
import ItemsureWizardIntro from './ItemsureWizardIntro.jsx';

const show = (text, unit) => (String(text ?? '').trim() === '' ? null : `${displayQuantity(text)} ${unit}`);

function Section({ title, step, steps, onEdit, children }) {
  return (
    <section className="isu-wizard-section">
      <div className="isu-wizard-section-head">
        <h3>{title}</h3>
        {steps.includes(step) ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onEdit(step)}>Change</button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Step 5: a plain summary in sections, and anything that didn't save last time. */
export default function ItemsureWizardReview({ form, entries, labelFor, unitInfo, allowed, categories, suppliers = [], problems, editing, steps, onEdit }) {
  const unit = unitInfo.unitSymbol || unitInfo.unitName;
  const category = categoryPath(categoryTree(categories), form.category_id) || 'No category';
  const section = { steps, onEdit };

  return (
    <div className="isu-stack">
      <ItemsureWizardIntro title="Check and save">Look it over. Tap Change to fix anything, then Save.</ItemsureWizardIntro>
      {problems.length ? (
        <div className="isu-wizard-problems" role="alert">
          <strong>Some things didn&apos;t save:</strong>
          <ul>
            {problems.map((p, i) => <li key={`${p.key}-${i}`}>{p.message}</li>)}
          </ul>
          <p className="isu-small">Everything else is saved. Fix these if needed, then tap Save again; only these will be retried.</p>
        </div>
      ) : null}

      <Section title="Item" step="basics" {...section}>
        <dl className="isu-wizard-summary">
          <dt>Name</dt>
          <dd><strong>{form.name || 'No name yet'}</strong></dd>
          <dt>Counted in</dt>
          <dd>{unitInfo.unitName}</dd>
          <dt>Category</dt>
          <dd>{category}</dd>
          {'supplier_id' in form ? (
            <>
              <dt>Buy from</dt>
              <dd>{suppliers.find((s) => s.id === form.supplier_id)?.name || 'No supplier'}</dd>
            </>
          ) : null}
        </dl>
      </Section>

      {allowed.view ? (
        <Section title="Places, on hand, and levels" step="where" {...section}>
          {entries.length ? (
            <ul className="isu-wizard-places">
              {entries.map((e) => e.remove ? (
                <li key={e.key} className="isu-wizard-place is-removing">
                  <strong>{labelFor(e)}</strong>
                  <p className="isu-wizard-removing">
                    Will be removed from this item
                    {hasSavedStock(e) ? ` (on hand set from ${show(e.quantity, unit)} to 0)` : ''}.
                  </p>
                </li>
              ) : (
                <li key={e.key} className="isu-wizard-place">
                  <strong>{labelFor(e)}</strong>
                  <dl className="isu-wizard-summary">
                    <dt>On hand now</dt>
                    <dd>{show(e.amount, unit) || 'not set yet'}</dd>
                    <dt>Warn me at</dt>
                    <dd>{show(e.minimum, unit) || 'not set'}</dd>
                    <dt>Fill up to</dt>
                    <dd>{show(e.par, unit) || 'not set'}</dd>
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <p className="isu-muted">Not kept anywhere yet.{editing ? '' : ' You can add them later from the item page.'}</p>
          )}
          {entries.length && steps.includes('levels') ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => onEdit('levels')}>Change warning and restock levels</button>
          ) : null}
        </Section>
      ) : null}

      {form.sku || form.barcode || form.description ? (
        <Section title="Extras" step="extras" {...section}>
          <dl className="isu-wizard-summary">
            {form.sku ? <><dt>SKU</dt><dd>{form.sku}</dd></> : null}
            {form.barcode ? <><dt>Barcode</dt><dd>{form.barcode}</dd></> : null}
            {form.description ? <><dt>Description</dt><dd>{form.description}</dd></> : null}
          </dl>
        </Section>
      ) : null}
    </div>
  );
}
