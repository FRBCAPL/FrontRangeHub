import React from 'react';

/**
 * Room dropdown + search for heir inventory browse.
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
    <div className="ei-field ei-heir-filter-room">
      <label htmlFor="heir-room-filter">Room / collection</label>
      <select
        id="heir-room-filter"
        value={roomFilter}
        onChange={(e) => onRoomChange?.(e.target.value)}
      >
        <option value="">Select a room…</option>
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
        placeholder="Optional — search across all rooms…"
        autoComplete="off"
      />
    </div>
    <p className="ei-heir-filter-count" aria-live="polite">
      {totalCount} item{totalCount === 1 ? '' : 's'} in estate — pick a room to open it
    </p>
  </div>
);

export default HeirInventoryFilters;
