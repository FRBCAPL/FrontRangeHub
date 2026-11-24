import React from 'react';

function PrepayGroup({ title, note, rows, empty, onOpenTeam }) {
  return (
    <div className="dz-panel">
      <h3 className="dz-h3">{title}</h3>
      {note ? <p className="dz-small dz-muted">{note}</p> : null}
      {rows.length ? (
        <ul className="dz-behind-list">
          {rows.map(({ team, when, week, division, key }) => (
            <li key={key}>
              {onOpenTeam ? (
                <button
                  type="button"
                  className="dz-prepay-row"
                  onClick={() => onOpenTeam(team.id, week)}
                >
                  <span className="dz-behind-name">
                    <span>
                      {team.name}
                      {division ? <small className="dz-div-tag">{division}</small> : null}
                    </span>
                    {when ? <small className="dz-behind-weeks">{when}</small> : null}
                  </span>
                  <span className="dz-makeup-caret" aria-hidden="true">›</span>
                </button>
              ) : (
                <span className="dz-behind-name">
                  <span>
                    {team.name}
                    {division ? <small className="dz-div-tag">{division}</small> : null}
                  </span>
                  {when ? <small className="dz-behind-weeks">{when}</small> : null}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="dz-muted dz-small">{empty}</p>
      )}
    </div>
  );
}

/**
 * Prepay section: future weeks already paid, and make-ups paid with the match still to play.
 * Tap a row to open that team on the relevant week.
 */
export default function DuezyPrepayPanel({ prepays = [], onOpenTeam = null }) {
  const futureRows = prepays
    .filter((p) => p.futureWeeks?.length)
    .map((p) => ({
      team: p.team,
      division: p.division,
      when: p.whenFuture,
      week: p.futureWeeks[0],
      key: `${p.team.id}-future`,
    }));
  const makeupRows = prepays
    .filter((p) => p.makeupWeeks?.length)
    .map((p) => ({
      team: p.team,
      division: p.division,
      when: p.whenMakeup,
      week: p.makeupWeeks[0],
      key: `${p.team.id}-makeup`,
    }));

  if (!futureRows.length && !makeupRows.length) {
    return (
      <div className="dz-allgood">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>Nothing prepaid right now</strong>
          <small>
            Pay a future week from a team’s window, or mark a make-up “Paid now · play later”, and it shows up here.
          </small>
        </div>
      </div>
    );
  }

  return (
    <section className="dz-behind dz-prepay">
      <PrepayGroup
        title="Paid ahead (future weeks)"
        note="Dues collected before that night. When the week arrives, it already counts as paid."
        rows={futureRows}
        empty="No future weeks prepaid."
        onOpenTeam={onOpenTeam}
      />
      <PrepayGroup
        title="Make-up paid · still to play"
        note="Money is in; the postponed match isn’t played yet. Open the team and tap Mark played when it happens."
        rows={makeupRows}
        empty="No prepaid make-ups waiting to be played."
        onOpenTeam={onOpenTeam}
      />
    </section>
  );
}
