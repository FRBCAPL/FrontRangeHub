import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ITEMSURE_PATH } from '../../data/itemsureConstants.js';
import usePosSetup from '../../hooks/usePosSetup.js';
import useTodayClover from '../../hooks/useTodayClover.js';
import { listModifiers } from '../../services/itemsurePosModifierService.js';
import { Card } from './ItemsureUi.jsx';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function Line({ title, detail, button, primary = true, onGo }) {
  return (
    <li className="isu-today-task is-info">
      <div className="isu-today-text">
        <strong>{title}</strong>
        {detail ? <p className="isu-muted isu-small">{detail}</p> : null}
      </div>
      {onGo ? <button type="button" className={`isu-btn isu-btn--${primary ? 'primary' : 'ghost'} isu-btn--sm`} onClick={onGo}>{button}</button> : null}
    </li>
  );
}

/** Add-ons used in sales that nobody has said anything about yet, or null while loading / unavailable. */
function useUnsetAddons(organizationId, enabled) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    listModifiers(organizationId)
      .then((list) => { if (alive) setCount(list.missing ? null : list.rows.filter((r) => !r.action).length); })
      .catch(() => { if (alive) setCount(null); });
    return () => { alive = false; };
  }, [organizationId, enabled]);
  return count;
}

/**
 * "What's left" on Settings → Point of sale: one line per thing still to do, each jumping to its
 * tab with onGo(tab). Read-only.
 */
export default function ItemsurePosLeft({ organizationId, can, salesReady, onGo }) {
  const canEdit = can('items.manage');
  const { summary } = usePosSetup(organizationId, 0);
  const status = useTodayClover(organizationId, { manage: can('pos.manage'), take: salesReady && can('inventory.adjust') });
  const unsetAddons = useUnsetAddons(organizationId, salesReady && canEdit);
  if (!summary) return <p className="isu-muted">Checking what&apos;s left…</p>;

  const toCheck = summary.ready ? summary.amounts.length : 0;
  const sizes = summary.ready ? summary.sizes.length : 0;
  const guessed = summary.ready ? summary.amounts.filter((a) => a.suggestion).length : 0;
  const lines = [];
  if (status?.problem) {
    lines.push(<Line key="conn" title="Clover needs attention" detail={status.problem} button="Fix" onGo={() => onGo('connection')} />);
  }
  if (summary.unmatched) {
    lines.push(
      <Line key="buttons" title={`${plural(summary.unmatched, 'Clover button isn’t', 'Clover buttons aren’t')} linked yet`}
        detail="Start with your best sellers. Stop tracking things you don't stock, like ball rentals."
        button="Link buttons" onGo={canEdit ? () => onGo('buttons') : null} />,
    );
  }
  if (toCheck || sizes) {
    const parts = [toCheck ? plural(toCheck, 'pour size', 'pour sizes') : '', sizes ? plural(sizes, 'bottle or case size', 'bottle or case sizes') : ''].filter(Boolean).join(' and ');
    lines.push(
      <Line key="pours" title={`${parts} to check`}
        detail={guessed ? `ItemSure already guessed ${guessed}. Setting a whole category (like Liquor) fills in most of them.` : 'Setting a whole category (like Liquor: 1.5 oz from 750 ml bottles) fills in most of them.'}
        button="Set pour sizes" onGo={canEdit ? () => onGo('pours') : null} />,
    );
  }
  if (unsetAddons) {
    lines.push(
      <Line key="addons" title={`${plural(unsetAddons, 'add-on isn’t', 'add-ons aren’t')} set`}
        detail="Extras staff tap in Clover, like Double, Add Red Bull or Ranch."
        button="Set add-ons" onGo={() => onGo('addons')} />,
    );
  }
  if (salesReady && status) {
    lines.push(
      <Line key="stock" title={`Take sales off stock: ${status.takeOn ? 'On' : 'Off'}`}
        detail={status.takeOn ? '' : 'Turn it on once the lines above are done.'}
        button="Open" primary={false} onGo={() => onGo('stock')} />,
    );
  }
  const done = !status?.problem && !summary.unmatched && !toCheck && !sizes && !unsetAddons;

  return (
    <Card title="What's left">
      {done ? <p className="isu-today-clear">Everything is set up.</p> : null}
      <ul className="isu-today-list">{lines}</ul>
      {done && can('inventory.activity') ? <Link to={`${ITEMSURE_PATH}/sales-vs-counts`} className="isu-link">See sales vs counts {'\u203A'}</Link> : null}
    </Card>
  );
}
