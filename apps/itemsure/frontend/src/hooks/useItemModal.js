import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ITEMSURE_PATH } from '../data/itemsureConstants.js';

/** `?item=<id>` opens that item in a window over whatever page is showing. */
export const ITEM_PARAM = 'item';

/** Marks history entries pushed by opening an item, so closing can step Back instead. */
export const ITEM_MODAL_STATE = { itemModal: true };

/** Address of the Inventory page with an item open, for pages the item can't open over. */
export function itemAddress(itemId) {
  return `${ITEMSURE_PATH}/items?${ITEM_PARAM}=${encodeURIComponent(itemId)}`;
}

/** `itemLink(id)` gives `{ to, state }` for a Link that opens the item over the current page. */
export function useItemLink() {
  const { pathname, search } = useLocation();
  return useCallback(
    (itemId) => {
      const params = new URLSearchParams(search);
      params.set(ITEM_PARAM, itemId);
      return { to: { pathname, search: `?${params}` }, state: ITEM_MODAL_STATE };
    },
    [pathname, search]
  );
}

/** `openItem(id)` does the same as clicking an item link. */
export function useOpenItem() {
  const navigate = useNavigate();
  const itemLink = useItemLink();
  return useCallback(
    (itemId) => {
      const { to, state } = itemLink(itemId);
      navigate(to, { state });
    },
    [navigate, itemLink]
  );
}
