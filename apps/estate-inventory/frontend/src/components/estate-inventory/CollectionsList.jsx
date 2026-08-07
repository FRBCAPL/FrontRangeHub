import React, { useMemo } from 'react';
import { formatRoomRefLabel } from '@shared/utils/estateInventoryRefCode.js';

function roomSortKey(c) {
  const n = Number(c?.collection_number);
  if (Number.isFinite(n) && n > 0) return n;
  return Number.POSITIVE_INFINITY;
}

function compareRooms(a, b) {
  const byNum = roomSortKey(a) - roomSortKey(b);
  if (byNum !== 0) return byNum;
  return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, {
    sensitivity: 'base'
  });
}

const CollectionsList = ({ collections, loading, error, onOpen, onAddItem }) => {
  const ordered = useMemo(
    () => [...(collections || [])].sort(compareRooms),
    [collections]
  );

  return (
    <section>
      {loading ? <p className="ei-status">Loading collections…</p> : null}
      {error ? <div className="ei-error">{error}</div> : null}

      {!loading && !error && ordered.length === 0 ? (
        <div className="ei-empty">
          <p>No collections yet. Create one or add your first item.</p>
        </div>
      ) : null}

      <div className="ei-list ei-list--rooms">
        {ordered.map((c) => {
          const label = formatRoomRefLabel(c.collection_number);
          const countLabel = c.itemCount === 1 ? '1 item' : `${c.itemCount || 0} items`;
          return (
            <div
              key={c.id}
              className="ei-list-item ei-list-item--room"
              role="button"
              tabIndex={0}
              onClick={() => onOpen(c)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  onOpen(c);
                }
              }}
            >
              <div className="ei-list-room-side">
                {label ? <span className="ei-list-room-num">{label}</span> : null}
                <span className="ei-list-room-count">{countLabel}</span>
              </div>
              <strong className="ei-list-room-name">{c.name}</strong>
              <button
                type="button"
                className="ei-list-room-add"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onAddItem(c);
                }}
                onKeyDown={(ev) => ev.stopPropagation()}
              >
                Add item
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CollectionsList;
