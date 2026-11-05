import { useCallback, useEffect, useState } from 'react';
import { listCatalog } from '../services/itemsureItemService.js';
import { listModifiers, modifierHours, saveModifier } from '../services/itemsurePosModifierService.js';
import { guessModifier, ruleOf } from '../utils/itemsurePosModifiers.js';

const RECENT_MS = 30 * 24 * 3600 * 1000;

/**
 * Settings → Clover modifiers: every modifier seen in sales with its rule, a suggestion from its
 * name, and how often it was used in the last 30 days (most used first). Reports only. */
export default function usePosModifiers(organizationId) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const now = Date.now();
      const [list, hours, catalog] = await Promise.all([
        listModifiers(organizationId),
        modifierHours(organizationId, new Date(now - RECENT_MS).toISOString(), new Date(now).toISOString()),
        listCatalog(organizationId),
      ]);
      if (list.missing) {
        setState({ missing: true, rows: [], items: [], recipes: [], recipeReady: false });
        return;
      }
      const used = new Map();
      for (const h of hours || []) used.set(h.modifier_id, (used.get(h.modifier_id) || 0) + Number(h.quantity || 0));
      const rows = list.rows.map((r) => ({ ...r, rule: ruleOf(r), guess: guessModifier(r.name), recent: used.get(r.modifier_id) || 0 }))
        .sort((a, b) => b.recent - a.recent || a.name.localeCompare(b.name));
      setState({ missing: false, rows, items: catalog.items, recipes: list.recipes, recipeReady: list.recipeReady });
    } catch (e) {
      setError(e.message);
      setState((s) => s || { missing: false, rows: [], items: [], recipes: [], recipeReady: false });
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (id, rule) => {
    setError('');
    try {
      const saved = await saveModifier(id, { ...rule, organizationId, recipeReady: Boolean(state?.recipeReady) });
      const withRecipe = { ...saved, recipe: (state?.recipes || []).find((x) => x.id === saved.recipe_id) || null };
      setState((s) => ({ ...s, rows: s.rows.map((r) => (r.id === id ? { ...r, ...withRecipe, rule: ruleOf(withRecipe) } : r)) }));
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, [organizationId, state]);

  return { state, error, save, reload: load };
}
