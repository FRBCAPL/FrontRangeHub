import React, { useState } from 'react';
import { cashClimbSubmitHref } from './cashClimbSubmit.js';
import './CashClimb.css';
import './CashClimbShareModal.css';

export default function CashClimbShareModal({ tournament, onClose, onOpen }) {
  const [copied, setCopied] = useState(false);
  const url = cashClimbSubmitHref(tournament?.id);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="cc-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="cc-share-title">
      <div className="cc-modal cc-share-modal" onClick={(e) => e.stopPropagation()}>
        <p className="cc-play-kicker">Cash Climb</p>
        <h3 id="cc-share-title">Send this to players</h3>
        <p className="cc-modal-meta">
          {tournament?.status === 'in-progress'
            ? 'Anyone with this link can submit a result. Standings and money only change after you confirm.'
            : 'Send this link so players can see the final standings. Results stay read-only after the event ends.'}
        </p>
        <img className="cc-share-qr" src={qr} alt="QR code for the player submit page" width="200" height="200" />
        <p className="cc-share-url">{url}</p>
        <div className="form-actions cc-share-actions">
          <button type="button" className="btn-secondary" onClick={copyLink}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button type="button" className="btn-secondary" onClick={onOpen}>
            Open player page
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
