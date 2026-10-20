import React from 'react';
import { USAPL_LINKS } from '../../data/usaplConstants.js';
import UsaplDuesGuide from './UsaplDuesGuide.jsx';
import UsaplDuesMustInclude from './UsaplDuesMustInclude.jsx';
import UsaplLeagueMark from './UsaplLeagueMark.jsx';
import UsaplPayColumn from './UsaplPayColumn.jsx';

function scrollToPayCodes() {
  document.getElementById('usapl-pay-codes')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

export default function UsaplDuesPage() {
  return (
    <div className="usapl-brand-page">
      <UsaplLeagueMark />
      <div className="usapl-page usapl-dues-page">
      <h1>League dues</h1>
      <p className="usapl-lede">
        Please pay the full team amount for the date and match(es) played.
      </p>
      <p className="usapl-note">
        Card / Apple Pay / Google Pay / ACH is coming soon.<br />
        Do not search or type the $ or @ tag — lookalike accounts have taken payments.<br />
        Use the QR codes or the buttons on this page.<br />
        FRUSAPL is not responsible for any payments made to fraudulent accounts.
      </p>

      <div className="usapl-dues-pay-jump">
        <button type="button" className="usapl-btn" onClick={scrollToPayCodes}>
          Cash App / Venmo QR codes
        </button>
        <UsaplDuesMustInclude />
        <p className="usapl-dues-cash-note">
          <span className="usapl-dues-cash-word">CASH PAYMENTS:</span>{' '}
         <br /> Please use the <span className="usapl-dues-red-word">red</span> drop box at Legends Brews & Cues.<br />
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
    </div>
  );
}
