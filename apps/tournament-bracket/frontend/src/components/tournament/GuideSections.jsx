import React, { useCallback, useRef, useState } from 'react';
import GuideTopicModal from './GuideTopicModal.jsx';
import GuideDetailModal from './GuideDetailModal.jsx';
import GuideJourney from './GuideJourney.jsx';
import GuideRulesModal from './GuideRulesModal.jsx';
import './GuideSections.css';

/**
 * Player guide body: "your night" steps and quick-answer questions open their own detail modal; the tour
 * button steps through the sections one at a time; the full-rules button opens every rule in one scrollable modal.
 * sections: [{ title, icon?, body: string[] }]            the tour
 * rules:    [{ title, icon?, body: string[] }]            detailed rules (defaults to the tour sections)
 * details:  { [id]: { icon, title, summary, lead, points?, example?, ladder?, topic? } }
 * journey:  [{ detail, label, money? (1-5) }]
 * faq:      [{ q, detail }]
 */
const DEFAULT_TOUR = { icon: '\u{1F680}', title: 'New here?', text: 'Take the 1-minute tour' };

export default function GuideSections({
  sections, details = {}, journey = [], faq = [], lineClass = () => '', renderLine,
  tour: tourButton = DEFAULT_TOUR, rulesHeading = 'Full rules', rules,
}) {
  const [tour, setTour] = useState(-1);
  const [open, setOpen] = useState(null);
  const [rulesAt, setRulesAt] = useState(null);
  const allRules = rules?.length ? rules : sections;
  const opener = useRef(null);

  const remember = () => { opener.current = document.activeElement; };
  const restore = useCallback(() => {
    const el = opener.current;
    requestAnimationFrame(() => el?.focus?.());
  }, []);

  const openTour = useCallback((title) => {
    setOpen(null);
    setTour(Math.max(0, sections.findIndex((s) => s.title === title)));
  }, [sections]);
  const openDetail = (id, title) => {
    remember();
    setOpen({ id, title });
  };

  const openRules = useCallback((title = '') => {
    setOpen(null);
    setRulesAt(title);
  }, []);
  const openTopic = useCallback((title) => {
    if (allRules.some((s) => s.title === title)) openRules(title);
    else openTour(title);
  }, [allRules, openRules, openTour]);

  const closeTour = useCallback(() => { setTour(-1); restore(); }, [restore]);
  const closeRules = useCallback(() => { setRulesAt(null); restore(); }, [restore]);
  const closeDetail = useCallback(() => { setOpen(null); restore(); }, [restore]);
  const prev = useCallback(() => setTour((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setTour((i) => Math.min(sections.length - 1, i + 1)), [sections.length]);

  const steps = journey.filter((j) => details[j.detail]).map((j) => ({
    ...j, icon: details[j.detail].icon, summary: details[j.detail].summary,
  }));

  return (
    <div className="tb-guide-layout">
      <section className="tb-guide-main" aria-labelledby="tb-guide-night-title">
        <h2 id="tb-guide-night-title" className="tb-guide-heading">Your night, step by step</h2>
        <GuideJourney steps={steps} onOpen={(step) => openDetail(step.detail)} />
      </section>

      <aside className="tb-guide-side">
        <button type="button" className="tb-guide-tour" onClick={() => { remember(); openTour(sections[0]?.title); }}>
          <span className="tb-guide-tour-icon" aria-hidden="true">{tourButton.icon}</span>
          <span>
            <strong>{tourButton.title}</strong>
            <span>{tourButton.text}</span>
          </span>
        </button>

        {faq.length ? (
          <section className="tb-guide-faq" aria-labelledby="tb-guide-faq-title">
            <h2 id="tb-guide-faq-title" className="tb-guide-heading">Quick answers</h2>
            <ul>
              {faq.filter((f) => details[f.detail]).map((item) => (
                <li key={item.q}>
                  <button type="button" onClick={() => openDetail(item.detail, item.q)}>
                    <span>{item.q}</span>
                    <span aria-hidden="true">{'\u203A'}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="tb-guide-all" aria-labelledby="tb-guide-all-title">
          <h2 id="tb-guide-all-title" className="tb-guide-heading">{rulesHeading}</h2>
          <button type="button" className="tb-guide-rules-open" onClick={() => { remember(); openRules(); }}>
            <span className="tb-guide-rules-open-icon" aria-hidden="true">{'\u{1F4D6}'}</span>
            <span>
              <strong>Read the {rulesHeading.toLowerCase()}</strong>
              <span>Every rule in detail, all in one place</span>
            </span>
          </button>
        </section>
      </aside>

      {open && details[open.id] ? (
        <GuideDetailModal detail={details[open.id]} title={open.title} onClose={closeDetail} onReadTopic={openTopic} />
      ) : null}

      {rulesAt !== null ? (
        <GuideRulesModal
          rules={allRules}
          title={rulesHeading}
          startAt={rulesAt}
          onClose={closeRules}
          lineClass={lineClass}
          renderLine={renderLine}
        />
      ) : null}

      {tour >= 0 && sections[tour] ? (
        <GuideTopicModal
          section={sections[tour]}
          index={tour}
          count={sections.length}
          onPrev={prev}
          onNext={next}
          onClose={closeTour}
          lineClass={lineClass}
          renderLine={renderLine}
        />
      ) : null}
    </div>
  );
}
