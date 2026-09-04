import React from 'react';

export default function UsaplRosterClaimStep({
  teamName,
  claim,
  submitting,
  onRequest,
}) {
  const status = claim?.status || '';
  if (status === 'approved' && claim?.teamActive === false) {
    return (
      <p className="usapl-lede">
        {teamName} is no longer an active team, so this login cannot edit it.
      </p>
    );
  }
  if (status === 'approved') {
    return (
      <p className="usapl-lede">
        You are the captain for {teamName}. Continue to update the roster.
      </p>
    );
  }
  if (status === 'pending') {
    return (
      <p className="usapl-lede">
        Access for {teamName} is waiting on the league office. You can leave this page and
        come back after they approve you.
      </p>
    );
  }
  if (status === 'denied') {
    return (
      <>
        <p className="usapl-lede">
          That request for {teamName} was not approved. Ask the office if this is your team,
          then send it again.
        </p>
        <button className="usapl-btn" type="button" disabled={submitting} onClick={onRequest}>
          {submitting ? 'Sending…' : 'Request again'}
        </button>
      </>
    );
  }
  return (
    <>
      <p className="usapl-lede">
        Ask the office to mark you as captain of {teamName}. After they approve, this login
        can edit that roster.
      </p>
      <button className="usapl-btn" type="button" disabled={submitting} onClick={onRequest}>
        {submitting ? 'Sending…' : 'Request captain access'}
      </button>
    </>
  );
}
