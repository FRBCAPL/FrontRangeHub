import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSessions, OPEN_STATUSES } from '../../services/itemsureCountService.js';
import { listReviews } from '../../services/itemsureCountReviewService.js';
import { listLocations } from '../../services/itemsureLocationService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { COUNT_STATUS_LABELS, ITEMSURE_PATH, REVIEW_STATUS_LABELS } from '../../data/itemsureConstants.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { site, SITE } from '../../data/itemsureTerms.js';
import { ErrorNote, PageHead } from './ItemsureUi.jsx';

function placeLabel(session, locations) {
  const location = locations.find((l) => l.id === session.location_id);
  const area = location?.storageAreas.find((a) => a.id === session.storage_area_id);
  return [location?.name || SITE, area?.name].filter(Boolean).join(' \u00b7 ');
}

/** Submitted counts are awaiting approval until a review row exists. */
function statusOf(session, reviews) {
  if (session.status !== 'submitted') return { key: session.status, label: COUNT_STATUS_LABELS[session.status] };
  const decision = reviews[session.id]?.decision || 'awaiting';
  return { key: decision, label: REVIEW_STATUS_LABELS[decision] };
}

function SessionRow({ session, locations, reviews }) {
  const closedAt = session.submitted_at || session.cancelled_at;
  const status = statusOf(session, reviews);
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
        <span className={`isu-badge isu-count-status isu-count-status--${status.key}`}>{status.label}</span>
      </Link>
    </li>
  );
}

function SessionSection({ title, sessions, locations, reviews }) {
  if (!sessions.length) return null;
  return (
    <section className="isu-stack">
      <h2 className="isu-section-title">{title}</h2>
      <ul className="isu-count-list">
        {sessions.map((s) => <SessionRow key={s.id} session={s} locations={locations} reviews={reviews} />)}
      </ul>
    </section>
  );
}

export default function ItemsureCounts() {
  const { organization, can } = useItemsureWorkspace();
  const [sessions, setSessions] = useState(null);
  const [locations, setLocations] = useState([]);
  const [reviews, setReviews] = useState({});
  const [error, setError] = useState('');
  const canStart = can('counts.create');

  useEffect(() => {
    let alive = true;
    Promise.all([listSessions(organization.id), listLocations(organization.id), listReviews(organization.id).catch(() => ({}))])
      .then(([s, l, r]) => {
        if (!alive) return;
        setSessions(s);
        setLocations(l);
        setReviews(r);
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

  const { open, awaiting, closed } = useMemo(() => {
    const list = sessions || [];
    const isAwaiting = (s) => s.status === 'submitted' && !reviews[s.id];
    return {
      open: list.filter((s) => OPEN_STATUSES.includes(s.status)),
      awaiting: list.filter(isAwaiting),
      closed: list.filter((s) => !OPEN_STATUSES.includes(s.status) && !isAwaiting(s)),
    };
  }, [sessions, reviews]);

  return (
    <div className="isu-page">
      <PageHead
        title="Counts"
        description={`Walk around and count everything at a ${site} (or one spot) in one go.`}
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

      <SessionSection title="Awaiting approval" sessions={awaiting} locations={locations} reviews={reviews} />
      <SessionSection title="Open" sessions={open} locations={locations} reviews={reviews} />
      <SessionSection title="History" sessions={closed} locations={locations} reviews={reviews} />
    </div>
  );
}
