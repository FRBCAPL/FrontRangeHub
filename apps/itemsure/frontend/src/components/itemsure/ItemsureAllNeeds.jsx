import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import { loadAllNeeds } from '../../services/itemsureAllNeedsService.js';
import { onInventoryChanged } from '../../utils/itemsureChanges.js';
import { needCountText } from '../../utils/itemsureAllNeeds.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { site, sites } from '../../data/itemsureTerms.js';
import ItemsureNeedRow from './ItemsureNeedRow.jsx';
import { itemAddress } from '../../hooks/useItemModal.js';
import { ErrorNote, PageHead } from './ItemsureUi.jsx';

function BusinessNeeds({ business, showName, current, onOpen }) {
  const { needs } = business;
  return (
    <section className="isu-all-needs-business">
      {showName ? <h2 className="isu-all-needs-business-name">🏢 {business.name}{current ? ' (current)' : ''}</h2> : null}
      {business.error ? <ErrorNote message={`Couldn't load ${business.name}: ${business.error}`} /> : null}
      {needs && !needs.groups.length ? <p className="isu-muted">Nothing is needed at any {site} right now.</p> : null}
      {needs?.groups.map((group) => (
        <div key={group.id} className="isu-restock-group">
          <h3>{group.name} <span className="isu-muted isu-small">({needCountText(group)})</span></h3>
          <ul className="isu-levels-list">
            {group.rows.map((r) => <ItemsureNeedRow key={r.target_id} row={r} onOpen={current ? null : () => onOpen(business.id, r.item_id)} />)}
          </ul>
        </div>
      ))}
      {needs?.clear.length ? <p className="isu-muted isu-small">Nothing needed at: {needs.clear.join(', ')}.</p> : null}
    </section>
  );
}

/** Owner view: what every location needs, across every business the person owns. */
export default function ItemsureAllNeeds() {
  const { organization, workspace, switchOrganization } = useItemsureWorkspace();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState(null);
  const memberships = workspace?.memberships;

  const load = useCallback(async () => {
    setBusinesses(await loadAllNeeds(memberships || []));
  }, [memberships]);

  useEffect(() => {
    load();
    return onInventoryChanged(load);
  }, [load]);

  const openIn = async (organizationId, itemId) => {
    await switchOrganization(organizationId);
    navigate(itemAddress(itemId));
  };

  const ordered = businesses
    ? [...businesses].sort((a, b) => (b.id === organization.id) - (a.id === organization.id) || a.name.localeCompare(b.name))
    : null;
  const totals = (businesses || []).reduce(
    (sum, b) => ({
      low: sum.low + (b.needs?.totals.low || 0),
      belowPar: sum.belowPar + (b.needs?.totals.belowPar || 0),
      noAmount: sum.noAmount + (b.needs?.totals.noAmount || 0),
    }),
    { low: 0, belowPar: 0, noAmount: 0 },
  );
  const several = (businesses?.length || 0) > 1;

  return (
    <div className="isu-page">
      <PageHead
        title={`Needs at all ${sites}`}
        description={several ? `Everything that needs stock, at every ${site} of every business you own.` : `Everything that needs stock, at every ${site}.`}
      />
      {!businesses ? <p className="isu-muted">Loading…</p> : null}
      {businesses ? (
        <p className="isu-notice">
          {needCountText(totals) || 'Nothing is needed anywhere right now.'}{' '}
          <Link to={`${ITEMSURE_PATH}/restock`}>Open the shopping list</Link> to buy or move stock{several ? ' for the business you are in' : ''}.
        </p>
      ) : null}
      {ordered?.map((b) => (
        <BusinessNeeds key={b.id} business={b} showName={several} current={b.id === organization.id} onOpen={openIn} />
      ))}
    </div>
  );
}
