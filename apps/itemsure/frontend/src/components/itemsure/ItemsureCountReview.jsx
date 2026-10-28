import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cancelSession, listTotals, loadPeopleNames, OPEN_STATUSES } from '../../services/itemsureCountService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import { COUNT_STATUS_LABELS, ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { ErrorNote, Modal } from './ItemsureUi.jsx';
import ItemsureCountReport from './ItemsureCountReport.jsx';
import ItemsureCountSubmitForm from './ItemsureCountSubmitForm.jsx';

/** Review step for an open count, and the read-only record of a closed one. */
export default function ItemsureCountReview({ data, onReload }) {
  const { session, items, entries, location, storageAreas } = data;
  const { can } = useItemsureWorkspace();
  const navigate = useNavigate();
  const [totals, setTotals] = useState(null);
  const [names, setNames] = useState({});
  const [modal, setModal] = useState('');
  const { busy, error, setError, run } = useItemsureAction();
  const isOpen = OPEN_STATUSES.includes(session.status);
  const countsPath = `${ITEMSURE_PATH}/counts`;

  useEffect(() => {
    let alive = true;
    listTotals(session.id)
      .then((t) => alive && setTotals(t))
      .catch((e) => alive && setError(e.message));
    loadPeopleNames([
      session.created_by,
      session.submitted_by,
      session.cancelled_by,
      ...entries.flatMap((e) => [e.counted_by, e.updated_by]),
    ]).then((n) => alive && setNames(n));
    return () => {
      alive = false;
    };
  }, [session, entries, setError]);

  const areaName = useCallback(
    (id) => (id ? storageAreas.find((a) => a.id === id)?.name || 'Storage area' : 'No specific area'),
    [storageAreas],
  );

  const stats = useMemo(() => {
    const countedIds = new Set(entries.map((e) => e.item_id));
    const zero = Object.values(totals || {}).filter((t) => displayQuantity(t.total_base_quantity) === '0').length;
    return { counted: countedIds.size, zero, omitted: items.length - countedIds.size };
  }, [entries, items, totals]);

  const closeModal = useCallback(() => setModal(''), []);
  const afterClose = async () => {
    setModal('');
    await onReload();
    navigate(`${countsPath}/${session.id}`, { replace: true });
  };

  const cancel = () =>
    run(async () => {
      await cancelSession(session.id);
      await afterClose();
    });

  const place = [location?.name, session.scope === 'storage_area' ? areaName(session.storage_area_id) : null].filter(Boolean).join(' · ');

  return (
    <div className="isu-page">
      <div className="isu-page-head">
        <div>
          <p className="isu-eyebrow">{isOpen ? 'Review' : COUNT_STATUS_LABELS[session.status]}</p>
          <h1>{session.name}</h1>
          <p className="isu-muted">{place}</p>
        </div>
      </div>

      {session.status === 'submitted' ? (
        <p className="isu-notice">
          Submitted {formatWhen(session.submitted_at)} by {names[session.submitted_by] || 'a member'}. This count is read-only.
        </p>
      ) : null}
      {session.status === 'cancelled' ? (
        <p className="isu-notice">
          Cancelled {formatWhen(session.cancelled_at)} by {names[session.cancelled_by] || 'a member'}. This count is read-only.
        </p>
      ) : null}
      <ErrorNote message={error} />

      <div className="isu-stats">
        <div className="isu-stat"><span className="isu-stat-value">{stats.counted}</span><span className="isu-stat-label">Counted</span></div>
        <div className="isu-stat"><span className="isu-stat-value">{totals ? stats.zero : '\u2014'}</span><span className="isu-stat-label">Counted as zero</span></div>
        <div className="isu-stat"><span className="isu-stat-value">{stats.omitted}</span><span className="isu-stat-label">Not counted</span></div>
      </div>

      <ItemsureCountReport items={items} entries={entries} totals={totals} names={names} areaName={areaName} />

      <div className="isu-count-footer">
        <Link to={countsPath} className="isu-btn isu-btn--ghost isu-btn--sm">All counts</Link>
        {isOpen && can('counts.edit') ? (
          <Link to={`${countsPath}/${session.id}`} className="isu-btn isu-btn--ghost isu-btn--sm">Keep counting</Link>
        ) : null}
        {isOpen && can('counts.cancel') ? (
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm isu-btn--danger" disabled={busy} onClick={() => setModal('cancel')}>
            Cancel count
          </button>
        ) : null}
        {isOpen && can('counts.submit') ? (
          <button type="button" className="isu-btn isu-btn--primary" disabled={busy || stats.counted === 0} onClick={() => setModal('submit')}>
            Submit
          </button>
        ) : null}
      </div>
      {isOpen && !can('counts.submit') ? (
        <p className="isu-muted isu-small">A manager or owner submits this count when counting is finished.</p>
      ) : null}

      <Modal open={modal === 'submit'} title="Submit count" onClose={closeModal}>
        <ItemsureCountSubmitForm sessionId={session.id} omittedCount={stats.omitted} onSubmitted={afterClose} />
      </Modal>
      <Modal open={modal === 'cancel'} title="Cancel count" onClose={closeModal}>
        <div className="isu-stack">
          <p>Cancelling keeps this count in history but no one can add to it or submit it.</p>
          <ErrorNote message={error} />
          <button type="button" className="isu-btn isu-btn--primary isu-btn--block isu-btn--danger-solid" disabled={busy} onClick={cancel}>
            {busy ? 'Cancelling…' : 'Cancel count'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
