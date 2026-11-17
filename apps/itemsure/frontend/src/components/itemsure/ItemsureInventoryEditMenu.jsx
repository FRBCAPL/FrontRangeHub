import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import Tip from './ItemsureTip.jsx';

/**
 * Inventory header: one Edit control that reveals Add Item, Edit categories, and Recipes.
 */
export default function ItemsureInventoryEditMenu({
  canManageItems = false,
  canManageCategories = false,
  onAddItem,
  onEditCategories,
}) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (root.current && !root.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (fn) => () => {
    setOpen(false);
    fn?.();
  };

  return (
    <div className={`isu-inv-edit${open ? ' is-open' : ''}`} ref={root}>
      <button
        type="button"
        className="isu-btn isu-btn--ghost"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        Edit {open ? '\u25B4' : '\u25BE'}
      </button>
      {open ? (
        <div className="isu-inv-edit-menu" role="menu" aria-label="Inventory edit">
          {canManageItems ? (
            <Tip label="Start the add-item wizard">
              <button type="button" role="menuitem" className="isu-btn isu-btn--primary" onClick={run(onAddItem)}>
                Add Item
              </button>
            </Tip>
          ) : null}
          {canManageCategories ? (
            <Tip label="Search, edit, reorder, or archive categories">
              <button type="button" role="menuitem" className="isu-btn isu-btn--ghost" onClick={run(onEditCategories)}>
                Edit categories
              </button>
            </Tip>
          ) : null}
          <Tip label="Shared ingredients for Clover buttons">
            <Link
              to={`${ITEMSURE_PATH}/items/recipes`}
              role="menuitem"
              className="isu-btn isu-btn--ghost"
              onClick={() => setOpen(false)}
            >
              Recipes
            </Link>
          </Tip>
        </div>
      ) : null}
    </div>
  );
}
