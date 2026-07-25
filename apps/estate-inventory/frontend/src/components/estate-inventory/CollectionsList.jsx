import React from 'react';

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
      {(collections || []).map((c) => (
        <div key={c.id} className="ei-list-row">
          <button type="button" className="ei-list-item" onClick={() => onOpen(c)}>
            <div>
              <strong>{c.name}</strong>
              <span>
                {c.itemCount === 1 ? '1 item' : `${c.itemCount || 0} items`}
              </span>
            </div>
            <span className="ei-list-chevron" aria-hidden="true">
              →
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
      ))}
    </div>
  </section>
);

export default CollectionsList;
