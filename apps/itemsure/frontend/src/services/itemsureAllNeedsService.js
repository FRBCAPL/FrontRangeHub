import { listLocations } from './itemsureLocationService.js';
import { listTargetStatus } from './itemsureTargetService.js';
import { groupAllNeeds } from '../utils/itemsureAllNeeds.js';

/**
 * Needs for every business the person owns. Each business loads on its own, so
 * one failing still shows the rest. Returns [{ id, name, needs | null, error }].
 */
export async function loadAllNeeds(memberships) {
  const owned = memberships.filter((m) => m.roleCode === 'owner');
  return Promise.all(
    owned.map(async (m) => {
      try {
        const [locations, rows] = await Promise.all([
          listLocations(m.organizationId),
          listTargetStatus(m.organizationId, ['low', 'below_par', 'not_set_up']),
        ]);
        return { id: m.organizationId, name: m.organizationName, needs: groupAllNeeds(locations, rows), error: '' };
      } catch (e) {
        return { id: m.organizationId, name: m.organizationName, needs: null, error: e.message };
      }
    }),
  );
}
