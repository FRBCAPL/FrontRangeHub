import tournamentService from '@shared/services/services/tournamentService';
import { listLiveCashClimbEventsResult } from '@apps/tournament-bracket/frontend/src/components/tournament/cash-climb/cashClimbCloud.js';
import { cashClimbSubmitHash } from '@apps/tournament-bracket/frontend/src/components/tournament/cash-climb/cashClimbSubmit.js';
import { listLiveElimEvents } from '@apps/tournament-bracket/frontend/src/components/tournament/elimCloud.js';
import { elimFormatLabel } from '@apps/tournament-bracket/frontend/src/components/tournament/elimStatus.js';
import { elimSubmitHash } from '@apps/tournament-bracket/frontend/src/components/tournament/elimSubmit.js';

const LADDER_LABELS = {
  '499-under': '499 & Under',
  '500-549': '500-549',
  '550-plus': '550+',
  simulation: 'Simulation',
};

function formatDate(value) {
  if (!value) return '';
  const raw = String(value);
  const when = raw.length <= 10 ? new Date(`${raw}T12:00:00`) : new Date(raw);
  if (Number.isNaN(when.getTime())) return '';
  return when.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function playerCount(event) {
  return event?.tournament?.players?.length || event?.tournament?.stats?.length || 0;
}

function detailLine(parts) {
  return parts.filter(Boolean).join(' · ');
}

export async function loadHomepageTournamentBanner() {
  const [ladderResult, cashResult, elimEvents] = await Promise.all([
    tournamentService.getAllUpcomingTournaments(8),
    listLiveCashClimbEventsResult(),
    listLiveElimEvents(),
  ]);

  const live = [];
  (cashResult.events || []).forEach((event) => {
    const players = playerCount(event);
    live.push({
      id: `cc-${event.id}`,
      path: cashClimbSubmitHash(event.id),
      label: event.name || 'Cash Climb',
      detail: detailLine(['Live Cash Climb', formatDate(event.tournamentDate), players ? `${players} players` : '']),
      live: true,
      cta: 'Submit a result',
    });
  });
  (elimEvents || []).forEach((event) => {
    live.push({
      id: `elim-${event.id}`,
      path: elimSubmitHash(event.id),
      label: event.name || 'Elimination',
      detail: detailLine(['Live', elimFormatLabel(event.type) || 'Bracket', formatDate(event.tournamentDate)]),
      live: true,
      cta: 'Submit a result',
    });
  });

  const upcoming = (ladderResult.success && ladderResult.data ? ladderResult.data : []).map((t) => {
    const daysUntil = Math.ceil((new Date(t.tournament_date) - new Date()) / (1000 * 60 * 60 * 24));
    const regCount = t.registrations?.length ?? t.total_players ?? 0;
    const entryFee = Number(t.entry_fee) || 20;
    return {
      id: `ladder-${t.id}`,
      path: '/ladder',
      label: LADDER_LABELS[t.ladder_name] || t.ladder_name,
      detail: detailLine([formatDate(t.tournament_date), `$${entryFee}`, regCount > 0 ? `${regCount} reg` : '']),
      live: false,
      urgent: daysUntil <= 7,
      cta: 'Register at The Hub',
    };
  });

  const items = [...live, ...upcoming];
  const hasLive = live.length > 0;
  const hasUpcoming = upcoming.length > 0;

  let title = 'Upcoming Tournaments';
  if (hasLive && hasUpcoming) title = 'Live & Upcoming Tournaments';
  else if (hasLive) title = 'Live Tournaments';

  let footer = 'Tap for the list →';
  if (hasLive && hasUpcoming) footer = 'Tap to pick a live event or register →';
  else if (hasLive) footer = 'Tap to pick a tournament →';

  return {
    items,
    hasLive,
    hasUrgent: items.some((item) => item.urgent),
    title,
    footer,
  };
}
