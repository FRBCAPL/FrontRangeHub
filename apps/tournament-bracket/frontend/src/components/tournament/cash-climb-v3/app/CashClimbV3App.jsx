import React, { useEffect, useMemo, useState } from 'react';
import { cashClimbV3Store, CASH_CLIMB_V3_EVENTS_KEY } from './cashClimbV3Store.js';
import { postCashClimbV3Result, settleCashClimbV3Record, startCashClimbV3Tournament } from './cashClimbV3Play.js';
import CashClimbV3Setup from './CashClimbV3Setup.jsx';
import CashClimbV3EventView from './CashClimbV3EventView.jsx';
import CashClimbV3SyncBanner from './CashClimbV3SyncBanner.jsx';
import CashClimbV3ConflictDialog from './CashClimbV3ConflictDialog.jsx';
import CashClimbV3FirstUploadDialog from './CashClimbV3FirstUploadDialog.jsx';
import useCashClimbV3Cloud, { APPROVAL_MODES } from './useCashClimbV3Cloud.js';
import { freshPostCheck } from './cashClimbV3FreshPost.js';
import { openCashClimbV3FromCloud } from './cashClimbV3CloudOpen.js';
import { canDeleteFromCloud, deletePrompt, removalPrompt } from './cashClimbV3Removal.js';
import { cashClimbV3Cloud, cashClimbV3SyncStore } from '../cloud/cashClimbV3Cloud.js';
import { sameValue } from './cashClimbV3SameValue.js';
import './CashClimbV3.css';
import './CashClimbV3Cloud.css';

/**
 * Cash Climb (V3) screen: setup for a new tournament, or a saved tournament restored exactly from this
 * tablet (or, when it is only in the cloud, from a cloud copy that restores exactly). `intent` 'new' | 'open';
 * `eventId` picks the tournament to open. Every confirmed change is saved on the tablet before it is shown
 * and then sent to the cloud; a change that cannot be saved on the tablet is not applied.
 */
export default function CashClimbV3App({ intent = 'open', eventId = null, onLeave, cloud = cashClimbV3Cloud }) {
  const store = useMemo(() => cashClimbV3Store(), []);
  const syncStore = useMemo(() => cashClimbV3SyncStore(), []);
  const [opened, setOpened] = useState(() => {
    if (intent === 'new') return null;
    const id = eventId || store.openId();
    return id ? store.load(id) : { status: 'missing' };
  });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [approving, setApproving] = useState(false);
  const record = opened?.status === 'ok' ? opened.record : null;

  const sync = useCashClimbV3Cloud({
    recordId: record?.id || null,
    record,
    cloud,
    syncStore,
    onReplace: (next) => {
      const saved = store.save(next);
      if (saved.error) { setError(saved.error); return; }
      setOpened(store.load(next.id));
    },
  });

  useEffect(() => {
    if (intent === 'new' || !eventId || opened?.status !== 'missing') return undefined;
    let current = true;
    setFetching(true);
    openCashClimbV3FromCloud({ cloud, store, syncStore, id: eventId }).then((r) => {
      if (!current) return;
      setFetching(false);
      if (r.status === 'ok') { store.setOpen(eventId); setOpened(store.load(eventId)); return; }
      setOpened(r.status === 'invalid' ? { status: 'invalid', problems: r.problems } : { status: 'missing', cloudError: r.message || '' });
    });
    return () => { current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!record?.id) return undefined;
    const onStorage = (e) => {
      if (e.key !== CASH_CLIMB_V3_EVENTS_KEY) return;
      const next = store.load(record.id);
      if (next.status === 'ok') sync.observe(next.record);
      if (next.status === 'ok') setOpened((cur) => (cur?.status === 'ok' && sameValue(cur.record, next.record) ? cur : next));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [record?.id, store]);

  const commit = (next) => {
    const saved = store.save(next);
    if (saved.error) return { status: 'invalid', problems: [saved.error] };
    store.setOpen(next.id);
    setOpened(store.load(next.id));
    setError('');
    sync.queue(next);
    return { status: 'ok' };
  };
  const saveSetup = (next) => {
    // Created while this cloud is in use: its first upload needs no separate review.
    if (!editing && APPROVAL_MODES.includes(cloud.mode())) syncStore.saveMeta(next.id, { uploadApproved: true });
    const r = editing ? apply(opened.record, { status: 'ok', record: next }) : commit(next);
    if (r.status !== 'ok') { setError(r.problems.join(' ')); return; }
    setEditing(false);
  };
  const apply = (base, result) => {
    if (result.status !== 'ok') return result;
    if (sync.status.state === 'conflict') {
      return { status: 'invalid', problems: ['Another device changed this tournament. Review both copies and choose one before making more changes.'] };
    }
    const current = store.load(base.id);
    if (current.status !== 'ok' || !sameValue(current.record, base)) {
      return { status: 'invalid', problems: ['This tournament was changed in another window on this device. Go back and open it again before continuing.'] };
    }
    return commit(result.record);
  };
  const postResult = async (matchId, submitted) => {
    const base = record;
    const stop = await freshPostCheck(sync.checkLatest);
    if (stop) return stop;
    return apply(base, postCashClimbV3Result(base, matchId, submitted));
  };

  if ((intent === 'new' && !opened) || (editing && opened?.status === 'ok')) {
    return (
      <>
        {error ? <p className="ccv3-problems" role="alert">{error}</p> : null}
        <CashClimbV3Setup
          initial={editing ? opened.record : null}
          onCancel={editing ? () => { setEditing(false); setError(''); } : onLeave}
          onCreate={saveSetup}
        />
      </>
    );
  }

  if (!record) {
    return (
      <div className="create-tournament-form cc-setup">
        <h3>Cash Climb</h3>
        <p className="cc-setup-note" role="alert">
          {fetching ? 'Loading this tournament from the cloud…'
            : opened?.status === 'invalid' ? 'This saved tournament cannot be opened:'
              : opened?.cloudError || 'This tournament is not saved on this tablet.'}
        </p>
        {opened?.status === 'invalid' ? <ul className="ccv3-problems">{opened.problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
        <div className="form-actions"><button type="button" className="btn-secondary" onClick={onLeave}>Back</button></div>
      </div>
    );
  }

  const meta = syncStore.meta(record.id);
  const removeLocal = () => {
    const removed = store.remove(record.id);
    if (removed.error) { window.alert(removed.error); return; }
    syncStore.forget(record.id);
    onLeave();
  };
  const panel = (
    <>
      <CashClimbV3SyncBanner
        status={sync.status} mode={sync.mode} onRetry={sync.retry} onReupload={sync.reupload}
        onReview={() => setReviewing(true)} onReviewUpload={() => setApproving(true)}
      />
      {error ? <p className="ccv3-problems" role="alert">{error}</p> : null}
      {approving && sync.status.state === 'needs-approval' ? (
        <CashClimbV3FirstUploadDialog
          record={record}
          mode={sync.mode}
          onClose={() => setApproving(false)}
          onApprove={async () => { await sync.approveUpload(); setApproving(false); }}
        />
      ) : null}
      {reviewing && sync.conflict ? (
        <CashClimbV3ConflictDialog
          conflict={sync.conflict}
          onClose={() => setReviewing(false)}
          onUseCloud={(opts) => { const r = sync.useCloud(opts); if (r.ok) setReviewing(false); return r; }}
          onUseTablet={async () => { const r = await sync.useTablet(); if (r.ok) setReviewing(false); return r; }}
        />
      ) : null}
    </>
  );
  return (
    <CashClimbV3EventView
      record={record}
      optimizerCurrent={opened.optimizerCurrent}
      cloudPanel={panel}
      onBack={onLeave}
      onEdit={() => setEditing(true)}
      onStart={() => apply(record, startCashClimbV3Tournament(record))}
      onPost={postResult}
      onRefresh={() => { sync.pull(); }}
      onSettle={() => apply(record, settleCashClimbV3Record(record))}
      onRemove={() => { if (window.confirm(removalPrompt(record, meta))) removeLocal(); }}
      onDeleteCloud={canDeleteFromCloud(record, meta) ? async () => {
        if (!window.confirm(deletePrompt(record))) return;
        const r = await sync.deleteFromCloud();
        if (!r.ok) { setError(r.problem); return; }
        removeLocal();
      } : undefined}
    />
  );
}
