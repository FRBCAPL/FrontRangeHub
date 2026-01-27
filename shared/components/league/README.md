# 🎱 League Management Component Library

A professional, reusable component library designed for pool league management applications. These components are **league-agnostic** and can be easily customized for any pool league operator.

## 🚀 Features

- **League-Agnostic Design**: Works with any pool league structure
- **Professional UI**: Modern, responsive design with smooth animations
- **Highly Customizable**: Extensive props for customization
- **TypeScript Ready**: Full PropTypes validation
- **Mobile Responsive**: Optimized for all screen sizes
- **Accessibility**: Built with accessibility best practices

## 📦 Components

### LeagueCard
Displays comprehensive league information with statistics, progress tracking, and action buttons.

**Key Features:**
- League status indicators (Active, Completed, Pending)
- Progress bars with completion percentages
- Player count and match statistics
- Customizable color schemes
- Interactive hover effects

### PlayerCard
Shows detailed player information including stats, rankings, and availability.

**Key Features:**
- Player avatars with fallback initials
- Win/loss statistics with win percentage
- Current and best streaks
- Online status indicators
- Ranking display
- Availability information

### MatchCard
Presents match information with player details, scores, and status.

**Key Features:**
- Match status badges (Scheduled, In Progress, Completed, Cancelled)
- Player vs player layout with scores
- Winner highlighting
- Date, time, and location display
- Phase and division information
- Action buttons based on match status

## 🛠️ Installation

```bash
# Copy the league components to your project
cp -r src/components/league/ your-project/src/components/
```

## 📖 Usage

### Basic Import
```javascript
import { LeagueCard, PlayerCard, MatchCard } from './components/league';
```

### League Card Example
```javascript
const leagueData = {
  name: "Spring 2024 League",
  description: "Competitive 8-ball league with 24 players",
  playerCount: 24,
  currentPhase: "Phase 2",
  totalMatches: 120,
  completedMatches: 85,
  status: "active",
  primaryColor: "#e53e3e",
  secondaryColor: "#c53030"
};

<LeagueCard 
  league={leagueData}
  onSelect={(league) => handleLeagueSelect(league)}
  showStats={true}
  showActions={true}
/>
```

### Player Card Example
```javascript
const playerData = {
  name: "John Smith",
  email: "john@example.com",
  phone: "(555) 123-4567",
  rank: 3,
  wins: 15,
  losses: 5,
  winPercentage: 75,
  currentStreak: 3,
  bestStreak: 5,
  status: "active",
  isOnline: true,
  lastPlayed: "2024-03-15"
};

<PlayerCard 
  player={playerData}
  onSelect={(player) => handlePlayerSelect(player)}
  showStats={true}
  showRanking={true}
  showAvailability={true}
/>
```

### Match Card Example
```javascript
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
  division: "Division A",
  phase: "Phase 1",
  winner: "John Smith",
  notes: "Great match with excellent sportsmanship"
};

<MatchCard 
  match={matchData}
  onSelect={(match) => handleMatchSelect(match)}
  showScores={true}
  showDetails={true}
  showActions={true}
/>
```

## 🎨 Customization

### Color Schemes
All components support custom color schemes through `primaryColor` and `secondaryColor` props:

```javascript
<LeagueCard 
  league={leagueData}
  primaryColor="#3b82f6"  // Blue theme
  secondaryColor="#1d4ed8"
/>
```

### Custom Actions
Override default action buttons with custom components:

```javascript
const customActions = (
  <div style={{ display: 'flex', gap: '8px' }}>
    <button onClick={() => handleEdit()}>Edit</button>
    <button onClick={() => handleDelete()}>Delete</button>
  </div>
);

<LeagueCard 
  league={leagueData}
  customActions={customActions}
  showActions={true}
/>
```

### Styling
Apply custom styles through the `style` prop:

```javascript
<PlayerCard 
  player={playerData}
  style={{
    margin: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
  }}
/>
```

## 📱 Responsive Design

All components are fully responsive and automatically adapt to different screen sizes:

- **Desktop**: Full feature set with hover effects
- **Tablet**: Optimized layouts with touch-friendly interactions
- **Mobile**: Compact designs with essential information

## ♿ Accessibility

Components include:
- Proper ARIA labels
- Keyboard navigation support
- High contrast color schemes
- Screen reader friendly structure
- Focus management

## 🔧 Props Reference

### LeagueCard Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `league` | object | required | League data object |
| `onSelect` | function | null | Selection callback |
| `isSelected` | boolean | false | Selection state |
| `showStats` | boolean | true | Show statistics |
| `showActions` | boolean | true | Show action buttons |
| `customActions` | node | null | Custom action buttons |
| `className` | string | '' | Additional CSS classes |
| `style` | object | {} | Inline styles |

### PlayerCard Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `player` | object | required | Player data object |
| `onSelect` | function | null | Selection callback |
| `isSelected` | boolean | false | Selection state |
| `showStats` | boolean | true | Show statistics |
| `showActions` | boolean | true | Show action buttons |
| `showRanking` | boolean | true | Show ranking |
| `showAvailability` | boolean | false | Show availability |
| `customActions` | node | null | Custom action buttons |
| `className` | string | '' | Additional CSS classes |
| `style` | object | {} | Inline styles |

### MatchCard Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `match` | object | required | Match data object |
| `onSelect` | function | null | Selection callback |
| `isSelected` | boolean | false | Selection state |
| `showActions` | boolean | true | Show action buttons |
| `showDetails` | boolean | true | Show additional details |
| `showScores` | boolean | true | Show match scores |
| `customActions` | node | null | Custom action buttons |
| `className` | string | '' | Additional CSS classes |
| `style` | object | {} | Inline styles |

## 🎯 Best Practices

### Data Structure
Ensure your data objects follow the expected structure:

```javascript
// League object structure
const league = {
  name: "string",           // Required
  description: "string",    // Optional
  playerCount: number,      // Optional
  currentPhase: "string",   // Optional
  totalMatches: number,     // Optional
  completedMatches: number, // Optional
  status: "active" | "completed" | "pending" | "inactive",
  startDate: "string",      // Optional
  endDate: "string",        // Optional
  logo: "string",          // Optional
  primaryColor: "string",   // Optional
  secondaryColor: "string"  // Optional
};
```

### Performance
- Use React.memo for components that receive stable props
- Implement proper key props when rendering lists
- Consider virtualization for large datasets

### State Management
- Keep component state minimal
- Use callbacks for parent communication
- Implement proper error boundaries

## 🔄 Updates and Maintenance

This component library is designed for easy maintenance and updates:

- **Modular Structure**: Each component is self-contained
- **Consistent API**: Standardized prop patterns
- **Documentation**: Comprehensive examples and guides
- **Versioning**: Semantic versioning for updates

## 🤝 Contributing

When contributing to this component library:

1. Maintain the league-agnostic design
2. Follow the established prop patterns
3. Include comprehensive PropTypes
4. Add accessibility features
5. Test across different screen sizes
6. Update documentation

## 📄 License

This component library is designed for pool league management applications and can be freely used and modified for league operations.

---

**Built for Pool League Operators** 🎱

*Professional, scalable, and customizable components for modern pool league management.*
