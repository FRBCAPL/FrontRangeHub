import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '@shared/config/config.js';
import './GuestApp.css';

// Import the actual Dashboard component
import Dashboard from '@apps/singles-league/frontend/src/components/dashboard/Dashboard';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';

const GuestLeagueApp = () => {
  const navigate = useNavigate();
     const [currentView, setCurrentView] = useState('info');
  const [guestUser, setGuestUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
     const [joinFormData, setJoinFormData] = useState({
     firstName: '',
     lastName: '',
     email: '',
     phone: '',
     experience: 'beginner',
     fargoRate: '',
     currentLeague: '',
     currentRanking: '',
     message: ''
   });
  const [submittingJoin, setSubmittingJoin] = useState(false);

  useEffect(() => {
    authenticateGuest();
  }, []);

  const authenticateGuest = async () => {
    try {
      setLoading(true);
      
      // Authenticate with the guest user credentials
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: 'guest@frontrangepool.com'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGuestUser(data.user);
        console.log('Guest user authenticated:', data.user);
      } else {
        const errorData = await response.json();
        console.error('Guest authentication failed:', errorData);
        setError('Failed to authenticate guest user');
      }
    } catch (error) {
      console.error('Error authenticating guest:', error);
      setError('Network error during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHub = () => {
    navigate('/');
  };

  const handleJoinLeague = () => {
    console.log('Opening join modal...');
    setShowJoinModal(true);
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!joinFormData.firstName || !joinFormData.lastName || !joinFormData.email) {
      alert('Please fill in all required fields (First Name, Last Name, and Email)');
      return;
    }

    setSubmittingJoin(true);

    try {
      // For now, we'll simulate a submission and show a success message
      // In a real implementation, this would send to the backend
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
                           alert(`🏆 Thank you for your interest in joining the Front Range Pool League BCAPL Singles Division!\n\nWe've received your application:\n\nName: ${joinFormData.firstName} ${joinFormData.lastName}\nEmail: ${joinFormData.email}\nExperience: ${joinFormData.experience}${joinFormData.fargoRate ? `\nFargoRate: ${joinFormData.fargoRate}` : ''}${joinFormData.currentLeague ? `\nCurrent League: ${joinFormData.currentLeague}` : ''}${joinFormData.currentRanking ? `\nCurrent Ranking: ${joinFormData.currentRanking}` : ''}\n\nWe'll contact you at ${joinFormData.email} within 24-48 hours to set up your player profile and get you started in the BCAPL singles division!\n\nIn the meantime, you can also reach us directly at: frbcapl@gmail.com`);
      
             // Reset form and close modal
       setJoinFormData({
         firstName: '',
         lastName: '',
         email: '',
         phone: '',
         experience: 'beginner',
         fargoRate: '',
         currentLeague: '',
         currentRanking: '',
         message: ''
       });
      setShowJoinModal(false);
    } catch (error) {
      alert('There was an error submitting your application. Please try again or contact us directly at frbcapl@gmail.com');
    } finally {
      setSubmittingJoin(false);
    }
  };

  // Mock functions for guest mode - these will show alerts instead of real functionality
  const guestHandlers = {
    onScheduleMatch: () => {
      alert('📅 Schedule Match\n\nThis feature is available to members only.\n\nContact frbcapl@gmail.com to join and start scheduling matches!');
    },
    onOpenChat: () => {
      alert('💬 Chat System\n\nThis feature is available to members only.\n\nContact frbcapl@gmail.com to join and start chatting with opponents!');
    },
    onLogout: () => {
      navigate('/');
    },
    onGoToAdmin: () => {
      alert('🔧 Admin Access\n\nAdmin features are only available to approved administrators.\n\nContact frbcapl@gmail.com for admin access requests.');
    },
    onGoToPlatformAdmin: () => {
      alert('🔧 Platform Admin\n\nPlatform admin features are only available to super administrators.\n\nContact frbcapl@gmail.com for platform admin access requests.');
    },
    // Phase 1 handlers
    onOpenOpponentsModal: () => {
      alert('👥 Opponents Modal\n\nThis feature is available to members only.\n\nContact frbcapl@gmail.com to join and view your opponents!');
    },
    onOpenCompletedMatchesModal: () => {
      alert('✅ Completed Matches\n\nThis feature is available to members only.\n\nContact frbcapl@gmail.com to join and view your completed matches!');
    },
    onOpenStandingsModal: () => {
      alert('📊 Standings\n\nThis feature is available to members only.\n\nContact frbcapl@gmail.com to join and view the standings!');
    },
    onOpenAllMatchesModal: () => {
      alert('📋 All Matches\n\nThis feature is available to members only.\n\nContact frbcapl@gmail.com to join and view all matches!');
    },
    onOpenProposalListModal: () => {
      alert('📝 Proposals\n\nThis feature is available to members only.\n\nContact frbcapl@gmail.com to join and view your proposals!');
    },
    onOpenSentProposalListModal: () => {
      alert('📤 Sent Proposals\n\nThis feature is available to members only.\n\nContact frbcapl@gmail.com to join and view your sent proposals!');
    },
    onMatchClick: () => {
      alert('🎯 Match Details\n\nThis feature is available to members only.\n\nContact frbcapl@gmail.com to join and view match details!');
    },
    onOpenMessageCenter: () => {
      alert('💬 Message Center\n\nThis feature is available to members only.\n\nContact frbcapl@gmail.com to join and access the message center!');
    },
    onSmartMatchClick: () => {
      alert('🧠 Smart Match\n\nThis feature is available to members only.\n\nContact frbcapl@gmail.com to join and use smart matchmaking!');
    },
    onOpenCalendar: () => {
      alert('📅 Calendar\n\nThis feature is available to members only.\n\nContact frbcapl@gmail.com to join and access the calendar!');
    }
  };

  if (loading) {
    return (
      <div className="guest-app-container">
        <div className="guest-app-header">
          <h1>🏆 League App - Guest Preview</h1>
          <p>Loading guest access...</p>
          <div className="guest-badge">👀 Guest Mode - Limited Access</div>
        </div>
        <div className="loading-spinner">Authenticating guest user...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="guest-app-container">
        <div className="guest-app-header">
          <h1>🏆 League App - Guest Preview</h1>
          <p>Error loading guest access</p>
          <div className="guest-badge">👀 Guest Mode - Limited Access</div>
        </div>
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={handleBackToHub} className="back-btn">
            ← Back to Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-app-container">
      {/* Header */}
      <div className="guest-app-header">
        <h1>🏆 League App - Guest Preview</h1>
        <p>Experience the actual League App interface with limited functionality</p>
        <div className="guest-badge">👀 Guest Mode - Limited Access</div>
        
        <div className="guest-actions">
          <button onClick={handleBackToHub} className="back-btn">
            ← Back to Hub
          </button>
          <button onClick={handleJoinLeague} className="join-btn">
            Join League
          </button>
        </div>
      </div>

             {/* View Tabs */}
       <div className="view-tabs">
         <button 
           className={`tab-btn ${currentView === 'info' ? 'active' : ''}`}
           onClick={() => setCurrentView('info')}
         >
           ℹ️ League Info
         </button>
         <button 
           className={`tab-btn ${currentView === 'app' ? 'active' : ''}`}
           onClick={() => setCurrentView('app')}
         >
           🎮 Try App Interface
         </button>
       </div>

      {/* Content */}
      <div className="content-area">
        {currentView === 'app' && (
          <div className="app-preview-section">
            <div className="guest-notice">
              <h3>🎮 Interactive App Preview</h3>
              <p>You can explore the actual League App interface below. Try clicking buttons and opening modals to see how it works!</p>
                             <div className="guest-limitations" style={{ textAlign: 'center' }}>
                 <strong>Guest Limitations:</strong>
                 <ul style={{ textAlign: 'left', display: 'inline-block', margin: '0.5rem auto' }}>
                   <li>• Can view all interfaces and modals</li>
                   <li>• Cannot submit forms or save data</li>
                   <li>• Cannot access chat or messaging</li>
                   <li>• Cannot schedule real matches</li>
                   <li>• Cannot access admin features</li>
                 </ul>
               </div>
            </div>

            {/* Actual Dashboard Component with real guest user data */}
            <div className="dashboard-preview">
              {(() => {
                console.log('🎮 Guest App Debug - Dashboard Props:', {
                  effectivePhase: "scheduled",
                  hasSeasonData: true,
                  completedMatches: [
                    {
                      _id: 'guest-match-1',
                      player1Id: 'Guest User',
                      player2Id: 'John Smith',
                      winner: 'Guest User',
                      score: '5-3',
                      matchDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                      status: 'completed'
                    },
                    {
                      _id: 'guest-match-2',
                      player1Id: 'Guest User',
                      player2Id: 'Jane Doe',
                      winner: 'Jane Doe',
                      score: '3-5',
                      matchDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                      status: 'completed'
                    }
                  ],
                  totalRequiredMatches: 6,
                  pendingCount: 2,
                  sentCount: 1
                });
                return null;
              })()}
              <Dashboard
                playerName={guestUser?.firstName || 'Guest'}
                playerLastName={guestUser?.lastName || 'User'}
                senderEmail={guestUser?.email || 'guest@frontrangepool.com'}
                onScheduleMatch={guestHandlers.onScheduleMatch}
                onOpenChat={guestHandlers.onOpenChat}
                onLogout={guestHandlers.onLogout}
                userPin={guestUser?.pin || 'GUEST'}
                onGoToAdmin={guestHandlers.onGoToAdmin}
                onGoToPlatformAdmin={guestHandlers.onGoToPlatformAdmin}
                // Phase 1 Example Data - Show Phase 1 overlay for guest preview
                effectivePhase="scheduled"
                seasonData={{
                  _id: 'guest-season-1',
                  name: 'BCAPL Singles Division - Guest Preview',
                  division: 'FRBCAPL TEST',
                  startDate: new Date(),
                  endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
                  phase1EndDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000), // 42 days from now
                  totalWeeks: 10,
                  currentWeek: 3,
                  isActive: true
                }}
                completedMatches={[
                  {
                    _id: 'guest-match-1',
                    player1Id: 'Guest User',
                    player2Id: 'John Smith',
                    winner: 'Guest User',
                    score: '5-3',
                    matchDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    status: 'completed'
                  },
                  {
                    _id: 'guest-match-2',
                    player1Id: 'Guest User',
                    player2Id: 'Jane Doe',
                    winner: 'Jane Doe',
                    score: '3-5',
                    matchDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                    status: 'completed'
                  }
                ]}
                totalRequiredMatches={6}
                selectedDivision="FRBCAPL TEST"
                pendingCount={2}
                sentCount={1}
                upcomingMatches={[
                  {
                    _id: 'guest-upcoming-1',
                    player1Id: 'Guest User',
                    player2Id: 'Mike Johnson',
                    proposedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    status: 'pending'
                  }
                ]}
                allPlayers={[
                  { firstName: 'Guest', lastName: 'User', email: 'guest@frontrangepool.com' },
                  { firstName: 'John', lastName: 'Smith', email: 'john@example.com' },
                  { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
                  { firstName: 'Mike', lastName: 'Johnson', email: 'mike@example.com' }
                ]}
                standings={[
                  { rank: 1, playerName: 'John Smith', points: 120, matchesPlayed: 6 },
                  { rank: 2, playerName: 'Jane Doe', points: 110, matchesPlayed: 6 },
                  { rank: 3, playerName: 'Guest User', points: 100, matchesPlayed: 6 },
                  { rank: 4, playerName: 'Mike Johnson', points: 90, matchesPlayed: 6 }
                ]}
                // Phase 1 handlers
                onOpenOpponentsModal={guestHandlers.onOpenOpponentsModal}
                onOpenCompletedMatchesModal={guestHandlers.onOpenCompletedMatchesModal}
                onOpenStandingsModal={guestHandlers.onOpenStandingsModal}
                onOpenAllMatchesModal={guestHandlers.onOpenAllMatchesModal}
                onOpenProposalListModal={guestHandlers.onOpenProposalListModal}
                onOpenSentProposalListModal={guestHandlers.onOpenSentProposalListModal}
                onMatchClick={guestHandlers.onMatchClick}
                onOpenMessageCenter={guestHandlers.onOpenMessageCenter}
                onSmartMatchClick={guestHandlers.onSmartMatchClick}
                onOpenCalendar={guestHandlers.onOpenCalendar}
              />
            </div>
          </div>
        )}

        {currentView === 'info' && (
          <div className="info-section">
            <h2>League Information</h2>
            
                         <div className="info-cards">
               <div className="info-card">
                 <h3>🏆 League Structure</h3>
                 <p>BCAPL Singles Division - Hybrid Format</p>
                 <ul>
                   <li>Maximum 30 players per session</li>
                   <li>10-week sessions with two phases</li>
                   <li>Phase 1 - Weeks 1-6: <br></br>Scheduled opponents (6 matches)</li>
                   <li>Phase 2 - Weeks 7-10: <br></br>Challenge matches (2-4 matches)</li>
                   <li>FargoRate integrated rankings</li>
                 </ul>
               </div>

               <div className="info-card">
                 <h3>📅 Match System</h3>
                 <p>Flexible scheduling with two distinct phases</p>
                 <ul>
                   <li>Phase 1: 6 assigned opponents (any time, any location)</li>
                   <li>Phase 2: Challenge matches (up to 4 spots higher)</li>
                   <li>Race to 5 games per match</li>
                   <li>10 points per game won + 10 bonus for match winner</li>
                 </ul>
               </div>

               <div className="info-card">
                 <h3>💬 Communication</h3>
                 <p>Official scheduling hub and coordination system</p>
                 <ul>
                   <li>League website: https://frusapl.com</li>
                   <li>Scheduling Hub for match coordination</li>
                   <li>Direct messaging between players</li>
                   <li>League chat room for announcements</li>
                 </ul>
               </div>

               <div className="info-card">
                 <h3>📊 Statistics & Rankings</h3>
                 <p>FargoRate integrated scoring and tracking</p>
                 <ul>
                   <li>BCAPL scoring app for all matches</li>
                   <li>FargoRate standings and statistics</li>
                   <li>Total points determine final rankings</li>
                   <li>Handicapping based on FargoRate difference</li>
                 </ul>
               </div>

                            <div className="info-card">
                <h3>💰 Fee Structure</h3>
                <p>Transparent pricing for BCAPL singles division</p>
                <ul>
                  <li>Registration: $30 per player per division</li>
                  <li>Weekly dues: $10 per week</li>
                  <li>Sessions: 10 weeks long</li>
                  <li>Maximum: 30 players per division</li>
                </ul>
              </div>

              <div className="info-card">
                <h3>🏆 Prize Payouts</h3>
                <p>Estimated payouts for BCAPL singles division based on 30 players</p>
                <h4 style={{ marginTop: '0.5rem', color: '#4CAF50', fontSize: '1rem' }}>🏅 Main Payouts</h4>
                <ul>
                  <li>1st Place: $600</li>
                  <li>2nd Place: $500</li>
                  <li>3rd Place: $400</li>
                  <li>4th Place: $300</li>
                </ul>
                     <h4 style={{ marginTop: '0.5rem', color: '#4CAF50', fontSize: '1rem' }}>🎁 Special Awards ($100 each)</h4>
                 <ul>
                   <li>Most Challenge Positions Gained (most spots climbed during challenge phase)</li>
                   <li>Biggest FargoRate Increase (min. 200+ robustness at end)</li>
                   <li>Sportsmanship Award (by player vote)</li>
                   <li>Random Drawing for Full Participation (all 10 matches completed)</li>
                   <li>Random Drawing for Full Pre-payment (paid in full before week 2)</li>
                 </ul>
                <p style={{ 
                  marginTop: '1rem', 
                  fontSize: '0.85rem', 
                  color: '#ccc', 
                  fontStyle: 'italic',
                  borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                  paddingTop: '0.5rem'
                }}>
                  <strong>Note:</strong> Places paid, amounts, and special prizes subject to change based on number of players in division.
                </p>
              </div>
            </div>

            <div className="join-section">
              <h3>Ready to Join?</h3>
              <p>Become a member to access all features and start competing!</p>
              <button onClick={handleJoinLeague} className="join-btn-large">
                🏆 Join the League Today
              </button>
              <p className="contact-info">
                Contact: <strong>frbcapl@gmail.com</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Join League Modal */}
      {showJoinModal && (
        <DraggableModal
          open={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          title="🏆 Join Front Range Pool League - BCAPL Singles Division"
          maxWidth="700px"
        >
                     <form onSubmit={handleJoinSubmit}>
             <div style={{ 
               display: 'grid', 
               gridTemplateColumns: '1fr 1fr', 
               gap: '1rem',
               marginBottom: '0.75rem'
             }}>
               <div>
                 <label htmlFor="firstName" style={{
                   display: 'block',
                   color: '#fff',
                   marginBottom: '0.5rem',
                   fontWeight: 'bold',
                   fontSize: '1rem'
                 }}>First Name *</label>
                 <input
                   type="text"
                   id="firstName"
                   value={joinFormData.firstName}
                   onChange={(e) => setJoinFormData({...joinFormData, firstName: e.target.value})}
                   required
                   placeholder="Enter your first name"
                   style={{
                     width: '100%',
                     padding: '0.8rem',
                     border: '2px solid rgba(255, 255, 255, 0.2)',
                     borderRadius: '8px',
                     background: 'rgba(255, 255, 255, 0.1)',
                     color: '#fff',
                     fontSize: '1rem',
                     boxSizing: 'border-box'
                   }}
                 />
               </div>

               <div>
                 <label htmlFor="lastName" style={{
                   display: 'block',
                   color: '#fff',
                   marginBottom: '0.5rem',
                   fontWeight: 'bold',
                   fontSize: '1rem'
                 }}>Last Name *</label>
                 <input
                   type="text"
                   id="lastName"
                   value={joinFormData.lastName}
                   onChange={(e) => setJoinFormData({...joinFormData, lastName: e.target.value})}
                   required
                   placeholder="Enter your last name"
                   style={{
                     width: '100%',
                     padding: '0.8rem',
                     border: '2px solid rgba(255, 255, 255, 0.2)',
                     borderRadius: '8px',
                     background: 'rgba(255, 255, 255, 0.1)',
                     color: '#fff',
                     fontSize: '1rem',
                     boxSizing: 'border-box'
                   }}
                 />
               </div>
             </div>

             <div style={{ 
               display: 'grid', 
               gridTemplateColumns: '1fr 1fr', 
               gap: '1rem',
               marginBottom: '0.75rem'
             }}>
               <div>
                 <label htmlFor="email" style={{
                   display: 'block',
                   color: '#fff',
                   marginBottom: '0.5rem',
                   fontWeight: 'bold',
                   fontSize: '1rem'
                 }}>Email Address *</label>
                 <input
                   type="email"
                   id="email"
                   value={joinFormData.email}
                   onChange={(e) => setJoinFormData({...joinFormData, email: e.target.value})}
                   required
                   placeholder="Enter your email address"
                   style={{
                     width: '100%',
                     padding: '0.8rem',
                     border: '2px solid rgba(255, 255, 255, 0.2)',
                     borderRadius: '8px',
                     background: 'rgba(255, 255, 255, 0.1)',
                     color: '#fff',
                     fontSize: '1rem',
                     boxSizing: 'border-box'
                   }}
                 />
               </div>

               <div>
                 <label htmlFor="phone" style={{
                   display: 'block',
                   color: '#fff',
                   marginBottom: '0.5rem',
                   fontWeight: 'bold',
                   fontSize: '1rem'
                 }}>Phone Number</label>
                 <input
                   type="tel"
                   id="phone"
                   value={joinFormData.phone}
                   onChange={(e) => setJoinFormData({...joinFormData, phone: e.target.value})}
                   placeholder="Enter your phone number (optional)"
                   style={{
                     width: '100%',
                     padding: '0.8rem',
                     border: '2px solid rgba(255, 255, 255, 0.2)',
                     borderRadius: '8px',
                     background: 'rgba(255, 255, 255, 0.1)',
                     color: '#fff',
                     fontSize: '1rem',
                     boxSizing: 'border-box'
                   }}
                 />
               </div>
             </div>

             <div style={{ 
               display: 'grid', 
               gridTemplateColumns: '1fr 1fr', 
               gap: '1rem',
               marginBottom: '0.75rem'
             }}>
               <div>
                 <label htmlFor="fargoRate" style={{
                   display: 'block',
                   color: '#fff',
                   marginBottom: '0.5rem',
                   fontWeight: 'bold',
                   fontSize: '1rem'
                 }}>Fargo Rate, if applicable</label>
                 <input
                   type="number"
                   id="fargoRate"
                   value={joinFormData.fargoRate}
                   onChange={(e) => setJoinFormData({...joinFormData, fargoRate: e.target.value})}
                   min="0"
                   max="850"
                   placeholder="Enter your Fargo rate (optional)"
                   style={{
                     width: '100%',
                     padding: '0.8rem',
                     border: '2px solid rgba(255, 255, 255, 0.2)',
                     borderRadius: '8px',
                     background: 'rgba(255, 255, 255, 0.1)',
                     color: '#fff',
                     fontSize: '1rem',
                     boxSizing: 'border-box'
                   }}
                 />
               </div>

               <div>
                 <label htmlFor="experience" style={{
                   display: 'block',
                   color: '#fff',
                   marginBottom: '0.5rem',
                   fontWeight: 'bold',
                   fontSize: '1rem'
                 }}>Experience Level</label>
                 <select
                   id="experience"
                   value={joinFormData.experience}
                   onChange={(e) => setJoinFormData({...joinFormData, experience: e.target.value})}
                   style={{
                     width: '100%',
                     padding: '0.8rem',
                     border: '2px solid rgba(255, 255, 255, 0.2)',
                     borderRadius: '8px',
                     background: 'rgba(255, 255, 255, 0.1)',
                     color: '#fff',
                     fontSize: '1rem',
                     boxSizing: 'border-box'
                   }}
                 >
                   <option value="beginner">Beginner</option>
                   <option value="intermediate">Intermediate</option>
                   <option value="advanced">Advanced</option>
                   <option value="expert">Expert</option>
                 </select>
               </div>
             </div>

             <div style={{ 
               display: 'grid', 
               gridTemplateColumns: '1fr 1fr', 
               gap: '1rem',
               marginBottom: '0.75rem'
             }}>
               <div>
                 <label htmlFor="currentLeague" style={{
                   display: 'block',
                   color: '#fff',
                   marginBottom: '0.5rem',
                   fontWeight: 'bold',
                   fontSize: '1rem'
                 }}>Current League (Optional)</label>
                 <input
                   type="text"
                   id="currentLeague"
                   value={joinFormData.currentLeague}
                   onChange={(e) => setJoinFormData({...joinFormData, currentLeague: e.target.value})}
                   placeholder="e.g., APA, BCA, Local League"
                   style={{
                     width: '100%',
                     padding: '0.8rem',
                     border: '2px solid rgba(255, 255, 255, 0.2)',
                     borderRadius: '8px',
                     background: 'rgba(255, 255, 255, 0.1)',
                     color: '#fff',
                     fontSize: '1rem',
                     boxSizing: 'border-box'
                   }}
                 />
               </div>

               <div>
                 <label htmlFor="currentRanking" style={{
                   display: 'block',
                   color: '#fff',
                   marginBottom: '0.5rem',
                   fontWeight: 'bold',
                   fontSize: '1rem'
                 }}>Current Ranking (Optional)</label>
                 <input
                   type="text"
                   id="currentRanking"
                   value={joinFormData.currentRanking}
                   onChange={(e) => setJoinFormData({...joinFormData, currentRanking: e.target.value})}
                   placeholder="e.g., 5, 6, 7, 8, 9"
                   style={{
                     width: '100%',
                     padding: '0.8rem',
                     border: '2px solid rgba(255, 255, 255, 0.2)',
                     borderRadius: '8px',
                     background: 'rgba(255, 255, 255, 0.1)',
                     color: '#fff',
                     fontSize: '1rem',
                     boxSizing: 'border-box'
                   }}
                 />
               </div>
             </div>

             <div style={{ marginBottom: '0.75rem' }}>
               <label htmlFor="message" style={{
                 display: 'block',
                 color: '#fff',
                 marginBottom: '0.5rem',
                 fontWeight: 'bold',
                 fontSize: '1rem'
               }}>Additional Message (Optional)</label>
                                <textarea
                   id="message"
                   value={joinFormData.message}
                   onChange={(e) => setJoinFormData({...joinFormData, message: e.target.value})}
                   placeholder="Tell us about your pool experience, goals, or any questions you have..."
                   style={{
                     width: '100%',
                     padding: '0.8rem',
                     border: '2px solid rgba(255, 255, 255, 0.2)',
                     borderRadius: '8px',
                     background: 'rgba(255, 255, 255, 0.1)',
                     color: '#fff',
                     fontSize: '1rem',
                     minHeight: '60px',
                     maxHeight: '80px',
                     resize: 'vertical',
                     boxSizing: 'border-box'
                   }}
                 />
             </div>

                           <div style={{
                 display: 'flex',
                 gap: '1rem',
                 marginTop: '0.5rem'
               }}>
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                disabled={submittingJoin}
                style={{
                  flex: 1,
                  padding: '0.8rem 1.2rem',
                  background: 'transparent',
                  color: '#ccc',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingJoin}
                style={{
                  flex: 1,
                  padding: '0.8rem 1.2rem',
                  background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                  color: 'white',
                  border: '2px solid #4CAF50',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                                 {submittingJoin ? 'Submitting...' : '🏆 Join BCAPL Singles Division'}
              </button>
            </div>
          </form>

                     <div style={{
             background: 'rgba(76, 175, 80, 0.1)',
             border: '1px solid rgba(76, 175, 80, 0.3)',
             borderRadius: '8px',
             padding: '0.6rem',
             marginTop: '0.5rem'
           }}>
                         <h3 style={{
               color: '#4CAF50',
               margin: '0 0 0.5rem 0',
               fontSize: '1rem',
               fontWeight: 'bold'
             }}>📋 What to Expect</h3>
                           <ul style={{
                margin: '0',
                paddingLeft: '1rem',
                color: '#ccc',
                fontSize: '0.9rem',
                lineHeight: '1.3'
              }}>
                <li>We'll review your application and contact you as soon as possible</li>
                                 <li>After registration fee is received, you'll be placed in an appropriate BCAPL singles division based on division availability</li>
                <li>Start competing in regular season matches and BCAPL tournaments</li>
                <li>Track your standings and statistics throughout the BCAPL season</li>
              </ul>
          </div>
        </DraggableModal>
      )}
    </div>
  );
};

export default GuestLeagueApp;
