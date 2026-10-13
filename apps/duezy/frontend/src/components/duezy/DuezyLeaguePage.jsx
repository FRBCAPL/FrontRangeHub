import React from 'react';
import { useParams } from 'react-router-dom';
import useDuezyLeague from '../../hooks/useDuezyLeague.js';
import DuezyLeagueView from './DuezyLeagueView.jsx';

/** /duezy/league/:leagueId — loads the league from the database and shows it. */
export default function DuezyLeaguePage() {
  const { leagueId } = useParams();
  const data = useDuezyLeague(leagueId);
  return <DuezyLeagueView data={data} />;
}
