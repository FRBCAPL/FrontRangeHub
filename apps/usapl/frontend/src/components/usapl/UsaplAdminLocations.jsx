import React, { useState } from 'react';
import { seedUsaplLocationRows } from '../../data/usaplLocations.js';
import { useUsaplLocations } from '../../hooks/useUsaplLocations.js';
import { deleteUsaplLocation, saveUsaplLocation, saveUsaplLocations } from '../../services/usaplLocations.js';
import UsaplAdminSubnav from './UsaplAdminSubnav.jsx';

export default function UsaplAdminLocations() {
  const { locations, loading, fromDatabase, error, reload } = useUsaplLocations();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');

  const tableMissing = Boolean(error && /could not find the table|schema cache/i.test(error));

  const persistAll = async (next) => {
    await saveUsaplLocations(next);
  };

  const persistOne = async (location) => {
    if (!fromDatabase) {
      const merged = locations.some((row) => row.id === location.id)
        ? locations.map((row) => (row.id === location.id ? location : row))
        : [...locations, location];
      await persistAll(merged);
      return;
    }
    await saveUsaplLocation(location);
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (locations.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      setMessage('That location is already on the list.');
      return;
    }
    setBusyId('add');
    setMessage('');
    try {
      await persistOne({
        name,
        sortOrder: (locations.length + 1) * 10,
      });
      setNewName('');
      setMessage('Location added. Signup uses this list.');
      await reload();
    } catch (err) {
      setMessage(err?.message || 'Could not add location.');
    } finally {
      setBusyId('');
    }
  };

  const handleRename = async (location) => {
    const name = editName.trim();
    if (!name) return;
    setBusyId(location.id);
    try {
      await persistOne({ ...location, name });
      setEditingId('');
      await reload();
    } catch (err) {
      setMessage(err?.message || 'Could not rename location.');
    } finally {
      setBusyId('');
    }
  };

  const move = async (index, direction) => {
    const other = index + direction;
    if (other < 0 || other >= locations.length) return;
    const next = [...locations];
    const swapped = next[index];
    next[index] = next[other];
    next[other] = swapped;
    const ordered = next.map((row, i) => ({ ...row, sortOrder: (i + 1) * 10 }));
    setBusyId(swapped.id);
    try {
      await persistAll(ordered);
      await reload();
    } catch (err) {
      setMessage(err?.message || 'Could not reorder.');
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async (location) => {
    if (!window.confirm(`Remove ${location.name} from signup?`)) return;
    setBusyId(location.id);
    try {
      await deleteUsaplLocation(location.id);
      await reload();
    } catch (err) {
      setMessage(err?.message || 'Could not remove location.');
    } finally {
      setBusyId('');
    }
  };

  const loadStarter = async () => {
    setBusyId('seed');
    try {
      await persistAll(seedUsaplLocationRows());
      setMessage('Starter locations saved. You can edit them any time.');
      await reload();
    } catch (err) {
      setMessage(err?.message || 'Could not save starter list. Run usapl-locations-admin-2026-09.sql in Supabase.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="usapl-page">
      <UsaplAdminSubnav />
      <h1>Locations</h1>
      <p className="usapl-lede">
        These names appear on the signup form as home location choices. Players can still pick Other.
      </p>
      {tableMissing ? (
        <div className="usapl-error">
          Run <code>supabase-migrations/usapl-locations-admin-2026-09.sql</code> in the Supabase SQL editor, then refresh. You must be signed in as an admin to save.
        </div>
      ) : null}
      {message ? <p className="usapl-note">{message}</p> : null}
      {loading ? <p>Loading…</p> : null}

      <form className="usapl-form" onSubmit={handleAdd} style={{ marginBottom: 20 }}>
        <div className="usapl-field">
          <label>Add a location</label>
          <div className="usapl-store-pair">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Bar or hall name" />
            <button className="usapl-btn" type="submit" disabled={busyId === 'add'}>Add</button>
          </div>
        </div>
      </form>

      {!fromDatabase ? (
        <div className="usapl-actions" style={{ marginBottom: 16 }}>
          <button type="button" className="usapl-btn-secondary" onClick={loadStarter} disabled={busyId === 'seed'}>
            Save starter list to database
          </button>
        </div>
      ) : null}

      {locations.map((location, index) => (
        <article className="usapl-night-row" key={location.id}>
          <div className="usapl-night-copy">
            {editingId === location.id ? (
              <div className="usapl-field" style={{ margin: 0 }}>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
              </div>
            ) : (
              <h2>{location.name}</h2>
            )}
          </div>
          <div className="usapl-actions" style={{ marginTop: 0 }}>
            {editingId === location.id ? (
              <>
                <button type="button" className="usapl-btn" disabled={busyId === location.id} onClick={() => handleRename(location)}>Save</button>
                <button type="button" className="usapl-btn-secondary" onClick={() => setEditingId('')}>Cancel</button>
              </>
            ) : (
              <button type="button" className="usapl-btn-secondary" onClick={() => { setEditingId(location.id); setEditName(location.name); }}>
                Rename
              </button>
            )}
            <button type="button" className="usapl-btn-secondary" disabled={index === 0 || busyId} onClick={() => move(index, -1)}>Up</button>
            <button type="button" className="usapl-btn-secondary" disabled={index === locations.length - 1 || busyId} onClick={() => move(index, 1)}>Down</button>
            {fromDatabase ? (
              <button type="button" className="usapl-btn-secondary" disabled={busyId === location.id} onClick={() => handleDelete(location)}>
                Remove
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
