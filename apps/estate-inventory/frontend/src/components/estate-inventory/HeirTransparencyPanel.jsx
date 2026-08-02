import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import {
  distributionClassificationLabel,
  familyFinancialVisibilityLabel,
  formatEstateDisplayDate
} from '@shared/utils/estateInventoryConstants.js';
import EstateModalShell from './EstateModalShell';

/**
 * Family trust dashboard — visibility-gated by the PR setting.
 * Compact launcher → modal with the full overview.
 */
const HeirTransparencyPanel = ({ caseNumber }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await estateInventoryService.getHeirTransparencySummary(caseNumber);
      if (cancelled) return;
      setLoaded(true);
      if (!result.success) {
        if (/estate_heir_transparency_summary|schema cache|does not exist/i.test(result.error || '')) {
          setData(null);
          return;
        }
        setError(result.error || 'Could not load the estate overview.');
        return;
      }
      setData(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [caseNumber]);

  if (!loaded) {
    return (
      <section className="ei-transparency-panel ei-transparency-launch">
        <p className="ei-transparency-launch-hint">Loading estate overview…</p>
      </section>
    );
  }
  if (!data && !error) return null;

  const visibility = data?.visibility || 'minimal';
  const summary = data?.summary || {};
  const residualCount = Number(summary.residual_beneficiary_count) || 0;
  const projectedShare =
    residualCount > 0 ? Number(summary.estate_balance || 0) / residualCount : null;

  const launchHint = !loaded
    ? 'Loading…'
    : error
      ? 'Could not load overview'
      : visibility === 'minimal'
        ? 'Limited visibility · tap to review'
        : summary.estate_balance != null
          ? `Est. remaining ${formatMoney(summary.estate_balance)} · tap to open`
          : `${familyFinancialVisibilityLabel(visibility)} · tap to open`;

  const overviewBody = (
    <>
      {error ? <div className="ei-error">{error}</div> : null}

      {data?.inventory ? (
        <div className="ei-transparency-section">
          <h4>Inventory status</h4>
          <ul className="ei-transparency-lines">
            <li>
              <span>Total items</span>
              <strong>{data.inventory.total}</strong>
            </li>
            <li>
              <span>Currently active</span>
              <strong>{data.inventory.active}</strong>
            </li>
            <li>
              <span>Distributed</span>
              <strong>{data.inventory.distributed}</strong>
            </li>
          </ul>
        </div>
      ) : null}

      {data?.auction_breakdown ? (
        <div className="ei-transparency-section">
          <h4>Sale/auction status</h4>
          <ul className="ei-transparency-lines">
            <li>
              <span>Approved for sale/auction</span>
              <strong>{data.auction_breakdown.approved_count}</strong>
            </li>
            <li>
              <span>On sale/auction catalog</span>
              <strong>{data.auction_breakdown.listed_count}</strong>
            </li>
            <li>
              <span>Approved but not listed</span>
              <strong>{data.auction_breakdown.not_listed_count}</strong>
            </li>
            <li>
              <span>Sold — payment pending</span>
              <strong>{data.auction_breakdown.sold_pending_count}</strong>
            </li>
            <li>
              <span>Sold — paid</span>
              <strong>{data.auction_breakdown.sold_paid_count}</strong>
            </li>
          </ul>
          {(data.auction_breakdown.not_listed || []).length ? (
            <ul className="ei-transparency-list">
              {data.auction_breakdown.not_listed.map((row, index) => (
                <li key={`${row.name}-${index}`}>
                  <span>
                    <strong>{row.name}</strong>
                    <br />
                    {row.reason}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {visibility === 'minimal' ? (
        <p className="ei-settings-hint">
          {data?.message ||
            'The Personal Representative has limited family financial visibility to your own distribution receipts.'}
        </p>
      ) : null}

      {visibility !== 'minimal' && summary ? (
        <>
          <div className="ei-transparency-grid">
            <article>
              <h4>What the estate holds</h4>
              <ul className="ei-transparency-lines">
                <li>
                  <span>Bank accounts (Funds)</span>
                  <strong>{formatMoney(summary.account_assets_total)}</strong>
                </li>
                <li>
                  <span>Other / starting cash</span>
                  <strong>{formatMoney(summary.other_cash)}</strong>
                </li>
                {Number(summary.undeposited_paid_sales) > 0 ? (
                  <li>
                    <span>Paid sales not yet deposited</span>
                    <strong>{formatMoney(summary.undeposited_paid_sales)}</strong>
                  </li>
                ) : null}
                {summary.funds_available != null ? (
                  <li>
                    <span>Cash available</span>
                    <strong>{formatMoney(summary.funds_available)}</strong>
                  </li>
                ) : null}
                <li>
                  <span>Outstanding sale/auction bids</span>
                  <strong>{formatMoney(summary.outstanding_bids)}</strong>
                </li>
                <li>
                  <span>Unsold property (estimates)</span>
                  <strong>{formatMoney(summary.unsold_inventory)}</strong>
                </li>
                <li className="is-total">
                  <span>Total assets</span>
                  <strong>{formatMoney(summary.gross_assets)}</strong>
                </li>
              </ul>
            </article>
            <article>
              <h4>What the estate owes</h4>
              <ul className="ei-transparency-lines">
                <li>
                  <span>Debts</span>
                  <strong>{formatMoney(summary.account_debts_total)}</strong>
                </li>
                {summary.pr_loans_total != null ? (
                  <li>
                    <span>PR loans / advances</span>
                    <strong>{formatMoney(summary.pr_loans_total)}</strong>
                  </li>
                ) : null}
                <li className="is-total">
                  <span>Total liabilities</span>
                  <strong>{formatMoney(summary.total_liabilities)}</strong>
                </li>
                <li className="is-total">
                  <span>Estimated remaining estate</span>
                  <strong>{formatMoney(summary.estate_balance)}</strong>
                </li>
              </ul>
              {Number(summary.expenses_total) > 0 ? (
                <p className="ei-settings-hint">
                  Bills paid so far: {formatMoney(summary.expenses_total)} (history only — already
                  reflected in bank Funds when paid from an estate account).
                </p>
              ) : null}
              {projectedShare != null ? (
                <p className="ei-settings-hint">
                  If residual share is equal among {residualCount} residual
                  beneficiary(ies), projected remaining share ≈{' '}
                  <strong>{formatMoney(projectedShare)}</strong> each (illustrative purposes only).
                </p>
              ) : null}
            </article>
          </div>

          {(data.accounts || []).length ? (
            <div className="ei-transparency-section">
              <h4>Accounts &amp; debts</h4>
              <ul className="ei-transparency-list">
                {data.accounts.map((row, index) => (
                  <li key={`${row.account_name}-${index}`}>
                    <span>
                      <strong>{row.account_name}</strong>
                      {row.institution ? ` · ${row.institution}` : ''}
                      {row.kind === 'debt' ? ' (debt)' : ''}
                    </span>
                    <strong>{formatMoney(row.balance)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(data.distributions || []).length ? (
            <div className="ei-transparency-section">
              <h4>Distribution summary</h4>
              <ul className="ei-transparency-list">
                {data.distributions.map((row, index) => (
                  <li key={`${row.distribution_id}-${row.sibling_key}-${index}`}>
                    <span>
                      <strong>
                        {row.recipient_name}
                        {row.is_viewer ? ' (you)' : ''}
                      </strong>
                      <br />
                      {distributionClassificationLabel(row.classification)} ·{' '}
                      {formatEstateDisplayDate(row.distribution_date) || row.distribution_date}
                      <br />
                      Cash {formatMoney(row.cash_amount)}
                      {Number(row.property_value) > 0
                        ? ` · Property ${formatMoney(row.property_value)}`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {(data.expenses || []).length ? (
            <div className="ei-transparency-section">
              <h4>Expenses</h4>
              <ul className="ei-transparency-list">
                {data.expenses.map((row, index) => (
                  <li key={`${row.expense_name}-${index}`}>
                    <span>
                      <strong>{row.expense_name}</strong>
                      {row.date_paid
                        ? ` · ${formatEstateDisplayDate(row.date_paid) || row.date_paid}`
                        : ''}
                      {visibility === 'full' && row.receipt_url ? (
                        <>
                          {' · '}
                          <a href={row.receipt_url} target="_blank" rel="noreferrer">
                            Receipt
                          </a>
                        </>
                      ) : null}
                    </span>
                    <strong>{formatMoney(row.amount)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.auction ? (
            <div className="ei-transparency-section">
              <h4>Sale/auction proceeds</h4>
              <ul className="ei-transparency-lines">
                <li>
                  <span>Expected proceeds</span>
                  <strong>{formatMoney(data.auction.expected_total)}</strong>
                </li>
                <li>
                  <span>Collected</span>
                  <strong>{formatMoney(data.auction.paid_total)}</strong>
                </li>
                <li>
                  <span>Outstanding</span>
                  <strong>{formatMoney(data.auction.outstanding_total)}</strong>
                </li>
              </ul>
              {visibility === 'full' && (data.auction.lots || []).length ? (
                <ul className="ei-transparency-list">
                  {data.auction.lots.map((lot, index) => (
                    <li key={`${lot.name}-${index}`}>
                      <span>
                        <strong>{lot.name}</strong> · {lot.payment_status}
                      </span>
                      <strong>
                        {Number(lot.highest_bid) > 0 ? formatMoney(lot.highest_bid) : '—'}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {data.note ? <p className="ei-settings-hint">{data.note}</p> : null}
        </>
      ) : null}
    </>
  );

  const opener = (
    <section
      className="ei-transparency-panel ei-transparency-launch"
      aria-labelledby="ei-transparency-title"
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label="Estate financial overview — open details"
      onClick={() => setOpen(true)}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          setOpen(true);
        }
      }}
    >
      <h3 id="ei-transparency-title">Estate financial overview</h3>
      <p className="ei-transparency-launch-hint">{launchHint}</p>
      <span className="ei-transparency-launch-cta">Tap to review</span>
    </section>
  );

  const modal = open ? (
    <EstateModalShell
      title="Estate financial overview"
      subtitle={`Visibility: ${familyFinancialVisibilityLabel(visibility)}${
        data?.access_tier === 'memorandum' ? ' · Specific Gift Recipient view' : ''
      }`}
      onClose={() => setOpen(false)}
      className="ei-modal-transparency"
      compact
    >
      {overviewBody}
    </EstateModalShell>
  ) : null;

  if (typeof document !== 'undefined' && document.body && modal) {
    return (
      <>
        {opener}
        {createPortal(
          <div className="estate-inventory ei-modal-portal">{modal}</div>,
          document.body
        )}
      </>
    );
  }

  return (
    <>
      {opener}
      {modal}
    </>
  );
};

export default HeirTransparencyPanel;
