import React, { useEffect } from 'react';
import { RewardsPanel } from './MemberPanels.jsx';

/** About Rewards + points scaffolding. Opens from My Legends. */
export default function RewardsModal({ open, onClose, message }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="lg-modal" role="presentation" onClick={onClose}>
      <div
        className="lg-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lg-rewards-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lg-modal__head">
          <div>
            <p className="lg-eyebrow lg-eyebrow--tight">Free</p>
            <h2 id="lg-rewards-modal-title" className="lg-display lg-display--card lg-mt-2">
              Legends Rewards
            </h2>
          </div>
          <button type="button" className="lg-btn lg-btn--quiet lg-btn--md" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="lg-card__copy lg-mt-4">
          Membership costs nothing. Your digital card identifies you. Points and redemptions show here when Legends
          turns them on — rates are not published yet.
        </p>
        <ul className="lg-bullets lg-mt-4">
          <li>A membership code and QR that identify you — they do not redeem or authorize a purchase by themselves.</li>
          <li>Points from qualifying purchases and participation, once rules are approved.</li>
          <li>Achievements that are separate from points and have no cash value.</li>
        </ul>

        <div className="lg-mt-6">
          <RewardsPanel message={message} />
        </div>
      </div>
    </div>
  );
}
