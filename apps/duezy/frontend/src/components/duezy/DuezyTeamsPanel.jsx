import React, { useEffect, useMemo, useRef, useState } from 'react';
import DuezyTeamRow from './DuezyTeamRow.jsx';
import DuezyAddTeam from './DuezyAddTeam.jsx';
import DuezyTeamFilters from './DuezyTeamFilters.jsx';
import { SEARCH_MIN_TEAMS, groupTeams, isSettled, teamBucket, teamCounts } from '../../utils/duezyTeamGroups.js';

/** How long a just-paid row stays put before it moves into the paid group. */
const SETTLE_MS = 1500;

const EMPTY = {
  open: 'Everyone’s paid, on a bye, or making up this week. 🎉',
  paid: 'No one has paid yet this week.',
  makeup: 'No make-ups this week.',
  bye: 'No byes this week.',
};

/** The team list for one division's week: filters, search, tap-to-record chips, expandable details, add team. */
export default function DuezyTeamsPanel({ league, stats, data, divisions, correctRequest = null, filterRequest = null }) {
  const [openTeamId, setOpenTeamId] = useState('');
  const [pinnedId, setPinnedId] = useState('');
  const [correcting, setCorrecting] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showPaid, setShowPaid] = useState(false);
  const [settling, setSettling] = useState(() => new Set());
  const timers = useRef({});
  const { unit, teams, week, dues, schedule } = stats;
  const { canEdit, paymentIndex } = data;

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  useEffect(() => {
    if (!correctRequest || !teams.some((t) => t.id === correctRequest.teamId)) return;
    setFilter('all');
    setQuery('');
    setShowPaid(true);
    setOpenTeamId(correctRequest.teamId);
    setPinnedId('');
    setCorrecting(correctRequest);
    requestAnimationFrame(() => {
      document.getElementById(`dz-team-${correctRequest.teamId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, [correctRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  const panelRef = useRef(null);
  const [weekRequest, setWeekRequest] = useState(null);
  useEffect(() => {
    if (!filterRequest) return;
    const { filter: nextFilter, teamId } = filterRequest;
    setFilter(teamId ? 'all' : nextFilter);
    setQuery('');
    if (teamId) {
      setShowPaid(true);
      setOpenTeamId(teamId);
      setPinnedId(teamId);
      setCorrecting(null);
      setWeekRequest(filterRequest.week ? { teamId, week: filterRequest.week, key: filterRequest.key } : null);
    }
    if (teamId && filterRequest.week) return;
    const timer = setTimeout(() => {
      const target = teamId ? document.getElementById(`dz-team-${teamId}`) : panelRef.current;
      target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 80);
    return () => clearTimeout(timer);
  }, [filterRequest]);

  const settle = (teamId) => {
    clearTimeout(timers.current[teamId]);
    setSettling((prev) => new Set(prev).add(teamId));
    timers.current[teamId] = setTimeout(() => {
      setSettling((prev) => {
        const next = new Set(prev);
        next.delete(teamId);
        return next;
      });
    }, SETTLE_MS);
  };

  const showSearch = teams.length >= SEARCH_MIN_TEAMS;
  const search = showSearch ? query : '';
  const counts = useMemo(() => teamCounts(teams, week, paymentIndex), [teams, week, paymentIndex]);
  const hold = useMemo(() => new Set([...settling, ...(pinnedId ? [pinnedId] : [])]), [settling, pinnedId]);
  const { main, paid } = useMemo(
    () => groupTeams({ teams, week, paymentIndex, filter, query: search, hold }),
    [teams, week, paymentIndex, filter, search, hold]
  );
  const paidOpen = showPaid || Boolean(search.trim());
  const byeCount = paid.filter((t) => teamBucket(t, week, paymentIndex) === 'bye').length;
  const paidCount = paid.length - byeCount;
  const groupLabel = [paidCount && `${paidCount} paid`, byeCount && `${byeCount} ${byeCount === 1 ? 'bye' : 'byes'}`]
    .filter(Boolean).join(' · ');

  const toggleTeam = (team) => {
    const opening = openTeamId !== team.id;
    setOpenTeamId(opening ? team.id : '');
    setPinnedId(opening && !isSettled(teamBucket(team, week, paymentIndex)) ? team.id : '');
    setCorrecting(null);
  };

  const row = (team) => (
    <DuezyTeamRow
      key={team.id}
      league={league}
      team={team}
      week={week}
      dues={dues}
      schedule={schedule}
      paymentIndex={paymentIndex}
      divisions={divisions}
      open={openTeamId === team.id}
      onToggle={() => toggleTeam(team)}
      onSetPayment={(entry) => {
        if (isSettled(entry.status)) settle(team.id);
        return data.setPayment(team.id, week, entry);
      }}
      onSetWeekPayment={(w, entry) => data.setPayment(team.id, w, entry)}
      focusWeek={weekRequest?.teamId === team.id ? weekRequest : null}
      onUpdateTeam={(changes) => data.updateTeam(team.id, changes)}
      canEdit={canEdit}
      correctKey={correcting?.teamId === team.id ? correcting.key : 0}
    />
  );

  const emptyText = search.trim()
    ? `No teams match “${search.trim()}”.`
    : filter === 'all' ? null : EMPTY[filter];

  return (
    <section className="dz-panel" ref={panelRef}>
      <div className="dz-row dz-panel-head">
        <h3 className="dz-h3">{divisions.length > 1 ? `${unit.name} teams` : 'Teams'}</h3>
      </div>
      {teams.length > 1 ? (
        <DuezyTeamFilters
          counts={counts}
          filter={filter}
          onFilter={setFilter}
          showSearch={showSearch}
          query={query}
          onQuery={setQuery}
        />
      ) : null}
      {teams.length ? (
        <>
          {main.length ? <ul className="dz-team-list">{main.map(row)}</ul> : null}
          {!main.length && !paid.length && emptyText ? <p className="dz-muted dz-small dz-team-empty">{emptyText}</p> : null}
          {!main.length && paid.length && filter === 'all' && !search.trim() ? (
            <p className="dz-muted dz-small dz-team-empty">
              {byeCount ? 'Everyone’s paid or on a bye this week. 🎉' : 'Everyone’s paid this week. 🎉'}
            </p>
          ) : null}
          {paid.length ? (
            <div className="dz-paid-group">
              <button
                type="button"
                className="dz-paid-toggle"
                aria-expanded={paidOpen}
                onClick={() => setShowPaid(!showPaid)}
                disabled={Boolean(search.trim())}
              >
                <span aria-hidden="true">{paidOpen ? '▾' : '▸'}</span>
                <span className="dz-paid-check" aria-hidden="true">✓</span>
                {groupLabel}
                <span className="dz-muted">· {paidOpen ? 'hide' : 'show'}</span>
              </button>
              {paidOpen ? <ul className="dz-team-list">{paid.map(row)}</ul> : null}
            </div>
          ) : null}
        </>
      ) : (
        <p className="dz-muted dz-small">{canEdit ? 'No teams yet — add the first one below.' : 'No teams yet.'}</p>
      )}
      {canEdit ? (
        <DuezyAddTeam
          divisions={divisions}
          divisionId={unit.id}
          onAdd={(team, divisionId) => data.addTeam(team, divisionId || unit.id)}
          onAddMany={(list, divisionId) => data.addTeams(list, divisionId || unit.id)}
        />
      ) : null}
    </section>
  );
}
