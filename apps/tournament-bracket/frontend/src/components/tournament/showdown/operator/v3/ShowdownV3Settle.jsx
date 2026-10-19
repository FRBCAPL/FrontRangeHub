import React from 'react';
import { ShowdownV3Reconciliation } from './ShowdownV3Money.jsx';
import ShowdownV3InterruptForm from './ShowdownV3InterruptForm.jsx';
import ShowdownV3Adjustments from './ShowdownV3Adjustments.jsx';
import * as E from '../../showdownEngine.js';
import { v3AbandonmentProblem } from '../../v3/showdownV3Abandonment.js';
import { V3_ABANDONMENT_RETENTION_APPROVED } from '../../v3/showdownV3Settlement.js';

const RUNNING = ['qualifying', 'shootout', 'bracket', 'playoffs'];

function Abandonment({ state, onAbandon }) {
  const problem = v3AbandonmentProblem(state, E.computeEarnings(state).status);
  return (
    <section className="sd-panel" aria-label="Voluntary abandonment">
      <h3>Voluntary abandonment</h3>
      <p className="sd-note">
        Only when every remaining playoff player withdrew or forfeited by their own choice, as you confirmed when recording it.
        Players keep what they earned. The rest is recorded as not awarded.
        {V3_ABANDONMENT_RETENTION_APPROVED ? '' : ' Keeping that money as the operator is not approved: it stays recorded separately until it is.'}
      </p>
      {problem ? <p className="sd-note">{problem}</p> : null}
      <button type="button" className="sd-btn sd-btn-danger" disabled={Boolean(problem)} onClick={onAbandon}>Record voluntary abandonment</button>
    </section>
  );
}

/**
 * V3 endings and the money that follows them: interruption, voluntary abandonment, reconciliation and
 * audited adjustments. Every ending needs typed confirmation and is written to the audit log.
 */
export default function ShowdownV3Settle({ state, view, error, act, ask }) {
  const running = RUNNING.includes(state.status);
  return (
    <>
      <ShowdownV3Reconciliation v={view} />
      {running ? (
        <>
          <ShowdownV3InterruptForm state={state} error={error} onInterrupt={(opts, text) => act('interrupt', opts, text)} />
          {state.status === 'playoffs' ? (
            <Abandonment
              state={state}
              onAbandon={() => ask({
                title: 'Record a voluntary abandonment?',
                message: 'Every remaining playoff player left by their own choice. The event ends; players keep what they earned and the rest is recorded as not awarded.',
                details: ['Operator retention of that money is not approved.'],
                typed: true,
                danger: true,
                confirmLabel: 'Record abandonment',
              }, (text) => act('abandon', text))}
            />
          ) : null}
        </>
      ) : null}
      {state.status === 'completed' ? (
        <ShowdownV3Adjustments view={view} players={state.players} error={error} onAdjust={(adj) => act('adjustPayout', adj)} />
      ) : null}
      {state.status === 'setup' ? <p className="sd-note">Nothing to settle until the event starts.</p> : null}
    </>
  );
}
