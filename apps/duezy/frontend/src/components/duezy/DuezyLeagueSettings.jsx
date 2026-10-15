import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getLeague } from '../../services/duezyService.js';
import { getPeople } from '../../services/duezyPeopleService.js';
import { canEdit, isOwner } from '../../utils/duezyPeople.js';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import DuezyLeagueForm from './DuezyLeagueForm.jsx';
import DuezyLeagueSummary from './DuezyLeagueSummary.jsx';
import DuezyDivisionSettings from './DuezyDivisionSettings.jsx';
import DuezyPeoplePanel from './DuezyPeoplePanel.jsx';
import DuezyJoinLinkCard from './DuezyJoinLinkCard.jsx';
import DuezySectionTabs from './DuezySectionTabs.jsx';
import DuezySkeleton from './DuezySkeleton.jsx';
import DuezyNoAccess from './DuezyNoAccess.jsx';
import DuezyTestLeagueBanner from './DuezyTestLeagueBanner.jsx';

const TABS = [
  { id: 'league', label: 'League' },
  { id: 'divisions', label: 'Divisions' },
  { id: 'people', label: 'People' },
];

const TITLES = { league: 'League settings', divisions: 'Division settings', people: 'People & access' };

const SCOPE = {
  league: { owner: 'Whole league · affects every division · owner only', other: 'Whole league · owner only' },
  divisions: { owner: 'Each division’s own night, dues and dates', other: 'Each division’s own night, dues and dates · adding or archiving divisions is owner only' },
  people: { owner: 'Who can see or work on this league', other: 'Who can see or work on this league · owner manages people' },
};

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
  const [form, setForm] = useState(undefined);
  const [error, setError] = useState('');
  const [role, setRole] = useState(undefined);
  const back = `${DUEZY_PATH}/league/${leagueId}`;
  const tab = tabFromParams(params);

  useEffect(() => {
    getLeague(leagueId)
      .then((l) => setForm(l ? { ...l, payment_note: l.payment_note || '' } : null))
      .catch((e) => { setError(e.message); setForm(null); });
    getPeople(leagueId).then((p) => setRole(p?.my_role || null)).catch(() => setRole(null));
  }, [leagueId]);

  if (form === null) return <DuezyNoAccess detail={error} />;
  if (form === undefined || role === undefined) return <DuezySkeleton variant="form" label="Loading settings…" />;

  const owner = isOwner(role);
  const header = (title) => (
    <div>
      <Link to={back} className="dz-link dz-small">‹ Back to {form.name}</Link>
      <div className="dz-settings-title">
        <span className="dz-eyebrow">{form.name}</span>
        <h1 className="dz-h1">{title}</h1>
      </div>
    </div>
  );

  if (!canEdit(role)) {
    return (
      <div className="dz-stack dz-stack--lg">
        {header(TITLES.people)}
        <p className="dz-viewonly"><span aria-hidden="true">👀</span><span>You can view this league but not change its settings.</span></p>
        <DuezyPeoplePanel league={form} />
      </div>
    );
  }

  return (
    <div className="dz-stack dz-stack--lg">
      {header(TITLES[tab])}
      {form.is_test ? <DuezyTestLeagueBanner league={form} /> : null}
      <DuezySectionTabs label="Settings sections" tabs={TABS} active={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} />
      <p className="dz-scope"><span aria-hidden="true">{tab === 'league' ? '🌐' : tab === 'divisions' ? '📅' : '👥'}</span>{SCOPE[tab][owner ? 'owner' : 'other']}</p>
      {tab === 'league' ? (owner ? <DuezyLeagueForm form={form} setForm={setForm} owner /> : <DuezyLeagueSummary league={form} />) : null}
      {tab === 'league' && !form.archived && form.is_test ? (
        <p className="dz-small dz-muted dz-test-locked">Captain sign-up links are turned off in test leagues.</p>
      ) : null}
      {tab === 'league' && !form.archived && !form.is_test ? (
        <DuezyJoinLinkCard league={form} owner={owner} onSaved={(changes) => setForm((prev) => ({ ...prev, ...changes }))} />
      ) : null}
      {tab === 'divisions' ? (
        <DuezyDivisionSettings
          league={form}
          isOwner={owner}
          onConverted={() => setForm((prev) => ({ ...prev, multi_division: true }))}
        />
      ) : null}
      {tab === 'people' && form.is_test ? (
        <p className="dz-small dz-muted dz-test-locked">
          Test leagues are just for you — co-treasurers and viewers can be added to your real leagues.
        </p>
      ) : null}
      {tab === 'people' && !form.is_test ? <DuezyPeoplePanel league={form} /> : null}
    </div>
  );
}
