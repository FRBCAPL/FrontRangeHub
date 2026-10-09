import { useEffect, useState } from 'react';
import arcadeService from '@shared/services/arcadeService.js';

const NEW_SCORE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** "New Score" badge for the homepage Legends Arcade tile — shown for 7 days after the latest leaderboard post. */
export default function useArcadeNewScoreBadge() {
  const [badge, setBadge] = useState('');

  useEffect(() => {
    let cancelled = false;
    arcadeService.getLatestScoreAt().then((latestAt) => {
      if (cancelled || !latestAt) return;
      const postedMs = Date.parse(latestAt);
      if (Number.isFinite(postedMs) && Date.now() - postedMs < NEW_SCORE_WINDOW_MS) {
        setBadge('New Score Added');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return badge;
}
