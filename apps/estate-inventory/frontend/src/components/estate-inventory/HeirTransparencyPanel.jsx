import React, { useEffect, useState } from 'react';
import estateInventoryService from '@shared/services/estateInventoryService.js';
import { formatMoney } from '@shared/utils/estateFinance.js';
import {
  distributionClassificationLabel,
  familyFinancialVisibilityLabel
} from '@shared/utils/estateInventoryConstants.js';

/**
 * Family trust dashboard — visibility-gated by the PR setting.
 * Residual / Both heirs see Standard or Full when the PR allows it.
 * Memorandum-only heirs always stay on Minimal messaging.
 */
const HeirTransparencyPanel = ({ caseNumber }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

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
      <section className="ei-transparency-panel">
        <p className="ei-settings-hint">Loading estate overview…</p>
      </section>
    );
  }
  if (!data && !error) return null;

  const visibility = data?.visibility || 'minimal';
  const summary = data?.summary || {};
  const residualCount = Number(summary.residual_beneficiary_count) || 0;
  const projectedShare =
    residualCount > 0 ? Number(summary.estate_balance || 0) / residualCount : null;

  return (
    <section className="ei-transparency-panel" aria-labelledby="ei-transparency-title">
      <div className="ei-accounts-section-head">
        <div>
          <h3 id="ei-transparency-title">Estate financial overview</h3>
          <p className="ei-settings-hint">
            Visibility: {familyFinancialVisibilityLabel(visibility)}
            {data?.access_tier === 'memorandum'
              ? ' · Specific Gift Recipient view'
              : null}
          </p>
        </div>
      </div>

      {error ? <div className="ei-error">{error}</div> : null}

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
                  <span>Accounts</span>
                  <strong>{formatMoney(summary.account_assets_total)}</strong>
                </li>
                <li>
                  <span>Other cash</span>
                  <strong>{formatMoney(summary.other_cash)}</strong>
                </li>
                <li>
                  <span>Outstanding auction bids</span>
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
              <h4>Obligations</h4>
              <ul className="ei-transparency-lines">
                <li>
                  <span>Debts</span>
                  <strong>{formatMoney(summary.account_debts_total)}</strong>
                </li>
                <li>
                  <span>Approved expenses (activity)</span>
                  <strong>{formatMoney(summary.expenses_total)}</strong>
                </li>
                {summary.pr_loans_total != null ? (
                  <li>
                    <span>PR loans</span>
                    <strong>{formatMoney(summary.pr_loans_total)}</strong>
                  </li>
                ) : null}
                <li className="is-total">
                  <span>Estimated remaining estate</span>
                  <strong>{formatMoney(summary.estate_balance)}</strong>
                </li>
              </ul>
              {projectedShare != null ? (
                <p className="ei-settings-hint">
                  If residual share is equal among {residualCount} residual
                  beneficiary(ies), projected remaining share ≈{' '}
                  <strong>{formatMoney(projectedShare)}</strong> each (illustrative only —
                  the will / PR controls the actual split).
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
                      {row.distribution_date}
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
                        ? ` · ${new Date(row.date_paid).toLocaleDateString()}`
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
              <h4>Auction summary</h4>
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
    </section>
  );
};

export default HeirTransparencyPanel;
