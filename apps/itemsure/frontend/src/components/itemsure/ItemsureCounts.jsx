import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSessions, OPEN_STATUSES } from '../../services/itemsureCountService.js';
import { listLocations } from '../../services/itemsureLocationService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { COUNT_STATUS_LABELS, ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { ErrorNote, PageHead } from './ItemsureUi.jsx';

function placeLabel(session, locations) {
  const location = locations.find((l) => l.id === session.location_id);
  const area = location?.storageAreas.find((a) => a.id === session.storage_area_id);
  return [location?.name || 'Location', area?.name].filter(Boolean).join(' \u00b7 ');
}

function SessionRow({ session, locations }) {
  const closedAt = session.submitted_at || session.cancelled_at;
  return (
    <li>
      <Link to={`${ITEMSURE_PATH}/counts/${session.id}`} className="isu-card isu-count-link">
        <div>
          <strong>{session.name}</strong>
          <p className="isu-muted isu-small">{placeLabel(session, locations)}</p>
          <p className="isu-muted isu-small">
            {closedAt ? `${COUNT_STATUS_LABELS[session.status]} ${formatWhen(closedAt)}` : `Started ${formatWhen(session.created_at)}`}
            {session.status === 'submitted'
              ? ` \u00b7 ${session.counted_item_count} counted, ${session.omitted_item_count} not counted`
              : ''}
          </p>
        </div>
        <span className={`isu-badge isu-count-status isu-count-status--${session.status}`}>{COUNT_STATUS_LABELS[session.status]}</span>
      </Link>
    </li>
  );
}

export default function ItemsureCounts() {
  const { organization, can } = useItemsureWorkspace();
  const [sessions, setSessions] = useState(null);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const canStart = can('counts.create');

  useEffect(() => {
    let alive = true;
    Promise.all([listSessions(organization.id), listLocations(organization.id)])
      .then(([s, l]) => {
        if (!alive) return;
        setSessions(s);
        setLocations(l);
      })
      .catch((e) => {
        if (!alive) return;
        setSessions([]);
        setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [organization.id]);

  const [open, closed] = useMemo(() => {
    const list = sessions || [];
    return [list.filter((s) => OPEN_STATUSES.includes(s.status)), list.filter((s) => !OPEN_STATUSES.includes(s.status))];
  }, [sessions]);

  return (
    <div className="isu-page">
      <PageHead
        title="Counts"
        description="Physical counts by location or storage area."
        action={canStart ? <Link to={`${ITEMSURE_PATH}/counts/new`} className="isu-btn isu-btn--primary">Start count</Link> : null}
      />
      <ErrorNote message={error} />
      {sessions === null ? <p className="isu-muted">Loading…</p> : null}

      {sessions && sessions.length === 0 && !error ? (
        <div className="isu-card isu-empty">
          <h2>No counts yet</h2>
          <p className="isu-muted">{canStart ? 'Start a count to record what is on hand.' : 'Counts you can see will appear here.'}</p>
        </div>
      ) : null}

      {open.length ? (
        <section className="isu-stack">
          <h2 className="isu-section-title">Open</h2>
          <ul className="isu-count-list">{open.map((s) => <SessionRow key={s.id} session={s} locations={locations} />)}</ul>
        </section>
      ) : null}

      {closed.length ? (
        <section className="isu-stack">
          <h2 className="isu-section-title">History</h2>
          <ul className="isu-count-list">{closed.map((s) => <SessionRow key={s.id} session={s} locations={locations} />)}</ul>
        </section>
      ) : null}
    </div>
  );
}
