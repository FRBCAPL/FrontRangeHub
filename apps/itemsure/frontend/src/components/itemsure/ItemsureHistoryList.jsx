import React, { useCallback, useEffect, useState } from 'react';
import { listRecentActivity } from '../../services/itemsureActivityService.js';
import { HISTORY_KINDS, historyKind } from '../../data/itemsureHistoryKinds.js';
import ItemsureHistoryEntries from './ItemsureHistoryEntries.jsx';

const PAGE_SIZE = 30;

/** The full history for one kind ('all' for everything), with chips to switch kinds. */
export default function ItemsureHistoryList({ organizationId, kindId, onOpen, onBack }) {
  const kind = historyKind(kindId);
  const entities = kind?.entities || null;
  const [entries, setEntries] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let alive = true;
    setEntries(null);
    listRecentActivity(organizationId, PAGE_SIZE, 0, entities).then((rows) => {
      if (!alive) return;
      setEntries(rows);
      setHasMore(rows.length === PAGE_SIZE);
    });
    return () => {
      alive = false;
    };
  }, [organizationId, kindId]); // eslint-disable-line react-hooks/exhaustive-deps

  const showMore = useCallback(async () => {
    setLoadingMore(true);
    const rows = await listRecentActivity(organizationId, PAGE_SIZE, entries.length, entities);
    setEntries((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]);
    setHasMore(rows.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [organizationId, entries, entities]);

  const chips = [{ id: 'all', title: 'Everything' }, ...HISTORY_KINDS];
  return (
    <>
      <button type="button" className="isu-history-back" onClick={onBack}>‹ All sections</button>
      <div className="isu-chip-row" role="group" aria-label="Kind of history">
        {chips.map((c) => (
          <button key={c.id} type="button" className={`isu-chip isu-chip--choice${c.id === (kind?.id || 'all') ? ' is-selected' : ''}`}
            aria-pressed={c.id === (kind?.id || 'all')} onClick={() => onOpen(c.id)}>
            {c.title}
          </button>
        ))}
      </div>
      <section className="isu-card isu-history-section">
        <h2 className="isu-history-heading">{kind ? kind.title : 'Everything'}</h2>
        {kind ? <p className="isu-muted isu-small">{kind.blurb}</p> : null}
        {entries === null ? (
          <p className="isu-muted">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="isu-muted">Nothing here yet.</p>
        ) : (
          <ItemsureHistoryEntries entries={entries} />
        )}
      </section>
      {hasMore ? (
        <button type="button" className="isu-btn isu-btn--ghost" disabled={loadingMore} onClick={showMore}>
          {loadingMore ? 'Loading…' : 'Show more'}
        </button>
      ) : null}
    </>
  );
}
