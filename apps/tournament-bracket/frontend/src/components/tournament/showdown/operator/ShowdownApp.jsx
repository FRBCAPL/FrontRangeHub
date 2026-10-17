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
import { closeObsoleteShowdown } from '../cloud/showdownHubActions.js';
import useShowdownCloud from './useShowdownCloud.js';
import { showdownCloud } from '../cloud/showdownCloud.js';
import { pendingView } from '../cloud/showdownPending.js';
import { runAction, nextStep, currentOperator } from './showdownOperatorActions.js';
import { loadShowdown, saveShowdown, archiveShowdown, listArchivedShowdowns, removeArchivedShowdown } from './showdownStore.js';
import { matchLabel } from './showdownView.js';
import { withdrawCopy, reopenQualifyingCopy, reopenShootoutCopy, undoFromCopy, confirmBracketCopy } from './showdownConfirmCopy.js';
import { createShowdown, computeEarnings } from '../showdownEngine.js';
import { legacyFormatProblem } from '../showdownState.js';
import { downstreamOf } from '../showdownPlayoff.js';
import '../../cash-climb/CashClimb.css';
import './Showdown.css';
import './ShowdownBoard.css';
import './ShowdownCloud.css';

export default function ShowdownApp({ onLeave }) {
  const [state, setState] = useState(loadShowdown);
  const [archive, setArchive] = useState(listArchivedShowdowns);
  const [tab, setTab] = useState('run');
  const [error, setError] = useState('');
  const [score, setScore] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [corrections, setCorrections] = useState(false);
  const [showConflict, setShowConflict] = useState(false);

  const replaceFromCloud = useCallback((next) => {
    setState(next);
    saveShowdown(next);
    if (next?.status === 'completed') archiveShowdown(next);
  }, []);
  const cloud = useShowdownCloud(showdownCloud, state, replaceFromCloud);
  useEffect(() => { if (cloud.sync.status === 'conflict') setShowConflict(true); }, [cloud.sync.status]);

  const commit = useCallback((next) => {
    replaceFromCloud(next);
    if (next) cloud.queue(next);
  }, [replaceFromCloud, cloud]);

  const act = (name, ...args) => {
    const out = runAction(state, name, args);
    if (out.error) { setError(out.error); return false; }
    setError('');
    commit(out.state);
    return true;
  };

  const ask = (copy, onYes) => { setError(''); setConfirm({ ...copy, onYes }); };
  const closeConfirm = () => { setConfirm(null); setError(''); };

  const newEvent = () => {
    if (state && state.status !== 'setup') archiveShowdown(state);
    commit(createShowdown({ presetId: 'legends' }, { by: currentOperator() }));
    setArchive(listArchivedShowdowns());
    setTab('run');
    setCorrections(false);
  };

  const h = {
    act,
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
    withdraw: (p) => ask(withdrawCopy(state, p), () => act('withdraw', p.id)),
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
      <ShowdownStart
        archive={archive}
        onNew={newEvent}
        onOpen={(item) => {
          if (legacyFormatProblem(item)) { replaceFromCloud(item); return; }
          commit(item);
          setTab(item.status === 'completed' ? 'results' : 'run');
        }}
        onRemove={(item) => { removeArchivedShowdown(item.id); setArchive(listArchivedShowdowns()); }}
        onLeave={onLeave}
      />
    );
  }

  if (state.status === 'setup') {
    return (
      <>
        {error ? <p className="sd-error sd-banner" role="alert">{error}</p> : null}
        {cloudParts}
        <ShowdownSetup
          state={state}
          act={act}
          onLeave={onLeave}
          onStart={() => ask({ title: 'Start qualifying?', message: 'The qualifying circle is drawn at random. Entrants, entry fee, and payouts are locked.', confirmLabel: 'Start qualifying' }, () => act('start'))}
          onDiscard={() => ask({ title: 'Discard this event?', message: 'The setup is deleted from this tablet and the cloud.', confirmLabel: 'Discard', danger: true }, () => { showdownCloud.remove(state.id); commit(null); return true; })}
        />
        {confirmModal}
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

  const raceTo = score?.match.phase === 'qualifying' ? state.settings.qualifyingRaceTo : state.settings.playoffRaceTo;
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
        onNew={() => ask({ title: 'Start a new Showdown?', message: state.status === 'completed' ? 'This event stays in Past events on this tablet.' : 'This event is not finished. It is saved in Past events on this tablet and can be reopened.', confirmLabel: 'New Showdown' }, () => { newEvent(); return true; })}
      />
      {error && !score && !confirm ? <p className="sd-error sd-banner" role="alert">{error} <button type="button" className="sd-link" onClick={() => setError('')}>Dismiss</button></p> : null}
      {cloudParts}
      <ShowdownPendingPanel
        items={pendingView(state, cloud.pendingRows)}
        error={cloud.pendingError}
        onApprove={(sub) => act('approvePhone', sub)}
        onReject={rejectPhone}
      />
      <ShowdownTabContent state={state} tab={tab} corrections={corrections} h={h} />
      {score ? (
        <ShowdownScoreModal
          match={score.match}
          raceTo={raceTo}
          correcting={score.correcting}
          error={error}
          onCancel={() => { setScore(null); setError(''); }}
          onSave={(a, b) => done(act('recordScore', score.match.id, a, b))}
          onForfeit={(ids) => done(act('forfeit', score.match.id, ids))}
        />
      ) : null}
      {confirmModal}
    </div>
  );
}
