import { useCallback, useEffect, useState } from 'react';
import { applyRecipeTo, listRecipes, listRecipeUses, saveRecipe, stopRecipeOn } from '../services/itemsureRecipeService.js';

/**
 * Point of sale → Clover buttons: the recipes and which button uses which. Empty (and nothing
 * offered) until the recipes database update is applied.
 */
export default function usePosRecipeUses(organizationId) {
  const [recipes, setRecipes] = useState([]);
  const [uses, setUses] = useState(() => new Map());
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [list, used] = await Promise.all([listRecipes(organizationId), listRecipeUses(organizationId)]);
      setRecipes(list.missing ? [] : list.recipes);
      setUses(used || new Map());
      setReady(!list.missing);
    } catch {
      setRecipes([]);
      setUses(new Map());
      setReady(false);
    }
  }, [organizationId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    recipes,
    uses,
    ready,
    reload,
    apply: (externalId, recipeId) => applyRecipeTo(organizationId, recipeId, [externalId]),
    create: async (externalId, name, lines) => {
      const recipeId = await saveRecipe(organizationId, null, name, lines);
      await applyRecipeTo(organizationId, recipeId, [externalId]);
    },
    stop: (externalId) => stopRecipeOn(organizationId, [externalId]),
  };
}
