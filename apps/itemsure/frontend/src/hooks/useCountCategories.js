import { useEffect, useState } from 'react';
import { listCategoryRows } from '../services/itemsureTargetService.js';
import { categoryTree } from '../utils/itemsureCategories.js';

/**
 * Category tree and each item's current category, for filtering a count.
 * { tree, categoryOf: Map(itemId → categoryId) }, or null while loading or if it can't load
 * (then the count simply shows no category filter).
 */
export default function useCountCategories(organizationId) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let alive = true;
    listCategoryRows(organizationId)
      .then(({ categories, itemCategories }) => {
        if (!alive) return;
        setState({ tree: categoryTree(categories), categoryOf: new Map(itemCategories.map((r) => [r.id, r.category_id])) });
      })
      .catch(() => alive && setState(null));
    return () => {
      alive = false;
    };
  }, [organizationId]);
  return state;
}
