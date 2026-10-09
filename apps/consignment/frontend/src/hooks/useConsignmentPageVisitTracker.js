import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  consignmentVisitIsPublic,
  consignmentVisitPageLabel,
  consignmentVisitPath,
} from '../utils/consignmentVisitPages.js';
import { recordConsignmentPageVisit } from '../services/consignmentPageVisits.js';

const DEDUPE_MS = 20000;

/** Records one view per public consignment page; repeat loads of the same page within 20s count once. */
export default function useConsignmentPageVisitTracker() {
  const location = useLocation();
  const last = useRef({ key: '', at: 0 });

  useEffect(() => {
    const path = consignmentVisitPath(location.pathname, location.search);
    if (!consignmentVisitIsPublic(path)) return;
    const now = Date.now();
    if (last.current.key === path && now - last.current.at < DEDUPE_MS) return;
    last.current = { key: path, at: now };
    recordConsignmentPageVisit({ path, pageLabel: consignmentVisitPageLabel(path) }).catch(() => {});
  }, [location.pathname, location.search]);
}
