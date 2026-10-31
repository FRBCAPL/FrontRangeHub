import React, { useCallback } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ITEM_PARAM, itemAddress } from '../../hooks/useItemModal.js';
import ItemsureItemModal from './ItemsureItemModal.jsx';

/** Shows the item window whenever the address has `?item=<id>`, over any page. */
export default function ItemsureItemModalHost() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const itemId = params.get(ITEM_PARAM);

  const close = useCallback(() => {
    if (location.state?.itemModal) {
      navigate(-1);
      return;
    }
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(ITEM_PARAM);
      return next;
    }, { replace: true });
  }, [location.state, navigate, setParams]);

  if (!itemId) return null;
  return <ItemsureItemModal itemId={itemId} onClose={close} />;
}

/** Old item page addresses (/items/:itemId) open the item over Inventory instead. */
export function ItemsureItemRedirect() {
  const { itemId } = useParams();
  return <Navigate to={itemAddress(itemId)} replace />;
}
