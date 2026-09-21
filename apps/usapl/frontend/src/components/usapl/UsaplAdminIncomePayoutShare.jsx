import React, { useState } from 'react';
import { payoutChartHref } from '../../data/usaplIncomePayoutShare.js';

export default function UsaplAdminIncomePayoutShare({ teams, weeks, poolCents, playType }) {
  const [copied, setCopied] = useState(false);
  if (!poolCents && poolCents !== 0) return null;
  const href = payoutChartHref({ teams, weeks, poolCents, playType });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="usapl-payout-share">
      <p className="usapl-note">
        Share this payout view
        {String(playType || '').toLowerCase() === 'double' ? ' (one format)' : ''}.
        {' '}Private chart stays off the link.
      </p>
      <div className="usapl-actions">
        <button type="button" className="usapl-btn" onClick={() => window.open(href, '_blank', 'noopener')}>
          Show others
        </button>
        <button type="button" className="usapl-btn-secondary" onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
