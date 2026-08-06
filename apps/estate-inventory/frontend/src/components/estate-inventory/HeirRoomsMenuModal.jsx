import React from 'react';
import { createPortal } from 'react-dom';
import EstateModalShell from './EstateModalShell';
import HeirInventoryFilters from './HeirInventoryFilters';

/**
 * Family portal: room list + search in a centered overlay modal.
 * Choosing a room is handled by parent (opens room browse modal).
 */
const HeirRoomsMenuModal = ({
  open,
  onClose,
  rooms = [],
  roomFilter,
  onRoomChange,
  searchQuery,
  onSearchChange,
  totalCount = 0,
  loading = false,
  emptyMessage = ''
}) => {
  if (!open) return null;

  const modal = (
    <div className="estate-inventory ei-modal-portal">
      <EstateModalShell
        title="Rooms & inventory"
        subtitle={
          loading
            ? 'Loading…'
            : `${totalCount} item${totalCount === 1 ? '' : 's'} · tap a room to open`
        }
        onClose={onClose}
        className="ei-heir-center-modal ei-rooms-menu-modal"
        foot={
          <button type="button" className="ei-btn" onClick={onClose}>
            Close
          </button>
        }
      >
        {loading ? <p className="ei-status">Loading inventory…</p> : null}
        {!loading && totalCount === 0 ? (
          <p className="ei-settings-hint">{emptyMessage || 'No inventory items to show yet.'}</p>
        ) : null}
        {!loading && totalCount > 0 ? (
          <HeirInventoryFilters
            rooms={rooms}
            roomFilter={roomFilter}
            onRoomChange={onRoomChange}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            totalCount={totalCount}
          />
        ) : null}
      </EstateModalShell>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modal, document.body);
  }
  return modal;
};

export default HeirRoomsMenuModal;
