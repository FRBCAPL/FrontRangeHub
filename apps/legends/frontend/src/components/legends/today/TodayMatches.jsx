import React from 'react';
import { matchesStillOn, tablesLabel } from '../../../services/legendsLive.js';
import LiveDots from './LiveDots.jsx';

export function TodayBadge({ children, className = '' }) {
  return <span className={`lg-badge ${className}`}>{children}</span>;
}

export default function TodayMatches({ heading, finishedText, matches }) {
  if (matches.length === 0) return null;
  const stillOn = matchesStillOn(matches);
  return (
    <div className="lg-today__group">
      <p className="lg-center">
        <TodayBadge>{heading}</TodayBadge>
      </p>
      {stillOn.length === 0 ? (
        <p className="lg-today__finished lg-glow">{finishedText}</p>
      ) : (
        <ul className="lg-today__matches">
          {stillOn.map((match) => {
            const tables = tablesLabel(match.tables);
            return (
              <li key={match.key} className="lg-today__match">
                <div>
                  <p className="lg-today__teams lg-glow" aria-label={match.title}>
                    <span className="lg-nowrap-block">{match.home}</span>
                    {match.away ? (
                      <>
                        {' '}
                        <span className="lg-nowrap-block">vs {match.away}</span>
                      </>
                    ) : null}
                  </p>
                  {match.detail ? <p className="lg-today__detail">{match.detail}</p> : null}
                </div>
                <div className="lg-today__status">
                  {match.status === 'in_progress' ? <LiveDots label={match.when} /> : <p className="lg-today__when">{match.when}</p>}
                  {tables ? <p className="lg-today__tables lg-glow">{tables}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
