import React from 'react';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { setPosAddOns } from '../../services/itemsurePosStockService.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { ErrorNote } from './ItemsureUi.jsx';

const TURN_ON = 'Count add-ons? From the next full hour, Doubles, "Add Red Bull", and other add-ons come off stock too, using the rules on the Add-ons tab. Earlier sales are not changed.';
const TURN_OFF = 'Stop counting add-ons? What was already taken off stays. Later sales take off only the drinks themselves.';

/** Take sales off stock → whether add-ons count too. Hidden until the database update is applied. */
export default function ItemsurePosAddOnsSwitch({ organizationId, status, canManage, onChanged }) {
  const { busy, error, run } = useItemsureAction();
  if (!status || !('add_ons_on' in status)) return null;
  const on = status.add_ons_on;

  const toggle = async () => {
    if (!window.confirm(on ? TURN_OFF : TURN_ON)) return;
    if (await run(() => setPosAddOns(organizationId, !on))) onChanged?.();
  };

  return (
    <div className="isu-stack">
      <div className="isu-pos-stock-state">
        <span>Count add-ons (Doubles, Add Red Bull): <strong>{on ? 'On' : 'Off'}</strong></span>
        {canManage ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={busy} onClick={toggle}>{on ? 'Turn off' : 'Turn on'}</button>
        ) : null}
      </div>
      <p className="isu-muted isu-small">
        {on
          ? `Add-ons count for sales after ${formatWhen(status.add_ons_from)}. Set what each one uses on the Add-ons tab.`
          : 'Off: only the drinks themselves come off stock. Add-ons still show in the sales reports.'}
      </p>
      <ErrorNote message={error} />
    </div>
  );
}
