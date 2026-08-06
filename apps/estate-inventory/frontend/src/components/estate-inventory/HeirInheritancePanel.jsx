import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import { downloadDistributionReceipt } from '@shared/utils/estateDistributionReceipt.js';
import {
  distributionClassificationLabel,
  formatEstateDisplayDate
} from '@shared/utils/estateInventoryConstants.js';
import { acknowledgementStatusLabel } from '@shared/utils/estateAcknowledgement.js';
import DistributionReceiptModal from './DistributionReceiptModal.jsx';
import EstateModalShell from './EstateModalShell';

const HeirInheritancePanel = ({
  caseNumber,
  estateName,
  recipientName,
  asMenuTile = false
}) => {
  const [rows, setRows] = useState([]);
  const [confirmed, setConfirmed] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const result = await estateInventoryService.listMyInheritance(caseNumber);
    setLoaded(true);
    if (!result.success) {
      if (/estate_heir_list_distributions|schema cache|does not exist/i.test(result.error || '')) {
        setRows([]);
        return;
      }
      setError(result.error || 'Could not load your inheritance record.');
      return;
    }
    setRows(result.data || []);
  };

  useEffect(() => {
    load();
  }, [caseNumber]);

  const acknowledge = async (row) => {
    if (!confirmed[row.recipient_id]) return;
    const accepted = window.confirm(
      'Confirm that you received the cash and/or property listed in this distribution? This creates a dated electronic acknowledgement for the estate record.'
    );
    if (!accepted) return;
    setBusyId(row.recipient_id);
    setError('');
    const result = await estateInventoryService.acknowledgeMyDistribution(
      row.recipient_id,
      'Recipient confirmed receipt in Estate Vault.',
      caseNumber
    );
    setBusyId(null);
    if (!result.success) {
      setError(result.error || 'Could not save your acknowledgement.');
      return;
    }
    await load();
  };

  const receiptPayload = (row) => ({
    distribution: row,
    recipient: {
      recipient_name: recipientName,
      cash_amount: row.cash_amount,
      share_percent: row.share_percent,
      acknowledgement_status: row.acknowledgement_status,
      acknowledged_at: row.acknowledged_at,
      items: row.items
    },
    estateName,
    caseNumber
  });

  const body = (
    <>
      {error ? <div className="ei-error">{error}</div> : null}
      {!loaded ? <p className="ei-settings-hint">Loading your inheritance…</p> : null}
      {loaded && !rows.length && !error ? (
        <p className="ei-settings-hint">Nothing has been recorded for you yet.</p>
      ) : null}
      <div className="ei-inheritance-list">
        {rows.map((row) => (
          <article key={row.recipient_id}>
            <header>
              <div>
                <strong>
                  {row.classification
                    ? `${distributionClassificationLabel(row.classification)} · `
                    : ''}
                  Distribution dated{' '}
                  {formatEstateDisplayDate(row.distribution_date) || row.distribution_date}
                </strong>
                <span>
                  {row.status === 'void'
                    ? 'Reversed by the Personal Representative'
                    : row.acknowledgement_status === 'acknowledged'
                      ? `Acknowledged ${
                          formatEstateDisplayDate(row.acknowledged_at) ||
                          new Date(row.acknowledged_at).toLocaleString()
                        }`
                      : acknowledgementStatusLabel(row.acknowledgement_status)}
                </span>
              </div>
              <strong>{formatMoney(row.cash_amount)}</strong>
            </header>
            {row.items?.length ? (
              <ul>
                {row.items.map((item) => (
                  <li key={item.item_id}>
                    <span>{item.item_name}</span>
                    <span>{formatMoney(item.estimated_value)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ei-settings-hint">No property listed in this distribution.</p>
            )}
            <div className="ei-btn-row">
              <button
                type="button"
                className="ei-btn ei-btn-small"
                onClick={() => setReceipt(receiptPayload(row))}
              >
                View receipt
              </button>
              <button
                type="button"
                className="ei-btn ei-btn-small ei-btn-secondary"
                onClick={() => {
                  const result = downloadDistributionReceipt(receiptPayload(row));
                  if (!result.success) setError(result.error);
                }}
              >
                Download PDF
              </button>
              {row.status !== 'void' && row.acknowledgement_status !== 'acknowledged' ? (
                <>
                  <label className="ei-inheritance-confirm">
                    <input
                      type="checkbox"
                      checked={Boolean(confirmed[row.recipient_id])}
                      onChange={(event) =>
                        setConfirmed((current) => ({
                          ...current,
                          [row.recipient_id]: event.target.checked
                        }))
                      }
                    />
                    I received what is listed above
                  </label>
                  <button
                    type="button"
                    className="ei-btn ei-btn-small"
                    disabled={!confirmed[row.recipient_id] || busyId === row.recipient_id}
                    onClick={() => acknowledge(row)}
                  >
                    {busyId === row.recipient_id ? 'Saving…' : 'Acknowledge receipt'}
                  </button>
                </>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      <DistributionReceiptModal
        open={Boolean(receipt)}
        payload={receipt}
        onClose={() => setReceipt(null)}
        onError={setError}
      />
    </>
  );

  if (asMenuTile) {
    const meta = !loaded
      ? 'Loading…'
      : rows.length
        ? `${rows.length} distribution${rows.length === 1 ? '' : 's'}`
        : 'Nothing recorded yet';
    const tile = (
      <button
        type="button"
        className="ei-family-action-tile ei-family-action-tile--inheritance ei-family-coach-target"
        id="ei-family-coach-inheritance"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <span className="ei-family-action-label">My inheritance</span>
        <span className="ei-family-action-meta">{meta}</span>
      </button>
    );
    const modal = open ? (
      <div className="estate-inventory ei-modal-portal">
        <EstateModalShell
          title="My inheritance"
          subtitle="Cash and property recorded for you"
          onClose={() => setOpen(false)}
          className="ei-heir-center-modal ei-inheritance-modal"
          foot={
            <button type="button" className="ei-btn" onClick={() => setOpen(false)}>
              Close
            </button>
          }
        >
          <div className="ei-inheritance-panel ei-inheritance-panel--modal">{body}</div>
        </EstateModalShell>
      </div>
    ) : null;
    if (typeof document !== 'undefined' && document.body && modal) {
      return (
        <>
          {tile}
          {createPortal(modal, document.body)}
        </>
      );
    }
    return (
      <>
        {tile}
        {modal}
      </>
    );
  }

  if (loaded && !rows.length && !error) return null;

  return (
    <section className="ei-inheritance-panel" aria-labelledby="ei-inheritance-title">
      <div className="ei-accounts-section-head">
        <div>
          <h3 id="ei-inheritance-title">My inheritance</h3>
          <p className="ei-settings-hint">
            Cash and property the Personal Representative recorded for you. Acknowledgements are
            saved to the estate record and included in formal accounting / court evidence.
          </p>
        </div>
      </div>
      {body}
    </section>
  );
};

export default HeirInheritancePanel;
