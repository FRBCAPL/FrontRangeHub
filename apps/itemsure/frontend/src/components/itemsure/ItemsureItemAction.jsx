import React, { useEffect, useRef } from 'react';
import { suggestLevels } from '../../utils/itemsureUsage.js';
import ItemsureCountNotice from './ItemsureCountNotice.jsx';
import ItemsureSetAmountForm from './ItemsureSetAmountForm.jsx';
import ItemsureQuickChangeForm from './ItemsureQuickChangeForm.jsx';
import ItemsureSlotLevelsForm from './ItemsureSlotLevelsForm.jsx';

export const ACTION_TITLES = { set: 'Set amount', add: 'Add stock', remove: 'Use stock', levels: 'Warning and full-up levels' };

/** One change to an item in one place, shown in the item window in place of its summary. */
export default function ItemsureItemAction({ action, item, itemName, placeName, organizationId, openCounts, usage, onDone, onBack }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector('input, select, textarea')?.focus();
  }, [action]);

  const { slot, kind } = action;
  const formProps = { item, slot, placeName, onDone };
  return (
    <div className="isu-stack" ref={ref}>
      <button type="button" className="isu-link isu-small isu-item-modal-back" onClick={onBack}>
        {'\u2039'} Back to {itemName}
      </button>
      {kind !== 'levels' ? <ItemsureCountNotice covering={openCounts.coveringSpot(item.id, slot.locationId, slot.storageAreaId)} /> : null}
      {kind === 'set' ? <ItemsureSetAmountForm {...formProps} /> : null}
      {kind === 'add' || kind === 'remove' ? <ItemsureQuickChangeForm {...formProps} direction={kind} /> : null}
      {kind === 'levels' ? (
        <ItemsureSlotLevelsForm
          {...formProps}
          organizationId={organizationId}
          usageReady={usage ? usage.enough : null}
          suggestion={usage ? suggestLevels(usage.forSlot(slot.locationId, slot.storageAreaId), item.precision) : null}
        />
      ) : null}
    </div>
  );
}
