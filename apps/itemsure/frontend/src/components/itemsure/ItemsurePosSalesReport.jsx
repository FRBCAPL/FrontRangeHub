import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import usePosSalesReport from '../../hooks/usePosSalesReport.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { site, SITE } from '../../data/itemsureTerms.js';
import { Card, ErrorNote, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsurePosSalesTable from './ItemsurePosSalesTable.jsx';
import ItemsurePosFixItem from './ItemsurePosFixItem.jsx';

const when = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');
const POS_SETTINGS = `${ITEMSURE_PATH}/settings/pos`;
const roundLabel = (round) => {
  const names = round.names.length > 3 ? `${round.names.slice(0, 3).join(', ')} +${round.names.length - 3}` : round.names.join(', ');
  return `${round.day} · ${names}`;
};

/** Sales vs counts: what Clover sales say was used between two approved counts, beside what the counts say. */
export default function ItemsurePosSalesReport() {
  const { organization, can } = useItemsureWorkspace();
  const r = usePosSalesReport(organization.id);
  const [fixing, setFixing] = useState(null);
  const head = <PageHead title="Sales vs counts" description="Compare what Clover says sold with what your counts say was used. This report never changes stock." />;

  if (!r.base) return <div className="isu-page">{head}<p className="isu-muted">Loading…</p></div>;
  const { connection, salesReady } = r.base;
  const settingsLink = can('pos.manage') ? <Link to={POS_SETTINGS} className="isu-link">Point of sale settings</Link> : null;
  if (!connection || !salesReady) {
    return (
      <div className="isu-page">
        {head}
        <Card>
          <p className="isu-muted">
            {!salesReady && connection ? 'This report needs a database update first. Nothing else is affected.' : 'Connect Clover first, then match its items to yours and set how much each sale uses.'}
          </p>
          {settingsLink}
          <ErrorNote message={r.error} />
        </Card>
      </div>
    );
  }

  const siteIds = [...new Set(r.base.counts.map((c) => c.locationId))];
  const siteName = (id) => r.base.locations.find((l) => l.id === id)?.name || SITE;
  const pick = (key) => (e) => r.setPair((p) => ({ ...p, [key]: e.target.value }));
  const otherSite = connection.location_id && r.siteId && connection.location_id !== r.siteId;

  return (
    <div className="isu-page isu-stack">
      {head}
      <Card>
        <div className="isu-pos-report-pick">
          {siteIds.length > 1 ? (
            <label>
              <span>{SITE}</span>
              <select value={r.siteId} onChange={(e) => r.setSiteId(e.target.value)}>
                {siteIds.map((id) => <option key={id} value={id}>{siteName(id)}</option>)}
              </select>
            </label>
          ) : null}
          <label>
            <span>From counts on</span>
            <select value={r.pair.from} onChange={pick('from')}>
              <option value="">Choose…</option>
              {r.rounds.map((c) => <option key={c.key} value={c.key}>{roundLabel(c)}</option>)}
            </select>
          </label>
          <label>
            <span>To counts on</span>
            <select value={r.pair.to} onChange={pick('to')}>
              <option value="">Choose…</option>
              {r.rounds.map((c) => <option key={c.key} value={c.key}>{roundLabel(c)}</option>)}
            </select>
          </label>
        </div>
        <p className="isu-muted isu-small">Each spot is compared with its own earlier count, so spots can be counted at different times.</p>
        {r.rounds.length < 2 ? (
          <p className="isu-muted">
            This report needs approved counts on two different days at the same {site}. To just see what sold, use{' '}
            <Link to={`${ITEMSURE_PATH}/clover-sales`} className="isu-link">Clover sales</Link>.
          </p>
        ) : null}
        {otherSite ? <p className="isu-notice">Clover is set to sell from {siteName(connection.location_id)}, not this {site}. Change it in {settingsLink || 'point of sale settings'}.</p> : null}
        {!connection.location_id && r.base.locations.length > 1 && can('pos.manage') ? (
          <p className="isu-notice">Choose which {site} Clover sells from in {settingsLink}.</p>
        ) : null}
        {r.result?.fromAt ? (
          <p className="isu-muted isu-small">Sales from {when(r.result.fromAt)} to {when(r.result.toAt)}, to the nearest hour.</p>
        ) : null}
        <div className="isu-pos-actions">
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={r.syncing || r.result?.loading || !r.pair.from || !r.pair.to} onClick={r.bringInSales}>
            {r.syncing ? 'Bringing in sales…' : 'Bring in sales'}
          </button>
          {settingsLink && can('items.manage') ? <Link to={POS_SETTINGS} className="isu-link isu-small">Sales tracking setup</Link> : null}
        </div>
        {r.result?.syncNote ? <p className="isu-notice" role="status">{r.result.syncNote}</p> : null}
        <ErrorNote message={r.error} />
      </Card>
      {r.result?.loading && !r.result.rows ? <p className="isu-muted">Comparing…</p> : null}
      {r.result?.rows ? (
        <Card title="By item">
          <p className="isu-muted isu-small">
            <strong>Sold</strong> is how many times Clover rang it up. <strong>Sales used</strong> is how much stock those sales should have used.{' '}
            <strong>Counts used</strong> is how much your two counts say was actually used (it needs the item counted both times).
          </p>
          <p className="isu-muted isu-small">&ldquo;More used than sold&rdquo; can mean spills, free drinks, big pours, or missing sales. Recorded removals (like waste) count as used.</p>
          <Link to={`${ITEMSURE_PATH}/clover-sales`} className="isu-link isu-small">Just want to see what sold? Clover sales {'\u203A'}</Link>
          <ItemsurePosSalesTable rows={r.result.rows} posNames={r.base.posNames} onFix={can('items.manage') ? setFixing : null} />
        </Card>
      ) : null}
      <Modal open={Boolean(fixing)} title={fixing ? `Fix ${fixing.name}` : ''} onClose={() => setFixing(null)} wide>
        {fixing ? (
          <ItemsurePosFixItem organizationId={organization.id} itemId={fixing.itemId} onChanged={r.refreshSetup} onClose={() => setFixing(null)} />
        ) : null}
      </Modal>
    </div>
  );
}
