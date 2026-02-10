import React, { useState } from 'react';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import './MyChallengesModal.css';

const MyChallengesModal = ({
  isOpen,
  onClose,
  pendingChallenges = [],
  sentChallenges = [],
  scheduledMatches = [],
  onViewChallenge,
  onReportMatch,
  onRescheduleRequest,
  onReportNoShow,
}) => {
  const [activeTab, setActiveTab] = useState('pending');

  const getChallengeTypeLabel = (type) => {
    switch (type) {
      case 'challenge': return '⚔️ Challenge';
      case 'smackdown': return '💥 SmackDown';
      case 'ladder-jump': return '🚀 Ladder Jump';
      case 'fast-track': return '🚀 Fast Track';
      default: return '🎯 Match';
    }
  };

  if (!isOpen) return null;

  return (
    <DraggableModal
      open={true}
      onClose={onClose}
      title="⚔️ My Challenges"
      maxWidth="680px"
      maxHeight="80vh"
      className="my-challenges-modal"
      borderColor="#5b21b6"
      glowColor="#5b21b6"
    >
      <div className="my-challenges-modal-content">
        {/* Tabs */}
        <div className="my-challenges-tabs">
          <button
            className={`my-challenges-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            📥 Pending ({pendingChallenges.length})
          </button>
          <button
            className={`my-challenges-tab ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            📤 Sent ({sentChallenges.length})
          </button>
          <button
            className={`my-challenges-tab ${activeTab === 'scheduled' ? 'active' : ''}`}
            onClick={() => setActiveTab('scheduled')}
          >
            📅 Scheduled ({scheduledMatches.length})
          </button>
        </div>

        {/* Tab content - scrollable */}
        <div className="my-challenges-body">
          {activeTab === 'pending' && (
            <div className="my-challenges-section">
              {pendingChallenges.length === 0 ? (
                <div className="my-challenges-empty">
                  <span className="my-challenges-empty-icon">📭</span>
                  <p>No challenges waiting for your response.</p>
                </div>
              ) : (
                <div className="my-challenges-list">
                  {pendingChallenges.map((challenge) => (
                    <div key={challenge._id} className="my-challenge-card pending">
                      <div className="my-challenge-card-header">
                        <h4>
                          {challenge.challenger?.firstName} {challenge.challenger?.lastName}
                          <span className="vs"> vs </span>
                          {challenge.defender?.firstName} {challenge.defender?.lastName}
                        </h4>
                        <span className={`my-challenge-type ${challenge.challengeType}`}>
                          {getChallengeTypeLabel(challenge.challengeType)}
                        </span>
                      </div>
                      <div className="my-challenge-card-details">
                        <span>${challenge.matchDetails?.entryFee || '0'}</span>
                        <span>•</span>
                        <span>Race to {challenge.matchDetails?.raceLength || '5'}</span>
                        <span>•</span>
                        <span>{challenge.matchDetails?.gameType || '8-Ball'}</span>
                        {challenge.deadline && (
                          <>
                            <span>•</span>
                            <span>Expires {new Date(challenge.deadline).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                      <button className="my-challenge-btn respond" onClick={() => onViewChallenge(challenge)}>
                        📝 Respond
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sent' && (
            <div className="my-challenges-section">
              {sentChallenges.length === 0 ? (
                <div className="my-challenges-empty">
                  <span className="my-challenges-empty-icon">📤</span>
                  <p>No sent challenges. Challenge another player to get started!</p>
                </div>
              ) : (
                <div className="my-challenges-list">
                  {sentChallenges.map((challenge) => (
                    <div key={challenge._id} className="my-challenge-card sent">
                      <div className="my-challenge-card-header">
                        <h4>
                          {challenge.challenger?.firstName} {challenge.challenger?.lastName}
                          <span className="vs"> vs </span>
                          {challenge.defender?.firstName} {challenge.defender?.lastName}
                        </h4>
                        <span className={`my-challenge-type ${challenge.challengeType}`}>
                          {getChallengeTypeLabel(challenge.challengeType)}
                        </span>
                      </div>
                      <div className="my-challenge-card-details">
                        <span className={`status-${challenge.status}`}>{challenge.status}</span>
                        <span>•</span>
                        <span>${challenge.matchDetails?.entryFee || '0'}</span>
                        <span>•</span>
                        <span>Race to {challenge.matchDetails?.raceLength || '5'}</span>
                      </div>
                      <button className="my-challenge-btn view" onClick={() => onViewChallenge(challenge)}>
                        👁️ View Details
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'scheduled' && (
            <div className="my-challenges-section">
              {scheduledMatches.length === 0 ? (
                <div className="my-challenges-empty">
                  <span className="my-challenges-empty-icon">📅</span>
                  <p>No scheduled matches yet.</p>
                </div>
              ) : (
                <div className="my-challenges-list">
                  {scheduledMatches.map((match) => {
                    const p1 = match.player1 || match.winner;
                    const p2 = match.player2 || match.loser;
                    const p1Name = p1 ? `${p1.firstName || p1.first_name || ''} ${p1.lastName || p1.last_name || ''}`.trim()
                      : (match.winner_name || 'Unknown');
                    const p2Name = p2 ? `${p2.firstName || p2.first_name || ''} ${p2.lastName || p2.last_name || ''}`.trim()
                      : (match.loser_name || 'Unknown');
                    const scheduledDate = match.scheduledDate || match.match_date || match.scheduled_date;
                    const raceLength = match.raceLength || match.race_length || '5';
                    const gameType = match.gameType || match.game_type || '8-Ball';
                    const matchType = match.matchType || match.match_type || 'challenge';
                    const rescheduleCount = match.rescheduleCount || 0;
                    const scheduledTime = match.scheduledDate ? new Date(match.scheduledDate) : null;
                    const thirtyMinLater = scheduledTime ? new Date(scheduledTime.getTime() + 30 * 60 * 1000) : null;
                    const canReportNoShow = scheduledTime && thirtyMinLater && new Date() >= thirtyMinLater;

                    return (
                      <div key={match._id || match.id} className="my-challenge-card scheduled">
                        <div className="my-challenge-card-header">
                          <h4>{p1Name} <span className="vs">vs</span> {p2Name}</h4>
                          <span className={`my-challenge-type ${matchType}`}>
                            {getChallengeTypeLabel(matchType)}
                          </span>
                        </div>
                        <div className="my-challenge-card-details">
                          <span>Race to {raceLength}</span>
                          <span>•</span>
                          <span>{gameType}</span>
                          <span>•</span>
                          <span>{scheduledDate ? new Date(scheduledDate).toLocaleDateString() : 'TBD'}</span>
                        </div>
                        <div className="my-challenge-card-actions">
                          <button className="my-challenge-btn report" onClick={() => onReportMatch(match)}>
                            📊 Report Score
                          </button>
                          {rescheduleCount < 2 && (
                            <button className="my-challenge-btn reschedule" onClick={() => onRescheduleRequest(match)}>
                              📅 Reschedule ({rescheduleCount}/2)
                            </button>
                          )}
                          {canReportNoShow && (
                            <button className="my-challenge-btn noshow" onClick={() => onReportNoShow(match)}>
                              📝 No-Show
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DraggableModal>
  );
};

export default MyChallengesModal;
