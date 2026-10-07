import React, { useState } from 'react';
import { openHubLogin } from '../../services/consignmentAuctionService.js';
import { formatShortDate } from '../../utils/consignmentDates.js';

/** Shown on the Sell page to anyone who isn't an approved seller yet. */
export default function ConsignmentSellGate({ access }) {
  const [sending, setSending] = useState(false);

  const ask = async () => {
    setSending(true);
    await access.request();
    setSending(false);
  };

  let body;
  if (access.loading) {
    body = <p className="cs-meta">Checking your account…</p>;
  } else if (!access.loggedIn) {
    body = (
      <>
        <p>Selling is open to approved FRPL sellers. Log in to get started.</p>
        <button type="button" className="cs-btn" onClick={openHubLogin}>Sign up / Log in</button>
      </>
    );
  } else if (access.requestedAt) {
    body = (
      <>
        <p><strong>Request sent {formatShortDate(access.requestedAt)}.</strong></p>
        <p className="cs-meta">FRPL will approve your seller access and you can list items here.</p>
      </>
    );
  } else {
    body = (
      <>
        <p>Selling is open to approved FRPL sellers. Ask FRPL to turn on selling for your account.</p>
        <button type="button" className="cs-btn" onClick={ask} disabled={sending}>
          {sending ? 'Sending…' : 'Request seller access'}
        </button>
      </>
    );
  }

  return (
    <div className="cs-page cs-page-centered cs-sell-start">
      <p className="cs-kicker">Sell through FRPL</p>
      <h1>Sell an item</h1>
      <div className="cs-mine-empty">
        {body}
        {access.error ? <p className="cs-error" role="alert">{access.error}</p> : null}
      </div>
    </div>
  );
}
