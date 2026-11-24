import React, { useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import { teamBalance } from '../../utils/duezyDivisions.js';
import { leagueMethods } from '../../utils/duezyLeaguePrefs.js';
import useQuickPay from '../../hooks/useQuickPay.js';
import DuezyQuickPay from './DuezyQuickPay.jsx';
import DuezyPayerPicker from './DuezyPayerPicker.jsx';

/** One team still owing on the Collect tonight list: big usual pay, visible Other method, Bye, Make up. */
export default function DuezyCollectRow({ league, team, week, dues, schedule, payment, paymentIndex, onSave, onAddPlayer }) {
  const onSetPayment = (entry) => onSave(team, entry);
  const { usual, owed, partial, picking, setPicking, quickPay, payWith, recordPayer } = useQuickPay({
    league, team, week, dues, payment, paymentIndex, onSetPayment,
  });
  const balance = teamBalance(team.id, schedule, dues, paymentIndex);
  const allOwed = balance.late + balance.due;
  const methods = leagueMethods(league);
  const alts = methods.filter((m) => m !== usual.method);
  const [showAlts, setShowAlts] = useState(false);

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
          methods={methods}
          onPay={quickPay}
          onPayWith={payWith}
        />
      </div>

      {alts.length ? (
        showAlts ? (
          <div className="dz-collect-alts">
            <button
              type="button"
              className="dz-link dz-small dz-collect-alts-toggle"
              onClick={() => setShowAlts(false)}
              aria-expanded="true"
            >
              Hide other methods ‹
            </button>
            <div className="dz-collect-alts-row" role="group" aria-label="Other payment methods">
              {alts.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="dz-chip"
                  onClick={() => {
                    setShowAlts(false);
                    payWith(m);
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="dz-link dz-small dz-collect-alts-toggle"
            onClick={() => setShowAlts(true)}
            aria-expanded="false"
          >
            Other method ›
          </button>
        )
      ) : null}

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
