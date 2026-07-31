import React, { useMemo } from 'react';
import {
  buildDistributionReceiptHtml,
  downloadDistributionReceipt
} from '@shared/utils/estateDistributionReceipt.js';

/**
 * Embedded distribution receipt — no popup required.
 */
const DistributionReceiptModal = ({ open, payload, onClose, onError }) => {
  const html = useMemo(() => {
    if (!open || !payload) return '';
    return buildDistributionReceiptHtml(payload);
  }, [open, payload]);

  if (!open || !payload) return null;

  const handleDownload = () => {
    const result = downloadDistributionReceipt(payload);
    if (!result.success) onError?.(result.error);
  };

  return (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings ei-receipt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-receipt-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ei-modal-head">
          <div>
            <h3 id="ei-receipt-title">Distribution receipt</h3>
            <p className="ei-settings-hint" style={{ margin: '0.2rem 0 0' }}>
              View here, or download to save / print as PDF from your browser.
            </p>
          </div>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="ei-modal-body">
          <div className="ei-btn-row" style={{ marginBottom: '0.75rem' }}>
            <button type="button" className="ei-btn ei-btn-small" onClick={handleDownload}>
              Download receipt
            </button>
            <button type="button" className="ei-btn ei-btn-small ei-btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
          <iframe
            className="ei-receipt-frame"
            title="Distribution receipt"
            srcDoc={html}
            sandbox=""
          />
        </div>
      </div>
    </div>
  );
};

export default DistributionReceiptModal;
