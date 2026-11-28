import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  playPoolSessionPath,
  playPoolVisitIsPublic,
  playPoolVisitPageLabel,
  playPoolVisitPath
} from './playPoolVisitPages';
import { recordPlayPoolPageVisit } from './playPoolPageVisits';

const DEDUPE_MS = 20000;

/**
 * Records one view per public Play Pool route.
 * - string view → `/play-pool?view=…` (or simple-pool)
 * - false → do not record (nested game under Play Pool shell)
 * - omitted/null → use current router path
 */
export default function usePlayPoolPageVisitTracker(view) {
  const location = useLocation();
  const last = useRef({ key: '', at: 0 });

  useEffect(() => {
    if (view === false) return;
    const path = typeof view === 'string' && view
      ? playPoolSessionPath(view)
      : playPoolVisitPath(location.pathname, location.search);
    if (!playPoolVisitIsPublic(path)) return;
    const now = Date.now();
    if (last.current.key === path && now - last.current.at < DEDUPE_MS) return;
    last.current = { key: path, at: now };
    recordPlayPoolPageVisit({ path, pageLabel: playPoolVisitPageLabel(path) }).catch(() => {});
  }, [location.pathname, location.search, view]);
}
