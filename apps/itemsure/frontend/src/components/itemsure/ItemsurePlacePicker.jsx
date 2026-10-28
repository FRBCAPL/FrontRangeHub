import React from 'react';
import { placeKey } from '../../utils/itemsurePlaces.js';

/** Tick where an item is normally kept: a whole location, or specific storage areas there. */
export default function ItemsurePlacePicker({ locations, value, onChange }) {
  const active = locations.filter((l) => l.is_active);
  if (!active.length) return <p className="isu-hint">Add a location first to choose where this item is kept.</p>;

  const toggle = (key) => {
    const next = new Set(value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };
  const box = (key, label) => (
    <label key={key} className="isu-check">
      <input type="checkbox" checked={value.has(key)} onChange={() => toggle(key)} /> {label}
    </label>
  );

  return (
    <div className="isu-places">
      {active.map((location) => (
        <fieldset key={location.id} className="isu-places-group">
          <legend>{location.name}</legend>
          {box(placeKey(location.id, null), 'At this location')}
          {(location.storageAreas || []).filter((a) => a.is_active).map((area) => box(placeKey(location.id, area.id), area.name))}
        </fieldset>
      ))}
    </div>
  );
}
