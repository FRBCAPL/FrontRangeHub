import React, { useEffect, useState } from 'react';
import { bidderName } from '../../services/consignmentAuctionAdminService.js';
import { loadSellerAccounts, setConsignmentSeller } from '../../services/consignmentSellerAccessService.js';
import { formatShortDate } from '../../utils/consignmentDates.js';

function AccountRow({ user, busy, onSet }) {
  const who = bidderName(user) || 'Unknown';
  let tag = '';
  if (user.seller) tag = ' · Seller';
  else if (user.requested_at) tag = ` · Requested ${formatShortDate(user.requested_at)}`;
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
      </span>
      <span className="cs-actions">
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
    </li>
  );
}

/** Who can list items. Requests come from the "Request seller access" button on the Sell page. */
export default function ConsignmentSellersPanel({ defaultOpen = false }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const refresh = () => loadSellerAccounts().then(setRows).catch((err) => setError(err.message));
  useEffect(() => { refresh(); }, []);

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

  return (
    <details className="cs-history cs-bidders" open={defaultOpen || requests.length > 0}>
      <summary>
        Sellers ({sellers.length}){requests.length ? ` · ${requests.length} request${requests.length === 1 ? '' : 's'}` : ''}
      </summary>
      <p className="cs-hint">Only sellers (and admins) can list items and see listing fees.</p>
      {error ? <p className="cs-error">{error}</p> : null}
      {requests.length ? (
        <>
          <p className="cs-meta"><strong>Requests</strong></p>
          <ul>{requests.map((u) => <AccountRow key={u.id} user={u} busy={busyId === u.id} onSet={onSet} />)}</ul>
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
        results.length ? (
          <ul>{results.map((u) => <AccountRow key={u.id} user={u} busy={busyId === u.id} onSet={onSet} />)}</ul>
        ) : <p className="cs-meta">No accounts match.</p>
      ) : null}
      {sellers.length ? (
        <>
          <p className="cs-meta"><strong>Current sellers</strong></p>
          <ul>{sellers.map((u) => <AccountRow key={u.id} user={u} busy={busyId === u.id} onSet={onSet} />)}</ul>
        </>
      ) : <p className="cs-meta">No sellers yet.</p>}
    </details>
  );
}
