import React from 'react';

/**
 * Room dropdown + search for heir inventory browse.
 */
const HeirInventoryFilters = ({
  rooms = [],
  roomFilter,
  onRoomChange,
  searchQuery,
  onSearchChange,
  resultCount,
  totalCount
}) => (
  <div className="ei-heir-filters">
    <div className="ei-field ei-heir-filter-room">
      <label htmlFor="heir-room-filter">Room / collection</label>
      <select
        id="heir-room-filter"
        value={roomFilter}
        onChange={(e) => onRoomChange?.(e.target.value)}
      >
        <option value="">All rooms ({totalCount})</option>
        {rooms.map((room) => (
          <option key={room.name} value={room.name}>
            {room.name} ({room.count})
          </option>
        ))}
      </select>
    </div>
    <div className="ei-field ei-heir-filter-search">
      <label htmlFor="heir-search">Search items</label>
      <input
        id="heir-search"
        type="search"
        value={searchQuery}
        onChange={(e) => onSearchChange?.(e.target.value)}
        placeholder="Type a name, note, or room…"
        autoComplete="off"
      />
    </div>
    <p className="ei-heir-filter-count" aria-live="polite">
      Showing {resultCount} of {totalCount}
    </p>
  </div>
);

export default HeirInventoryFilters;
