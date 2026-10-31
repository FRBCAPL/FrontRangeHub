import React, { useEffect, useState } from 'react';
import { listRecentActivity } from '../../services/itemsureActivityService.js';
import { HISTORY_KINDS } from '../../data/itemsureHistoryKinds.js';
import ItemsureHistoryEntries from './ItemsureHistoryEntries.jsx';

const PREVIEW = 3;
const RECENT = 5;

/**
 * A "Recent" card with the latest changes of any kind, then one card per kind with its
 * latest few entries. Titles open the full list.
 */
export default function ItemsureHistorySections({ organizationId, onOpen }) {
  const [previews, setPreviews] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    let alive = true;
    setPreviews(null);
    Promise.all([
      listRecentActivity(organizationId, RECENT, 0, null),
      ...HISTORY_KINDS.map((kind) => listRecentActivity(organizationId, PREVIEW, 0, kind.entities)),
    ]).then(([latest, ...lists]) => {
      if (!alive) return;
      setRecent(latest);
      setPreviews(lists);
    });
    return () => {
      alive = false;
    };
  }, [organizationId]);

  if (previews === null) return <p className="isu-muted">Loading…</p>;
  const sections = HISTORY_KINDS.map((kind, i) => ({ kind, entries: previews[i] })).filter((s) => s.entries.length);
  if (!sections.length) {
    return (
      <div className="isu-card isu-empty">
        <p className="isu-muted">No activity yet.</p>
      </div>
    );
  }

  return (
    <>
      {recent.length ? (
        <section className="isu-card isu-history-section">
          <h2 className="isu-history-title">
            <button type="button" onClick={() => onOpen('all')}>
              Recent <span aria-hidden="true">›</span>
            </button>
          </h2>
          <p className="isu-muted isu-small">The latest changes of any kind, and who made them.</p>
          <ItemsureHistoryEntries entries={recent} />
          <button type="button" className="isu-history-more" onClick={() => onOpen('all')}>
            See everything, newest first
          </button>
        </section>
      ) : null}
      {sections.map(({ kind, entries }) => (
        <section key={kind.id} className="isu-card isu-history-section">
          <h2 className="isu-history-title">
            <button type="button" onClick={() => onOpen(kind.id)}>
              {kind.title} <span aria-hidden="true">›</span>
            </button>
          </h2>
          <p className="isu-muted isu-small">{kind.blurb}</p>
          <ItemsureHistoryEntries entries={entries} />
          <button type="button" className="isu-history-more" onClick={() => onOpen(kind.id)}>
            See all {kind.title.toLowerCase()}
          </button>
        </section>
      ))}
    </>
  );
}
