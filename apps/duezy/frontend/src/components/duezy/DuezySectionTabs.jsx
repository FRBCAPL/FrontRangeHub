import React, { useRef } from 'react';

/** Segmented tabs: tabs = [{ id, label, count?, tone? }]. Arrow keys move between tabs. */
export default function DuezySectionTabs({ tabs, active, onChange, label }) {
  const refs = useRef({});

  const onKeyDown = (e) => {
    const i = tabs.findIndex((t) => t.id === active);
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  return (
    <div className="dz-seg" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={`dz-seg-tab${on ? ' is-active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            {t.label}
            {t.count ? <span className={`dz-seg-count${t.tone ? ` is-${t.tone}` : ''}`}>{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}