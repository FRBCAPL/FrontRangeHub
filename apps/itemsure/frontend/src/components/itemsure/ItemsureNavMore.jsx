import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Tip from './ItemsureTip.jsx';

const DESKTOP = '(min-width: 820px)';
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia?.(DESKTOP).matches;

const flatLinks = (sections) => (sections || []).flatMap((s) => s.links || []);
const linkMatches = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);
const sectionHasPath = (section, pathname) => (section.links || []).some((l) => linkMatches(pathname, l.to));

/**
 * The "More" menu: categories expand to show their links.
 * On phones it opens a panel above the bottom bar; on desktop it expands in the sidebar.
 */
export default function ItemsureNavMore({ sections = [], linkClass }) {
  const { pathname } = useLocation();
  const panelId = useId();
  const rootRef = useRef(null);
  const links = useMemo(() => flatLinks(sections), [sections]);
  const current = links.some((l) => linkMatches(pathname, l.to));
  const activeSectionId = useMemo(
    () => sections.find((s) => sectionHasPath(s, pathname))?.id || null,
    [sections, pathname],
  );
  const [open, setOpen] = useState(() => current && isDesktop());
  const [openSections, setOpenSections] = useState(() => new Set(activeSectionId ? [activeSectionId] : []));

  useEffect(() => {
    setOpen(current && isDesktop());
  }, [pathname, current]);

  useEffect(() => {
    if (!activeSectionId) return;
    setOpenSections((prev) => {
      if (prev.has(activeSectionId)) return prev;
      const next = new Set(prev);
      next.add(activeSectionId);
      return next;
    });
  }, [activeSectionId]);

  useEffect(() => {
    if (!open || isDesktop()) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggleSection = (id) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!links.length) return null;

  return (
    <div className={`isu-nav-more${open ? ' is-open' : ''}`} ref={rootRef}>
      <Tip label="Stock tools, places, Clover, settings, and help" side="right">
        <button
          type="button"
          className={`isu-nav-link isu-nav-more-btn${current ? ' is-active' : ''}`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true" className="isu-nav-icon">{'\u22EF'}</span>
          <span>More</span>
          <span aria-hidden="true" className="isu-nav-more-caret">{open ? '\u25B4' : '\u25BE'}</span>
        </button>
      </Tip>
      {open ? (
        <div id={panelId} className="isu-nav-more-panel">
          {sections.map((section) => {
            const sectionOpen = openSections.has(section.id);
            const sectionActive = sectionHasPath(section, pathname);
            const bodyId = `${panelId}-${section.id}`;
            return (
              <div
                key={section.id}
                className={`isu-nav-more-section${sectionOpen ? ' is-open' : ''}${sectionActive ? ' is-current' : ''}`}
              >
                <button
                  type="button"
                  className="isu-nav-more-heading"
                  aria-expanded={sectionOpen}
                  aria-controls={bodyId}
                  onClick={() => toggleSection(section.id)}
                >
                  <span>{section.label}</span>
                  <span aria-hidden="true" className="isu-nav-more-section-caret">{sectionOpen ? '\u25B4' : '\u25BE'}</span>
                </button>
                {sectionOpen ? (
                  <div id={bodyId} className="isu-nav-more-section-body">
                    {section.links.map((link) => {
                      const row = (
                        <NavLink to={link.to} className={linkClass} onClick={() => { if (!isDesktop()) setOpen(false); }}>
                          <span aria-hidden="true" className="isu-nav-icon">{link.icon}</span>
                          <span>{link.label}</span>
                        </NavLink>
                      );
                      return link.tip ? (
                        <Tip key={link.to} label={link.tip} side="right">{row}</Tip>
                      ) : (
                        <React.Fragment key={link.to}>{row}</React.Fragment>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
