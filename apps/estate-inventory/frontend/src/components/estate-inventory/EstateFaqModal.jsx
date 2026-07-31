import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ESTATE_FAQ } from '@shared/utils/estateFaq.js';

/**
 * Estate Vault FAQ — roles, security, money, reports.
 */
const EstateFaqModal = ({ open, onClose }) => {
  const [openIds, setOpenIds] = useState(() => new Set());

  useEffect(() => {
    if (open) {
      // Open first category by default for orientation.
      setOpenIds(new Set([ESTATE_FAQ.categories[0]?.id].filter(Boolean)));
    }
  }, [open]);

  if (!open) return null;

  const content = ESTATE_FAQ;

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const body = (
    <div className="ei-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ei-modal ei-modal-settings ei-faq-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ei-faq-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="ei-modal-head">
          <div>
            <p className="ei-faq-eyebrow">{content.eyebrow}</p>
            <h3 id="ei-faq-title">{content.title}</h3>
          </div>
          <button type="button" className="ei-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ei-modal-body ei-faq-body">
          <p className="ei-faq-lead">{content.intro}</p>

          {content.categories.map((category) => {
            const expanded = openIds.has(category.id);
            return (
              <section key={category.id} className="ei-faq-category">
                <button
                  type="button"
                  className={`ei-faq-category-toggle${expanded ? ' is-open' : ''}`}
                  aria-expanded={expanded}
                  onClick={() => toggle(category.id)}
                >
                  <span>{category.title}</span>
                  <span className="ei-faq-chevron" aria-hidden="true">
                    {expanded ? '−' : '+'}
                  </span>
                </button>
                {expanded ? (
                  <div className="ei-faq-items">
                    {category.items.map((item) => (
                      <article key={item.q} className="ei-faq-item">
                        <h4>{item.q}</h4>
                        <p>{item.a}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        <div className="ei-modal-foot ei-btn-row">
          <button type="button" className="ei-btn" onClick={onClose}>
            {content.closeLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(<div className="estate-inventory ei-modal-portal">{body}</div>, document.body);
  }
  return body;
};

export default EstateFaqModal;
