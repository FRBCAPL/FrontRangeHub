import React, { useEffect, useMemo, useState } from 'react';
import { breakAndRunListItem, loadBreakAndRunItems } from '@shared/components/tournament/homepageTournamentBannerData.js';
import HomepageTournamentListModal from '@shared/components/tournament/HomepageTournamentListModal.jsx';
import { useBreakAndRunLiveCheck } from '@apps/tournament-bracket/frontend/src/components/tournament/break-and-run/useBreakAndRunLiveNow.js';
import { BREAK_AND_RUN_GUIDE_HASH, formatDollars } from '@apps/tournament-bracket/frontend/src/components/tournament/break-and-run/breakAndRunGuide.js';
import breakAndRunLogo from '@apps/tournament-bracket/frontend/src/components/tournament/break-and-run/brand/break-and-run-logo.jpg';

const POLL_MS = 20000;
const BLURB = 'Run out 10-Ball off the break to win the pot.';

/** Homepage launcher tile for the 10-Ball Break & Run, plus its open-pots list modal. */
export default function useBreakAndRunTile(navigate) {
  const [pots, setPots] = useState([]);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (document.hidden) return;
      try {
        const next = await loadBreakAndRunItems();
        if (!cancelled) setPots(next);
      } catch (err) {
        console.error('Break & Run tile fetch error:', err);
      }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, []);

  const tournaments = useMemo(() => pots.map((p) => p.tournament), [pots]);
  const isLive = useBreakAndRunLiveCheck(tournaments);
  const items = pots
    .map((p) => breakAndRunListItem(p, isLive(p.tournament)))
    .sort((a, b) => Number(b.live) - Number(a.live));
  const liveCount = items.filter((i) => i.live).length;
  const topPot = Number(items[0]?.tournament?.currentPot);
  const highlight = items.length && Number.isFinite(topPot)
    ? `${liveCount ? 'Live · ' : ''}Pot ${formatDollars(topPot)}`
    : undefined;

  const openGuide = () => navigate(BREAK_AND_RUN_GUIDE_HASH);
  const openPots = () => (items.length === 1 ? navigate(items[0].path) : setListOpen(true));

  const tile = {
    id: 'break-and-run',
    icon: <img className="hal-logo hal-logo--photo" src={breakAndRunLogo} alt="" decoding="async" />,
    title: 'Break & Run',
    blurb: BLURB,
    highlight,
    accent: '#facc15',
    badge: liveCount ? 'Live' : undefined,
    onOpen: items.length ? openPots : openGuide,
    actions: [
      { label: 'How it works', onClick: openGuide },
      ...(items.length ? [{ label: liveCount ? 'Watch live' : 'View the pot', onClick: openPots }] : []),
    ],
  };

  const modal = listOpen ? (
    <HomepageTournamentListModal
      title={liveCount ? 'Live Break & Run' : 'Break & Run pot'}
      items={items}
      footerLink={{ href: `#${BREAK_AND_RUN_GUIDE_HASH}`, label: 'How the Break & Run works' }}
      onClose={() => setListOpen(false)}
      onPick={(item) => {
        setListOpen(false);
        if (item?.path) navigate(item.path);
      }}
    />
  ) : null;

  return { tile, modal };
}
