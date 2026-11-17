import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import { loadStockHealth } from '../../services/itemsureTargetService.js';
import { onInventoryChanged } from '../../utils/itemsureChanges.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * Home: three tappable tiles (running low, needs topping up, stocked) counted per item and
 * place, plus a one-line shopping list peek. `today` is the Today data (recs and plans).
 */
export default function ItemsureStockHealth({ organizationId, hasLevels, today, showMoves, canSetLevels }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    if (!hasLevels) return undefined;
    let alive = true;
    const load = () => loadStockHealth(organizationId).then((h) => alive && setHealth(h)).catch(() => alive && setHealth(null));
    load();
    const off = onInventoryChanged(load);
    return () => {
      alive = false;
      off();
    };
  }, [organizationId, hasLevels]);

  if (hasLevels === null || hasLevels === undefined) return null;
  if (!hasLevels) {
    return (
      <section className="isu-card isu-health" aria-label="Stock health">
        <h2>Stock health</h2>
        <p className="isu-health-setup-lead"><strong>Not set up yet</strong></p>
        <p className="isu-muted isu-small">
          No warning levels means these tiles can&apos;t show Running low, Need topping up, or Stocked —
          and &ldquo;nothing to restock&rdquo; would be misleading. Set &ldquo;Warn me at&rdquo; and &ldquo;Fill up to&rdquo; on your items first.
        </p>
        {canSetLevels ? <Link to={`${ITEMSURE_PATH}/levels`} className="isu-btn isu-btn--ghost isu-btn--sm isu-health-setup">Set warning levels</Link> : null}
      </section>
    );
  }

  const tiles = [
    { key: 'low', tone: 'danger', label: 'Running low', value: health?.low, to: `${ITEMSURE_PATH}/low-stock` },
    { key: 'par', tone: 'warn', label: 'Need topping up', value: health?.belowPar, to: `${ITEMSURE_PATH}/low-stock?show=topoff` },
    { key: 'ok', tone: 'ok', label: 'Stocked', value: health?.stocked, to: `${ITEMSURE_PATH}/items?category=all` },
  ];
  const toBuy = (today?.recs || []).length;
  const planned = showMoves ? (today?.plans || []).length : 0;

  return (
    <section className="isu-card isu-health" aria-label="Stock health">
      <h2>Stock health</h2>
      <div className="isu-health-tiles">
        {tiles.map((t) => (
          <Link key={t.key} to={t.to} className={`isu-health-tile is-${t.tone}`}>
            <span className="isu-health-value">{t.value ?? '\u2014'}</span>
            <span className="isu-health-label">{t.label}</span>
          </Link>
        ))}
      </div>
      <p className="isu-muted isu-small isu-health-note">
        Counted per item in each place it is kept. Need topping up uses the Top off line (Usual), not every dip under Fill up to.
      </p>
      {today?.recs ? (
        <Link to={`${ITEMSURE_PATH}/restock`} className="isu-health-shopping">
          <span>
            <strong>Shopping list:</strong>{' '}
            {toBuy ? plural(toBuy, 'item to restock', 'items to restock') : 'nothing to restock (levels are set)'}
            {planned ? ` \u00b7 ${plural(planned, 'planned move', 'planned moves')}` : ''}
          </span>
          <span aria-hidden="true">{'\u203A'}</span>
        </Link>
      ) : null}
    </section>
  );
}
