import React from 'react';
import { money } from '../../utils/duezyMath.js';
import { teamBalance } from '../../utils/duezyDivisions.js';
import { leagueMethods } from '../../utils/duezyLeaguePrefs.js';
import useQuickPay from '../../hooks/useQuickPay.js';
import DuezyQuickPay from './DuezyQuickPay.jsx';
import DuezyPayerPicker from './DuezyPayerPicker.jsx';

/** One team still owing on the Collect tonight list: big quick pay (hold for other methods), Bye, Make up. */
export default function DuezyCollectRow({ league, team, week, dues, schedule, payment, paymentIndex, onSave, onAddPlayer }) {
  const onSetPayment = (entry) => onSave(team, entry);
  const { usual, owed, partial, picking, setPicking, quickPay, payWith, recordPayer } = useQuickPay({
    league, team, week, dues, payment, paymentIndex, onSetPayment,
  });
  const balance = teamBalance(team.id, schedule, dues, paymentIndex);
  const allOwed = balance.late + balance.due;

  return (
    <li className="dz-collect-row">
      <div className="dz-collect-main">
        <div className="dz-collect-name">
          <strong>{team.name}</strong>
          <small>
            {partial ? `${money(owed)} left this week` : `${money(owed)} this week`}
            {allOwed > owed ? <span className="dz-owe-late"> · {money(allOwed)} owed in all</span> : null}
          </small>
        </div>
        <DuezyQuickPay
          big
          usual={usual}
          owed={owed}
          partial={partial}
          picking={Boolean(picking)}
          methods={leagueMethods(league)}
          onPay={quickPay}
          onPayWith={payWith}
        />
      </div>
      <div className="dz-collect-more">
        <button type="button" className="dz-chip" onClick={() => onSetPayment({ status: 'bye', amount: 0 })}>
          <span aria-hidden="true">⏸</span> Bye
        </button>
        <button
          type="button"
          className="dz-chip"
          title="Match postponed: still owed, not late"
          onClick={() => onSetPayment({ status: 'makeup', amount: 0 })}
        >
          <span aria-hidden="true">↻</span> Make up
        </button>
      </div>
      {picking ? (
        <DuezyPayerPicker
          key={picking}
          team={team}
          method={picking}
          amount={owed}
          canSavePlayers={'players' in team}
          onPick={(name, isNew) => {
            recordPayer(name);
            if (isNew) onAddPlayer(team, name);
          }}
          onCancel={() => setPicking(null)}
        />
      ) : null}
    </li>
  );
}
