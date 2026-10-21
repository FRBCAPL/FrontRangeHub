import React, { useCallback, useEffect, useState } from 'react';
import ShowdownSetup from './ShowdownSetup.jsx';
import ShowdownStart from './ShowdownStart.jsx';
import ShowdownHeader from './ShowdownHeader.jsx';
import ShowdownTabContent from './ShowdownTabContent.jsx';
import ShowdownScoreModal from './ShowdownScoreModal.jsx';
import ShowdownConfirm from './ShowdownConfirm.jsx';
import ShowdownCloudBar from './ShowdownCloudBar.jsx';
import ShowdownPendingPanel from './ShowdownPendingPanel.jsx';
import ShowdownConflictModal from './ShowdownConflictModal.jsx';
import ShowdownLegacyNotice from './ShowdownLegacyNotice.jsx';
import ShowdownUnsupportedNotice from './ShowdownUnsupportedNotice.jsx';
import ShowdownFormatPicker from './ShowdownFormatPicker.jsx';
import ShowdownV3ScoreModal from './v3/ShowdownV3ScoreModal.jsx';
import ShowdownV3WithdrawModal from './v3/ShowdownV3WithdrawModal.jsx';
import { v3LimitsOf } from './v3/showdownV3ScoreDraft.js';
import { v3PreviewOn } from './v3/showdownV3Preview.js';
import { v3PlanPreview, v3PlanSummary } from './v3/showdownV3PlanView.js';
import { closeObsoleteShowdown } from '../cloud/showdownHubActions.js';
import { isShowdownPrefill, prefillConfig, prefillPickerNote, prefillSetupNote } from './showdownPrefill.js';
import useShowdownCloud from './useShowdownCloud.js';
import { showdownCloud } from '../cloud/showdownCloud.js';
import { pendingView } from '../cloud/showdownPending.js';
import { runAction, nextStep, currentOperator } from './showdownOperatorActions.js';
import { loadShowdown, saveShowdown, archiveShowdown, listArchivedShowdowns, removeArchivedShowdown } from './showdownStore.js';
import { matchLabel } from './showdownView.js';
import { withdrawCopy, reopenQualifyingCopy, reopenShootoutCopy, undoFromCopy, confirmBracketCopy } from './showdownConfirmCopy.js';
import { createShowdownWithFormat, computeEarnings, raceToFor, payoutVersionOf, isPayoutV3, formatSupportProblem, formatChangePreview } from '../showdownEngine.js';
import { legacyFormatProblem } from '../showdownState.js';
import { downstreamOf } from '../showdownPlayoff.js';
import '../../cash-climb/CashClimb.css';

const PREFILL_BLOCKED = 'The Help me choose settings were not used: set this event aside first, then try again.';
const DISCARD_COPY = { title: 'Discard this event?', message: 'The setup is deleted from this tablet and the cloud.', confirmLabel: 'Discard', danger: true };
const newShowdownCopy = (state) => ({
  title: 'Start a new Showdown?',
  message: state.status === 'completed' ? 'This event stays in Past events on this tablet.' : 'This event is not finished. It is saved in Past events on this tablet and can be reopened.',
  confirmLabel: 'Choose format',
});
import './Showdown.css';
import './ShowdownBoard.css';
import './ShowdownCloud.css';

/**
 * `prefill`: one-time Smart Builder settings, applied through the format picker. With an event already
 * loaded, the usual discard (setup) or start-a-new-Showdown confirmation comes first; cancelling drops them.
 */
export default function ShowdownApp({ onLeave, prefill = null }) {
  const [state, setState] = useState(loadShowdown);
  const [handoff, setHandoff] = useState(() => (isShowdownPrefill(prefill) ? prefill : null));
  const [builderNote, setBuilderNote] = useState(null);
  const [archive, setArchive] = useState(listArchivedShowdowns);
  const [tab, setTab] = useState('run');
  const [error, setError] = useState('');
  const [score, setScore] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [corrections, setCorrections] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [picker, setPicker] = useState(() => (handoff && !state ? 'create' : null));
  const [withdrawing, setWithdrawing] = useState(null);
  const v3 = Boolean(state) && isPayoutV3(state);
  const v3Preview = v3 && v3PreviewOn();

  const replaceFromCloud = useCallback((next) => {
    setState(next);
    saveShowdown(next);
    if (next?.status === 'completed') archiveShowdown(next);
  }, []);
  const cloud = useShowdownCloud(showdownCloud, state, replaceFromCloud);
  useEffect(() => { if (cloud.sync.status === 'conflict') setShowConflict(true); }, [cloud.sync.status]);

  const commit = useCallback((next) => {
    replaceFromCloud(next);
    if (next && !formatSupportProblem(next)) cloud.queue(next);
  }, [replaceFromCloud, cloud]);

  const act = (name, ...args) => {
    const out = runAction(state, name, args);
    if (out.error) { setError(out.error); return false; }
    setError('');
    commit(out.state);
    return true;
  };

  const ask = (copy, onYes, onNo) => { setError(''); setConfirm({ ...copy, onYes, onNo }); };
  const closeConfirm = () => { confirm?.onNo?.(); setConfirm(null); setError(''); };
  const discard = () => { showdownCloud.remove(state.id); commit(null); return true; };

  useEffect(() => {
    if (!handoff || !state) return;
    if (formatSupportProblem(state) || (state.status !== 'setup' && legacyFormatProblem(state))) {
      setHandoff(null);
      setError(PREFILL_BLOCKED);
      return;
    }
    const drop = () => setHandoff(null);
    if (state.status === 'setup') ask(DISCARD_COPY, () => { discard(); setPicker('create'); return true; }, drop);
    else ask(newShowdownCopy(state), () => { setPicker('create'); return true; }, drop);
    // Runs once: the prefill is offered only when this screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newEvent = (payoutVersion) => {
    const prefilled = prefillConfig(handoff, payoutVersion);
    let created;
    try {
      created = createShowdownWithFormat({ ...prefilled, presetId: 'legends', payoutVersion, confirmed: true }, { by: currentOperator() });
    } catch (err) {
      setError(err.message);
      return false;
    }
    if (state && state.status !== 'setup') archiveShowdown(state);
    setBuilderNote(Object.keys(prefilled).length ? { id: created.id, text: prefillSetupNote(handoff) } : null);
    setHandoff(null);
    commit(created);
    setArchive(listArchivedShowdowns());
    setTab('run');
    setCorrections(false);
    setError('');
    return true;
  };

  const pickerModal = picker ? (
    <ShowdownFormatPicker
      current={picker === 'change' ? payoutVersionOf(state) : null}
      suggested={picker === 'create' ? handoff?.version ?? null : null}
      note={picker === 'create' ? prefillPickerNote(handoff) : ''}
      resetsFor={(v) => formatChangePreview(state, v).resets}
      error={error}
      onCancel={() => { setPicker(null); setHandoff(null); setError(''); }}
      onConfirm={(v) => { if (picker === 'change' ? act('changeFormat', v, { confirmed: true }) : newEvent(v)) setPicker(null); }}
    />
  ) : null;

  const h = {
    act,
    ask,
    board: {
      onStart: (id, table) => act('startMatch', id, table),
      onStartNext: (table) => act('startSuggested', table),
      onRecord: (m) => { setError(''); setScore({ match: m, correcting: false }); },
      onMove: (id, table) => act('moveTable', id, table),
      onTakeOff: (id) => act('takeOffTable', id),
      onHold: (id, on) => act('hold', id, on),
      onCorrect: (m) => { setError(''); setScore({ match: m, correcting: true }); },
      onUndoFrom: (m) => {
        const later = downstreamOf(state.matches.filter((x) => x.phase === 'playoff'), m.id)
          .map((id) => state.matches.find((x) => x.id === id))
          .filter((x) => x && x.status !== 'waiting')
          .map((x) => matchLabel(state, x));
        ask(undoFromCopy(state, m, later), (text) => act('undoFrom', m.id, text));
      },
    },
    lock: () => ask({ title: 'Lock qualifying standings?', message: 'Qualifiers are set from these standings. A tie across the cutoff opens a shootout.', confirmLabel: 'Lock standings' }, () => act('lockQualifying')),
    reopenQualifying: () => ask(reopenQualifyingCopy(state), (text) => act('reopenQualifying', text)),
    reopenShootout: () => ask(reopenShootoutCopy(state), (text) => act('reopenShootout', text)),
    confirmBracket: () => ask(confirmBracketCopy(state), () => act('confirmBracket')),
    complete: () => ask({ title: 'Complete the event?', message: 'Final results and earnings are locked in.', confirmLabel: 'Complete event' }, () => act('complete')),
    withdraw: (p) => (v3 ? (setError(''), setWithdrawing(p)) : ask(withdrawCopy(state, p), () => act('withdraw', p.id))),
    reinstate: (p) => ask({ title: `Undo ${p.name}'s withdrawal?`, message: 'The forfeits created by the withdrawal are cleared so those matches can be played.', confirmLabel: 'Undo withdrawal' }, () => act('reinstate', p.id)),
  };

  const confirmModal = confirm ? (
    <ShowdownConfirm {...confirm} error={error} onCancel={closeConfirm} onConfirm={(text) => { if (confirm.onYes(text) !== false) setConfirm(null); }} />
  ) : null;

  const rejectPhone = async (sub, reason) => {
    const problem = await cloud.reject(sub, reason);
    if (problem) { setError(problem); return; }
    act('rejectPhone', sub, reason);
  };

  const cloudParts = state ? (
    <>
      <ShowdownCloudBar
        eventId={state.id}
        status={state.status}
        v3={v3}
        guideVersion={payoutVersionOf(state)}
        isolated={Boolean(showdownCloud.isIsolated?.())}
        writesLive={Boolean(showdownCloud.writesLive?.())}
        sync={cloud.sync}
        onRetry={cloud.retry}
        onReupload={cloud.reupload}
        onOpenConflict={() => setShowConflict(true)}
      />
      {showConflict && cloud.sync.status === 'conflict' ? (
        <ShowdownConflictModal
          conflict={cloud.sync.conflict}
          onClose={() => setShowConflict(false)}
          onChoose={(choice) => { setShowConflict(false); cloud.resolve(choice); }}
        />
      ) : null}
    </>
  ) : null;

  if (!state) {
    return (
      <>
        <ShowdownStart
          archive={archive}
          onNew={() => { setError(''); setPicker('create'); }}
          onOpen={(item) => {
            if (formatSupportProblem(item) || legacyFormatProblem(item)) { replaceFromCloud(item); return; }
            commit(item);
            setTab(item.status === 'completed' ? 'results' : 'run');
          }}
          onRemove={(item) => { removeArchivedShowdown(item.id); setArchive(listArchivedShowdowns()); }}
          onLeave={onLeave}
        />
        {pickerModal}
      </>
    );
  }

  const unsupported = formatSupportProblem(state);
  if (unsupported) {
    const setAside = () => { archiveShowdown(state); replaceFromCloud(null); setArchive(listArchivedShowdowns()); };
    return <ShowdownUnsupportedNotice state={state} message={unsupported} onSetAside={setAside} onLeave={onLeave} />;
  }

  if (state.status === 'setup') {
    return (
      <>
        {error ? <p className="sd-error sd-banner" role="alert">{error}</p> : null}
        {builderNote?.id === state.id ? <p className="sd-note sd-banner" role="status">{builderNote.text}</p> : null}
        {cloudParts}
        <ShowdownSetup
          state={state}
          act={act}
          onLeave={onLeave}
          v3Preview={v3Preview}
          onChangeFormat={() => { setError(''); setPicker('change'); }}
          onStart={() => ask(v3
            ? { title: 'Start this V3 event?', message: 'The qualifying circle is drawn at random. Entrants, entry fee and the V3 payout plan shown on this screen are locked; the plan\u2019s financial terms cannot be edited after the start.', details: v3PlanSummary(v3PlanPreview(state).view), confirmLabel: 'Lock plan and start qualifying' }
            : { title: 'Start qualifying?', message: 'The qualifying circle is drawn at random. Entrants, entry fee, and payouts are locked.', confirmLabel: 'Start qualifying' },
          () => act('start', { v3Preview }))}
          onDiscard={() => ask(DISCARD_COPY, discard)}
        />
        {confirmModal}
        {pickerModal}
      </>
    );
  }

  const legacy = legacyFormatProblem(state);
  if (legacy) {
    const closeLegacy = async () => {
      const problem = await closeObsoleteShowdown(showdownCloud, state);
      if (!problem) { replaceFromCloud(null); setArchive(listArchivedShowdowns()); }
      return problem;
    };
    return <ShowdownLegacyNotice state={state} message={legacy} onClose={closeLegacy} onLeave={onLeave} />;
  }

  const raceTo = score && !v3 ? raceToFor(state, score.match.phase) : 0;
  const done = (ok) => { if (ok) setScore(null); };

  return (
    <div className="sd-app">
      <ShowdownHeader
        state={state}
        tab={tab}
        onTab={setTab}
        paid={computeEarnings(state).paid}
        step={nextStep(state)}
        corrections={corrections}
        onCorrections={setCorrections}
        onLeave={onLeave}
        onNew={() => ask(newShowdownCopy(state), () => { setPicker('create'); return true; })}
      />
      {error && !score && !confirm && !withdrawing && tab !== 'settle' ? <p className="sd-error sd-banner" role="alert">{error} <button type="button" className="sd-link" onClick={() => setError('')}>Dismiss</button></p> : null}
      {cloudParts}
      <ShowdownPendingPanel
        items={pendingView(state, cloud.pendingRows)}
        error={cloud.pendingError}
        onApprove={(sub) => act('approvePhone', sub)}
        onReject={rejectPhone}
      />
      <ShowdownTabContent state={state} tab={tab} corrections={corrections} h={h} error={error} />
      {score && v3 ? (
        <ShowdownV3ScoreModal
          match={score.match}
          limits={v3LimitsOf(state, score.match.phase)}
          correcting={score.correcting}
          error={error}
          onCancel={() => { setScore(null); setError(''); }}
          onSave={(a, b) => done(act('recordScore', score.match.id, a, b))}
          onForfeit={(ids, entry) => done(act('forfeit', score.match.id, ids, entry))}
        />
      ) : null}
      {withdrawing ? (
        <ShowdownV3WithdrawModal
          state={state}
          player={withdrawing}
          error={error}
          onCancel={() => { setWithdrawing(null); setError(''); }}
          onConfirm={(opts) => { if (act('withdraw', withdrawing.id, opts)) setWithdrawing(null); }}
        />
      ) : null}
      {score && !v3 ? (
        <ShowdownScoreModal
          match={score.match}
          raceTo={raceTo}
          payoutVersion={payoutVersionOf(state)}
          correcting={score.correcting}
          error={error}
          onCancel={() => { setScore(null); setError(''); }}
          onSave={(a, b) => done(act('recordScore', score.match.id, a, b))}
          onForfeit={(ids) => done(act('forfeit', score.match.id, ids))}
        />
      ) : null}
      {confirmModal}
      {pickerModal}
    </div>
  );
}
