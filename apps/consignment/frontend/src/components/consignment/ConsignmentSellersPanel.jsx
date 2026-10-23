import React, { useEffect, useState } from 'react';
import { bidderName } from '../../services/consignmentAuctionAdminService.js';
import { loadSellerAccounts, loadSellerItemRows, setConsignmentSeller } from '../../services/consignmentSellerAccessService.js';
import { formatShortDate } from '../../utils/consignmentDates.js';
import { sellerCountsLabel, sellerItemCounts, sellerMatches } from '../../utils/consignmentSellerItems.js';
import ConsignmentSellerItems from './ConsignmentSellerItems.jsx';

function AccountRow({ user, busy, onSet, itemRows, onViewItems }) {
  const [open, setOpen] = useState(false);
  const who = bidderName(user) || 'Unknown';
  let tag = '';
  if (user.seller) tag = ' · Seller';
  else if (user.requested_at) tag = ` · Requested ${formatShortDate(user.requested_at)}`;
  const counts = itemRows ? sellerItemCounts(itemRows, user) : null;
  const hasItems = Boolean(itemRows?.some((row) => sellerMatches(row.seller, user)));
  return (
    <li>
      <span>
        <strong>{who}</strong>
        <span className="cs-meta">
          {user.email ? ` · ${user.email}` : ''}
          {user.phone ? ` · ${user.phone}` : ''}
          {tag}
          {user.approved ? '' : ' · Account not approved yet'}
        </span>
        {counts ? <span className="cs-meta" style={{ display: 'block' }}>{sellerCountsLabel(counts)}</span> : null}
      </span>
      <span className="cs-actions">
        {hasItems ? (
          <>
            <button type="button" className="cs-btn-secondary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? 'Hide items' : 'Show items'}
            </button>
            <button type="button" className="cs-btn-secondary" onClick={() => onViewItems(user)}>Manage items</button>
          </>
        ) : null}
        {user.seller ? (
          <button type="button" className="cs-btn-secondary" disabled={busy} onClick={() => onSet(user, false)}>Remove seller</button>
        ) : (
          <>
            <button type="button" className="cs-btn" disabled={busy} onClick={() => onSet(user, true)}>Allow selling</button>
            {user.requested_at ? (
              <button type="button" className="cs-btn-secondary" disabled={busy} onClick={() => onSet(user, false)}>Decline</button>
            ) : null}
          </>
        )}
      </span>
      {open ? <div className="cs-bidder-items-wrap"><ConsignmentSellerItems itemRows={itemRows} account={user} /></div> : null}
    </li>
  );
}

/** Admin Sellers tab. Requests come from the "Request seller access" button on the Sell page. */
export default function ConsignmentSellersPanel({ onViewItems }) {
  const [rows, setRows] = useState([]);
  const [itemRows, setItemRows] = useState(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const refresh = () => loadSellerAccounts().then(setRows).catch((err) => setError(err.message));
  useEffect(() => {
    refresh();
    loadSellerItemRows().then(setItemRows).catch((err) => setError(err.message));
  }, []);

  const find = async (e) => {
    e.preventDefault();
    setError('');
    if (!search.trim()) { setResults(null); return; }
    try {
      setResults(await loadSellerAccounts(search.trim()));
    } catch (err) {
      setError(err.message);
    }
  };

  const onSet = async (user, allow) => {
    const who = bidderName(user) || 'this account';
    let ask = `Remove selling for ${who}? Items they already listed stay as they are.`;
    if (allow) ask = `Let ${who} list items to sell?`;
    else if (!user.seller) ask = `Decline the seller request from ${who}?`;
    if (!window.confirm(ask)) return;
    setBusyId(user.id);
    setError('');
    try {
      await setConsignmentSeller(user.id, allow);
      await refresh();
      if (results) setResults(await loadSellerAccounts(search.trim()));
    } catch (err) {
      setError(err.message);
    }
    setBusyId(null);
  };

  const requests = rows.filter((u) => !u.seller && u.requested_at);
  const sellers = rows.filter((u) => u.seller);
  const row = (u) => (
    <AccountRow key={u.id} user={u} busy={busyId === u.id} onSet={onSet} itemRows={itemRows} onViewItems={onViewItems} />
  );

  return (
    <section className="cs-history cs-bidders">
      <p className="cs-hint">Only sellers (and admins) can list items and see listing fees.</p>
      {error ? <p className="cs-error">{error}</p> : null}
      {requests.length ? (
        <>
          <h3>Seller requests ({requests.length})</h3>
          <ul>{requests.map(row)}</ul>
        </>
      ) : null}
      <form className="cs-filters" onSubmit={find}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find an account by name or email"
          aria-label="Find an account"
        />
        <button type="submit" className="cs-btn-secondary">Find</button>
      </form>
      {results ? (
        results.length ? <ul>{results.map(row)}</ul> : <p className="cs-meta">No accounts match.</p>
      ) : null}
      <h3>Sellers ({sellers.length})</h3>
      {sellers.length ? <ul>{sellers.map(row)}</ul> : <p className="cs-meta">No sellers yet.</p>}
    </section>
  );
}
