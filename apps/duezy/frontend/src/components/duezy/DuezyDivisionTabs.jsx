import React, { useEffect, useRef, useState } from 'react';
import { dayBehind, divisionsByDay, nameWithoutDay } from '../../utils/duezyDivisionDays.js';

export const ALL_DIVISIONS = 'all';

const Count = ({ n }) => (n ? <span className="dz-div-tab-count" title={`${n} behind`}>{n}</span> : null);

/**
 * "All divisions · Tuesdays · Thursdays" pills — one per night, so 10+ divisions still fit.
 * Pills always show the night. A night with one division opens it; a night with several opens a menu of them.
 * Counts = teams that still owe.
 */
export default function DuezyDivisionTabs({ divisions, active, onChange, behindCounts = {} }) {
  const [open, setOpen] = useState(null);
  const [menuLeft, setMenuLeft] = useState(0);
  const wrapRef = useRef(null);
  const groups = divisionsByDay(divisions);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(null); };
    const escape = (e) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const pick = (id) => {
    setOpen(null);
    onChange(id);
  };

  const toggle = (group, e) => {
    if (group.divisions.length === 1) { pick(group.divisions[0].id); return; }
    if (open === group.key) { setOpen(null); return; }
    const wrap = wrapRef.current.getBoundingClientRect();
    const pill = e.currentTarget.getBoundingClientRect();
    setMenuLeft(Math.max(0, Math.min(pill.left - wrap.left, wrap.width - 280)));
    setOpen(group.key);
  };

  const openGroup = groups.find((g) => g.key === open);

  return (
    <div className="dz-div-days" ref={wrapRef}>
      <nav className="dz-div-tabs" aria-label="Divisions" onScroll={() => setOpen(null)}>
        <button
          type="button"
          className={`dz-div-tab${active === ALL_DIVISIONS ? ' is-active' : ''}`}
          aria-pressed={active === ALL_DIVISIONS}
          onClick={() => pick(ALL_DIVISIONS)}
        >
          All divisions
        </button>
        {groups.map((g) => {
          const current = g.divisions.find((d) => d.id === active);
          const several = g.divisions.length > 1;
          const label = current ? `${g.short} · ${nameWithoutDay(current.name, g.key)}` : g.label;
          return (
            <button
              key={g.key}
              type="button"
              className={`dz-div-tab${current ? ' is-active' : ''}`}
              aria-pressed={Boolean(current)}
              aria-expanded={several ? open === g.key : undefined}
              aria-haspopup={several ? 'true' : undefined}
              onClick={(e) => toggle(g, e)}
              title={several ? undefined : g.divisions[0].name}
            >
              {label}
              {several && !current ? <span className="dz-div-tab-sub">· {g.divisions.length}</span> : null}
              <Count n={dayBehind(g, behindCounts)} />
              {several ? <span className="dz-div-tab-caret" aria-hidden="true">▾</span> : null}
            </button>
          );
        })}
      </nav>

      {openGroup ? (
        <div className="dz-div-menu" style={{ left: menuLeft }} role="group" aria-label={`${openGroup.label} divisions`}>
          <div className="dz-div-menu-head">{openGroup.label} · {openGroup.divisions.length} divisions</div>
          {openGroup.divisions.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`dz-div-menu-item${active === d.id ? ' is-active' : ''}`}
              aria-pressed={active === d.id}
              onClick={() => pick(d.id)}
            >
              <span>{d.name}</span>
              <Count n={behindCounts[d.id] || 0} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
