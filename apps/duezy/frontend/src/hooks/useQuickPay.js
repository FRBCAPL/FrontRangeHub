import { useMemo, useState } from 'react';
import { keepPrepaid } from '../utils/duezyMakeup.js';
import { asksWhoPaid } from '../utils/duezyPayers.js';
import { addPartEntry } from '../utils/duezySplits.js';
import { quickPayAmount, usualPay } from '../utils/duezyUsualMethod.js';

/**
 * One-tap pay for a team's week (team row, Collect tonight): the team's usual method, what's left to pay,
 * and "Who paid?" for methods that ask. payWith(method) pays with another method (the quick-pay menu).
 */
export default function useQuickPay({ league, team, week, dues, payment, paymentIndex, onSetPayment }) {
  const [picking, setPicking] = useState(null);
  const usual = useMemo(() => usualPay(league, team.id, week, paymentIndex), [league, team.id, week, paymentIndex]);
  const owed = quickPayAmount(payment, dues);
  const partial = payment?.status === 'partial';

  const entry = (method, paidBy) => (partial
    ? keepPrepaid(payment, addPartEntry(payment, dues, { amount: owed, method, paid_by: paidBy }))
    : { status: 'paid', amount: dues, method, paid_by: paidBy });

  const payWith = (method, paidBy = method === usual.method ? usual.paid_by : null) => {
    if (asksWhoPaid(method) && !paidBy) {
      setPicking(method);
      return undefined;
    }
    setPicking(null);
    return onSetPayment(entry(method, paidBy));
  };

  const quickPay = () => {
    if (picking) { setPicking(null); return undefined; }
    return payWith(usual.method);
  };

  const recordPayer = (name) => {
    const method = picking;
    setPicking(null);
    return onSetPayment(entry(method, name));
  };

  return { usual, owed, partial, picking, setPicking, quickPay, payWith, recordPayer };
}
