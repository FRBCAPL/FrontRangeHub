import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GUIDE_BASICS } from '../../data/itemsureGuideBasics.js';
import { GUIDE_STOCK } from '../../data/itemsureGuideStock.js';
import { PageHead } from './ItemsureUi.jsx';
import ItemsureHelpSection from './ItemsureHelpSection.jsx';

const SECTIONS = [...GUIDE_BASICS, ...GUIDE_STOCK];

/** The ItemSure user guide. `?topic=<id>` opens and scrolls to one topic. */
export default function ItemsureHelp() {
  const [params] = useSearchParams();
  const topic = params.get('topic');
  const [openIds, setOpenIds] = useState(() => new Set(topic ? [topic] : ['getting-started']));

  useEffect(() => {
    if (!topic) return;
    setOpenIds((prev) => new Set(prev).add(topic));
    document.getElementById(`isu-help-${topic}`)?.scrollIntoView({ block: 'start' });
  }, [topic]);

  const toggle = (id, open) =>
    setOpenIds((prev) => {
      if (prev.has(id) === open) return prev;
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });

  const jumpTo = (id) => {
    toggle(id, true);
    requestAnimationFrame(() => document.getElementById(`isu-help-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const allOpen = openIds.size === SECTIONS.length;

  return (
    <div className="isu-page">
      <PageHead
        title="Help"
        description="How ItemSure works, in plain words. Tap a topic to open it."
        action={
          <button type="button" className="isu-btn isu-btn--ghost isu-btn--sm" onClick={() => setOpenIds(new Set(allOpen ? [] : SECTIONS.map((s) => s.id)))}>
            {allOpen ? 'Close all' : 'Open all'}
          </button>
        }
      />
      <nav className="isu-help-topics" aria-label="Help topics">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" className="isu-chip" onClick={() => jumpTo(s.id)}>{s.title}</button>
        ))}
      </nav>
      <div className="isu-help-list">
        {SECTIONS.map((s) => <ItemsureHelpSection key={s.id} section={s} open={openIds.has(s.id)} onToggle={toggle} />)}
      </div>
    </div>
  );
}
