import React from 'react';
import { formatRoomRefLabel } from '@shared/utils/estateInventoryRefCode.js';

const CollectionsList = ({ collections, loading, error, onOpen, onAddItem }) => (
  <section>
    {loading ? <p className="ei-status">Loading collections…</p> : null}
    {error ? <div className="ei-error">{error}</div> : null}

    {!loading && !error && (!collections || collections.length === 0) ? (
      <div className="ei-empty">
        <p>No collections yet. Create one or add your first item.</p>
      </div>
    ) : null}

    <div className="ei-list">
      {(collections || []).map((c) => {
        const label = formatRoomRefLabel(c.collection_number);
        const countLabel = c.itemCount === 1 ? '1 item' : `${c.itemCount || 0} items`;
        return (
          <div key={c.id} className="ei-list-row">
            <button
              type="button"
              className="ei-list-item ei-list-item--room"
              onClick={() => onOpen(c)}
            >
              {label ? <span className="ei-list-room-num">{label}</span> : <span />}
              <strong className="ei-list-room-name">{c.name}</strong>
              <span className="ei-list-room-meta">
                <span className="ei-list-room-count">{countLabel}</span>
                <span className="ei-list-chevron" aria-hidden="true">
                  →
                </span>
              </span>
            </button>
            <button
              type="button"
              className="ei-btn ei-btn-row-add"
              onClick={() => onAddItem(c)}
            >
              Add item
            </button>
          </div>
        );
      })}
    </div>
  </section>
);

export default CollectionsList;
