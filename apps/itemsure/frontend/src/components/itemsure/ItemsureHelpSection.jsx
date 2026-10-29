import React from 'react';

/** One guide topic as an expandable section. */
export default function ItemsureHelpSection({ section, open, onToggle }) {
  return (
    <details id={`isu-help-${section.id}`} className="isu-card isu-help-section" open={open} onToggle={(e) => onToggle(section.id, e.currentTarget.open)}>
      <summary>
        <span className="isu-help-title">{section.title}</span>
        <span className="isu-muted isu-small">{section.summary}</span>
      </summary>
      <div className="isu-help-body">
        {section.paragraphs?.map((p) => <p key={p}>{p}</p>)}
        {section.steps?.length ? (
          <>
            <h3 className="isu-help-subhead">How to</h3>
            <ol className="isu-help-steps">
              {section.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </>
        ) : null}
        {section.tips?.length ? (
          <>
            <h3 className="isu-help-subhead">Good to know</h3>
            <ul className="isu-help-tips">
              {section.tips.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </>
        ) : null}
        {section.questions?.length ? (
          <dl className="isu-help-faq">
            {section.questions.map(([q, a]) => (
              <div key={q}>
                <dt>{q}</dt>
                <dd>{a}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </details>
  );
}
