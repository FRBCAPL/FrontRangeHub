import React from 'react';
import { USAPL_CONTACT, USAPL_DUES_PRODUCTS, USAPL_LINKS } from '../../data/usaplConstants.js';
import UsaplPayColumn from './UsaplPayColumn.jsx';

const NOTE_LINES = [
  '1. Full amount due',
  '2. Team name',
  '3. Date of play — if a makeup, include the original play date',
];

export default function UsaplDuesPage() {
  return (
    <div className="usapl-page usapl-dues-page">
      <h1>League dues</h1>
      <p className="usapl-lede">
        Please pay the full team amount for the date and match(es) played.
      </p>

      <p className="usapl-note">
        Card / Apple Pay / Google Pay / ACH is moving into this app next.<br />
        Scan the QR code or use the button on this page.
        Do not search the $ or @ name — lookalike accounts have taken payments.
      </p>

      <details className="usapl-facts usapl-dues-fold">
        <summary>
          <h2>Team dues</h2>
          <span className="usapl-vegas-fold-action">
            <span className="is-show">Show Team Dues</span>
            <span className="is-hide">Hide</span>
          </span>
        </summary>
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
      </details>

      <section className="usapl-card usapl-pay-notes">
        <h2>Required for every payment type :</h2>
        
        <ul>
          {NOTE_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p>
        Cash Payments may be made by dropping in the red drop box at Legends Brews & Cues.<br />
        Look for envelopes near the box or ask a staff member.
        </p>
      </section>

      <div className="usapl-pay-pair">
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
