import React, { useEffect, useRef, useState } from 'react';
import { money } from '../../utils/duezyMath.js';
import { asksWhoPaid } from '../../utils/duezyPayers.js';

const icon = (method) => (asksWhoPaid(method) ? '🧾' : '💵');
const HOLD_MS = 450;

/**
 * One-tap pay with the team's usual method (learned from recent weeks). Press and hold (or right-click)
 * for the other methods. usual = usualPay(); owed = what's left this week. A partial week shows "+$22".
 */
export default function DuezyQuickPay({ usual, owed, partial, picking, methods = [], onPay, onPayWith, big = false }) {
  const { method, paid_by: payer, learned } = usual;
  const [menu, setMenu] = useState(false);
  const timer = useRef(null);
  const held = useRef(false);
  const wrap = useRef(null);

  useEffect(() => {
    if (!menu) return undefined;
    const away = (e) => { if (!wrap.current?.contains(e.target)) setMenu(false); };
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setMenu(false); } };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc, true);
    };
  }, [menu]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const canMenu = Boolean(onPayWith) && methods.length > 1;
  const startHold = () => {
    held.current = false;
    if (!canMenu) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      held.current = true;
      setMenu(true);
      navigator.vibrate?.(10);
    }, HOLD_MS);
  };
  const endHold = () => clearTimeout(timer.current);

  const title = [
    learned ? `${method} is how this team usually pays` : `${method} is the league's default method`,
    payer ? `— records ${money(owed)} from ${payer}` : asksWhoPaid(method) ? '— asks who paid' : `— records ${money(owed)}`,
    canMenu ? '· hold for other methods' : '',
  ].join(' ');

  return (
    <span className="dz-quick-wrap" ref={wrap}>
      <button
        type="button"
        className={`dz-chip dz-quick-pay${picking ? ' is-picking' : ''}${big ? ' dz-quick-pay--big' : ''}`}
        onClick={() => {
          if (held.current) { held.current = false; return; }
          onPay();
        }}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
        onContextMenu={(e) => {
          if (!canMenu) return;
          e.preventDefault();
          endHold();
          setMenu(true);
        }}
        title={title}
        aria-label={`${partial ? `Add ${money(owed)}` : `Paid ${money(owed)}`} by ${method}${payer ? ` from ${payer}` : ''}`}
        aria-haspopup={canMenu ? 'menu' : undefined}
        aria-expanded={canMenu ? menu : undefined}
      >
        <span aria-hidden="true">{icon(method)}</span>
        {partial ? `+${money(owed)} ` : ''}
        {method}
        {payer ? <small className="dz-quick-payer">· {payer}</small> : null}
      </button>
      {menu ? (
        <div className="dz-quick-menu" role="menu" aria-label={`Paid ${money(owed)} by`}>
          <p>{partial ? `Add ${money(owed)}` : `Paid ${money(owed)}`} by…</p>
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              role="menuitem"
              className={m === method ? 'is-usual' : ''}
              onClick={() => { setMenu(false); onPayWith(m); }}
            >
              <span aria-hidden="true">{icon(m)}</span> {m}
              {m === method ? <small>{learned ? 'usual' : 'default'}</small> : null}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}
