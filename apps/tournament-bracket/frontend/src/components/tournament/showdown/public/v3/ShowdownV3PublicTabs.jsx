import React from 'react';
import ShowdownV3PublicNow, { ShowdownV3PublicUpNext } from './ShowdownV3PublicNow.jsx';
import { ShowdownV3PublicStandings, ShowdownV3PublicBracket, ShowdownV3PublicMoney, ShowdownV3PublicResults } from './ShowdownV3PublicSections.jsx';

/** Body of the selected player-page tab for a V3 event. Only V3 views are used. */
export default function ShowdownV3PublicTabs({ tab, event, pendingIds, mine, canReport, onReport, onTrack, me, onPickMe }) {
  if (tab === 'now') return <ShowdownV3PublicNow event={event} pendingIds={pendingIds} mine={mine} canReport={canReport} onReport={onReport} onTrack={onTrack} me={me} onPickMe={onPickMe} />;
  if (tab === 'next') return <ShowdownV3PublicUpNext event={event} me={me} />;
  if (tab === 'standings') return <ShowdownV3PublicStandings event={event} />;
  if (tab === 'bracket') return <ShowdownV3PublicBracket event={event} />;
  if (tab === 'money') return <ShowdownV3PublicMoney event={event} />;
  if (tab === 'results') return <ShowdownV3PublicResults event={event} />;
  return null;
}
