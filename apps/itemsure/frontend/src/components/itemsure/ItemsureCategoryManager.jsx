import React, { useCallback, useMemo, useState } from 'react';
import { categoryTree } from '../../utils/itemsureCategories.js';
import { Modal } from './ItemsureUi.jsx';
import ItemsureCategoryForm from './ItemsureCategoryForm.jsx';
import ItemsureCategoryTools from './ItemsureCategoryTools.jsx';
import ItemsureCategoryMoveItems from './ItemsureCategoryMoveItems.jsx';
import ItemsureCategoryOrder from './ItemsureCategoryOrder.jsx';
import ItemsureCategoryArchived from './ItemsureCategoryArchived.jsx';
import ItemsureUndoBar from './ItemsureUndoBar.jsx';

/**
 * Every category window on the Inventory page. `request` says which one is open:
 * { kind: 'add', parentId } | { kind: 'edit', category } | { kind: 'move', category }
 * | { kind: 'order', parentId } | { kind: 'archived' }; null when none.
 * `onRequest` switches window; `onChanged` reloads the catalog after a save.
 */
export default function ItemsureCategoryManager({ organizationId, catalog, request, onRequest, onChanged, canMoveItems }) {
  const [moved, setMoved] = useState(null);
  const closeMoved = useCallback(() => setMoved(null), []);
  const categories = useMemo(() => catalog?.categories || [], [catalog]);
  const items = catalog?.items || [];
  const active = useMemo(() => categories.filter((c) => c.is_active !== false), [categories]);
  const tree = useMemo(() => categoryTree(active), [active]);
  const kind = request?.kind || '';
  const category = request?.category ? tree.byId.get(request.category.id) || request.category : null;
  const close = () => onRequest(null);
  const saved = async () => {
    close();
    await onChanged();
  };

  const orderParent = kind === 'order' && request.parentId ? tree.byId.get(request.parentId) : null;
  const title = {
    add: request?.parentId ? 'Add subcategory' : 'Add category',
    edit: category ? `Edit ${category.name}` : '',
    move: category ? `Move items out of ${category.name}` : '',
    order: orderParent ? `Order of subcategories in ${orderParent.name}` : 'Order of categories',
    archived: 'Archived categories',
  }[kind] || '';

  return (
    <>
      <Modal open={Boolean(kind)} title={title} onClose={close}>
        {kind === 'add' || kind === 'edit' ? (
          <>
            <ItemsureCategoryForm
              key={category?.id || `new-${request.parentId || ''}`}
              organizationId={organizationId}
              categories={active}
              parentId={request.parentId || ''}
              category={kind === 'edit' ? category : null}
              iconsAvailable={Boolean(catalog?.iconsAvailable)}
              onSaved={saved}
            />
            {kind === 'edit' && category ? (
              <ItemsureCategoryTools
                organizationId={organizationId}
                category={category}
                tree={tree}
                items={items}
                canMoveItems={canMoveItems}
                onMoveItems={() => onRequest({ kind: 'move', category })}
                onArchived={saved}
              />
            ) : null}
          </>
        ) : null}
        {kind === 'move' && category ? (
          <ItemsureCategoryMoveItems
            organizationId={organizationId}
            category={category}
            tree={tree}
            items={items}
            onDone={async (done) => {
              setMoved({
                message: done.message,
                undo: async () => {
                  await done.undo();
                  await onChanged();
                },
              });
              await saved();
            }}
          />
        ) : null}
        {kind === 'order' ? (
          <ItemsureCategoryOrder
            organizationId={organizationId}
            siblings={orderParent ? tree.childrenOf(orderParent.id) : tree.roots}
            onSaved={saved}
          />
        ) : null}
        {kind === 'archived' ? (
          <ItemsureCategoryArchived organizationId={organizationId} categories={categories} onChanged={onChanged} />
        ) : null}
      </Modal>
      <ItemsureUndoBar done={moved} onClose={closeMoved} />
    </>
  );
}
