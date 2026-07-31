import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import { openDistributionReceipt } from '@shared/utils/estateDistributionReceipt.js';
import { distributionClassificationLabel } from '@shared/utils/estateInventoryConstants.js';

const HeirInheritancePanel = ({ caseNumber, estateName, recipientName }) => {
  const [rows, setRows] = useState([]);
  const [confirmed, setConfirmed] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const result = await estateInventoryService.listMyInheritance(caseNumber);
    setLoaded(true);
    if (!result.success) {
      // Older databases simply do not have this feature yet. Keep the family
      // portal usable while the owner applies the additive migration.
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

  const printReceipt = (row) => {
    const result = openDistributionReceipt({
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
    if (!result.success) setError(result.error);
  };

  if (loaded && !rows.length && !error) return null;

  return (
    <section className="ei-inheritance-panel" aria-labelledby="ei-inheritance-title">
      <div className="ei-accounts-section-head">
        <div>
          <h3 id="ei-inheritance-title">My inheritance</h3>
          <p className="ei-settings-hint">
            Cash and property the Personal Representative recorded for you.
          </p>
        </div>
      </div>
      {error ? <div className="ei-error">{error}</div> : null}
      {!loaded ? <p className="ei-settings-hint">Loading your inheritance…</p> : null}
      <div className="ei-inheritance-list">
        {rows.map((row) => (
          <article key={row.recipient_id}>
            <header>
              <div>
                <strong>
                  {row.classification
                    ? `${distributionClassificationLabel(row.classification)} · `
                    : ''}
                  Distribution dated {row.distribution_date}
                </strong>
                <span>
                  {row.status === 'void'
                    ? 'Reversed by the Personal Representative'
                    : row.acknowledgement_status === 'acknowledged'
                      ? `Acknowledged ${new Date(row.acknowledged_at).toLocaleString()}`
                      : 'Your acknowledgement is requested'}
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
                className="ei-btn ei-btn-small ei-btn-secondary"
                onClick={() => printReceipt(row)}
              >
                Print receipt
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
    </section>
  );
};

export default HeirInheritancePanel;

