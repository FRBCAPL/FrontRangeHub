import React, { useState } from 'react';
import ShowdownV3PartialScore from './ShowdownV3PartialScore.jsx';
import { v3LimitsOf, v3PartialProblem, v3PartialEntry, emptyPartial } from './showdownV3ScoreDraft.js';
import { V3_OUTCOME_LABELS } from './showdownV3MoneyView.js';
import { previewInterruption } from '../../v3/showdownV3Endings.js';
import { formatCents } from '../../v3/showdownV3Rules.js';
import { RESET_CONFIRM_WORD } from '../../showdownRules.js';
import { matchLabel, nameOf } from '../showdownView.js';

function preview(state, scores) {
  try {
    const { outcome, earnings } = previewInterruption(state, { scores });
    const s = earnings.settlement;
    return {
      outcome: V3_OUTCOME_LABELS[outcome] || outcome,
      recipients: s.bonusRecipients.map((id) => `${nameOf(state, id)} ${formatCents(s.rows[id].settlementCents)}`),
      unresolvedCents: s.unresolvedCents,
      problem: s.ok ? '' : s.problems[0],
    };
  } catch (err) {
    return { problem: err.message, recipients: [], unresolvedCents: 0 };
  }
}

/**
 * Stop a running V3 event early (emergency, venue closure, operator decision). Matches on a table need the
 * games already played. The remainder goes to the players still eligible right before the interruption;
 * with nobody eligible it is left unresolved for review, which the operator must acknowledge.
 */
export default function ShowdownV3InterruptForm({ state, error = '', onInterrupt }) {
  const onTable = state.matches.filter((m) => m.status === 'on-table');
  const [drafts, setDrafts] = useState(() => Object.fromEntries(onTable.map((m) => [m.id, emptyPartial()])));
  const [ack, setAck] = useState(false);
  const [text, setText] = useState('');
  const problems = onTable.map((m) => v3PartialProblem(v3LimitsOf(state, m.phase), drafts[m.id] || emptyPartial())).filter(Boolean);
  const scores = Object.fromEntries(onTable.map((m) => [m.id, v3PartialEntry(drafts[m.id] || emptyPartial())]));
  const p = problems.length ? null : preview(state, scores);
  const needAck = Boolean(p?.unresolvedCents);
  const typed = text.trim().toUpperCase() === RESET_CONFIRM_WORD;
  const ready = p && !p.problem && typed && (!needAck || ack);

  return (
    <section className="sd-panel" aria-label="Interrupt the event">
      <h3>Interrupt the event</h3>
      <p className="sd-note">
        Use this for an emergency, a venue closure, an operator cancellation or any other stop that is not every player&rsquo;s own choice.
        Players keep everything they earned. The rest of the pool goes to the players still eligible immediately before the interruption.
      </p>
      {onTable.map((m) => (
        <ShowdownV3PartialScore
          key={m.id}
          title={`${matchLabel(state, m)} on table ${m.table}: games already played`}
          p1Name={nameOf(state, m.p1)}
          p2Name={nameOf(state, m.p2)}
          limits={v3LimitsOf(state, m.phase)}
          draft={drafts[m.id] || emptyPartial()}
          onChange={(d) => setDrafts((all) => ({ ...all, [m.id]: d }))}
        />
      ))}
      {problems.length ? <p className="sd-note" aria-live="polite">{problems[0]}</p> : null}
      {p ? (
        <div className="sd-v3-preview" aria-label="Interruption preview">
          <p><strong>Settled as:</strong> {p.outcome}</p>
          {p.recipients.length ? <p className="sd-note">Remainder split among the players still eligible: {p.recipients.join(', ')}.</p> : null}
          {needAck ? (
            <>
              <p className="sd-warn">
                Nobody is still eligible, so {formatCents(p.unresolvedCents)} cannot go to anyone automatically. It will be left unresolved for your review;
                any payout from it must be recorded as an audited adjustment with a reason.
              </p>
              <label className="sd-format-confirm">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                I understand {formatCents(p.unresolvedCents)} will be left unresolved for operator review.
              </label>
            </>
          ) : null}
          {p.problem ? <p className="sd-error">{p.problem}</p> : null}
        </div>
      ) : null}
      <label className="sd-field">
        Type {RESET_CONFIRM_WORD} to confirm
        <input value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" aria-label={`Type ${RESET_CONFIRM_WORD} to confirm the interruption`} />
      </label>
      {error ? <p className="sd-error" role="alert">{error}</p> : null}
      <button type="button" className="sd-btn sd-btn-danger" disabled={!ready} onClick={() => onInterrupt({ scores, acknowledgeUnresolved: needAck && ack }, text)}>
        Interrupt and settle the event
      </button>
    </section>
  );
}
