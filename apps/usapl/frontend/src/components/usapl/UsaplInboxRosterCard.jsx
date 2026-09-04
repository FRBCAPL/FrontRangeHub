import React from 'react';
import { USAPL_ROSTER_STATUS } from '../../data/usaplInboxStatus.js';
import { updateUsaplRosterStatus } from '../../services/usaplSubmissions.js';
import UsaplInboxDuezyButton from './UsaplInboxDuezyButton.jsx';
import UsaplInboxRosterDetail from './UsaplInboxRosterDetail.jsx';
import UsaplInboxStatus from './UsaplInboxStatus.jsx';

export default function UsaplInboxRosterCard({ row, divisions, onReload }) {
  return (
    <section className="usapl-card" style={{ marginBottom: 12 }}>
      <h2>{row.team_name}</h2>
      <UsaplInboxRosterDetail row={row} divisions={divisions} />
      <UsaplInboxDuezyButton roster={row} onDone={onReload} />
      <UsaplInboxStatus
        label="Your tracking"
        hint="Use the Duezy button to copy names. This menu is only a reminder for you."
        value={row.status || 'new'}
        options={USAPL_ROSTER_STATUS}
        onChange={(status) => updateUsaplRosterStatus(row.id, status).then(onReload)}
      />
    </section>
  );
}
