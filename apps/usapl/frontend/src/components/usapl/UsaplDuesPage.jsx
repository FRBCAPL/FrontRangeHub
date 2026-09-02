import React from 'react';
import { USAPL_CONTACT, USAPL_DUES_PRODUCTS, USAPL_LINKS } from '../../data/usaplConstants.js';

const NOTE_LINES = [
  '1. Full amount due',
  '2. Name of person making payment',
  '3. Team name',
  '4. Date of play — if a makeup, include the original play date',
];

export default function UsaplDuesPage() {
  return (
    <div className="usapl-page">
      <h1>League dues</h1>
      <p className="usapl-lede">
        Please pay the full team amount for the date and match(es) played. Dues are due within 24 hours or the team may get penalty points.
      </p>

      <p className="usapl-note">
        Card / Apple Pay / Google Pay / ACH is moving into this app next (it used to be a JotForm + Square form). For now use Cash App or Venmo with the notes below.
      </p>

      <section className="usapl-card" style={{ marginTop: 16 }}>
        <h2>Team dues</h2>
        <p>Pay the full weekly amount as one payment when you can. Partial or incomplete info can delay processing and scores.</p>
        <ul>
          {USAPL_DUES_PRODUCTS.team.map((product) => (
            <li key={product.id}>{product.label} — ${product.amount}</li>
          ))}
        </ul>
        <p className="usapl-meta">Teams get 100 bonus points for paying full dues and submitting scores within 24 hours.</p>
      </section>

      <section className="usapl-card" style={{ marginTop: 14 }}>
        <h2>Cash App · {USAPL_LINKS.cashAppHandle}</h2>
        <p>Put all of this in the For / Notes field:</p>
        <ul>
          {NOTE_LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="usapl-actions">
          <a className="usapl-btn" href={USAPL_LINKS.cashApp} target="_blank" rel="noreferrer">Open Cash App</a>
        </div>
      </section>

      <section className="usapl-card" style={{ marginTop: 14 }}>
        <h2>Venmo · {USAPL_LINKS.venmoHandle}</h2>
        <p>Put the same four items in What&apos;s this for?</p>
        <div className="usapl-actions">
          <a className="usapl-btn" href={USAPL_LINKS.venmo} target="_blank" rel="noreferrer">Open Venmo</a>
        </div>
      </section>

      <section className="usapl-card" style={{ marginTop: 14 }}>
        <h2>Individual dues</h2>
        <p>
          Individual payments are accepted, but one team payment is strongly preferred. Split payments can delay scores and may lead to penalty points.
        </p>
        <ul>
          {USAPL_DUES_PRODUCTS.individual.map((product) => (
            <li key={product.id}>{product.label} — ${product.amount}</li>
          ))}
        </ul>
        <p className="usapl-meta">
          Questions? Call or text {USAPL_CONTACT.phoneDisplay} or email {USAPL_CONTACT.email}.
        </p>
      </section>
    </div>
  );
}
