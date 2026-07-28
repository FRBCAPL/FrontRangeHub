import React, { useMemo, useState } from 'react';
import { getPhotoEntries } from '@shared/utils/estatePhotoMeta.js';

/** Group scene rows by room label (case-insensitive). */
export function groupScenesByRoom(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const label = String(row.room_label || '').trim() || 'Unassigned';
    const key = label.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { key, label, rows: [] });
    }
    map.get(key).rows.push(row);
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

function SceneCard({ row, onSelect }) {
  const photos = getPhotoEntries(row);
  const url = photos[0]?.url || row.photo_url;
  const takenBy = photos[0]?.taken_by || row.created_by_name || '—';
  const archived = Boolean(row.archived_at);

  return (
    <button
      type="button"
      className={`ei-card ei-scene-card ei-scene-card-btn${archived ? ' is-archived' : ''}`}
      onClick={() => onSelect?.(row)}
    >
      {url ? (
        <img className="ei-card-photo" src={url} alt={row.room_label || 'Scene'} loading="lazy" />
      ) : (
        <div className="ei-card-photo-placeholder">No photo</div>
      )}
      <div className="ei-card-body">
        {archived ? <p className="ei-card-meta ei-scene-archived-pill">Archived</p> : null}
        <p className="ei-card-meta">
          {row.created_by_role === 'helper' ? 'Helper' : 'PR'} · {takenBy}
        </p>
        <p className="ei-card-meta">
          {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
        </p>
        {row.notes ? <p className="ei-card-meta">{row.notes}</p> : null}
        {row.photo_gps_lat != null && row.photo_gps_lng != null ? (
          <p className="ei-card-meta">
            GPS {Number(row.photo_gps_lat).toFixed(5)}, {Number(row.photo_gps_lng).toFixed(5)}
          </p>
        ) : null}
        <p className="ei-card-meta ei-scene-edit-hint">Tap to move, edit, or archive</p>
      </div>
    </button>
  );
}

/**
 * Scene gallery grouped by room — same mental model as inventory collections.
 */
const SceneRoomGroups = ({ rows, onSelectScene }) => {
  const groups = useMemo(() => groupScenesByRoom(rows), [rows]);
  const [collapsed, setCollapsed] = useState(() => ({}));

  if (!groups.length) return null;

  const toggle = (key) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="ei-scene-room-groups">
      {groups.map((group) => {
        const isCollapsed = Boolean(collapsed[group.key]);
        const count = group.rows.length;
        return (
          <section key={group.key} className="ei-scene-room-group">
            <button
              type="button"
              className="ei-scene-room-head"
              onClick={() => toggle(group.key)}
              aria-expanded={!isCollapsed}
            >
              <div>
                <strong>{group.label}</strong>
                <span className="ei-scene-room-count">
                  {count === 1 ? '1 photo' : `${count} photos`}
                </span>
              </div>
              <span className="ei-list-chevron" aria-hidden="true">
                {isCollapsed ? '→' : '↓'}
              </span>
            </button>
            {!isCollapsed ? (
              <div className="ei-grid ei-scene-grid">
                {group.rows.map((row) => (
                  <SceneCard key={row.id} row={row} onSelect={onSelectScene} />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
};

export default SceneRoomGroups;
