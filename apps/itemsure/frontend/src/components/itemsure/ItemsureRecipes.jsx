import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useRecipes from '../../hooks/useRecipes.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { recipeText, recipeUseCounts } from '../../utils/itemsureRecipes.js';
import { ErrorNote, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsureRecipeForm from './ItemsureRecipeForm.jsx';
import ItemsureRecipeButtons from './ItemsureRecipeButtons.jsx';

/** Inventory → Recipes: build a drink or dish once, then use it on any number of Clover buttons. */
export default function ItemsureRecipes() {
  const { organization, can } = useItemsureWorkspace();
  const canEdit = can('items.manage');
  const { state, error, setError, save, remove, applyTo, stopOn } = useRecipes(organization.id);
  const [editing, setEditing] = useState(null); // { recipe|null }
  const [picking, setPicking] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');

  const itemsById = useMemo(() => new Map((state?.items || []).map((i) => [i.id, i])), [state]);
  const recipesById = useMemo(() => new Map((state?.recipes || []).map((r) => [r.id, r])), [state]);
  const counts = useMemo(() => recipeUseCounts(state?.uses), [state]);
  const hasClover = Boolean(state?.posItems?.length);
  const needle = search.trim().toLowerCase();
  const shown = (state?.recipes || []).filter((r) => !needle || r.name.toLowerCase().includes(needle)
    || r.lines.some((l) => String(itemsById.get(l.itemId)?.name || '').toLowerCase().includes(needle)));

  const open = (setter, value) => {
    setError('');
    setter(value);
  };
  const confirmDelete = async () => {
    if (await remove(deleting.id)) setDeleting(null);
  };

  const head = (
    <PageHead
      title="Recipes"
      description="Build a drink or dish once, then use it on every Clover button that makes it. Change the recipe and they all follow."
      action={canEdit && state && !state.missing ? (
        <button type="button" className="isu-btn isu-btn--primary" onClick={() => open(setEditing, { recipe: null })}>Add recipe</button>
      ) : null}
    />
  );

  if (!state) return <div className="isu-page">{head}<p className="isu-muted">Loading…</p></div>;
  if (state.missing) {
    return (
      <div className="isu-page">
        {head}
        <div className="isu-card isu-empty"><p className="isu-muted">Recipes need a database update first. Nothing else is affected.</p></div>
      </div>
    );
  }

  return (
    <div className="isu-page">
      {head}
      <p className="isu-small"><Link to={`${ITEMSURE_PATH}/items`}>{'\u2190'} Inventory</Link></p>
      <ErrorNote message={editing || picking || deleting ? '' : error} />
      {state.recipes.length > 6 ? (
        <input type="search" className="isu-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a recipe or ingredient" aria-label="Find a recipe" />
      ) : null}
      {!state.recipes.length ? (
        <div className="isu-card isu-empty">
          <h2>No recipes yet</h2>
          <p className="isu-muted">A recipe is what one sale uses, like a House Margarita: tequila, triple sec, and margarita mix.</p>
        </div>
      ) : null}
      <ul className="isu-recipe-list">
        {shown.map((r) => {
          const n = counts.get(r.id) || 0;
          return (
            <li key={r.id} className="isu-card isu-recipe">
              <div className="isu-recipe-head">
                <strong>{r.name}</strong>
                <span className="isu-muted isu-small">{n ? `On ${n} Clover button${n === 1 ? '' : 's'}` : hasClover ? 'Not on any Clover button yet' : ''}</span>
              </div>
              <p className="isu-small">{recipeText(r, itemsById)}</p>
              {canEdit ? (
                <div className="isu-pos-ask-actions">
                  {hasClover ? (
                    <button type="button" className="isu-btn isu-btn--primary isu-btn--sm" onClick={() => open(setPicking, r)}>Use on Clover buttons…</button>
                  ) : null}
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => open(setEditing, { recipe: r })}>Change</button>
                  <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => open(setDeleting, r)}>Delete</button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <Modal open={Boolean(editing)} title={editing?.recipe ? `Change ${editing.recipe.name}` : 'New recipe'} onClose={() => setEditing(null)}>
        {editing ? (
          <ItemsureRecipeForm
            recipe={editing.recipe}
            items={state.items}
            usedOn={editing.recipe ? counts.get(editing.recipe.id) || 0 : 0}
            error={error}
            onSave={(name, lines) => save(editing.recipe?.id || null, name, lines)}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Modal>

      <Modal open={Boolean(picking)} title={picking ? `Clover buttons for ${picking.name}` : ''} wide onClose={() => setPicking(null)}>
        {picking ? (
          <ItemsureRecipeButtons
            recipe={picking}
            posItems={state.posItems}
            uses={state.uses}
            links={state.links}
            itemsById={itemsById}
            recipesById={recipesById}
            error={error}
            onApply={(ids) => applyTo(picking.id, ids)}
            onStop={(id) => stopOn([id])}
            onClose={() => setPicking(null)}
          />
        ) : null}
      </Modal>

      <Modal open={Boolean(deleting)} title={deleting ? `Delete ${deleting.name}?` : ''} onClose={() => setDeleting(null)}>
        {deleting ? (
          <div className="isu-stack">
            <p>
              {counts.get(deleting.id)
                ? `${counts.get(deleting.id)} Clover button${counts.get(deleting.id) === 1 ? ' uses' : 's use'} it. They keep their current links, and you can change those one by one.`
                : 'No Clover buttons use it.'}
              {' '}Any add-on that uses it goes back to &ldquo;not set&rdquo;.
            </p>
            <ErrorNote message={error} />
            <div className="isu-pos-ask-actions">
              <button type="button" className="isu-btn isu-btn--danger isu-btn--sm" onClick={confirmDelete}>Delete recipe</button>
              <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setDeleting(null)}>Cancel</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
