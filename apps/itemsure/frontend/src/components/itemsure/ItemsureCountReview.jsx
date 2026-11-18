import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cancelSession, listTotals, loadPeopleNames, OPEN_STATUSES } from '../../services/itemsureCountService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useItemsureAction from '../../hooks/useItemsureAction.js';
import useItemPlaces from '../../hooks/useItemPlaces.js';
import useItemStock from '../../hooks/useItemStock.js';
import { COUNT_STATUS_LABELS, ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { displayQuantity } from '../../utils/itemsureQuantity.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { slotsInUse } from '../../utils/itemsureItemStock.js';
import { splitForSpot } from '../../utils/itemsureCountAreas.js';
import { ErrorNote, Modal } from './ItemsureUi.jsx';
import ItemsureCountReport from './ItemsureCountReport.jsx';
import ItemsureCountSubmitForm from './ItemsureCountSubmitForm.jsx';
import ItemsureCountDecision from './ItemsureCountDecision.jsx';

/** Review step for an open count, and the read-only record of a closed one. */
export default function ItemsureCountReview({ data, onReload }) {
  const { session, items, entries, location, storageAreas } = data;
  const { organization, features, can } = useItemsureWorkspace();
  const navigate = useNavigate();
  const [totals, setTotals] = useState(null);
  const [names, setNames] = useState({});
  const [modal, setModal] = useState('');
  const { busy, error, setError, run } = useItemsureAction();
  const isOpen = OPEN_STATUSES.includes(session.status);
  const countsPath = `${ITEMSURE_PATH}/counts`;
  const places = useItemPlaces(organization.id);
  const { stock } = useItemStock(organization.id, can('inventory.view'));
  const spotScoped = session.scope === 'storage_area';

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
    (id) => (id ? storageAreas.find((a) => a.id === id)?.name || 'Spot' : 'Loose (no specific spot)'),
    [storageAreas],
  );

  const inUse = useMemo(
    () => (places.places ? slotsInUse({ places: places.places, balances: stock?.balances || [], targets: stock?.targets || [] }) : null),
    [places.places, stock],
  );
  const countedEntryIds = useMemo(() => new Set(entries.map((e) => e.item_id)), [entries]);
  // Spot counts should not treat the whole catalog as "not counted."
  const expectedItems = useMemo(() => {
    if (!spotScoped) return items;
    const countedHere = new Set(
      entries.filter((e) => (e.storage_area_id || null) === (session.storage_area_id || null)).map((e) => e.item_id),
    );
    const { here } = splitForSpot(items, inUse, session.location_id, session.storage_area_id || null, countedHere);
    return here.length ? here : items;
  }, [spotScoped, items, inUse, session.location_id, session.storage_area_id, entries]);

  const stats = useMemo(() => {
    const expectedIds = new Set(expectedItems.map((i) => i.item_id));
    const counted = [...countedEntryIds].filter((id) => expectedIds.has(id)).length;
    const zero = Object.values(totals || {}).filter((t) => {
      if (displayQuantity(t.total_base_quantity) !== '0') return false;
      return expectedIds.has(t.item_id);
    }).length;
    return { counted, zero, omitted: expectedItems.length - counted, expected: expectedItems.length };
  }, [countedEntryIds, expectedItems, totals]);

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
      {spotScoped && expectedItems.length < items.length ? (
        <p className="isu-muted isu-small">
          Totals cover the {stats.expected} items kept in {areaName(session.storage_area_id)}, not the full catalog ({items.length}).
        </p>
      ) : null}

      {session.status === 'submitted' ? <ItemsureCountDecision session={session} areaName={areaName} /> : null}

      <ItemsureCountReport items={expectedItems} entries={entries} totals={totals} names={names} areaName={areaName} />

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
        <ItemsureCountSubmitForm
          sessionId={session.id}
          omittedCount={stats.omitted}
          applyNow={!features.approvals && can('counts.approve')}
          onSubmitted={afterClose}
        />
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
