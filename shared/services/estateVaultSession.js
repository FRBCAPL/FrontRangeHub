/**
 * Estate Vault session exit paths.
 *
 * Two distinct actions:
 *   leaveCurrentEstate  — drop this estate’s unlock / heir / helper / bidder
 *                         session. The PR Google/email account stays signed in.
 *   signOutEstateVault  — leave every estate session AND sign out of Auth.
 */
import { ESTATEIT_PATH } from '../utils/estateInventoryConstants.js';
import {
  clearAdminUnlock,
  clearAuctionBidder,
  clearAuctionUnlock,
  clearHelperSession,
  clearSiblingSession,
  setActiveEstateCase
} from './estateInventoryService.js';
import { getEstateOwnerSession, signOutEstateOwner } from './estateVaultAuth.js';

/** Clear every case-scoped unlock / invite session on this device. */
export function leaveCurrentEstate() {
  clearAdminUnlock();
  clearSiblingSession();
  clearHelperSession();
  clearAuctionBidder();
  clearAuctionUnlock();
  try {
    setActiveEstateCase('');
  } catch {
    // ignore
  }
}

/**
 * Where to send the user after leaving an estate (Auth session may still exist).
 * @returns {Promise<string>} hash-router path
 */
export async function leaveCurrentEstateDestination() {
  leaveCurrentEstate();
  const owner = await getEstateOwnerSession();
  if (owner.success) return `${ESTATEIT_PATH}/owner`;
  return ESTATEIT_PATH;
}

/**
 * Full Estate Vault exit — local estate sessions + Supabase Auth.
 * @returns {Promise<{ success: boolean, path: string, error?: string }>}
 */
export async function signOutEstateVault() {
  leaveCurrentEstate();
  const result = await signOutEstateOwner();
  return {
    success: result.success !== false,
    path: ESTATEIT_PATH,
    error: result.success === false ? result.error : undefined
  };
}

export default {
  leaveCurrentEstate,
  leaveCurrentEstateDestination,
  signOutEstateVault
};
