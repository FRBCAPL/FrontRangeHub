import React, { useMemo } from 'react';
import { auctionTermsLines } from '@shared/utils/estateInventoryConstants.js';
import { PR_AUCTION_BID_BLOCK_MESSAGE } from '@shared/utils/estateLegalOps.js';

/**
 * Public auction rules — terms + PR / estate-owner bid restriction.
 */
const AuctionRulesModal = ({ open, onClose, pickupWindow = '' }) => {
  const terms = useMemo(() => auctionTermsLines(pickupWindow), [pickupWindow]);

  if (!open) return null;

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-auction-rules-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <h3 id="ei-auction-rules-title">Sale/auction rules</h3>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ei-modal-body">
          <h4 className="ei-settings-subhead">Terms of Estate Sale</h4>
          <ol className="ei-terms-list" style={{ paddingLeft: '1.15rem', margin: '0 0 1rem' }}>
            {terms.map((line) => (
              <li key={line} className="ei-settings-hint" style={{ marginBottom: '0.45rem' }}>
                {line}
              </li>
            ))}
          </ol>

          <h4 className="ei-settings-subhead">Personal Representative</h4>
          <p className="ei-settings-hint" style={{ margin: 0 }}>
            {PR_AUCTION_BID_BLOCK_MESSAGE}
          </p>
        </div>
        <div className="ei-modal-foot ei-btn-row">
          <button type="button" className="ei-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuctionRulesModal;
