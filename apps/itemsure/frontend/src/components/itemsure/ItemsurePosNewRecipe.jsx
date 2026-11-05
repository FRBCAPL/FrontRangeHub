import React from 'react';
import { Modal } from './ItemsureUi.jsx';
import ItemsureRecipeForm from './ItemsureRecipeForm.jsx';

/**
 * Clover buttons → "New recipe…": build a recipe for one button (`start` fills it in from what
 * the button uses now). Saving creates the recipe and puts it on the button; onSave returns true when done.
 */
export default function ItemsurePosNewRecipe({ pos, start, items, error, onSave, onClose }) {
  return (
    <Modal open={Boolean(pos)} title={pos ? `New recipe for ${pos.name || 'this button'}` : ''} onClose={onClose}>
      {pos ? (
        <div className="isu-stack">
          <p className="isu-muted isu-small">
            Saving adds it to Inventory &rarr; Recipes and uses it on this button. You can use it on other buttons later.
          </p>
          <ItemsureRecipeForm start={start} items={items} error={error} onSave={onSave} onCancel={onClose} />
        </div>
      ) : null}
    </Modal>
  );
}
