import React from 'react';

const ROWS = [
  { label: 'See teams, payments and change history', who: [1, 1, 1] },
  { label: 'Download bookkeeping exports (CSV)', who: [1, 1, 1] },
  { label: 'Record payments and correct entries', who: [1, 1, 0], note: 'Every change is saved with who made it' },
  { label: 'Add, edit and move teams', who: [1, 1, 0] },
  { label: 'Division settings', who: [1, 1, 0], note: 'Night, dues, dates — that division only' },
  { label: 'League-wide settings', who: [1, 0, 0], note: 'Name, payment instructions, grace days — every division' },
  { label: 'Add or archive divisions', who: [1, 0, 0], note: 'Changes the monthly bill' },
  { label: 'Invite people and change roles', who: [1, 0, 0] },
  { label: 'Billing and plan', who: [1, 0, 0] },
  { label: 'Archive the league', who: [1, 0, 0] },
];

/** Owner / Treasurer / Viewer — what each role can do. Mirrors the database rules. */
export default function DuezyPermissionTable() {
  return (
    <div className="dz-perms-wrap">
      <table className="dz-perms">
        <thead>
          <tr>
            <th scope="col">What they can do</th>
            <th scope="col">Owner</th>
            <th scope="col">Treasurer</th>
            <th scope="col">Viewer</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label}>
              <th scope="row">
                {r.label}
                {r.note ? <small>{r.note}</small> : null}
              </th>
              {r.who.map((yes, i) => (
                <td key={i} className={yes ? 'is-yes' : 'is-no'}>
                  <span aria-hidden="true">{yes ? '✓' : '—'}</span>
                  <span className="dz-sr-only">{yes ? 'Yes' : 'No'}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
