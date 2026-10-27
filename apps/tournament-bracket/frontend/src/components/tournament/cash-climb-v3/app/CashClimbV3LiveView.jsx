import React, { useState } from 'react';
import { cashClimbV3Shape } from '../cashClimbV3Bracket.js';
import { cashClimbV3ReadOnly } from './cashClimbV3Play.js';
import CashClimbV3Payouts from './CashClimbV3Payouts.jsx';
import CashClimbV3Bracket from './CashClimbV3Bracket.jsx';
import CashClimbV3Money from './CashClimbV3Money.jsx';
import CashClimbV3Settle from './CashClimbV3Settle.jsx';
import CashClimbV3ResultDialog from './CashClimbV3ResultDialog.jsx';
import CashClimbV3HistoryDialog from './CashClimbV3HistoryDialog.jsx';
import { openCashClimbV3GuideTv } from '../guide/cashClimbV3GuideRoute.js';

const TABS = [{ key: 'bracket', label: 'Bracket' }, { key: 'money', label: 'Money and earnings' }];

/**
 * A started or settled tournament. In progress: ready matches, result entry and settlement. Settled:
 * read-only bracket, money and final result. `onPost(matchId, submitted)` (may be async) and `onSettle()`
 * save and return { status, problems }. `onRefresh()` asks for the latest copy when result entry opens.
 */
export default function CashClimbV3LiveView({ record, onPost, onSettle, onRefresh }) {
  const [tab, setTab] = useState('bracket');
  const [entering, setEntering] = useState(null);
  const [history, setHistory] = useState(false);
  const readOnly = cashClimbV3ReadOnly(record);

  const post = async (submitted) => {
    const r = await onPost(entering, submitted);
    if (r.status === 'ok') setEntering(null);
    return r;
  };

  return (
    <>
      <CashClimbV3Settle record={record} onSettle={onSettle} />
      <nav className="ccv3-tabs" aria-label="Tournament views">
        {TABS.map((t) => (
          <button type="button" key={t.key} className={`ccv3-round-tab${tab === t.key ? ' is-active' : ''}`} aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
        <button type="button" className="ccv3-round-tab ccv3-history-btn" onClick={() => setHistory(true)}>Match history</button>
        <button type="button" className="ccv3-round-tab" onClick={openCashClimbV3GuideTv}>How it works TV</button>
      </nav>
      {tab === 'bracket'
        ? <CashClimbV3Bracket record={record} live={!readOnly} onEnter={readOnly ? undefined : setEntering} />
        : (
          <>
            <CashClimbV3Money record={record} />
            <CashClimbV3Payouts payout={record.payout} shape={cashClimbV3Shape(record.players.length)} locked />
          </>
        )}
      {readOnly ? <p className="cc-setup-note ccv3-muted">This tournament is settled and read-only.</p> : null}
      {history ? <CashClimbV3HistoryDialog record={record} onClose={() => setHistory(false)} /> : null}
      {entering && !readOnly ? (
        <CashClimbV3ResultDialog key={entering} record={record} matchId={entering} onPost={post} onClose={() => setEntering(null)} onOpen={onRefresh} />
      ) : null}
    </>
  );
}
