import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { Field, Modal } from './ItemsureUi.jsx';
import ItemsureSupplierForm from './ItemsureSupplierForm.jsx';

const ADD_NEW = '__add_new__';

/**
 * "Buy from" dropdown: active suppliers, plus the current one if it has since been archived.
 * With `canAdd`, "+ Add a new supplier…" opens the supplier form; `onAdded(id)` then picks it.
 */
export default function ItemsureSupplierPicker({ organizationId, suppliers, value, onChange, canAdd, onAdded }) {
  const [adding, setAdding] = useState(false);
  const options = suppliers.filter((s) => s.is_active || s.id === value);

  const form = (
    <Modal open={adding} title="Add supplier" onClose={() => setAdding(false)}>
      {adding ? (
        <ItemsureSupplierForm
          organizationId={organizationId}
          onSaved={async (id) => {
            setAdding(false);
            await onAdded(id);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : null}
    </Modal>
  );

  if (!options.length) {
    return (
      <>
        <Field label="Buy from (supplier)">
          {canAdd ? (
            <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setAdding(true)}>+ Add a supplier</button>
          ) : (
            <p className="isu-muted isu-small">
              No suppliers yet. They can be added under <Link to={`${ITEMSURE_PATH}/suppliers`}>Suppliers</Link>.
            </p>
          )}
        </Field>
        {form}
      </>
    );
  }
  return (
    <>
      <Field label="Buy from (supplier)" hint="Optional. The company you usually order this item from.">
        <select
          value={value || ''}
          onChange={(e) => (e.target.value === ADD_NEW ? setAdding(true) : onChange(e.target.value))}
        >
          <option value="">No supplier</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{s.is_active ? '' : ' (archived)'}</option>
          ))}
          {canAdd ? <option value={ADD_NEW}>+ Add a new supplier…</option> : null}
        </select>
      </Field>
      {form}
    </>
  );
}
