import React, { useState } from 'react';
import { emptyUsaplDivision, USAPL_DIVISIONS, usaplNightLabel } from '../../data/usaplDivisions.js';
import { usaplFormatWithoutInHouse } from '../../data/usaplFormat.js';
import { useUsaplDivisions } from '../../hooks/useUsaplDivisions.js';
import { useUsaplLocations } from '../../hooks/useUsaplLocations.js';
import { deleteUsaplDivision, saveUsaplDivision, saveUsaplDivisions } from '../../services/usaplDivisions.js';
import UsaplAdminSubnav from './UsaplAdminSubnav.jsx';
import UsaplDivisionEditModal from './UsaplDivisionEditModal.jsx';
import UsaplInHouseTag from './UsaplInHouseTag.jsx';

export default function UsaplAdminDivisions() {
  const { allDivisions, loading, fromDatabase, error, reload } = useUsaplDivisions();
  const { names: locationOptions } = useUsaplLocations();
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');

  const tableMissing = Boolean(error && /could not find the table|schema cache/i.test(error));

  const persist = async (division) => {
    if (!fromDatabase && allDivisions.length) {
      const merged = allDivisions.some((row) => row.id === division.id)
        ? allDivisions.map((row) => (row.id === division.id ? division : row))
        : [...allDivisions, division];
      await saveUsaplDivisions(merged);
    } else {
      await saveUsaplDivision(division);
    }
  };

  const handleSave = async (division) => {
    await persist(division);
    setEditing(null);
    setIsNew(false);
    setMessage('Division saved. Signup and play-nights pages use this list.');
    await reload();
  };

  const toggleSignup = async (division) => {
    setBusyId(division.id);
    setMessage('');
    try {
      await persist({ ...division, signupOpen: !division.signupOpen });
      await reload();
    } catch (err) {
      setMessage(err?.message || 'Could not update signup.');
    } finally {
      setBusyId('');
    }
  };

  const move = async (index, direction) => {
    const otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= allDivisions.length) return;
    const next = [...allDivisions];
    const swapped = next[index];
    next[index] = next[otherIndex];
    next[otherIndex] = swapped;
    const ordered = next.map((row, i) => ({ ...row, sortOrder: (i + 1) * 10 }));
    setBusyId(swapped.id);
    try {
      await saveUsaplDivisions(ordered);
      await reload();
    } catch (err) {
      setMessage(err?.message || 'Could not reorder.');
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async (division) => {
    if (!window.confirm(`Remove ${division.shortName} from signup?`)) return;
    setBusyId(division.id);
    try {
      await deleteUsaplDivision(division.id);
      await reload();
    } catch (err) {
      setMessage(err?.message || 'Could not delete. Run the divisions SQL migration if the table is missing.');
    } finally {
      setBusyId('');
    }
  };

  const loadStarter = async () => {
    setBusyId('seed');
    try {
      await saveUsaplDivisions(USAPL_DIVISIONS);
      setMessage('Starter divisions saved. You can edit them any time.');
      await reload();
    } catch (err) {
      setMessage(err?.message || 'Could not save starter list. Run usapl-divisions-admin-2026-09.sql in Supabase.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="usapl-page">
      <UsaplAdminSubnav />
      <h1>Divisions</h1>
      <p className="usapl-lede">
        Open for signup is what players see on the signup form. Closed nights stay listed
        on Play nights, without a Join button. Mark a finished session as a past division
        and enter the winner — it moves to Past divisions.
      </p>
      {tableMissing ? (
        <div className="usapl-error">
          Run <code>supabase-migrations/usapl-divisions-admin-2026-09.sql</code> in the Supabase SQL editor, then refresh. You must be signed in as an admin to save.
        </div>
      ) : null}
      {message ? <p className="usapl-note">{message}</p> : null}
      {loading ? <p>Loading…</p> : null}

      <div className="usapl-actions" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="usapl-btn"
          onClick={() => {
            setIsNew(true);
            setEditing(emptyUsaplDivision((allDivisions.length + 1) * 10));
          }}
        >
          Add division
        </button>
        {!fromDatabase ? (
          <button type="button" className="usapl-btn-secondary" onClick={loadStarter} disabled={busyId === 'seed'}>
            Save starter list to database
          </button>
        ) : null}
      </div>

      {allDivisions.map((division, index) => (
        <article className="usapl-night-row" key={division.id}>
          <div className="usapl-night-copy">
            <h2>
              {division.shortName}
              <UsaplInHouseTag division={division} />
            </h2>
            <p className="usapl-meta">
              {usaplNightLabel(division.night)} · {usaplFormatWithoutInHouse(division.format) || 'format TBD'}
              <br />
              {division.archived ? 'Past division' : (division.signupOpen ? 'Open for signup' : 'Signup closed')}
            </p>
          </div>
          <div className="usapl-actions" style={{ marginTop: 0 }}>
            <button type="button" className="usapl-btn-secondary" disabled={busyId === division.id} onClick={() => toggleSignup(division)}>
              {division.signupOpen ? 'Close signup' : 'Open signup'}
            </button>
            <button type="button" className="usapl-btn-secondary" onClick={() => { setIsNew(false); setEditing(division); }}>
              Edit
            </button>
            <button type="button" className="usapl-btn-secondary" disabled={index === 0 || busyId} onClick={() => move(index, -1)}>
              Up
            </button>
            <button type="button" className="usapl-btn-secondary" disabled={index === allDivisions.length - 1 || busyId} onClick={() => move(index, 1)}>
              Down
            </button>
            {fromDatabase ? (
              <button type="button" className="usapl-btn-secondary" disabled={busyId === division.id} onClick={() => handleDelete(division)}>
                Remove
              </button>
            ) : null}
          </div>
        </article>
      ))}

      {editing ? (
        <UsaplDivisionEditModal
          draft={editing}
          isNew={isNew}
          locationOptions={locationOptions}
          onClose={() => { setEditing(null); setIsNew(false); }}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
