import React, { useState } from 'react';
import { USAPL_DUES_PRODUCTS, USAPL_LINKS } from '../../data/usaplConstants.js';
import UsaplPayColumn from './UsaplPayColumn.jsx';

const NOTE_LINES = [
  'Full amount due',
  'Team name',
  'Date of play — if a makeup, include the original play date',
];

function scrollToPayCodes() {
  document.getElementById('usapl-pay-codes')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

export default function UsaplDuesPage() {
  const [teamDuesOpen, setTeamDuesOpen] = useState(false);

  return (
    <div className="usapl-page usapl-dues-page">
      <h1>League dues</h1>
      <p className="usapl-lede">
        Please pay the full team amount for the date and match(es) played.
      </p>

      <p className="usapl-note">
        Card / Apple Pay / Google Pay / ACH is coming soon.<br />
        CASHAPP & VENMO are available now. Scan the QR code or use the button on this page.<br />
        Do not search the $ or @ name — lookalike accounts have taken payments.<br />
        FRUSAPL is not responsible for any payments made to fraudulent accounts.
      </p>

      <section className="usapl-dues-block">
        <h2>Team dues</h2>
        <div className="usapl-dues-heading-actions">
          <button
            type="button"
            className="usapl-vegas-fold-action"
            aria-expanded={teamDuesOpen}
            onClick={() => setTeamDuesOpen((open) => !open)}
          >
            {teamDuesOpen ? 'Hide' : 'Show Team Dues'}
          </button>
          <button type="button" className="usapl-btn" onClick={scrollToPayCodes}>
            Cash App / Venmo QR codes
          </button>
        </div>
        {teamDuesOpen ? (
          <div className="usapl-facts-body">
            <p>Please pay the full weekly team amount as one payment.<br />
             Partial or incomplete info can delay processing and scores.</p>
            <ul>
              {USAPL_DUES_PRODUCTS.team.map((product) => (
                <li key={product.id}>{product.label} — ${product.amount}</li>
              ))}
            </ul>
            <p className="usapl-meta">Due are due within 48 hours.<br />
 Late payments will be subject to penalty as outlined in the local by-laws.</p>
          </div>
        ) : null}
      </section>

      <section className="usapl-pay-notes">
        <p className="usapl-pay-notes-kicker">Cash App · Venmo · Cash</p>
        <h2>Required for every payment type</h2>
        <ol className="usapl-pay-notes-list">
          {NOTE_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <p>
        Cash Payments may be made by dropping in the red drop box at Legends Brews & Cues.<br />
        Look for envelopes near the box or ask a staff member.
        </p>
      </section>

      <div className="usapl-pay-pair" id="usapl-pay-codes">
        <UsaplPayColumn
          title={`Cash App · ${USAPL_LINKS.cashAppHandle}`}
          warn={`Scan this code or tap Open Cash App. \nDo not search ${USAPL_LINKS.cashAppHandle}.`}
          src={USAPL_LINKS.cashAppQr}
          alt="Cash App QR code for Front Range USA Pool League $frusapl"
          href={USAPL_LINKS.cashApp}
          buttonLabel="Open Cash App"
        />
        <UsaplPayColumn
          title={`Venmo · ${USAPL_LINKS.venmoHandle}`}
          warn={`Scan this code or tap Open Venmo. \nDo not search ${USAPL_LINKS.venmoHandle}.`}
          src={USAPL_LINKS.venmoQr}
          alt="Venmo QR code for Front Range USA Pool League @duesfrusapl"
          href={USAPL_LINKS.venmo}
          buttonLabel="Open Venmo"
        />
      </div>
    </div>
  );
}
