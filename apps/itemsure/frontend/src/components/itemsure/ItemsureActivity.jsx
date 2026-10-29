import React, { useCallback, useEffect, useState } from 'react';
import { listRecentActivity } from '../../services/itemsureActivityService.js';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { Card, PageHead } from './ItemsureUi.jsx';

const PAGE_SIZE = 30;

/** Organization-wide history of changes (setup, members, counts), newest first. */
export default function ItemsureActivity() {
  const { organization } = useItemsureWorkspace();
  const [activity, setActivity] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let alive = true;
    setActivity(null);
    listRecentActivity(organization.id, PAGE_SIZE).then((rows) => {
      if (!alive) return;
      setActivity(rows);
      setHasMore(rows.length === PAGE_SIZE);
    });
    return () => {
      alive = false;
    };
  }, [organization.id]);

  const showMore = useCallback(async () => {
    setLoadingMore(true);
    const rows = await listRecentActivity(organization.id, PAGE_SIZE, activity.length);
    setActivity((prev) => [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]);
    setHasMore(rows.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [organization.id, activity]);

  return (
    <div className="isu-page">
      <PageHead title="History" description="Every change made in your business, newest first." />
      <Card>
        {activity === null ? (
          <p className="isu-muted">Loading…</p>
        ) : activity.length === 0 ? (
          <p className="isu-muted">No activity yet.</p>
        ) : (
          <ul className="isu-activity">
            {activity.map((a) => (
              <li key={a.id}>
                <span>{a.label}</span>
                <time dateTime={a.createdAt}>{formatWhen(a.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {hasMore ? (
        <button type="button" className="isu-btn isu-btn--ghost" disabled={loadingMore} onClick={showMore}>
          {loadingMore ? 'Loading…' : 'Show more'}
        </button>
      ) : null}
    </div>
  );
}
