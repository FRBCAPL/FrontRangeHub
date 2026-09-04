import React from 'react';
import { USAPL_LINKS } from '../../data/usaplConstants.js';
import UsaplDuesGuide from './UsaplDuesGuide.jsx';
import UsaplPayColumn from './UsaplPayColumn.jsx';

function scrollToPayCodes() {
  document.getElementById('usapl-pay-codes')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

export default function UsaplDuesPage() {
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

      <div className="usapl-dues-pay-jump">
        <button type="button" className="usapl-btn" onClick={scrollToPayCodes}>
          Cash App / Venmo QR codes
        </button>
        <p className="usapl-dues-cash-note">
          <span className="usapl-dues-cash-word">CASH PAYMENTS:</span>{' '}
         <br /> Please use the <span className="usapl-dues-red-word">red</span> drop box at Legends Brews & Cues.
          Envelopes are near the box, or ask staff.
        </p>
      </div>

      <UsaplDuesGuide />

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
