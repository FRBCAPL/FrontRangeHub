import React, { useState } from 'react';
import { createSupplier, updateSupplier } from '../../services/itemsureSupplierService.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

const EMPTY = { name: '', contact_name: '', phone: '', email: '', website: '', account_number: '', notes: '' };

/** Adds a supplier, or edits `supplier` when one is given. `onSaved(id)` gets the supplier's id. */
export default function ItemsureSupplierForm({ organizationId, supplier, onSaved, onCancel }) {
  const [form, setForm] = useState(() => (supplier
    ? Object.fromEntries(Object.keys(EMPTY).map((k) => [k, supplier[k] || '']))
    : EMPTY));
  const { busy, error, run } = useItemsureAction();
  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    let id = supplier?.id || null;
    const save = supplier
      ? () => updateSupplier(organizationId, supplier.id, form)
      : async () => {
          id = await createSupplier(organizationId, form);
        };
    if (await run(save)) onSaved(id);
  };

  return (
    <form onSubmit={submit} noValidate>
      <ErrorNote message={error} />
      <Field label="Supplier name">
        <input value={form.name} onChange={set('name')} maxLength={120} placeholder="e.g. Southern Glazer's" />
      </Field>
      <div className="isu-grid-2">
        <Field label="Contact person">
          <input value={form.contact_name} onChange={set('contact_name')} maxLength={120} autoComplete="off" />
        </Field>
        <Field label="Phone">
          <input type="tel" value={form.phone} onChange={set('phone')} maxLength={40} autoComplete="off" />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={set('email')} maxLength={254} autoComplete="off" />
        </Field>
        <Field label="Website or ordering portal">
          <input value={form.website} onChange={set('website')} maxLength={300} placeholder="e.g. shop.example.com" />
        </Field>
      </div>
      <Field label="Your account number with them" hint="Optional. Handy when you call to order.">
        <input value={form.account_number} onChange={set('account_number')} maxLength={80} />
      </Field>
      <Field label="Ordering notes" hint="For example: order by Tuesday for Thursday delivery, $250 minimum.">
        <textarea value={form.notes} onChange={set('notes')} maxLength={2000} rows={3} />
      </Field>
      <div className="isu-quickcount-actions">
        <button type="button" className="isu-btn isu-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="isu-btn isu-btn--primary" disabled={busy}>
          {busy ? 'Saving…' : supplier ? 'Save changes' : 'Add supplier'}
        </button>
      </div>
    </form>
  );
}
