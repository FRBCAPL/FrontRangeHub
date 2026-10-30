import React, { useEffect, useState } from 'react';
import { listRecentActivity } from '../../services/itemsureActivityService.js';
import { HISTORY_KINDS } from '../../data/itemsureHistoryKinds.js';
import ItemsureHistoryEntries from './ItemsureHistoryEntries.jsx';

const PREVIEW = 3;

/** One card per kind of history with its latest few entries; the title opens that kind in full. */
export default function ItemsureHistorySections({ organizationId, onOpen }) {
  const [previews, setPreviews] = useState(null);

  useEffect(() => {
    let alive = true;
    setPreviews(null);
    Promise.all(HISTORY_KINDS.map((kind) => listRecentActivity(organizationId, PREVIEW, 0, kind.entities))).then((lists) => {
      if (alive) setPreviews(lists);
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
      <button type="button" className="isu-btn isu-btn--ghost" onClick={() => onOpen('all')}>
        See everything, newest first
      </button>
    </>
  );
}
