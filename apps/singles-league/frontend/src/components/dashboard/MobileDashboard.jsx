import React, { useState, useEffect } from 'react';
import { 
  FaHome, 
  FaCalendarAlt, 
  FaUsers, 
  FaTrophy, 
  FaComments,
  FaPlus,
  FaUser,
  FaCog,
  FaBell,
  FaChartBar,
  FaClock,
  FaMapMarkerAlt
} from 'react-icons/fa';
import MobileBottomNavigation from './MobileBottomNavigation';
import MobileOptimizedCard, { MobileActionButton } from './MobileOptimizedCard';
import MobileSection, { 
  MobileStatsGrid, 
  MobileStatCard, 
  MobileList, 
  MobileListItem 
} from './MobileSection';
import { useMobileOptimization } from '@shared/hooks/useMobileOptimization';

export default function MobileDashboard({
  // Data props
  playerName,
  playerLastName,
  pendingProposals = [],
  sentProposals = [],
  matches = [],
  notes = [],
  standings = [],
  schedule = [],
  
  // Loading states
  proposalsLoading = false,
  matchesLoading = false,
  notesLoading = false,
  seasonLoading = false,
  standingsLoading = false,
  scheduleLoading = false,
  
  // Action handlers
  onTabChange,
  onQuickAction,
  onViewMatch,
  onViewProposal,
  onViewStandings,
  onViewSchedule,
  onViewProfile,
  onViewSettings,
  
  // Modal handlers
  setShowMatchProposalModal,
  setShowUserProfileModal,
  setShowSettingsModal,
  
  // Additional props
  className = "",
  style = {},
  ...props
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const { isMobile, mobileUtils, pullToRefreshUtils } = useMobileOptimization();

  // Handle tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (onTabChange) onTabChange(tabId);
  };

  // Handle quick action (usually create new match/proposal)
  const handleQuickAction = () => {
    if (onQuickAction) {
      onQuickAction();
    } else {
      setShowMatchProposalModal(true);
    }
  };

  // Pull to refresh handler
  const pullToRefreshHandler = pullToRefreshUtils.createPullToRefreshHandler(async () => {
    // Refresh all data
    window.location.reload();
  });

  // Render Overview Tab
  const renderOverview = () => (
    <div style={{ paddingBottom: '80px' }}>
      {/* Welcome Section */}
      <MobileSection
        title={`Hello, ${playerName} ${playerLastName}`}
        subtitle="Your pool league dashboard"
      >
        <MobileStatsGrid columns={2}>
          <MobileStatCard
            title="Pending"
            value={pendingProposals.length}
            icon={<FaUsers />}
            color="#f59e0b"
            onClick={() => handleTabChange('proposals')}
          />
          <MobileStatCard
            title="Matches"
            value={matches.length}
            icon={<FaCalendarAlt />}
            color="#10b981"
            onClick={() => handleTabChange('matches')}
          />
          <MobileStatCard
            title="Position"
            value={standings.length > 0 ? `#${standings.findIndex(s => s.playerName === `${playerName} ${playerLastName}`) + 1}` : 'N/A'}
            subtitle="in standings"
            icon={<FaTrophy />}
            color="#e53e3e"
            onClick={() => handleTabChange('standings')}
          />
          <MobileStatCard
            title="Next Match"
            value={schedule.length > 0 ? 'Scheduled' : 'None'}
            subtitle={schedule.length > 0 ? schedule[0].date : 'No upcoming matches'}
            icon={<FaClock />}
            color="#8b5cf6"
            onClick={() => handleTabChange('schedule')}
          />
        </MobileStatsGrid>
      </MobileSection>

      {/* Quick Actions */}
      <MobileSection title="Quick Actions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <MobileActionButton
            variant="primary"
            icon={<FaPlus />}
            onClick={() => setShowMatchProposalModal(true)}
            fullWidth
          >
            Create Match Proposal
          </MobileActionButton>
          
          <MobileActionButton
            variant="secondary"
            icon={<FaUser />}
            onClick={() => setShowUserProfileModal(true)}
            fullWidth
          >
            View Profile
          </MobileActionButton>
          
          <MobileActionButton
            variant="secondary"
            icon={<FaCog />}
            onClick={() => setShowSettingsModal(true)}
            fullWidth
          >
            Settings
          </MobileActionButton>
        </div>
      </MobileSection>

      {/* Recent Activity */}
      <MobileSection 
        title="Recent Activity" 
        collapsible 
        defaultCollapsed={false}
      >
        <MobileList emptyMessage="No recent activity">
          {notes.slice(0, 3).map((note, index) => (
            <MobileListItem
              key={index}
              onTap={() => {/* Handle note tap */}}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#e53e3e',
                  flexShrink: 0
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#fff',
                    fontWeight: '500',
                    marginBottom: '2px'
                  }}>
                    {note.title || 'News Update'}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#ccc',
                    lineHeight: '1.3'
                  }}>
                    {note.content || note.message}
                  </div>
                </div>
              </div>
            </MobileListItem>
          ))}
        </MobileList>
      </MobileSection>
    </div>
  );

  // Render Matches Tab
  const renderMatches = () => (
    <div style={{ paddingBottom: '80px' }}>
      <MobileSection
        title="Your Matches"
        subtitle={`${matches.length} total matches`}
      >
        <MobileList 
          emptyMessage="No matches found"
          loading={matchesLoading}
        >
          {matches.map((match, index) => (
            <MobileOptimizedCard
              key={match._id || index}
              title={`${match.playerName} vs ${match.opponent || 'TBD'}`}
              subtitle={`${match.date} • ${match.location || 'Location TBD'}`}
              onTap={() => onViewMatch && onViewMatch(match)}
              onSwipeLeft={() => {/* Handle match actions */}}
              onSwipeRight={() => {/* Handle match view */}}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: '600',
                    background: match.status === 'completed' ? '#10b981' : 
                               match.status === 'pending' ? '#f59e0b' : '#6b7280',
                    color: '#fff'
                  }}>
                    {match.status}
                  </div>
                  {match.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ccc', fontSize: '0.8rem' }}>
                      <FaMapMarkerAlt />
                      {match.location}
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ color: '#ccc', fontSize: '0.8rem' }}>
                    {match.time || 'Time TBD'}
                  </div>
                </div>
              </div>
            </MobileOptimizedCard>
          ))}
        </MobileList>
      </MobileSection>
    </div>
  );

  // Render Proposals Tab
  const renderProposals = () => (
    <div style={{ paddingBottom: '80px' }}>
      <MobileSection
        title="Match Proposals"
        subtitle={`${pendingProposals.length} pending, ${sentProposals.length} sent`}
      >
        {/* Pending Proposals */}
        <MobileSection
          title="Pending Proposals"
          subtitle={`${pendingProposals.length} waiting for response`}
          collapsible
          defaultCollapsed={false}
        >
          <MobileList 
            emptyMessage="No pending proposals"
            loading={proposalsLoading}
          >
            {pendingProposals.map((proposal, index) => (
              <MobileOptimizedCard
                key={proposal._id || index}
                title={`Proposal to ${proposal.recipientName}`}
                subtitle={`${proposal.date} • ${proposal.location || 'Location TBD'}`}
                onTap={() => onViewProposal && onViewProposal(proposal)}
                onSwipeLeft={() => {/* Handle proposal actions */}}
                onSwipeRight={() => {/* Handle proposal view */}}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      background: '#f59e0b',
                      color: '#fff'
                    }}>
                      Pending
                    </div>
                    {proposal.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ccc', fontSize: '0.8rem' }}>
                        <FaMapMarkerAlt />
                        {proposal.location}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ color: '#ccc', fontSize: '0.8rem' }}>
                    {proposal.time || 'Time TBD'}
                  </div>
                </div>
              </MobileOptimizedCard>
            ))}
          </MobileList>
        </MobileSection>

        {/* Sent Proposals */}
        <MobileSection
          title="Sent Proposals"
          subtitle={`${sentProposals.length} proposals sent`}
          collapsible
          defaultCollapsed={true}
        >
          <MobileList 
            emptyMessage="No sent proposals"
            loading={proposalsLoading}
          >
            {sentProposals.map((proposal, index) => (
              <MobileOptimizedCard
                key={proposal._id || index}
                title={`Proposal to ${proposal.recipientName}`}
                subtitle={`${proposal.date} • ${proposal.location || 'Location TBD'}`}
                onTap={() => onViewProposal && onViewProposal(proposal)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      background: proposal.status === 'accepted' ? '#10b981' : 
                                 proposal.status === 'rejected' ? '#ef4444' : '#6b7280',
                      color: '#fff'
                    }}>
                      {proposal.status}
                    </div>
                    {proposal.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ccc', fontSize: '0.8rem' }}>
                        <FaMapMarkerAlt />
                        {proposal.location}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ color: '#ccc', fontSize: '0.8rem' }}>
                    {proposal.time || 'Time TBD'}
                  </div>
                </div>
              </MobileOptimizedCard>
            ))}
          </MobileList>
        </MobileSection>
      </MobileSection>
    </div>
  );

  // Render Standings Tab
  const renderStandings = () => (
    <div style={{ paddingBottom: '80px' }}>
      <MobileSection
        title="League Standings"
        subtitle="Current season rankings"
      >
        <MobileList 
          emptyMessage="No standings available"
          loading={standingsLoading}
        >
          {standings.map((player, index) => (
            <MobileListItem
              key={player._id || index}
              onTap={() => onViewStandings && onViewStandings()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: index < 3 ? '#fbbf24' : '#6b7280',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#fff',
                    fontWeight: '500',
                    marginBottom: '2px'
                  }}>
                    {player.playerName}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#ccc'
                  }}>
                    {player.wins}W - {player.losses}L • {player.points} pts
                  </div>
                </div>
                
                <div style={{
                  fontSize: '0.8rem',
                  color: '#888',
                  fontWeight: '600'
                }}>
                  #{index + 1}
                </div>
              </div>
            </MobileListItem>
          ))}
        </MobileList>
      </MobileSection>
    </div>
  );

  // Render Chat Tab
  const renderChat = () => (
    <div style={{ paddingBottom: '80px' }}>
      <MobileSection
        title="League Chat"
        subtitle="Communicate with other players"
      >
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{
            fontSize: '3rem',
            color: '#888',
            marginBottom: '16px'
          }}>
            <FaComments />
          </div>
          <div style={{
            fontSize: '1.1rem',
            color: '#fff',
            marginBottom: '8px'
          }}>
            Chat Coming Soon
          </div>
          <div style={{
            fontSize: '0.9rem',
            color: '#ccc'
          }}>
            Direct messaging and league chat will be available soon
          </div>
        </div>
      </MobileSection>
    </div>
  );

  // Main render
  return (
    <div
      className={`mobile-dashboard ${className}`}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b69 100%)',
        overflowX: 'hidden',
        ...style
      }}
      {...pullToRefreshHandler}
      {...props}
    >
      {/* Main Content */}
      <div style={{ padding: '16px' }}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'matches' && renderMatches()}
        {activeTab === 'proposals' && renderProposals()}
        {activeTab === 'standings' && renderStandings()}
        {activeTab === 'chat' && renderChat()}
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onQuickAction={handleQuickAction}
        pendingCount={pendingProposals.length}
        sentCount={sentProposals.length}
        matchesCount={matches.length}
      />
    </div>
  );
}
