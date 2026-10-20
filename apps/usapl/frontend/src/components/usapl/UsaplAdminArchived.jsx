import React, { useState } from 'react';
import { usaplDivisionIsPast } from '../../data/usaplPastDivisions.js';
import { useUsaplDivisions } from '../../hooks/useUsaplDivisions.js';
import { useUsaplLocations } from '../../hooks/useUsaplLocations.js';
import { deleteUsaplDivision, saveUsaplDivision, saveUsaplDivisions } from '../../services/usaplDivisions.js';
import UsaplAdminDivisionRow from './UsaplAdminDivisionRow.jsx';
import UsaplAdminSubnav from './UsaplAdminSubnav.jsx';
import UsaplDivisionEditModal from './UsaplDivisionEditModal.jsx';

export default function UsaplAdminArchived() {
  const { allDivisions, loading, fromDatabase, error, reload } = useUsaplDivisions();
  const { names: locationOptions } = useUsaplLocations();
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const archived = allDivisions.filter(usaplDivisionIsPast);
  const tableMissing = Boolean(error && /could not find the table|schema cache/i.test(error));

  const persist = async (division) => {
    if (!fromDatabase && allDivisions.length) {
      await saveUsaplDivisions(allDivisions.map((row) => (row.id === division.id ? division : row)));
    } else {
      await saveUsaplDivision(division);
    }
  };

  const handleSave = async (division) => {
    await persist(division);
    setEditing(null);
    setMessage(division.archived ? 'Archived division saved.' : 'Restored to current divisions.');
    await reload();
  };

  const restore = async (division) => {
    setBusyId(division.id);
    setMessage('');
    try {
      await persist({ ...division, archived: false });
      setMessage(`${division.shortName} restored to Divisions.`);
      await reload();
    } catch (err) {
      setMessage(err?.message || 'Could not restore.');
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async (division) => {
    if (!window.confirm(`Permanently remove ${division.shortName}?`)) return;
    setBusyId(division.id);
    try {
      await deleteUsaplDivision(division.id);
      await reload();
    } catch (err) {
      setMessage(err?.message || 'Could not delete.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="usapl-page">
      <UsaplAdminSubnav />
      <h1>Archived</h1>
      <p className="usapl-lede">
        Past divisions. Restore one to put it back on the current Divisions list, or open
        its public page to check winners and flyers.
      </p>
      {tableMissing ? (
        <div className="usapl-error">
          Run <code>supabase-migrations/usapl-divisions-admin-2026-09.sql</code> in the Supabase SQL editor, then refresh.
        </div>
      ) : null}
      {message ? <p className="usapl-note">{message}</p> : null}
      {loading ? <p>Loading…</p> : null}
      {archived.map((division, index) => (
        <UsaplAdminDivisionRow
          key={division.id}
          division={division}
          index={index}
          total={archived.length}
          busy={busyId === division.id}
          fromDatabase={fromDatabase}
          archivedList
          onEdit={(row) => setEditing(row)}
          onDelete={handleDelete}
          onRestore={restore}
        />
      ))}
      {!loading && !archived.length ? <p>No archived divisions yet.</p> : null}
      {editing ? (
        <UsaplDivisionEditModal
          draft={editing}
          isNew={false}
          locationOptions={locationOptions}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
