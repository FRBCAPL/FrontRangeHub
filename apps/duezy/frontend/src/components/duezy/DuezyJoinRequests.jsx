import React, { useEffect, useState } from 'react';
import { deleteJoinRequest, listJoinRequests } from '../../services/duezyJoinService.js';
import DuezyModal from './DuezyModal.jsx';
import DuezyJoinRequestRow from './DuezyJoinRequestRow.jsx';
import { claimChanges } from '../../utils/duezyJoin.js';

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * League page: "3 teams signed up" banner + review popup. Approving adds a normal team (data.addTeams)
 * and removes the sign-up; declining just removes it. Nothing waiting = nothing shown.
 */
export default function DuezyJoinRequests({ data }) {
  const { league, teams } = data;
  const [requests, setRequests] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const divisions = data.units.filter((u) => u.id).map((u) => ({ id: u.id, name: u.name }));

  useEffect(() => {
    let alive = true;
    listJoinRequests(league.id).then((list) => alive && setRequests(list)).catch(() => {});
    return () => { alive = false; };
  }, [league.id]);

  if (!requests.length) return null;

  const drop = (id) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    if (requests.length <= 1) setOpen(false);
  };

  const approve = async (request, divisionId) => {
    setError('');
    try {
      if (request.team_id) {
        const team = teams.find((t) => t.id === request.team_id);
        if (!team) throw new Error(`${request.name} isn’t in the league anymore. Decline this sign-up or add the team again.`);
        const changes = claimChanges(team, request);
        if (!('players' in team)) delete changes.players;
        await data.updateTeam(team.id, changes);
      } else {
        await data.addTeams([{ name: request.name, captain: request.captain, contact: request.contact, players: request.players }], divisionId);
      }
      await deleteJoinRequest(request.id).catch(() => {});
      drop(request.id);
    } catch (e) {
      setError(e.message);
    }
  };

  const decline = async (request) => {
    if (!window.confirm(`Decline ${request.name}? Their sign-up is removed. They aren't notified.`)) return;
    setError('');
    try {
      await deleteJoinRequest(request.id);
      drop(request.id);
    } catch (e) {
      setError(e.message);
    }
  };

  const n = requests.length;
  return (
    <>
      <p className="dz-join-banner" role="status">
        <span aria-hidden="true">🙋</span>
        <span>{n} {n === 1 ? 'team signed up and is' : 'teams signed up and are'} waiting for your OK.</span>
        <button type="button" className="dz-btn dz-btn--primary dz-btn--sm" onClick={() => setOpen(true)}>Review</button>
      </p>
      {open ? (
        <DuezyModal title="Team sign-ups" onClose={() => setOpen(false)} className="dz-team-modal">
          <p className="dz-team-modal-hint">
            New teams join the list like any other team. For a team already in the league, approving updates its captain,
            contact and players. Nothing changes until you approve.
          </p>
          {error ? <p className="dz-error" role="alert">{error}</p> : null}
          <ul className="dz-join-reqs">
            {requests.map((r) => (
              <DuezyJoinRequestRow
                key={r.id}
                request={r}
                divisions={divisions}
                claimed={r.team_id ? teams.find((t) => t.id === r.team_id) || 'missing' : null}
                taken={!r.team_id && teams.some((t) => sameName(t.name, r.name))}
                onApprove={approve}
                onDecline={decline}
              />
            ))}
          </ul>
        </DuezyModal>
      ) : null}
    </>
  );
}
