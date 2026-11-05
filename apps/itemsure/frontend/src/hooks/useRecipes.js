import { useCallback, useEffect, useState } from 'react';
import { listCatalog } from '../services/itemsureItemService.js';
import { listPosItems, listPosLinks } from '../services/itemsurePosService.js';
import { applyRecipeTo, deleteRecipe, listRecipes, listRecipeUses, saveRecipe, stopRecipeOn } from '../services/itemsureRecipeService.js';

/**
 * Inventory → Recipes: the recipes, catalog items, Clover buttons, and which buttons use which
 * recipe. Every change reloads, since one recipe change can update many buttons.
 */
export default function useRecipes(organizationId) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [list, uses, catalog, posItems, links] = await Promise.all([
        listRecipes(organizationId), listRecipeUses(organizationId), listCatalog(organizationId),
        listPosItems(organizationId).catch(() => []), listPosLinks(organizationId).catch(() => new Map()),
      ]);
      setState({ missing: list.missing, recipes: list.recipes, uses: uses || new Map(), items: catalog.items, posItems, links });
    } catch (e) {
      setError(e.message);
      setState((s) => s || { missing: false, recipes: [], uses: new Map(), items: [], posItems: [], links: new Map() });
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = useCallback(async (action) => {
    setError('');
    try {
      const result = await action();
      await load();
      return result ?? true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, [load]);

  return {
    state,
    error,
    setError,
    reload: load,
    save: (id, name, lines) => act(() => saveRecipe(organizationId, id, name, lines)),
    remove: (id) => act(() => deleteRecipe(organizationId, id)),
    applyTo: (recipeId, externalIds) => act(() => applyRecipeTo(organizationId, recipeId, externalIds)),
    stopOn: (externalIds) => act(() => stopRecipeOn(organizationId, externalIds)),
  };
}
