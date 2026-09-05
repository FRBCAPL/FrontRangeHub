import React, { useState } from 'react';
import { emptyUsaplDivision, USAPL_DIVISIONS } from '../../data/usaplDivisions.js';
import { usaplDivisionIsPast } from '../../data/usaplPastDivisions.js';
import { useUsaplDivisions } from '../../hooks/useUsaplDivisions.js';
import { useUsaplLocations } from '../../hooks/useUsaplLocations.js';
import { deleteUsaplDivision, saveUsaplDivision, saveUsaplDivisions } from '../../services/usaplDivisions.js';
import UsaplAdminDivisionRow from './UsaplAdminDivisionRow.jsx';
import UsaplAdminSubnav from './UsaplAdminSubnav.jsx';
import UsaplDivisionEditModal from './UsaplDivisionEditModal.jsx';

export default function UsaplAdminDivisions() {
  const { allDivisions, loading, fromDatabase, error, reload } = useUsaplDivisions();
  const { names: locationOptions } = useUsaplLocations();
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const current = allDivisions.filter((row) => !usaplDivisionIsPast(row));
  const archived = allDivisions.filter(usaplDivisionIsPast);
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
    setMessage(division.archived ? 'Saved. Archived nights are on the Archived page.' : 'Division saved.');
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
    if (otherIndex < 0 || otherIndex >= current.length) return;
    const next = [...current];
    const swapped = next[index];
    next[index] = next[otherIndex];
    next[otherIndex] = swapped;
    const ordered = [...next.map((row, i) => ({ ...row, sortOrder: (i + 1) * 10 })), ...archived];
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
        Current nights only. Finished sessions live on Archived. Open for signup is what
        players see on the signup form.
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
            setEditing(emptyUsaplDivision((current.length + 1) * 10));
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

      {current.map((division, index) => (
        <UsaplAdminDivisionRow
          key={division.id}
          division={division}
          index={index}
          total={current.length}
          busy={busyId === division.id || Boolean(busyId)}
          fromDatabase={fromDatabase}
          onToggleSignup={toggleSignup}
          onEdit={(row) => { setIsNew(false); setEditing(row); }}
          onMove={move}
          onDelete={handleDelete}
        />
      ))}
      {!loading && !current.length ? <p>No current divisions.</p> : null}

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
