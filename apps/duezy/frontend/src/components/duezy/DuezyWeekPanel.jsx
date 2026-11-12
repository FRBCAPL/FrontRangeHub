import React, { useEffect, useRef, useState } from 'react';
import { isPrepaidMakeup, money, paidFor } from '../../utils/duezyMath.js';
import { isSplit, methodText } from '../../utils/duezySplits.js';
import { asPrepaid, markPlayedEntry, markToPlayEntry } from '../../utils/duezyMakeup.js';
import DuezyTeamPayButtons from './DuezyTeamPayButtons.jsx';
import DuezyPayerPicker from './DuezyPayerPicker.jsx';
import DuezyPlayedAsk from './DuezyPlayedAsk.jsx';

function statusLine(payment, dues, late) {
  const status = payment?.status || 'unpaid';
  const how = methodText(payment);
  const toPlay = isPrepaidMakeup(payment) ? ' · ↻ make-up to play' : '';
  if (status === 'paid') return `✓ Paid ${money(paidFor(payment, dues))}${how ? ` · ${how}` : ''}${toPlay}`;
  if (status === 'partial') return `Partial: ${money(paidFor(payment, dues))} of ${money(dues)}${isSplit(payment) ? ` · ${how}` : ''}${toPlay}`;
  if (status === 'bye') return '⏸ Bye';
  if (status === 'makeup') return `↻ Make up · ${money(dues)} still owed`;
  return late ? `Late · ${money(dues)} owed` : `Not paid yet · ${money(dues)}`;
}

const isMoney = (entry) => entry.status === 'paid' || entry.status === 'partial';

/**
 * Record one team's payment for any week (team window, or the make-ups popup).
 * `heading` replaces the night label; no onClose = no ×. `more(save)` renders extra forms (other amount,
 * correct) that save through the same path. Money for an unpaid make-up asks "Was the match played?" —
 * "Paid ahead" keeps it on the make-up list until "Mark played".
 */
export default function DuezyWeekPanel({
  league, team, week, dues, schedule, payment, canSavePlayers, onSetPayment, onAddPlayer, onClose, scrollKey = 0,
  heading = null, extra = null, more = null,
}) {
  const [picking, setPicking] = useState(null);
  const [asking, setAsking] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!scrollKey) return undefined;
    const timer = setTimeout(() => ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
    return () => clearTimeout(timer);
  }, [scrollKey]);
  useEffect(() => { setAsking(null); setPicking(null); }, [week, payment?.status]);

  const night = schedule.dates ? `${schedule.label(week)} (week ${week})` : `Week ${week}`;
  const prepaid = isPrepaidMakeup(payment);
  const late = !['paid', 'bye', 'makeup'].includes(payment?.status || 'unpaid') && !prepaid && week <= schedule.lateThrough;

  const set = (entry) => {
    setPicking(null);
    if (payment?.status === 'makeup' && isMoney(entry)) {
      setAsking(entry);
      return undefined;
    }
    return onSetPayment(prepaid ? asPrepaid(entry) : entry);
  };
  const answer = (played) => {
    const entry = asking;
    setAsking(null);
    return onSetPayment(played ? entry : asPrepaid(entry));
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
      {prepaid ? (
        <div className="dz-prepaid-note">
          <span>↻ Paid ahead — make-up match still to play.</span>
          <button type="button" className="dz-btn dz-btn--ghost dz-btn--sm" onClick={() => onSetPayment(markPlayedEntry(payment))}>
            ✓ Mark played
          </button>
        </div>
      ) : null}
      {asking ? (
        <DuezyPlayedAsk entry={asking} onAnswer={answer} onCancel={() => setAsking(null)} />
      ) : (
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
      )}
      {picking && !asking ? (
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
      {more && !asking ? more(set) : null}
      {!prepaid && isMoney(payment || {}) ? (
        <button
          type="button"
          className="dz-prepay-toggle"
          title="Keeps this payment and puts the week on the make-up list until you mark it played"
          onClick={() => onSetPayment(markToPlayEntry(payment))}
        >
          ↻ Make-up still to play
        </button>
      ) : null}
    </div>
  );
}
