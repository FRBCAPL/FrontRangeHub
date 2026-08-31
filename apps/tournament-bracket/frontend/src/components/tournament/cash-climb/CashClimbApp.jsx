import React, { useCallback, useEffect, useRef, useState } from 'react';
import CashClimbSetup from './CashClimbSetup.jsx';
import CashClimbPlay from './CashClimbPlay.jsx';
import { createOpenTournament, sanitizeCashClimb, startTournament, recordMatchResult, continueCashClimb, chopCashClimb, formatMoney } from './cashClimbEngine.js';
import { chopRemainingPreview } from './cashClimbKohSettle.js';
import { updateOpenTournament } from './cashClimbEdit.js';
import { loadCashClimb, saveCashClimb, clearCashClimb } from './cashClimbStore.js';
import {
  syncCashClimbCloud,
  retireCashClimbEvent,
  loadLiveCashClimbEvent,
  loadCashClimbPending,
  deleteCashClimbPending,
  listSavedCashClimbEvents,
  deleteCashClimbEvent,
} from './cashClimbCloud.js';
import { cashClimbPublishErrorMessage, isCashClimbAuthError } from './cashClimbPublic.js';
import { cashClimbUnsavedConfirm, cashClimbUnsavedNewConfirm } from './cashClimbCloudSave.js';
import CashClimbCloudSaveModal from './CashClimbCloudSaveModal.jsx';
import { findMatchById, idsEqual, resolvePendingWinnerId } from './cashClimbSubmit.js';
import { playedGameFromPending } from './cashClimbPlayedGame.js';
import { preferLocalTournament } from './cashClimbSaved.js';
import './CashClimb.css';

const PENDING_POLL_MS = 2500;

export default function CashClimbApp({ onLeave }) {
  const [tournament, setTournament] = useState(() => loadCashClimb());
  const [submissions, setSubmissions] = useState([]);
  const [savedEvents, setSavedEvents] = useState([]);
  const [cloudError, setCloudError] = useState('');
  const [cloudNeedsSignIn, setCloudNeedsSignIn] = useState(false);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const tournamentRef = useRef(tournament);
  const hadCloudError = useRef(false);
  tournamentRef.current = tournament;

  const applyCloudResult = useCallback((result) => {
    const error = result?.error || null;
    const message = error ? cashClimbPublishErrorMessage(error) : '';
    setCloudError(message);
    setCloudNeedsSignIn(Boolean(error && isCashClimbAuthError(error)));
    if (message && !hadCloudError.current) setSavePromptOpen(true);
    if (!message) setSavePromptOpen(false);
    hadCloudError.current = Boolean(message);
  }, []);

  const persist = useCallback((next) => {
    setTournament(next);
    saveCashClimb(next);
    syncCashClimbCloud(next).then(applyCloudResult);
  }, [applyCloudResult]);

  const retryCloud = useCallback(() => {
    const current = tournamentRef.current;
    if (!current?.id) return Promise.resolve();
    saveCashClimb(current);
    return syncCashClimbCloud(current).then(applyCloudResult);
  }, [applyCloudResult]);

  const refreshSaved = useCallback(async () => {
    setSavedEvents(await listSavedCashClimbEvents());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const local = loadCashClimb();
      const live = await loadLiveCashClimbEvent();
      if (cancelled) return;
      const chosen = preferLocalTournament(local, live.tournament);
      if (chosen && !local) {
        const restored = sanitizeCashClimb(chosen);
        setTournament(restored);
        saveCashClimb(restored);
      } else if (local) {
        const result = await syncCashClimbCloud(local);
        if (!cancelled) applyCloudResult(result);
      }
      if (!cancelled) await refreshSaved();
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [refreshSaved, applyCloudResult]);

  useEffect(() => {
    if (!tournament?.id || tournament.status === 'completed') {
      setSubmissions([]);
      return undefined;
    }
    let cancelled = false;
    const refresh = async () => {
      const rows = await loadCashClimbPending(tournament.id);
      if (!cancelled) setSubmissions(rows);
    };
    refresh();
    const timer = setInterval(refresh, PENDING_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tournament?.id, tournament?.status, tournament?.matches]);

  useEffect(() => {
    if (!tournament?.id || !cloudError) return undefined;
    const save = () => {
      const current = tournamentRef.current;
      if (!current?.id) return;
      syncCashClimbCloud(current).then(applyCloudResult);
    };
    const timer = setInterval(save, 8000);
    const onFocus = () => save();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [tournament?.id, cloudError, applyCloudResult]);

  const handleStart = (config) => {
    try {
      const created = createOpenTournament(config);
      persist(startTournament(created));
    } catch (err) {
      alert(err.message || 'Could not start tournament');
    }
  };

  const handleRecord = (matchId, winnerId, score, extras = {}) => {
    try {
      persist(recordMatchResult(tournament, matchId, winnerId, score, extras));
    } catch (err) {
      alert(err.message || 'Could not save result');
    }
  };

  const dropPending = (matchId) => {
    setSubmissions((prev) => prev.filter((item) => !idsEqual(item.match_id, matchId)));
    deleteCashClimbPending(tournament.id, matchId);
  };

  const handleConfirmSubmit = (row) => {
    const match = findMatchById(tournament, row?.match_id);
    const winnerId = resolvePendingWinnerId(match, row);
    if (!match || !winnerId) {
      alert('That submit does not match an open table. Enter the result on this tablet instead.');
      return false;
    }
    try {
      const extras = { playedGame: playedGameFromPending(row) };
      persist(recordMatchResult(tournament, match.id, winnerId, row.score || null, extras));
      dropPending(match.id);
      return true;
    } catch (err) {
      alert(err.message || 'Could not confirm that result');
      return false;
    }
  };

  const handleRejectSubmit = (row) => {
    if (!row?.match_id) return;
    dropPending(row.match_id);
  };

  const handleContinue = () => {
    try {
      persist(continueCashClimb(tournament));
    } catch (err) {
      alert(err.message || 'Could not continue');
    }
  };

  const handleChop = () => {
    try {
      const remaining = formatMoney(chopRemainingPreview(tournament));
      const thirdUnpaid = tournament.leftoverBuckets && !tournament.thirdLastAwardPaid;
      const ok = window.confirm(
        thirdUnpaid
          ? `Pay 3rd last leftover first, then chop remaining leftover 50/50 (${remaining} after 3rd is paid)?\n\nEach player keeps match money already won. Pending King of the Hill matches will not be played and will not pay extra.`
          : `Chop remaining leftover 50/50 (${remaining})?\n\nEach player keeps match money already won. Pending King of the Hill matches will not be played and will not pay extra.`
      );
      if (!ok) return;
      persist(chopCashClimb(tournament));
    } catch (err) {
      alert(err.message || 'Could not chop');
    }
  };

  const handleEdit = (patch) => {
    try {
      persist(updateOpenTournament(tournament, patch));
      return true;
    } catch (err) {
      alert(err.message || 'Could not update tournament');
      return false;
    }
  };

  const leaveToSetup = () => {
    clearCashClimb();
    setTournament(null);
    setSubmissions([]);
    refreshSaved();
  };

  const handleNew = () => {
    if (cloudError && !window.confirm(cashClimbUnsavedNewConfirm())) return;
    if (tournament && tournament.status !== 'completed') {
      const ok = window.confirm(
        'Start a new Cash Climb? This event will be ended in the database and cleared from this tablet. You can open or remove it later from setup.'
      );
      if (!ok) return;
      retireCashClimbEvent(tournament);
    }
    leaveToSetup();
  };

  const handleLeave = () => {
    if (cloudError && !window.confirm(cashClimbUnsavedConfirm())) return;
    onLeave?.();
  };

  const handleRemove = async () => {
    if (!tournament?.id) return;
    const ok = window.confirm('Remove this tournament from the database and this tablet? This cannot be undone.');
    if (!ok) return;
    await deleteCashClimbEvent(tournament.id);
    leaveToSetup();
  };

  const handleOpenSaved = (item) => {
    if (!item?.tournament) return;
    persist(sanitizeCashClimb(item.tournament));
  };

  const handleRemoveSaved = async (item) => {
    if (!item?.id) return;
    const ok = window.confirm(`Remove "${item.name}" from the database? This cannot be undone.`);
    if (!ok) return;
    await deleteCashClimbEvent(item.id);
    const local = loadCashClimb();
    if (local && idsEqual(local.id, item.id)) clearCashClimb();
    refreshSaved();
  };

  if (!tournament) {
    return (
      <CashClimbSetup
        onStart={handleStart}
        onCancel={onLeave}
        savedEvents={savedEvents}
        onOpenSaved={handleOpenSaved}
        onRemoveSaved={handleRemoveSaved}
      />
    );
  }

  return (
    <>
      <CashClimbPlay
        tournament={tournament}
        submissions={submissions}
        onRecord={handleRecord}
        onConfirmSubmit={handleConfirmSubmit}
        onRejectSubmit={handleRejectSubmit}
        onContinue={handleContinue}
        onChop={handleChop}
        onNew={handleNew}
        onRemove={handleRemove}
        onEdit={handleEdit}
        onLeave={handleLeave}
        cloudError={cloudError}
        cloudNeedsSignIn={cloudNeedsSignIn}
        onRetryCloud={retryCloud}
        onOpenSavePrompt={() => setSavePromptOpen(true)}
      />
      {cloudError && savePromptOpen ? (
        <CashClimbCloudSaveModal
          needsSignIn={cloudNeedsSignIn}
          message={cloudError}
          onRetry={retryCloud}
          onKeepWorking={() => setSavePromptOpen(false)}
          onSignedIn={retryCloud}
        />
      ) : null}
    </>
  );
}
