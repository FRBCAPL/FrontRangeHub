import React from 'react';

/**
 * Room list + search for heir inventory browse.
 * Choosing a room opens a collection modal (handled by parent).
 */
const HeirInventoryFilters = ({
  rooms = [],
  roomFilter,
  onRoomChange,
  searchQuery,
  onSearchChange,
  totalCount
}) => (
  <div className="ei-heir-filters">
    <div className="ei-field ei-heir-filter-search">
      <label htmlFor="heir-search">Search items</label>
      <input
        id="heir-search"
        type="search"
        value={searchQuery}
        onChange={(e) => onSearchChange?.(e.target.value)}
        placeholder="Optional — search across all rooms…"
        autoComplete="off"
      />
    </div>

    <div className="ei-heir-room-list-wrap">
      <p className="ei-heir-room-list-label" id="heir-room-list-label">
        Rooms / collections
      </p>
      {rooms.length === 0 ? (
        <p className="ei-settings-hint" style={{ margin: 0 }}>
          No rooms to show yet.
        </p>
      ) : (
        <ul className="ei-heir-room-list" aria-labelledby="heir-room-list-label">
          {rooms.map((room) => (
            <li key={room.name}>
              <button
                type="button"
                className={`ei-heir-room-btn${roomFilter === room.name ? ' is-active' : ''}`}
                onClick={() => onRoomChange?.(room.name)}
              >
                <span className="ei-heir-room-btn-name">{room.name}</span>
                <span className="ei-heir-room-btn-count">
                  {room.count} item{room.count === 1 ? '' : 's'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>

    <p className="ei-heir-filter-count" aria-live="polite">
      {totalCount} item{totalCount === 1 ? '' : 's'} in estate — tap a room to open it
    </p>
  </div>
);

export default HeirInventoryFilters;
