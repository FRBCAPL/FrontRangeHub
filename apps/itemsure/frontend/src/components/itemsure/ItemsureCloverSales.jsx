import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useItemsureWorkspace } from '../../hooks/useItemsureWorkspace.js';
import useCloverSales from '../../hooks/useCloverSales.js';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { PERIODS } from '../../utils/itemsureCloverSales.js';
import { shortQty } from '../../utils/itemsurePosUsage.js';
import { formatWhen } from '../../utils/itemsureText.js';
import { Card, ErrorNote, Modal, PageHead } from './ItemsureUi.jsx';
import ItemsureCloverSalesList from './ItemsureCloverSalesList.jsx';
import ItemsurePosFixItem from './ItemsurePosFixItem.jsx';

const POS_SETTINGS = `${ITEMSURE_PATH}/settings/pos`;
const UNMATCHED_SHOWN = 15;

/** Clover sales: what sold in a period, item by item, and how much stock that is. Never changes stock. */
export default function ItemsureCloverSales() {
  const { organization, can } = useItemsureWorkspace();
  const s = useCloverSales(organization.id);
  const [search, setSearch] = useState('');
  const [fixing, setFixing] = useState(null);
  const head = <PageHead title="Clover sales" description="What Clover sold, item by item, and how much stock that uses. This page never changes stock." />;

  if (!s.base) return <div className="isu-page">{head}<p className="isu-muted">Loading…</p></div>;
  if (!s.base.connection || !s.base.salesReady) {
    return (
      <div className="isu-page">
        {head}
        <Card>
          <p className="isu-muted">{s.base.connection ? 'This page needs a database update first.' : 'Connect Clover first in Settings → Point of sale.'}</p>
          <ErrorNote message={s.error} />
        </Card>
      </div>
    );
  }

  const r = s.result;
  const words = search.trim().toLowerCase();
  const rows = (r?.rows || []).filter((row) => !words || row.name.toLowerCase().includes(words) || row.buttons.some((b) => b.name.toLowerCase().includes(words)));
  const setKey = (key) => s.setPeriod((p) => ({ ...p, key }));
  const setDay = (field) => (e) => s.setPeriod((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="isu-page isu-stack">
      {head}
      <Card>
        <div className="isu-pos-filters" role="group" aria-label="Period">
          {Object.entries(PERIODS).map(([key, label]) => (
            <button key={key} type="button" className={`isu-chip${s.period.key === key ? ' is-active' : ''}`} aria-pressed={s.period.key === key} onClick={() => setKey(key)}>
              {label}
            </button>
          ))}
        </div>
        {s.period.key === 'custom' ? (
          <div className="isu-pos-report-pick">
            <label><span>From</span><input type="date" value={s.period.from} onChange={setDay('from')} /></label>
            <label><span>To</span><input type="date" value={s.period.to} onChange={setDay('to')} /></label>
          </div>
        ) : null}
        {s.period.key === 'custom' && !s.range ? <p className="isu-muted isu-small">Pick a start and end date.</p> : null}
        {r?.through ? <p className="isu-muted isu-small">Clover sales brought in up to {formatWhen(r.through)}.</p> : null}
        <div className="isu-pos-actions">
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" disabled={s.syncing || r?.loading || !s.range} onClick={s.bringInSales}>
            {s.syncing ? 'Bringing in sales…' : 'Bring in latest sales'}
          </button>
        </div>
        {r?.syncNote ? <p className="isu-notice" role="status">{r.syncNote}</p> : null}
        <ErrorNote message={s.error} />
      </Card>

      {r?.loading && !r.rows ? <p className="isu-muted">Loading sales…</p> : null}
      {r?.rows ? (
        <Card title="By item">
          <p className="isu-muted isu-small">
            About {Math.round(r.total).toLocaleString()} Clover sales in this period. &ldquo;Sold&rdquo; is how many times Clover rang it up. Stock is that number times the amount for each one sold. A drink with two items counts for both.
          </p>
          {r.rows.length > 8 ? (
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find an item" aria-label="Find an item" />
          ) : null}
          {rows.length ? (
            <ItemsureCloverSalesList rows={rows} onFix={can('items.manage') ? setFixing : null} />
          ) : (
            <p className="isu-muted">{r.rows.length ? 'Nothing matches.' : 'No sales of matched items in this period.'}</p>
          )}
        </Card>
      ) : null}

      {r?.unmatched?.length ? (
        <Card title="Sold, but not linked to an item">
          <p className="isu-muted isu-small">
            These Clover items sold but aren&apos;t linked to anything you stock, so they don&apos;t count above. For generic buttons (like a $10 pitcher), mark them as Not tracked in Point of sale settings.
          </p>
          <ul className="isu-sales-unmatched">
            {r.unmatched.slice(0, UNMATCHED_SHOWN).map((u) => (
              <li key={u.externalId}><span>{u.name}</span><strong>{shortQty(u.sold)}</strong></li>
            ))}
          </ul>
          {r.unmatched.length > UNMATCHED_SHOWN ? <p className="isu-muted isu-small">And {r.unmatched.length - UNMATCHED_SHOWN} more.</p> : null}
          {can('items.manage') ? <Link to={`${POS_SETTINGS}?tab=buttons`} className="isu-link isu-small">Link them in Point of sale settings {'\u203A'}</Link> : null}
        </Card>
      ) : null}

      <Modal open={Boolean(fixing)} title={fixing ? `Fix ${fixing.name}` : ''} onClose={() => setFixing(null)} wide>
        {fixing ? (
          <ItemsurePosFixItem organizationId={organization.id} itemId={fixing.itemId} onChanged={s.refreshSetup} onClose={() => setFixing(null)} />
        ) : null}
      </Modal>
    </div>
  );
}
