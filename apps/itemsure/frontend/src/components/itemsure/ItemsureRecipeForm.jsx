import React, { useState } from 'react';
import { checkRecipe, linesToForm } from '../../utils/itemsureRecipes.js';
import { ErrorNote, Field } from './ItemsureUi.jsx';
import ItemsureRecipeLines from './ItemsureRecipeLines.jsx';

/**
 * Add or change a recipe. onSave(name, lines) returns true when saved. `usedOn` (how many Clover
 * buttons use it) warns that they all change too. `start` ({ name, lines }) fills in a new recipe.
 */
export default function ItemsureRecipeForm({ recipe, start = null, items, usedOn = 0, error, onSave, onCancel }) {
  const [name, setName] = useState(recipe?.name || start?.name || '');
  const [rows, setRows] = useState(() => linesToForm(recipe?.lines || start?.lines));
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const checked = checkRecipe(name, rows, new Set(items.map((i) => i.id)));
    if (checked.error) {
      setProblem(checked.error);
      return;
    }
    setProblem('');
    setBusy(true);
    const ok = await onSave(checked.name, checked.lines);
    setBusy(false);
    if (ok) onCancel();
  };

  return (
    <form className="isu-stack" onSubmit={submit} aria-label={recipe ? `Change ${recipe.name}` : 'New recipe'}>
      <Field label="Name" hint="Like House Margarita, Long Island, or Wings.">
        <input type="text" value={name} maxLength={80} disabled={busy} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div>
        <p className="isu-small"><strong>Ingredients</strong> <span className="isu-muted">· what one sale uses</span></p>
        <ItemsureRecipeLines rows={rows} items={items} busy={busy} onChange={setRows} />
      </div>
      {usedOn ? (
        <p className="isu-notice isu-small">
          {usedOn} Clover button{usedOn === 1 ? ' uses' : 's use'} this recipe. Saving changes {usedOn === 1 ? 'it' : 'all of them'} too.
        </p>
      ) : null}
      <ErrorNote message={problem || error} />
      <div className="isu-pos-ask-actions">
        <button type="submit" className="isu-btn isu-btn--primary isu-btn--sm" disabled={busy}>{busy ? 'Saving…' : 'Save recipe'}</button>
        <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
