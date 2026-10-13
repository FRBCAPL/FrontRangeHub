import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getLeague } from '../../services/duezyService.js';
import { getPeople } from '../../services/duezyPeopleService.js';
import { canEdit, isOwner } from '../../utils/duezyPeople.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import DuezyLeagueForm from './DuezyLeagueForm.jsx';
import DuezyDivisionSettings from './DuezyDivisionSettings.jsx';
import DuezyPeoplePanel from './DuezyPeoplePanel.jsx';
import DuezySectionTabs from './DuezySectionTabs.jsx';
import DuezySkeleton from './DuezySkeleton.jsx';

const TABS = [
  { id: 'league', label: 'League' },
  { id: 'divisions', label: 'Divisions' },
  { id: 'people', label: 'People' },
];

/** ?tab=league|divisions|people. Older links: ?add=division opens Divisions, ?show=people opens People. */
function tabFromParams(params) {
  if (params.get('add') === 'division') return 'divisions';
  if (params.get('show') === 'people') return 'people';
  return TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'league';
}

/** Settings shell: League details · Divisions · People. Viewers only see who's on the league. */
export default function DuezyLeagueSettings() {
  const { leagueId } = useParams();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [role, setRole] = useState(undefined);
  const back = `${DUEZY_PATH}/league/${leagueId}`;
  const tab = tabFromParams(params);

  useEffect(() => {
    getLeague(leagueId)
      .then((l) => setForm(l ? { ...l, payment_note: l.payment_note || '' } : null))
      .catch((e) => setError(e.message));
    getPeople(leagueId).then((p) => setRole(p?.my_role || null)).catch(() => setRole(null));
  }, [leagueId]);

  if (error && !form) return <p className="dz-error">{error}</p>;
  if (!form || role === undefined) return <DuezySkeleton variant="form" label="Loading settings…" />;

  const header = (
    <div>
      <Link to={back} className="dz-link dz-small">‹ Back to {form.name}</Link>
      <span className="dz-eyebrow dz-settings-eyebrow">{form.name}</span>
      <h1 className="dz-h1">Settings</h1>
    </div>
  );

  if (!canEdit(role)) {
    return (
      <div className="dz-stack dz-stack--lg">
        {header}
        <p className="dz-viewonly"><span aria-hidden="true">👀</span><span>You can view this league but not change its settings.</span></p>
        <DuezyPeoplePanel league={form} />
      </div>
    );
  }

  return (
    <div className="dz-stack dz-stack--lg">
      {header}
      <DuezySectionTabs label="Settings sections" tabs={TABS} active={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} />
      {tab === 'league' ? <DuezyLeagueForm form={form} setForm={setForm} owner={isOwner(role)} /> : null}
      {tab === 'divisions' ? (
        <DuezyDivisionSettings
          league={form}
          isOwner={isOwner(role)}
          onConverted={() => setForm((prev) => ({ ...prev, multi_division: true }))}
        />
      ) : null}
      {tab === 'people' ? <DuezyPeoplePanel league={form} /> : null}
    </div>
  );
}
