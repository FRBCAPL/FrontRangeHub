import React, { useState } from 'react';
import ShowdownV3PartialScore from './ShowdownV3PartialScore.jsx';
import { v3LimitsOf, v3PartialProblem, v3PartialEntry, emptyPartial, V3_VOLUNTARY_MESSAGE } from './showdownV3ScoreDraft.js';
import { earningsDropDetails } from '../showdownEarningsDrop.js';
import { matchLabel, nameOf } from '../showdownView.js';
import * as E from '../../showdownEngine.js';

const EFFECT = {
  qualifying: 'Their unfinished qualifying matches become forfeits. Games already played are paid to both players, and each opponent gets an administrative credit for the unplayed games. You can undo this while qualifying is still open.',
  shootout: 'If they are in the playoff picture, the next eligible player takes the spot. If they are outside it, nothing changes.',
  bracket: 'If they qualified, the drawn bracket is cleared and the next eligible player takes the spot. If not, the bracket stands.',
  playoffs: 'They forfeit their next playoff match; the opponent advances by walkover and is paid the match-win bonus. Money already earned (including a bye) is kept.',
};

/**
 * V3 withdrawal. A match the player is on a table for needs the games already played (or an explicit
 * "no games were played"); during the playoffs the operator must say whether the withdrawal is voluntary.
 */
export default function ShowdownV3WithdrawModal({ state, player, error = '', onConfirm, onCancel }) {
  const onTable = state.matches.filter((m) => m.status === 'on-table' && (m.p1 === player.id || m.p2 === player.id));
  const [drafts, setDrafts] = useState(() => Object.fromEntries(onTable.map((m) => [m.id, emptyPartial()])));
  const [voluntary, setVoluntary] = useState(null);
  const needVoluntary = state.status === 'playoffs';
  const problems = onTable.map((m) => v3PartialProblem(v3LimitsOf(state, m.phase), drafts[m.id])).filter(Boolean);
  if (needVoluntary && voluntary === null) problems.push(V3_VOLUNTARY_MESSAGE);
  const scoresSoFar = problems.length ? {} : Object.fromEntries(onTable.map((m) => [m.id, v3PartialEntry(drafts[m.id])]));
  const opts = { scoresSoFar, voluntary: voluntary === true };
  const drops = problems.length ? [] : earningsDropDetails(state, () => E.withdrawPlayer(state, player.id, {}, opts));

  return (
    <div className="cc-modal-overlay" role="presentation" onClick={onCancel}>
      <div className="cc-modal sd-confirm" role="dialog" aria-modal="true" aria-labelledby="sd-v3-withdraw-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="sd-v3-withdraw-title">Withdraw {player.name}?</h2>
        <p>{EFFECT[state.status] || ''}</p>
        {state.status !== 'qualifying' ? <p className="sd-note">This cannot be undone after qualifying.</p> : null}
        {onTable.map((m) => (
          <ShowdownV3PartialScore
            key={m.id}
            title={`${matchLabel(state, m)} is on table ${m.table}: games already played`}
            p1Name={nameOf(state, m.p1)}
            p2Name={nameOf(state, m.p2)}
            limits={v3LimitsOf(state, m.phase)}
            draft={drafts[m.id]}
            onChange={(d) => setDrafts((all) => ({ ...all, [m.id]: d }))}
          />
        ))}
        {needVoluntary ? (
          <div className="sd-v3-voluntary" role="radiogroup" aria-label={`Why ${player.name} is withdrawing`}>
            <p className="sd-note"><strong>Why is {player.name} withdrawing?</strong> This decides whether a later abandonment can be recorded.</p>
            <label><input type="radio" checked={voluntary === true} onChange={() => setVoluntary(true)} /> By choice (voluntary)</label>
            <label><input type="radio" checked={voluntary === false} onChange={() => setVoluntary(false)} /> Emergency, venue closure or operator decision (involuntary)</label>
          </div>
        ) : null}
        {drops.length ? <ul className="sd-confirm-list">{drops.map((d) => <li key={d}>{d}</li>)}</ul> : null}
        {problems.length ? <p className="sd-note" aria-live="polite">{problems[0]}</p> : null}
        {error ? <p className="sd-error" role="alert">{error}</p> : null}
        <div className="sd-modal-actions">
          <button type="button" className="tb-btn-new" onClick={onCancel}>Cancel</button>
          <button type="button" className="sd-btn sd-btn-danger" disabled={problems.length > 0} onClick={() => onConfirm(opts)}>Withdraw player</button>
        </div>
      </div>
    </div>
  );
}
