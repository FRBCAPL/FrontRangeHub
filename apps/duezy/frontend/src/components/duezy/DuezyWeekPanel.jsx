import React, { useEffect, useRef, useState } from 'react';
import { isPrepaidMakeup, money, paidFor } from '../../utils/duezyMath.js';
import { hasRecordedEntry } from '../../utils/duezyCorrection.js';
import { isSplit, methodText } from '../../utils/duezySplits.js';
import { asPrepaid, markToPlayEntry } from '../../utils/duezyMakeup.js';
import DuezyTeamPayButtons from './DuezyTeamPayButtons.jsx';
import DuezyPayerPicker from './DuezyPayerPicker.jsx';
import DuezyPlayedAsk from './DuezyPlayedAsk.jsx';
import DuezyPrepaidNote from './DuezyPrepaidNote.jsx';

function statusLine(payment, dues, late) {
  const status = payment?.status || 'unpaid';
  const how = methodText(payment);
  const toPlay = isPrepaidMakeup(payment) ? ' · ↻ paid · match still to play' : '';
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
  league, team, week, dues, schedule, payment, paymentIndex, canSavePlayers, onSetPayment, onAddPlayer, onClose, scrollKey = 0,
  heading = null, extra = null, more = null, hero = false, onWeekPrev = null, onWeekNext = null,
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
  const recorded = hasRecordedEntry(payment);
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
  // Correct / Add sit under the date when money is already recorded; "Other amount…" stays below the buttons.
  const moreNode = more && !asking ? more(set) : null;

  return (
    <div className={`dz-week-panel${hero ? ' dz-week-panel--hero' : ''}`} ref={ref} role="group" aria-label={`Record ${night}`}>
      <div className={`dz-payer-head${late ? ' is-late' : ''}`}>
        {hero ? (
          <div className="dz-week-hero">
            <div className="dz-week-hero-nav">
              {onWeekPrev ? (
                <button type="button" className="dz-week-step" onClick={onWeekPrev} aria-label="Previous week">‹</button>
              ) : <span className="dz-week-step is-spacer" aria-hidden="true" />}
              <strong className="dz-week-hero-date">{heading || night}</strong>
              {onWeekNext ? (
                <button type="button" className="dz-week-step" onClick={onWeekNext} aria-label="Next week">›</button>
              ) : <span className="dz-week-step is-spacer" aria-hidden="true" />}
            </div>
            <span className={`dz-week-hero-status${late ? ' is-late' : ''}`}>{statusLine(payment, dues, late)}</span>
            {recorded ? <div className="dz-week-hero-more">{moreNode}</div> : null}
            {extra}
          </div>
        ) : (
          <p>
            <strong>{heading || night}</strong>{' '}
            <span className={late ? 'dz-owe-late' : 'dz-muted'}>· {statusLine(payment, dues, late)}</span>
          </p>
        )}
        {!hero ? extra : null}
        {onClose ? <button type="button" className="dz-payer-close" onClick={onClose} aria-label="Close">×</button> : null}
      </div>
      {prepaid ? <DuezyPrepaidNote payment={payment} onSetPayment={onSetPayment} /> : null}
      {asking ? (
        <DuezyPlayedAsk entry={asking} onAnswer={answer} onCancel={() => setAsking(null)} />
      ) : (
        <DuezyTeamPayButtons
          league={league}
          team={team}
          week={week}
          dues={dues}
          payment={payment}
          paymentIndex={paymentIndex}
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
      {(!hero || !recorded) ? moreNode : null}
      {!prepaid && isMoney(payment || {}) ? (
        <div className="dz-prepay-opt">
          <button
            type="button"
            className="dz-prepay-toggle"
            title="Keeps the payment and puts this night back on the make-up list until the match is played"
            onClick={() => onSetPayment(markToPlayEntry(payment))}
          >
            ↻ Match still to play
          </button>
          <p className="dz-tiny dz-muted">
            Use this if they already paid but the make-up hasn’t happened — you’ll Mark played later.
          </p>
        </div>
      ) : null}
    </div>
  );
}
