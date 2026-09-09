import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usaplVisitIsPublic, usaplVisitPageLabel, usaplVisitPath } from '../data/usaplVisitPages.js';
import { recordUsaplPageVisit } from '../services/usaplPageVisits.js';

const DEDUPE_MS = 20000;

export default function useUsaplPageVisitTracker() {
  const location = useLocation();
  const last = useRef({ key: '', at: 0 });

  useEffect(() => {
    const path = usaplVisitPath(location.pathname, location.search);
    if (!usaplVisitIsPublic(path)) return undefined;

    const key = path;
    const now = Date.now();
    if (last.current.key === key && now - last.current.at < DEDUPE_MS) return undefined;
    last.current = { key, at: now };

    recordUsaplPageVisit({
      path,
      pageLabel: usaplVisitPageLabel(path),
    }).catch(() => {});

    return undefined;
  }, [location.pathname, location.search]);
}
