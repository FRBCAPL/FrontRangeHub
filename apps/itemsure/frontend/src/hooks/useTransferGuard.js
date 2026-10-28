import { useCallback, useState } from 'react';
import { checkTransferSource } from '../services/itemsureRestockService.js';
import { confirmDecision, transferWarning } from '../utils/itemsureTransferGuard.js';

/**
 * Checks the source right before a transfer. Proceeds when nothing drops below
 * par, throws when the transfer can't happen, and otherwise holds a warning
 * until the person confirms or changes the transfer. Confirming checks again:
 * if the warning or its figures changed, the new warning needs a new confirm.
 */
export default function useTransferGuard() {
  const [warning, setWarning] = useState(null);

  const guard = useCallback(async ({ item, from, quantity }, proceed) => {
    const result = transferWarning(await checkTransferSource({ item, from, quantity }), item);
    if (result.block) throw new Error(result.text);
    if (result.confirm) {
      setWarning(result);
      return;
    }
    await proceed();
  }, []);

  const confirm = useCallback(
    async ({ item, from, quantity }, proceed) => {
      const decision = confirmDecision(warning?.check, await checkTransferSource({ item, from, quantity }), item);
      if (decision.action === 'block') {
        setWarning(null);
        throw new Error(decision.warning.text);
      }
      if (decision.action === 'reconfirm') {
        setWarning(decision.warning);
        return;
      }
      setWarning(null);
      await proceed();
    },
    [warning],
  );

  const clear = useCallback(() => setWarning(null), []);
  return { warning, guard, confirm, clear };
}
