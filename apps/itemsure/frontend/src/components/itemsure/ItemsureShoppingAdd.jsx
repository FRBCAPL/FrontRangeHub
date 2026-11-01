import React, { useMemo, useState } from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { pickableItems } from '../../utils/itemsureShoppingExtras.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';

const SHOW_AT_MOST = 40;

/**
 * Inside the "Add to the list" window: pick one of the business's items (that
 * supplier's, when one is chosen), or type something else. Something else can go on
 * this list only, or (`onCreate`, for people who can add items) become a new item.
 * `onAdd(line)` saves a line; the window stays open so several can be added.
 */
export default function ItemsureShoppingAdd({ startSupplierId = '', suppliers = [], items, supplierOf, listed, onAdd, onCreate = null, onDone }) {
  const [supplierId, setSupplierId] = useState(startSupplierId);
  const [query, setQuery] = useState('');
  const [pickedId, setPickedId] = useState('');
  const [other, setOther] = useState(false);
  const [otherName, setOtherName] = useState('');
  const [amount, setAmount] = useState('');
  const [added, setAdded] = useState('');
  const { busy, error, setError, run } = useItemsureAction();

  const matches = useMemo(
    () => pickableItems(items, { supplierId, supplierOf, listed, query }),
    [items, supplierId, supplierOf, listed, query],
  );
  const picked = matches.find((i) => i.id === pickedId) || null;

  const save = async (line) => {
    if (await run(() => onAdd({ ...line, amount }))) {
      setAdded(`Added ${line.name}. Add another, or tap Done.`);
      setPickedId('');
      setAmount('');
      setOtherName('');
      setOther(false);
    }
  };
  const addPicked = () => save({ itemId: picked.id, supplierId: supplierOf(picked.id) || supplierId || null, name: picked.name });
  const otherReady = () => {
    if (otherName.trim()) return true;
    setError('Type what you need, like "Birthday candles".');
    return false;
  };
  const addOther = () => otherReady() && save({ name: otherName.trim(), supplierId: supplierId || null });
  const createItem = () => otherReady() && onCreate({ name: otherName.trim(), supplierId, amount });
  const startOther = () => {
    setOther(true);
    setPickedId('');
    setOtherName(query.trim());
    setAdded('');
  };

  return (
    <div className="isu-shopadd">
      <ErrorNote message={error} />
      {added ? <p className="isu-notice isu-small" role="status">{added}</p> : null}

      {other ? (
        <>
          <Field label="What do you need?">
            <input value={otherName} onChange={(e) => setOtherName(e.target.value)} maxLength={120} placeholder="e.g. Birthday candles" />
          </Field>
          {suppliers.length ? (
            <Field label="Supplier" hint="Optional. Puts it under that supplier on the list.">
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">No supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          ) : null}
        </>
      ) : (
        <>
          <Field label="Find an item">
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type part of the name" autoComplete="off" />
          </Field>
          {suppliers.length ? (
            <Field label="From">
              <select value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPickedId(''); }}>
                <option value="">Any supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          ) : null}
          <ul className="isu-shopadd-list" aria-label="Items you can add">
            {matches.slice(0, SHOW_AT_MOST).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`isu-shopadd-pick${item.id === pickedId ? ' is-picked' : ''}`}
                  aria-pressed={item.id === pickedId}
                  onClick={() => { setPickedId(item.id === pickedId ? '' : item.id); setAdded(''); }}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
          {!matches.length ? (
            <p className="isu-muted isu-small">{query.trim() ? `No items match "${query.trim()}".` : 'Every item here is already on the list.'}</p>
          ) : null}
          {matches.length > SHOW_AT_MOST ? <p className="isu-muted isu-small">Showing {SHOW_AT_MOST} of {matches.length}. Type to narrow it down.</p> : null}
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm isu-shopadd-other" onClick={startOther}>
            + Something else{query.trim() ? `: "${query.trim()}"` : ''}
          </button>
        </>
      )}

      {other || picked ? (
        <Field label="How many?" hint="Optional, like 2 cases.">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} maxLength={40} autoComplete="off" />
        </Field>
      ) : null}

      {other && onCreate ? (
        <p className="isu-hint">
          <strong>Just this list</strong> adds it here only. <strong>Add to ItemSure</strong> also makes it an item you can count, then puts it on the list.
        </p>
      ) : null}

      <div className="isu-quickcount-actions">
        {other ? <button type="button" className="isu-btn isu-btn--ghost" onClick={() => setOther(false)}>Back</button> : <button type="button" className="isu-btn isu-btn--ghost" onClick={onDone}>Done</button>}
        {other && onCreate ? <button type="button" className="isu-btn isu-btn--ghost" onClick={createItem} disabled={busy}>Add to ItemSure</button> : null}
        {other ? (
          <button type="button" className="isu-btn isu-btn--primary" onClick={addOther} disabled={busy}>{busy ? 'Adding…' : 'Just this list'}</button>
        ) : (
          <button type="button" className="isu-btn isu-btn--primary" onClick={addPicked} disabled={busy || !picked}>{busy ? 'Adding…' : picked ? 'Add to list' : 'Pick an item'}</button>
        )}
      </div>
    </div>
  );
}
