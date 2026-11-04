import { useCallback, useEffect, useState } from 'react';
import { useItemsureWorkspace } from './useItemsureWorkspace.js';
import { listLoosePieces } from '../services/itemsureLooseService.js';
import { onInventoryChanged } from '../utils/itemsureChanges.js';

const NONE = () => 0;
// One load per business, shared by every screen using this; dropped when stock or items change.
const shared = new Map();

function loadShared(organizationId) {
  if (!shared.has(organizationId)) {
    shared.set(organizationId, listLoosePieces(organizationId).catch(() => new Map()));
  }
  return shared.get(organizationId);
}

/**
 * piecesFor(itemId): how many are sold out of one case when the business counts loose ones
 * too, else 0 (show and type plain amounts). Loads nothing while the switch is off.
 */
export default function useLoosePieces() {
  const { organization, features } = useItemsureWorkspace();
  const on = Boolean(features?.loose && organization?.looseAvailable);
  const organizationId = organization?.id;
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (!on || !organizationId) return undefined;
    let live = true;
    const load = () => loadShared(organizationId).then((m) => live && setMap(m));
    load();
    const stop = onInventoryChanged(() => {
      shared.delete(organizationId);
      load();
    });
    return () => {
      live = false;
      stop();
    };
  }, [on, organizationId]);

  const piecesFor = useCallback((itemId) => map?.get(itemId) || 0, [map]);
  return on && map ? piecesFor : NONE;
}
