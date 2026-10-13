import React, { useEffect, useRef, useState } from 'react';
import { money, paidFor } from '../../utils/duezyMath.js';
import { methodFrom } from '../../utils/duezyPayers.js';
import DuezyTeamPayButtons from './DuezyTeamPayButtons.jsx';
import DuezyPayerPicker from './DuezyPayerPicker.jsx';

function statusLine(payment, dues, late) {
  const status = payment?.status || 'unpaid';
  if (status === 'paid') return `✓ Paid ${money(paidFor(payment, dues))}${payment.method ? ` · ${methodFrom(payment.method, payment.paid_by)}` : ''}`;
  if (status === 'partial') return `Partial: ${money(paidFor(payment, dues))} of ${money(dues)}`;
  if (status === 'bye') return '⏸ Bye';
  if (status === 'makeup') return `↻ Make up · ${money(dues)} still owed`;
  return late ? `Late · ${money(dues)} owed` : `Not paid yet · ${money(dues)}`;
}

/**
 * Record one team's payment for any week (tapped in Season so far, or in the make-ups popup),
 * not just the page's week. `heading` replaces the night label; no onClose = no ×.
 */
export default function DuezyWeekPanel({
  league, team, week, dues, schedule, payment, canSavePlayers, onSetPayment, onAddPlayer, onClose, scrollKey = 0,
  heading = null, extra = null,
}) {
  const [picking, setPicking] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!scrollKey) return undefined;
    const timer = setTimeout(() => ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
    return () => clearTimeout(timer);
  }, [scrollKey]);
  const night = schedule.dates ? `${schedule.label(week)} (week ${week})` : `Week ${week}`;
  const late = !['paid', 'bye', 'makeup'].includes(payment?.status || 'unpaid') && week <= schedule.lateThrough;

  const set = (entry) => {
    setPicking(null);
    return onSetPayment(entry);
  };

  return (
    <div className="dz-week-panel" ref={ref} role="group" aria-label={`Record ${night}`}>
      <div className="dz-payer-head">
        <p>
          <strong>{heading || night}</strong>{' '}
          <span className={late ? 'dz-owe-late' : 'dz-muted'}>· {statusLine(payment, dues, late)}</span>
        </p>
        {extra}
        {onClose ? <button type="button" className="dz-payer-close" onClick={onClose} aria-label="Close">×</button> : null}
      </div>
      <DuezyTeamPayButtons
        league={league}
        team={team}
        week={week}
        dues={dues}
        payment={payment}
        picking={picking}
        onSetPayment={set}
        onAskWhoPaid={setPicking}
      />
      {picking ? (
        <DuezyPayerPicker
          key={picking}
          team={team}
          method={picking}
          amount={dues}
          canSavePlayers={canSavePlayers}
          onPick={(name, isNew) => {
            set({ status: 'paid', amount: dues, method: picking, paid_by: name });
            if (isNew) onAddPlayer?.(name);
          }}
          onCancel={() => setPicking(null)}
        />
      ) : null}
    </div>
  );
}
