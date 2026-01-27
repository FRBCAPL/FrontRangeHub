// Reusable League Components
// Designed to be league-agnostic and easily customizable for any pool league

export { default as LeagueCard } from './LeagueCard';
export { default as PlayerCard } from './PlayerCard';
export { default as MatchCard } from './MatchCard';

// Component documentation and usage examples
export const LEAGUE_COMPONENTS = {
  LeagueCard: {
    description: 'Displays league information with stats, progress, and actions',
    props: {
      league: 'League object with name, description, playerCount, etc.',
      onSelect: 'Callback when league is selected',
      isSelected: 'Whether this league is currently selected',
      showStats: 'Whether to show league statistics',
      showActions: 'Whether to show action buttons',
      customActions: 'Custom action buttons to override defaults'
    }
  },
  PlayerCard: {
    description: 'Displays player information with stats, ranking, and status',
    props: {
      player: 'Player object with name, stats, ranking, etc.',
      onSelect: 'Callback when player is selected',
      isSelected: 'Whether this player is currently selected',
      showStats: 'Whether to show player statistics',
      showActions: 'Whether to show action buttons',
      showRanking: 'Whether to show player ranking',
      showAvailability: 'Whether to show availability information'
    }
  },
  MatchCard: {
    description: 'Displays match information with players, scores, and status',
    props: {
      match: 'Match object with players, scores, status, etc.',
      onSelect: 'Callback when match is selected',
      isSelected: 'Whether this match is currently selected',
      showActions: 'Whether to show action buttons',
      showDetails: 'Whether to show additional match details',
      showScores: 'Whether to show match scores'
    }
  }
};

// Example usage:
/*
import { LeagueCard, PlayerCard, MatchCard } from './components/league';

// League Card Example
const leagueData = {
  name: "Spring 2024 League",
  description: "Competitive 8-ball league",
  playerCount: 24,
  currentPhase: "Phase 2",
  totalMatches: 120,
  completedMatches: 85,
  status: "active",
  primaryColor: "#e53e3e"
};

<LeagueCard 
  league={leagueData}
  onSelect={(league) => console.log('Selected:', league.name)}
  showStats={true}
/>

// Player Card Example
const playerData = {
  name: "John Smith",
  email: "john@example.com",
  rank: 3,
  wins: 15,
  losses: 5,
  winPercentage: 75,
  currentStreak: 3,
  status: "active",
  isOnline: true
};

<PlayerCard 
  player={playerData}
  onSelect={(player) => console.log('Selected:', player.name)}
  showStats={true}
  showRanking={true}
/>

// Match Card Example
const matchData = {
  id: "match_123",
  player1: "John Smith",
  player2: "Jane Doe",
  player1Score: 7,
  player2Score: 5,
  status: "completed",
  date: "2024-03-15",
  time: "7:00 PM",
  location: "Main Street Pool Hall",
  winner: "John Smith"
};

<MatchCard 
  match={matchData}
  onSelect={(match) => console.log('Selected:', match.id)}
  showScores={true}
  showDetails={true}
/>
*/
