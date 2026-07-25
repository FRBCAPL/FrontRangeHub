import React, { useEffect, useMemo, useState } from 'react';

/**
 * Collapsible room groups with sticky section headers.
 * items must include a `room` string (or pass getRoom).
 */
const RoomAccordionList = ({
  items,
  getRoom = (item) => item.room || 'Unassigned',
  renderItem,
  initiallyOpen = true
}) => {
  const groups = useMemo(() => {
    const map = new Map();
    for (const item of items || []) {
      const room = getRoom(item) || 'Unassigned';
      if (!map.has(room)) map.set(room, []);
      map.get(room).push(item);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items, getRoom]);

  const [openRooms, setOpenRooms] = useState({});

  useEffect(() => {
    setOpenRooms((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [room] of groups) {
        if (next[room] === undefined) {
          next[room] = initiallyOpen;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [groups, initiallyOpen]);

  if (!groups.length) return null;

  return (
    <div className="ei-room-accordion">
      {groups.map(([room, roomItems]) => {
        const open = openRooms[room] !== false;
        return (
          <section key={room} className="ei-room-section">
            <button
              type="button"
              className="ei-room-header"
              aria-expanded={open}
              onClick={() =>
                setOpenRooms((prev) => ({
                  ...prev,
                  [room]: !open
                }))
              }
            >
              <span className="ei-room-header-title">
                {room}{' '}
                <em>
                  [{roomItems.length} item{roomItems.length === 1 ? '' : 's'}]
                </em>
              </span>
              <span className="ei-room-header-chevron" aria-hidden>
                {open ? '▾' : '▸'}
              </span>
            </button>
            {open ? (
              <div className="ei-grid ei-room-grid">{roomItems.map((item) => renderItem(item))}</div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
};

export default RoomAccordionList;
