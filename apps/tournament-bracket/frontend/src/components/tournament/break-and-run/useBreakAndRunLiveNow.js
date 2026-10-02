import { useEffect, useMemo, useState } from 'react';
import { hasOpenBreakAndRunSession } from './breakAndRunSessions.js';
import { isBreakAndRunLiveNow } from './breakAndRunLiveStatus.js';
import { watchBreakAndRunOperators } from './breakAndRunPresence.js';

const TICK_MS = 30000;

/** Re-renders every 30s so scheduled windows open and close without a data change. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Set of pot ids whose operator screen is open right now. */
export function useBreakAndRunOperatorPresence(eventIds = []) {
  const key = [...new Set(eventIds.map(String).filter(Boolean))].sort().join('|');
  const [present, setPresent] = useState(() => new Set());
  useEffect(() => {
    setPresent(new Set());
    if (!key) return undefined;
    return watchBreakAndRunOperators(key.split('|'), setPresent);
  }, [key]);
  return present;
}

/** Live status for many pots at once (homepage list): returns (tournament) => boolean. */
export function useBreakAndRunLiveCheck(tournaments = []) {
  const now = useNow();
  const ids = useMemo(
    () => tournaments.filter((t) => hasOpenBreakAndRunSession(t)).map((t) => String(t.id)),
    [tournaments],
  );
  const present = useBreakAndRunOperatorPresence(ids);
  return (tournament) => isBreakAndRunLiveNow(tournament, {
    now,
    operatorPresent: present.has(String(tournament?.id || '')),
  });
}

/** Live status for one pot (TV, phone, rules TV, how-it-works page). */
export default function useBreakAndRunLiveNow(tournament) {
  const list = useMemo(() => (tournament ? [tournament] : []), [tournament]);
  const check = useBreakAndRunLiveCheck(list);
  return tournament ? check(tournament) : false;
}
