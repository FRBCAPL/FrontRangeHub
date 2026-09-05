import React from 'react';

export default function UsaplDivisionEditWinners({ form, setForm }) {
  const double = form.playType === 'double';
  const formatA = form.formatA === 'Other' ? (form.formatOtherA || 'first format') : (form.formatA || '8-ball');
  const formatB = form.formatB === 'Other' ? (form.formatOtherB || 'second format') : (form.formatB || '10-ball');

  const setArchived = (checked) => {
    setForm((prev) => ({
      ...prev,
      archived: checked,
      signupOpen: checked ? false : prev.signupOpen,
      inSession: checked ? false : prev.inSession,
    }));
  };

  return (
    <div className="usapl-division-edit-winners">
      <label className="usapl-field" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={Boolean(form.archived)}
          onChange={(e) => setArchived(e.target.checked)}
        />
        Past division — list on Past divisions with the winner
      </label>
      <div className={double ? 'usapl-player-grid' : undefined}>
        <div className="usapl-field">
          <label>{double ? `${formatA} winner` : 'Division winner'}</label>
          <input
            value={form.winnerTeam || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, winnerTeam: e.target.value }))}
            placeholder="Team name"
          />
        </div>
        {double ? (
          <div className="usapl-field">
            <label>{formatB} winner</label>
            <input
              value={form.winnerTeamB || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, winnerTeamB: e.target.value }))}
              placeholder="Team name"
            />
          </div>
        ) : null}
      </div>
      <p className="usapl-meta">
        Winning teams stay on Past divisions even if they are not eligible for Vegas Cup.
        Mark inactive teams on the Vegas Cup seed board (signed in as admin).
      </p>
    </div>
  );
}
