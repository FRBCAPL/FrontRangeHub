import React, { useEffect, useState } from 'react';
import { bidderName, setBidderSuspended } from '../../services/consignmentAuctionAdminService.js';
import { loadBidderAccounts } from '../../services/consignmentBidderAccountsService.js';
import { formatShortDate } from '../../utils/consignmentDates.js';
import ConsignmentAccountRequestsPanel from './ConsignmentAccountRequestsPanel.jsx';
import ConsignmentBidderItems from './ConsignmentBidderItems.jsx';

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function activity(b) {
  const parts = [plural(b.bids, 'bid')];
  if (b.leading_now) parts.push(`leading ${b.leading_now}`);
  if (b.won) parts.push(`won ${b.won}`);
  if (b.awaiting_payment) parts.push(`${b.awaiting_payment} awaiting payment`);
  if (b.defaults_count) parts.push(plural(b.defaults_count, 'unpaid win'));
  if (b.last_bid_at) parts.push(`last bid ${formatShortDate(b.last_bid_at)}`);
  return parts.join(' · ');
}

function BidderRow({ bidder, onToggle }) {
  const [open, setOpen] = useState(false);
  const canSuspend = bidder.suspended || bidder.defaults_count > 0;
  return (
    <li style={{ flexWrap: 'wrap' }}>
      <span>
        <strong>{bidderName(bidder) || 'Unknown'}</strong>
        <span className="cs-meta">
          {bidder.email ? ` · ${bidder.email}` : ''}
          {bidder.phone ? ` · ${bidder.phone}` : ''}
          {bidder.approved ? '' : ' · Not approved'}
          {bidder.suspended ? ' · Suspended' : ''}
        </span>
        <span className="cs-meta" style={{ display: 'block' }}>{activity(bidder)}</span>
      </span>
      <span className="cs-actions">
        {bidder.bids ? (
          <button type="button" className="cs-btn-secondary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide items' : 'Show items'}
          </button>
        ) : null}
        {canSuspend ? (
          <button type="button" className="cs-btn-secondary" onClick={() => onToggle(bidder)}>
            {bidder.suspended ? 'Unsuspend' : 'Suspend'}
          </button>
        ) : null}
      </span>
      {open ? <div className="cs-bidder-items-wrap"><ConsignmentBidderItems userId={bidder.id} /></div> : null}
    </li>
  );
}

/** Admin Bidders tab: new accounts waiting for approval, then everyone who has bid. */
export default function ConsignmentBiddersPanel() {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const refresh = (q = query) => loadBidderAccounts(q)
    .then((data) => { setRows(data); setError(''); })
    .catch((err) => setError(err.message));
  useEffect(() => { refresh(); }, []);

  const find = (e) => {
    e.preventDefault();
    const q = search.trim();
    setQuery(q);
    refresh(q);
  };

  const toggle = (b) => {
    const next = !b.suspended;
    const who = bidderName(b) || 'this bidder';
    if (!window.confirm(next ? `Suspend ${who} from bidding?` : `Let ${who} bid again?`)) return;
    setBidderSuspended(b.id, next).then(() => refresh()).catch((err) => setError(err.message));
  };

  return (
    <>
      <ConsignmentAccountRequestsPanel />
      <section className="cs-history cs-bidders">
        <form className="cs-filters" onSubmit={find}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find any account by name or email"
            aria-label="Find a bidder"
          />
          <button type="submit" className="cs-btn-secondary">Find</button>
          {query ? (
            <button type="button" className="cs-btn-secondary" onClick={() => { setSearch(''); setQuery(''); refresh(''); }}>
              Show all bidders
            </button>
          ) : null}
        </form>
        {error ? <p className="cs-error">{error}</p> : null}
        <h3>{query ? `Accounts matching “${query}”` : 'Bidders'}{rows ? ` (${rows.length})` : ''}</h3>
        {rows === null && !error ? <p className="cs-meta">Loading…</p> : null}
        {rows && !rows.length ? <p className="cs-meta">{query ? 'No accounts match.' : 'No one has bid yet.'}</p> : null}
        {rows && rows.length ? <ul>{rows.map((b) => <BidderRow key={b.id} bidder={b} onToggle={toggle} />)}</ul> : null}
      </section>
    </>
  );
}
