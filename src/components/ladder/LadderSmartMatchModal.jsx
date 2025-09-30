import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DraggableModal from '../modal/DraggableModal';
import LadderChallengeModal from './LadderChallengeModal';
import { createSecureHeaders } from '../../utils/security.js';
import { BACKEND_URL } from '../../config.js';
import './LadderSmartMatchModal.css';

const LadderSmartMatchModal = ({ 
  isOpen, 
  onClose, 
  challenger, 
  availableDefenders = [],
  ladderData = [],
  onChallengeComplete,
  userPin 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDefender, setSelectedDefender] = useState(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeType, setChallengeType] = useState('challenge');
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
   const [showAIAssistant, setShowAIAssistant] = useState(false);
   const [aiQuery, setAiQuery] = useState('');
   const [aiSuggestions, setAiISuggestions] = useState([]);
   const [headToHeadRecord, setHeadToHeadRecord] = useState(null);
   const [loadingHeadToHead, setLoadingHeadToHead] = useState(false);
   const [showMatchTypeModal, setShowMatchTypeModal] = useState(false);
   const [selectedMatchType, setSelectedMatchType] = useState(null);
   const [showMatchTypeSelection, setShowMatchTypeSelection] = useState(false);

  useEffect(() => {
    console.log('🧠 Smart Match Modal useEffect triggered:', {
      isOpen,
      challenger: challenger ? 'Present' : 'Missing',
      availableDefendersCount: availableDefenders.length,
      availableDefenders: availableDefenders
    });
    
    if (isOpen && challenger && availableDefenders.length > 0) {
      generateSuggestions();
    } else if (isOpen && challenger && availableDefenders.length === 0) {
      console.warn('⚠️ Smart Match: No available defenders found!');
      console.log('Available defenders array:', availableDefenders);
    }
  }, [isOpen, challenger, availableDefenders]);

  const generateSuggestions = async () => {
    setLoading(true);
    setSuggestions([]);

    try {
      // Simulate a brief delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate smart suggestions based on ladder rules
      const smartSuggestions = generateSmartSuggestions(challenger, availableDefenders);
      setSuggestions(smartSuggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

   // Enhanced availability matching
   const checkAvailabilityMatch = (challenger, defender) => {
     const challengerAvailability = challenger.availability || {};
     const defenderAvailability = defender.availability || {};
     
     // If no availability data, return neutral score
     if (Object.keys(challengerAvailability).length === 0 || Object.keys(defenderAvailability).length === 0) {
       return { score: 0.5, reason: 'No availability data', details: 'No availability information available' };
     }
     
     const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
     const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
     let matchingDays = 0;
     let totalDays = 0;
     let overlappingTimes = [];
     
     days.forEach((day, index) => {
       if (challengerAvailability[day] && defenderAvailability[day]) {
         totalDays++;
         // Check if they have overlapping time preferences
         const challengerTimes = challengerAvailability[day];
         const defenderTimes = defenderAvailability[day];
         
         if (Array.isArray(challengerTimes) && Array.isArray(defenderTimes)) {
           const commonTimes = challengerTimes.filter(time => defenderTimes.includes(time));
           if (commonTimes.length > 0) {
             matchingDays++;
             overlappingTimes.push(`${dayNames[index]}: ${commonTimes.join(', ')}`);
           }
         }
       }
     });
     
     const availabilityScore = totalDays > 0 ? matchingDays / totalDays : 0.5;
     const reason = totalDays > 0 ? 
       `${matchingDays}/${totalDays} days with matching availability` : 
       'No availability overlap';
     
     const details = overlappingTimes.length > 0 ? 
       overlappingTimes.join('; ') : 
       'No overlapping free time found';
     
     return { score: availabilityScore, reason, details };
   };

   // Enhanced location matching
   const checkLocationMatch = (challenger, defender) => {
     const challengerLocations = challenger.locations || '';
     const defenderLocations = defender.locations || '';
     
     // If no location data, return neutral score
     if (!challengerLocations || !defenderLocations) {
       return { score: 0.5, reason: 'No location preferences', details: 'No location preferences set' };
     }
     
     // Split locations by common delimiters
     const challengerPrefs = challengerLocations.toLowerCase().split(/[,;|]/).map(loc => loc.trim());
     const defenderPrefs = defenderLocations.toLowerCase().split(/[,;|]/).map(loc => loc.trim());
     
     // Find common locations (case-insensitive matching)
     const commonLocations = challengerPrefs.filter(loc => 
       defenderPrefs.some(defLoc => defLoc.includes(loc) || loc.includes(defLoc))
     );
     
     // Get original case versions of common locations
     const originalCommonLocations = commonLocations.map(commonLoc => {
       const challengerMatch = challengerPrefs.find(pref => pref.toLowerCase() === commonLoc.toLowerCase());
      const defenderMatch = defenderPrefs.find(pref => pref.toLowerCase() === commonLoc.toLowerCase());
      return challengerMatch || defenderMatch || commonLoc;
     });
     
     const locationScore = commonLocations.length > 0 ? 
       Math.min(1, commonLocations.length / Math.max(challengerPrefs.length, defenderPrefs.length)) : 0.2;
     
     const reason = commonLocations.length > 0 ? 
       `Both prefer: ${originalCommonLocations.join(', ')}` : 
       'No location preferences match';
     
     const details = originalCommonLocations.length > 0 ? 
       originalCommonLocations.join(', ') : 
       'No common pool halls found';
     
     return { score: locationScore, reason, details };
   };

  // Enhanced schedule conflict detection
  const checkScheduleConflicts = (challenger, defender) => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Check if either player has scheduled matches in the next week
    const challengerScheduled = challenger.scheduledMatches || [];
    const defenderScheduled = defender.scheduledMatches || [];
    
    const challengerBusy = challengerScheduled.some(match => {
      const matchDate = new Date(match.scheduledDate);
      return matchDate >= now && matchDate <= nextWeek;
    });
    
    const defenderBusy = defenderScheduled.some(match => {
      const matchDate = new Date(match.scheduledDate);
      return matchDate >= now && matchDate <= nextWeek;
    });
    
    if (challengerBusy && defenderBusy) {
      return { score: 0.3, reason: 'Both players have scheduled matches this week' };
    } else if (challengerBusy || defenderBusy) {
      return { score: 0.6, reason: 'One player has scheduled matches this week' };
    } else {
      return { score: 1.0, reason: 'No schedule conflicts' };
    }
  };

  // Machine Learning: Track match success patterns
  const trackMatchOutcome = async (suggestion, outcome) => {
    try {
      const matchData = {
        challengerId: challenger._id || challenger.email,
        defenderId: suggestion.defender._id || suggestion.defender.email,
        matchType: suggestion.type,
        confidence: suggestion.confidence,
        availabilityScore: suggestion.availabilityScore,
        locationScore: suggestion.locationScore,
        scheduleScore: suggestion.scheduleScore,
        outcome: outcome, // 'accepted', 'declined', 'played', 'no_response'
        timestamp: new Date().toISOString(),
        positionDiff: suggestion.positionDiff
      };

      // Store in localStorage for now (in production, this would go to backend)
      const existingData = JSON.parse(localStorage.getItem('smartMatchLearning') || '[]');
      existingData.push(matchData);
      
      // Keep only last 1000 records to prevent storage bloat
      if (existingData.length > 1000) {
        existingData.splice(0, existingData.length - 1000);
      }
      
      localStorage.setItem('smartMatchLearning', JSON.stringify(existingData));
      console.log('📊 Match outcome tracked:', matchData);
    } catch (error) {
      console.error('Error tracking match outcome:', error);
    }
  };

  // Machine Learning: Learn from historical data
  const getLearnedPreferences = (playerId) => {
    try {
      const learningData = JSON.parse(localStorage.getItem('smartMatchLearning') || '[]');
      const playerMatches = learningData.filter(match => 
        match.challengerId === playerId || match.defenderId === playerId
      );

      if (playerMatches.length === 0) return {};

      const preferences = {
        preferredMatchTypes: {},
        preferredTimeSlots: {},
        responseRate: 0,
        averageConfidence: 0,
        successRate: 0
      };

      // Analyze match type preferences
      playerMatches.forEach(match => {
        if (match.outcome === 'accepted' || match.outcome === 'played') {
          preferences.preferredMatchTypes[match.matchType] = 
            (preferences.preferredMatchTypes[match.matchType] || 0) + 1;
        }
      });

      // Calculate response rate
      const totalChallenges = playerMatches.length;
      const respondedChallenges = playerMatches.filter(match => 
        match.outcome !== 'no_response'
      ).length;
      preferences.responseRate = totalChallenges > 0 ? respondedChallenges / totalChallenges : 0;

      // Calculate average confidence for successful matches
      const successfulMatches = playerMatches.filter(match => 
        match.outcome === 'accepted' || match.outcome === 'played'
      );
      preferences.averageConfidence = successfulMatches.length > 0 ? 
        successfulMatches.reduce((sum, match) => sum + match.confidence, 0) / successfulMatches.length : 0;

      // Calculate success rate
      preferences.successRate = totalChallenges > 0 ? 
        successfulMatches.length / totalChallenges : 0;

      return preferences;
    } catch (error) {
      console.error('Error getting learned preferences:', error);
      return {};
    }
  };

   // Get head-to-head record between two players
   const getHeadToHeadRecord = async (challenger, defender) => {
     try {
       console.log('🔍 Fetching head-to-head record:', { challenger, defender });
       
       // Find the challenger's actual _id from the ladder data
       let challengerId = challenger._id || challenger.id || challenger.playerId;
       
       // If challengerId is not a valid MongoDB ObjectId (like 'ladder'), 
       // find the challenger in the ladderData array
       if (!challengerId || challengerId === 'ladder' || !challengerId.match(/^[0-9a-fA-F]{24}$/)) {
         const challengerFromLadder = ladderData.find(player => 
           player.firstName === challenger.firstName && 
           player.lastName === challenger.lastName
         );
         if (challengerFromLadder) {
           challengerId = challengerFromLadder._id;
           console.log('🔍 Found challenger in ladder data:', challengerId);
         }
       }
       
       const defenderId = defender._id || defender.id || defender.playerId;
       
       console.log('🆔 Using IDs:', { challengerId, defenderId });
       console.log('🔍 Challenger object keys:', Object.keys(challenger));
       console.log('🔍 Defender object keys:', Object.keys(defender));
       
       // Check if we have the necessary IDs for API calls
       if (!challengerId) {
         console.log('❌ Missing challenger ID for head-to-head lookup');
         return { wins: 0, losses: 0, totalMatches: 0, lastMatch: null };
       }
       
       if (!defenderId) {
         console.log('❌ Missing defender ID for head-to-head lookup');
         return { wins: 0, losses: 0, totalMatches: 0, lastMatch: null };
       }
       
       // Fetch matches for both players using IDs
       const [challengerMatches, defenderMatches] = await Promise.all([
         fetch(`${BACKEND_URL}/api/ladder/player/${encodeURIComponent(challengerId)}/matches`, {
           headers: createSecureHeaders(userPin)
         }).then(res => {
           console.log('🔍 Challenger API response status:', res.status);
           if (!res.ok) {
             console.log('❌ Challenger API error:', res.status, res.statusText);
             return [];
           }
           return res.json();
         }),
         fetch(`${BACKEND_URL}/api/ladder/player/${encodeURIComponent(defenderId)}/matches`, {
           headers: createSecureHeaders(userPin)
         }).then(res => {
           console.log('🔍 Defender API response status:', res.status);
           if (!res.ok) {
             console.log('❌ Defender API error:', res.status, res.statusText);
             return [];
           }
           return res.json();
         })
       ]);
       
       console.log('📊 Challenger matches:', challengerMatches.length);
       console.log('📊 Defender matches:', defenderMatches.length);
       
       
       // Find head-to-head matches (completed matches between these two players)
       const headToHeadMatches = [];
       
       // Check challenger's matches for games against defender
       challengerMatches.forEach(match => {
         // Since the match data is flattened, if it has a result, it's completed
         if (match.result) {
           // Compare using opponent name since the match data is flattened
           const isAgainstDefender = match.opponentName === `${defender.firstName} ${defender.lastName}`;
           
           console.log('🔍 Checking challenger match:', {
             matchId: match._id,
             opponentName: match.opponentName,
             defenderName: `${defender.firstName} ${defender.lastName}`,
             isAgainstDefender
           });
           
           if (isAgainstDefender) {
             headToHeadMatches.push(match);
             console.log('✅ Found head-to-head match in challenger data');
           }
         }
       });
       
       // Check defender's matches for games against challenger
       defenderMatches.forEach(match => {
         // Since the match data is flattened, if it has a result, it's completed
         if (match.result) {
           // Compare using opponent name since the match data is flattened
           const isAgainstChallenger = match.opponentName === `${challenger.firstName} ${challenger.lastName}`;
           
           console.log('🔍 Checking defender match:', {
             matchId: match._id,
             opponentName: match.opponentName,
             challengerName: `${challenger.firstName} ${challenger.lastName}`,
             isAgainstChallenger
           });
           
           if (isAgainstChallenger) {
             // Avoid duplicates
             if (!headToHeadMatches.find(h2h => h2h._id === match._id)) {
               headToHeadMatches.push(match);
               console.log('✅ Found head-to-head match in defender data');
             }
           }
         }
       });
       
       console.log('📈 Head-to-head matches found:', headToHeadMatches.length);
       
       if (headToHeadMatches.length === 0) {
         return { wins: 0, losses: 0, totalMatches: 0, lastMatch: null };
       }
       
       // Calculate wins and losses from challenger's perspective
       let wins = 0;
       let losses = 0;
       let lastMatch = null;
       
       // Sort matches by date to get the most recent
       headToHeadMatches.sort((a, b) => new Date(b.completedDate || b.scheduledDate) - new Date(a.completedDate || a.scheduledDate));
       
       headToHeadMatches.forEach(match => {
         // Determine winner using the result field and playerRole
         // If the challenger was the player in this match record, use their result
         const isChallengerRecord = match.playerRole === 'challenger' || match.playerRole === 'defender';
         
         if (isChallengerRecord) {
           if (match.result === 'W') {
             wins++;
           } else if (match.result === 'L') {
             losses++;
           }
         }
         
         // Set the most recent match as lastMatch
         if (!lastMatch) {
           // Try to find a valid date from various possible fields
           let matchDate = match.matchDate || match.completedDate || match.scheduledDate || match.date || match.createdAt;
           
           // If we have a date, format it properly
           if (matchDate) {
             try {
               const date = new Date(matchDate);
               if (!isNaN(date.getTime())) {
                 matchDate = date.toLocaleDateString();
               } else {
                 matchDate = 'Match completed';
               }
             } catch (e) {
               matchDate = 'Match completed';
             }
           } else {
             matchDate = 'Match completed';
           }
           
           lastMatch = {
             date: matchDate,
             winner: match.result === 'W' ? 
                    `${challenger.firstName} ${challenger.lastName}` : 
                    match.opponentName,
             loser: match.result === 'W' ? 
                    match.opponentName :
                    `${challenger.firstName} ${challenger.lastName}`,
             score: match.score || 'N/A'
           };
         }
       });
       
       const record = {
         wins,
         losses,
         totalMatches: wins + losses,
         lastMatch
       };
       
       console.log('📈 Calculated head-to-head record:', record);
       return record;
     } catch (error) {
       console.error('❌ Error getting head-to-head record:', error);
       console.error('❌ Error details:', error.message);
       
       // Fallback to showing no previous matches when API fails
       return { wins: 0, losses: 0, totalMatches: 0, lastMatch: null };
     }
   };

   // Machine Learning: Enhanced confidence calculation with learned data
   const calculateLearnedConfidence = (challenger, defender, suggestion) => {
    const baseConfidence = suggestion.confidence;
    const challengerPrefs = getLearnedPreferences(challenger._id || challenger.email);
    const defenderPrefs = getLearnedPreferences(defender._id || defender.email);

    let learnedBonus = 0;

    // Bonus for match types the challenger prefers
    if (challengerPrefs.preferredMatchTypes && challengerPrefs.preferredMatchTypes[suggestion.type]) {
      learnedBonus += 5;
    }

    // Bonus for opponents with high response rates
    if (defenderPrefs.responseRate > 0.7) {
      learnedBonus += 8;
    } else if (defenderPrefs.responseRate > 0.5) {
      learnedBonus += 4;
    }

    // Bonus for opponents with high success rates
    if (defenderPrefs.successRate > 0.8) {
      learnedBonus += 6;
    } else if (defenderPrefs.successRate > 0.6) {
      learnedBonus += 3;
    }

    // Penalty for opponents with low response rates
    if (defenderPrefs.responseRate < 0.3) {
      learnedBonus -= 10;
    }

    return Math.min(Math.max(baseConfidence + learnedBonus, 10), 95);
  };

  const generateSmartSuggestions = (challenger, defenders) => {
    const suggestions = [];
    const opponentMap = new Map(); // Group suggestions by opponent
    
    // Debug logging (can be removed in production)
    // console.log('🧠 Smart Match Debug:', { challenger, defenders: defenders.length });

    // Filter defenders by ladder
    // Challenger has 'ladder' property, defenders have 'ladderName' property
    const challengerLadder = challenger.ladder || challenger.ladderName;
    const sameLadderDefenders = defenders.filter(defender => 
      defender.ladderName === challengerLadder
    );
    
    // console.log('Same ladder defenders:', sameLadderDefenders.length);

    // Enhanced Challenge Match suggestions (up to 4 spots above)
    const challengeTargets = sameLadderDefenders.filter(defender => 
      defender.position < challenger.position && 
      defender.position >= challenger.position - 4
    );
    
    // console.log('Challenge targets:', challengeTargets.length);

    challengeTargets.forEach(defender => {
      // Enhanced matching analysis
      const availabilityMatch = checkAvailabilityMatch(challenger, defender);
      const locationMatch = checkLocationMatch(challenger, defender);
      const scheduleConflicts = checkScheduleConflicts(challenger, defender);
      
      // Calculate enhanced confidence prioritizing scheduling compatibility
      const baseConfidence = calculateConfidence(challenger, defender, 'challenge');
      const enhancedConfidence = Math.min(1, baseConfidence * 0.2 + availabilityMatch.score * 0.5 + locationMatch.score * 0.25 + scheduleConflicts.score * 0.05);
      
      // Create suggestion object for learned confidence calculation
      const suggestion = {
        defender,
        type: 'challenge',
        confidence: enhancedConfidence,
        availabilityScore: availabilityMatch.score,
        locationScore: locationMatch.score,
        scheduleScore: scheduleConflicts.score,
        positionDiff: challenger.position - defender.position
      };
      
      // Apply machine learning enhancements
      const learnedConfidence = calculateLearnedConfidence(challenger, defender, suggestion);
      
      const positionDiff = challenger.position - defender.position;
      let reason = `Challenge Match: ${defender.firstName} is ${positionDiff} spot${positionDiff > 1 ? 's' : ''} above you`;
      
      // Add smart reasoning
      if (positionDiff === 1) {
        reason += ' - Perfect for a quick climb!';
      } else if (positionDiff === 2) {
        reason += ' - Great opportunity to advance';
      } else if (positionDiff >= 3) {
        reason += ' - High reward challenge';
      }
      
      // Add availability and location insights
      if (availabilityMatch.score > 0.7) {
        reason += ` | 📅 ${availabilityMatch.reason}`;
      }
      if (locationMatch.score > 0.7) {
        reason += ` | 📍 ${locationMatch.reason}`;
      }
      if (scheduleConflicts.score < 0.5) {
        reason += ` | ⚠️ ${scheduleConflicts.reason}`;
      }

      // Store in opponent map instead of directly pushing
      const opponentKey = `${defender.firstName}-${defender.lastName}`;
      if (!opponentMap.has(opponentKey)) {
        opponentMap.set(opponentKey, {
          defender,
          matchTypes: [],
          availabilityScore: availabilityMatch.score,
          locationScore: locationMatch.score,
          scheduleScore: scheduleConflicts.score,
          availabilityDetails: availabilityMatch.details,
          locationDetails: locationMatch.details
        });
      }
      
      opponentMap.get(opponentKey).matchTypes.push({
        type: 'challenge',
        confidence: learnedConfidence,
        reason,
        priority: 1,
        positionDiff,
        learnedBonus: learnedConfidence - enhancedConfidence
      });
    });

    // Fast Track suggestions (up to 6 spots above for players with Fast Track privileges)
    // Check if challenger has Fast Track privileges
    const hasFastTrackPrivileges = challenger.fastTrackChallengesRemaining > 0 && 
                                   challenger.fastTrackExpirationDate && 
                                   new Date() < new Date(challenger.fastTrackExpirationDate);
    
    const hasReverseFastTrackPrivileges = challenger.reverseFastTrackChallengesRemaining > 0 && 
                                          challenger.reverseFastTrackExpirationDate && 
                                          new Date() < new Date(challenger.reverseFastTrackExpirationDate);

    if (hasFastTrackPrivileges || hasReverseFastTrackPrivileges) {
      const fastTrackTargets = sameLadderDefenders.filter(defender => 
        defender.position < challenger.position && 
        defender.position >= challenger.position - 6 // Extended range for Fast Track
      );

      fastTrackTargets.forEach(defender => {
        const availabilityMatch = checkAvailabilityMatch(challenger, defender);
        const locationMatch = checkLocationMatch(challenger, defender);
        const scheduleConflicts = checkScheduleConflicts(challenger, defender);
        
        const baseConfidence = calculateConfidence(challenger, defender, 'fast-track');
        const enhancedConfidence = Math.min(1, baseConfidence * 0.2 + availabilityMatch.score * 0.5 + locationMatch.score * 0.25 + scheduleConflicts.score * 0.05);
        
        const positionDiff = challenger.position - defender.position;
        const fastTrackType = hasFastTrackPrivileges ? 'fast-track' : 'reverse-fast-track';
        const fastTrackName = hasFastTrackPrivileges ? 'Fast Track' : 'Reverse Fast Track';
        const challengesRemaining = hasFastTrackPrivileges ? challenger.fastTrackChallengesRemaining : challenger.reverseFastTrackChallengesRemaining;
        
        let reason = `${fastTrackName} Challenge: ${defender.firstName} is ${positionDiff} spot${positionDiff > 1 ? 's' : ''} above you (Extended Range!)`;
        reason += ` | ${challengesRemaining} Fast Track challenges remaining`;
        
        // Add smart reasoning for Fast Track
        if (positionDiff > 4) {
          reason += ' - Extended range opportunity!';
        } else if (positionDiff >= 3) {
          reason += ' - Great Fast Track target';
        }
        
        // Add availability and location insights
        if (availabilityMatch.score > 0.7) {
          reason += ` | 📅 ${availabilityMatch.reason}`;
        }
        if (locationMatch.score > 0.7) {
          reason += ` | 📍 ${locationMatch.reason}`;
        }
        if (scheduleConflicts.score < 0.5) {
          reason += ` | ⚠️ ${scheduleConflicts.reason}`;
        }

        // Store in opponent map
        const opponentKey = `${defender.firstName}-${defender.lastName}`;
        if (!opponentMap.has(opponentKey)) {
          opponentMap.set(opponentKey, {
            defender,
            matchTypes: [],
            availabilityScore: availabilityMatch.score,
            locationScore: locationMatch.score,
            scheduleScore: scheduleConflicts.score,
            availabilityDetails: availabilityMatch.details,
            locationDetails: locationMatch.details
          });
        }
        
        opponentMap.get(opponentKey).matchTypes.push({
          type: fastTrackType,
          confidence: enhancedConfidence,
          reason,
          priority: 0, // High priority for Fast Track
          positionDiff,
          learnedBonus: 0
        });
      });
    }

    // Enhanced SmackDown suggestions (up to 5 spots below)
    const smackdownTargets = sameLadderDefenders.filter(defender => 
      defender.position > challenger.position && 
      defender.position <= challenger.position + 5
    );

    smackdownTargets.forEach(defender => {
      // Enhanced matching analysis
      const availabilityMatch = checkAvailabilityMatch(challenger, defender);
      const locationMatch = checkLocationMatch(challenger, defender);
      const scheduleConflicts = checkScheduleConflicts(challenger, defender);
      
      // Calculate enhanced confidence prioritizing scheduling compatibility
      const baseConfidence = calculateConfidence(challenger, defender, 'smackdown');
      const enhancedConfidence = Math.min(1, baseConfidence * 0.2 + availabilityMatch.score * 0.5 + locationMatch.score * 0.25 + scheduleConflicts.score * 0.05);
      
      const positionDiff = defender.position - challenger.position;
      let reason = `SmackDown Match: ${defender.firstName} is ${positionDiff} spot${positionDiff > 1 ? 's' : ''} below you`;
      
      // Add smart reasoning
      if (positionDiff === 1) {
        reason += ' - Defend your position';
      } else if (positionDiff <= 3) {
        reason += ' - Maintain your ranking';
      } else {
        reason += ' - Show your dominance';
      }
      
      // Add availability and location insights
      if (availabilityMatch.score > 0.7) {
        reason += ` | 📅 ${availabilityMatch.reason}`;
      }
      if (locationMatch.score > 0.7) {
        reason += ` | 📍 ${locationMatch.reason}`;
      }
      if (scheduleConflicts.score < 0.5) {
        reason += ` | ⚠️ ${scheduleConflicts.reason}`;
      }

      // Store in opponent map
      const opponentKey = `${defender.firstName}-${defender.lastName}`;
      if (!opponentMap.has(opponentKey)) {
        opponentMap.set(opponentKey, {
          defender,
          matchTypes: [],
          availabilityScore: availabilityMatch.score,
          locationScore: locationMatch.score,
          scheduleScore: scheduleConflicts.score,
          availabilityDetails: availabilityMatch.details,
          locationDetails: locationMatch.details
        });
      }
      
      opponentMap.get(opponentKey).matchTypes.push({
        type: 'smackdown',
        confidence: enhancedConfidence,
        reason,
        priority: 2,
        positionDiff
      });
    });

    // Enhanced Ladder Jump suggestions (if eligible)
    if (challenger.ladderName === '499-under' && challenger.position <= 3) {
      const higherLadderDefenders = defenders.filter(defender => 
        ['500-549', '550-plus'].includes(defender.ladderName)
      ).slice(-4); // Last 4 positions

      higherLadderDefenders.forEach(defender => {
        const confidence = calculateConfidence(challenger, defender, 'ladder-jump');
        const reason = `Ladder Jump: ${defender.firstName} is in ${defender.ladderName} ladder - Big opportunity to advance!`;
        
        suggestions.push({
          defender,
          type: 'ladder-jump',
          confidence,
          reason,
          priority: 3
        });
      });
    }


    // Add "Perfect Match" suggestions for players with high availability and location compatibility
    const perfectMatches = sameLadderDefenders.filter(defender => {
      const availabilityMatch = checkAvailabilityMatch(challenger, defender);
      const locationMatch = checkLocationMatch(challenger, defender);
      const scheduleConflicts = checkScheduleConflicts(challenger, defender);
      
      // Perfect match criteria: high availability, good location match, no schedule conflicts
      return availabilityMatch.score >= 0.7 && 
             locationMatch.score >= 0.6 && 
             scheduleConflicts.score >= 0.8;
    });

    perfectMatches.forEach(defender => {
      const availabilityMatch = checkAvailabilityMatch(challenger, defender);
      const locationMatch = checkLocationMatch(challenger, defender);
      const scheduleConflicts = checkScheduleConflicts(challenger, defender);
      
      const positionDiff = Math.abs(challenger.position - defender.position);
      const matchType = challenger.position > defender.position ? 'challenge' : 'smackdown';
      
      const confidence = 0.9; // High confidence for perfect matches
      const reason = `Perfect Match: ${defender.firstName} - Great availability & location compatibility! | 📅 ${availabilityMatch.reason} | 📍 ${locationMatch.reason}`;
      
       suggestions.push({
         defender,
         type: 'perfect-match',
         confidence,
         reason,
         priority: 0, // Highest priority
         positionDiff,
         availabilityScore: availabilityMatch.score,
         locationScore: locationMatch.score,
         scheduleScore: scheduleConflicts.score,
         availabilityDetails: availabilityMatch.details,
         locationDetails: locationMatch.details
       });
    });


    // Convert opponent map to final suggestions array
    const finalSuggestions = Array.from(opponentMap.values()).map(opponentData => {
      // Sort match types by priority and confidence
      const sortedMatchTypes = opponentData.matchTypes.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return b.confidence - a.confidence;
      });
      
      // Get the best match type for display
      const bestMatchType = sortedMatchTypes[0];
      
      return {
        defender: opponentData.defender,
        type: bestMatchType.type,
        confidence: bestMatchType.confidence,
        reason: bestMatchType.reason,
        priority: bestMatchType.priority,
        positionDiff: bestMatchType.positionDiff,
        availabilityScore: opponentData.availabilityScore,
        locationScore: opponentData.locationScore,
        scheduleScore: opponentData.scheduleScore,
        availabilityDetails: opponentData.availabilityDetails,
        locationDetails: opponentData.locationDetails,
        allMatchTypes: sortedMatchTypes, // Include all available match types
        learnedBonus: bestMatchType.learnedBonus || 0
      };
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.confidence - a.confidence;
    })
    .slice(0, 10); // Top 10 suggestions
    
    console.log('Final suggestions:', finalSuggestions.length);
    console.log('Final suggestions:', finalSuggestions);
    
    return finalSuggestions;
  };

  const calculateConfidence = (challenger, defender, type) => {
    let confidence = 50; // Base confidence

    // Factor in position difference (more nuanced)
    const positionDiff = Math.abs(challenger.position - defender.position);
    if (positionDiff === 1) confidence += 25; // Adjacent positions are ideal
    else if (positionDiff === 2) confidence += 20;
    else if (positionDiff === 3) confidence += 15;
    else if (positionDiff <= 5) confidence += 10;
    else if (positionDiff <= 8) confidence += 5;

    // Factor in activity (recent matches) - more detailed
    if (defender.recentMatches && defender.recentMatches.length > 0) {
      const lastMatch = new Date(defender.recentMatches[0].date);
      const daysSinceLastMatch = (new Date() - lastMatch) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastMatch <= 1) confidence += 20; // Very recent
      else if (daysSinceLastMatch <= 3) confidence += 18;
      else if (daysSinceLastMatch <= 7) confidence += 15;
      else if (daysSinceLastMatch <= 14) confidence += 12;
      else if (daysSinceLastMatch <= 30) confidence += 8;
      else if (daysSinceLastMatch <= 60) confidence += 3;
      else confidence -= 5; // Inactive players
    } else {
      confidence -= 10; // No recent matches
    }

    // Factor in win rate (more sophisticated)
    if (defender.wins && defender.totalMatches) {
      const winRate = defender.wins / defender.totalMatches;
      const totalMatches = defender.totalMatches;
      
      if (totalMatches >= 10) { // Established player
        if (winRate >= 0.7) confidence += 15;
        else if (winRate >= 0.6) confidence += 12;
        else if (winRate >= 0.5) confidence += 8;
        else if (winRate >= 0.4) confidence += 3;
        else confidence -= 5;
      } else if (totalMatches >= 5) { // Developing player
        if (winRate >= 0.6) confidence += 10;
        else if (winRate >= 0.4) confidence += 5;
        else confidence -= 2;
      } else { // New player
        confidence += 5; // Give new players a chance
      }
    }

    // Remove match type bonuses - scheduling difficulty should be the same regardless of match type

    // Factor in ladder level
    if (challenger.ladderName === defender.ladderName) {
      confidence += 5; // Same ladder is preferred
    }

    // Factor in player experience (if available)
    if (defender.totalMatches) {
      if (defender.totalMatches >= 20) confidence += 3; // Experienced
      else if (defender.totalMatches >= 10) confidence += 2;
      else if (defender.totalMatches >= 5) confidence += 1;
    }

    // Factor in recent performance trend (if we have multiple recent matches)
    if (defender.recentMatches && defender.recentMatches.length >= 3) {
      const recentWins = defender.recentMatches.slice(0, 3).filter(match => 
        match.winner === defender.email || match.winner === defender.firstName
      ).length;
      
      if (recentWins >= 2) confidence += 8; // Hot streak
      else if (recentWins === 1) confidence += 3; // Mixed
      else confidence -= 5; // Cold streak
    }

    // Factor in time of day (if we want to consider optimal match times)
    const currentHour = new Date().getHours();
    if (currentHour >= 18 && currentHour <= 22) {
      confidence += 3; // Evening is good for matches
    } else if (currentHour >= 12 && currentHour <= 17) {
      confidence += 2; // Afternoon is decent
    }

    return Math.min(Math.max(confidence, 10), 95); // Cap between 10% and 95%
  };

  const handleSuggestionSelect = (suggestion) => {
    setSelectedDefender(suggestion.defender);
    setChallengeType(suggestion.type);
    setShowChallengeModal(true);
  };

   const handleViewDetails = async (suggestion, e) => {
     e.stopPropagation(); // Prevent triggering the main card click
     setSelectedSuggestion(suggestion);
     setShowDetailsModal(true);
     
     // Load head-to-head record
     setLoadingHeadToHead(true);
     try {
       const record = await getHeadToHeadRecord(challenger, suggestion.defender);
       setHeadToHeadRecord(record);
     } catch (error) {
       console.error('Error loading head-to-head record:', error);
       setHeadToHeadRecord({ wins: 0, losses: 0, totalMatches: 0, lastMatch: null });
     } finally {
       setLoadingHeadToHead(false);
     }
   };

  const handleMatchTypeClick = (matchType, e) => {
    e.stopPropagation();
    console.log('🎯 Match type clicked:', matchType);
    console.log('🎯 Setting selectedMatchType to:', matchType);
    console.log('🎯 Setting showMatchTypeModal to true');
    setSelectedMatchType(matchType);
    setShowMatchTypeModal(true);
    console.log('🎯 Modal state should be updated now');
  };

  const handleChallengeClick = (suggestion) => {
    setSelectedDefender(suggestion.defender);
    setChallengeType(suggestion.type);
    setShowChallengeModal(true);
  };

  const handleChallengeFromDetails = (suggestion) => {
    setShowDetailsModal(false);
    setSelectedDefender(suggestion.defender);
    setChallengeType(suggestion.type);
    setShowChallengeModal(true);
  };

  // AI Assistant: Natural language query processing
  const handleAIQuery = () => {
    if (!aiQuery.trim()) return;
    
    const query = aiQuery.toLowerCase().trim();
    let filteredSuggestions = [...suggestions];
    
    // Parse natural language queries
    if (query.includes('challenge') || query.includes('above')) {
      filteredSuggestions = suggestions.filter(s => s.type === 'challenge');
    } else if (query.includes('smackdown') || query.includes('below')) {
      filteredSuggestions = suggestions.filter(s => s.type === 'smackdown');
    } else if (query.includes('perfect match') || query.includes('perfect')) {
      filteredSuggestions = suggestions.filter(s => s.type === 'perfect-match');
    } else if (query.includes('fast track') || query.includes('fasttrack')) {
      filteredSuggestions = suggestions.filter(s => s.type === 'fast-track' || s.type === 'reverse-fast-track');
    } else if (query.includes('reverse fast track') || query.includes('reverse fasttrack')) {
      filteredSuggestions = suggestions.filter(s => s.type === 'reverse-fast-track');
    }
    
    // Parse position queries
    if (query.includes('1 position') || query.includes('one position')) {
      filteredSuggestions = filteredSuggestions.filter(s => s.positionDiff === 1);
    } else if (query.includes('2 position') || query.includes('two position')) {
      filteredSuggestions = filteredSuggestions.filter(s => s.positionDiff === 2);
    } else if (query.includes('3 position') || query.includes('three position')) {
      filteredSuggestions = filteredSuggestions.filter(s => s.positionDiff === 3);
    }
    
    // Parse time queries
    if (query.includes('tonight') || query.includes('evening')) {
      // Filter by players with evening availability
      filteredSuggestions = filteredSuggestions.filter(s => 
        s.availabilityScore > 0.6
      );
    } else if (query.includes('weekend') || query.includes('saturday') || query.includes('sunday')) {
      // Filter by players with weekend availability
      filteredSuggestions = filteredSuggestions.filter(s => 
        s.availabilityScore > 0.5
      );
    }
    
    // Parse availability queries
    if (query.includes('available') || query.includes('free')) {
      filteredSuggestions = filteredSuggestions.filter(s => 
        s.availabilityScore > 0.7 && s.scheduleScore > 0.7
      );
    }
    
    // Parse location queries
    if (query.includes('location') || query.includes('nearby') || query.includes('close')) {
      filteredSuggestions = filteredSuggestions.filter(s => 
        s.locationScore > 0.6
      );
    }
    
    // Sort by confidence for best matches
    filteredSuggestions.sort((a, b) => b.confidence - a.confidence);
    
    setAiISuggestions(filteredSuggestions);
    
    // Clear the query
    setAiQuery('');
    
    console.log('🤖 AI Query processed:', { query, results: filteredSuggestions.length });
  };

  const handleClose = () => {
    setSuggestions([]);
    setSelectedDefender(null);
    setShowChallengeModal(false);
    onClose();
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return '#10b981'; // Green for "Very Likely"
    if (confidence >= 60) return '#3b82f6'; // Blue for "Likely"
    if (confidence >= 40) return '#f59e0b'; // Amber for "Maybe"
    return '#6b7280'; // Gray for "Unlikely"
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 80) return 'Easy Smart Match';
    if (confidence >= 60) return 'Possible Smart Match';
    if (confidence >= 40) return 'Unlikely Smart Match';
    return 'Very Unlikely Smart Match';
  };

  const getChallengeTypeIcon = (type) => {
    const icons = {
      'challenge': '⚔️',
      'smackdown': '💥',
      'ladder-jump': '🆙',
      'smackback': '🔄',
      'fast-track': '🚀',
      'reverse-fast-track': '🔄',
    };
    return icons[type] || '⚔️';
  };

  const getChallengeTypeName = (type) => {
    const names = {
      'challenge': '⚔️ Challenge Match',
      'smackdown': '💥 SmackDown Match',
      'ladder-jump': '🆙 Ladder Jump',
      'smackback': '🔄 SmackBack Match',
      'fast-track': '🚀 Fast Track Challenge',
      'reverse-fast-track': '🔄 Reverse Fast Track Challenge',
    };
    return names[type] || type;
  };

  // Function to check if a player has a hot streak (3+ consecutive wins)
  const hasHotStreak = (player) => {
    if (!player.recentMatches || player.recentMatches.length === 0) return false;
    
    let consecutiveWins = 0;
    for (let i = 0; i < player.recentMatches.length; i++) {
      if (player.recentMatches[i].result === 'win') {
        consecutiveWins++;
        if (consecutiveWins >= 3) return true;
      } else {
        break; // Streak broken
      }
    }
    return false;
  };

  const getMatchTypeDescription = (type) => {
    const descriptions = {
      'challenge': {
        title: 'Challenge Match',
        description: 'A standard ladder challenge where you challenge a player above you on the ladder. Win to move up in position!',
        rules: [
          'Players can challenge opponents up to 4 spots above them',
          'Challenger wins: Players switch positions',
          'Defender wins: Ladder positions remain unchanged',
          'Must be accepted when called out'
        ]
      },
      'smackdown': {
        title: 'SmackDown Match',
        description: 'An intense match with special rules and higher stakes. The challenger pays full entry fee, defender pays 50%.',
        rules: [
          'Any player can call out a "SmackDown"',
          'Player calls out an opponent no more than 5 spots below them',
          'The Challenger pays the full entry fee; the Defender pays 50% of the entry fee',
          'If Challenger Wins: Opponent moves THREE spots down, challenger moves TWO spots up (but not into first place)',
          'If Challenger Loses: Players switch positions',
          'First place must be earned via a Challenge Match or SmackBack match'
        ]
      },
      'ladder-jump': {
        title: 'Ladder Jump',
        description: 'Challenge a player much higher on the ladder to jump multiple positions at once. High risk, high reward! (Currently not available in UI)',
        rules: [
          'Challenge players significantly above your current position',
          'Win to jump multiple positions at once',
          'Lose and you stay in your current position',
          'Requires mutual agreement on the jump distance',
          'Must be accepted when called out',
          'Note: This feature is not yet available in the user interface'
        ]
      },
      'smackback': {
        title: 'SmackBack Match',
        description: 'A special match where a SmackDown defender can challenge for 1st place in their next match.',
        rules: [
          'If the SmackDown defender wins, they can challenge for 1st place in their next match with a SmackBack',
          'The Challenger pays the full entry fee; the Defender pays 50% of the entry fee',
          'If Challenger Wins: Moves into 1st place, all other positions move down one spot',
          'If Defender Wins: Ladder positions remain unchanged'
        ]
      },
      'fast-track': {
        title: 'Fast Track Challenge',
        description: 'Special challenge for players who moved down to 499-under ladder with Fast Track privileges.',
        rules: [
          'Can challenge up to 6 spots above (normal limit is 4)',
          'Winner takes defender\'s position, others move down one spot',
          'Limited to 2 challenges within 4 weeks',
          'Must be on same ladder for Fast Track challenges'
        ]
      },
      'reverse-fast-track': {
        title: 'Reverse Fast Track Challenge',
        description: 'Special challenge for players who moved down to 499-under ladder with Reverse Fast Track privileges.',
        rules: [
          'Can challenge up to 6 spots above (normal limit is 4)',
          'Winner takes defender\'s position, others move down one spot',
          'Limited to 2 challenges within 4 weeks',
          'Must be on same ladder for Fast Track challenges'
        ]
      },
    };
    return descriptions[type] || {
      title: 'Unknown Match Type',
      description: 'This match type is not recognized.',
      rules: ['Contact an administrator for more information.']
    };
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <DraggableModal
        open={true}
        onClose={handleClose}
        title={`🧠 Smart Match: ${challenger.firstName} ${challenger.lastName}`}
        maxWidth="1200px"
        maxHeight="80vh"
        className="ladder-smart-match-modal"
        borderColor="#5b21b6"
        glowColor="#5b21b6"
      >
        <div className="ladder-smart-match-content">
          {/* Header Info */}
          <div className="ladder-smart-match-header">
            <h3 className="ladder-smart-match-title">
              Smart Match Suggestions
            </h3>
            <p className="ladder-smart-match-subtitle">
              AI-powered suggestions based on ladder rules, player activity, and match history
            </p>
            
            {/* AI Assistant Button */}
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <button
                onClick={() => setShowAIAssistant(true)}
                style={{
                  background: 'linear-gradient(135deg, #6b46c1 0%, #a855f7 100%)',
                  border: '1px solid #5b21b6',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(91, 33, 182, 0.3)'
                }}
              >
                🤖 Ask AI Assistant
              </button>
            </div>
          </div>

          {loading && (
            <div className="ladder-smart-match-loading">
              <div className="ladder-smart-match-spinner"></div>
              <p className="ladder-smart-match-loading-text">
                Analyzing ladder data and generating suggestions...
              </p>
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <div className="ladder-smart-match-empty">
              <div className="ladder-smart-match-empty-icon">🤔</div>
              <h3 className="ladder-smart-match-empty-title">No Suggestions Available</h3>
              <p className="ladder-smart-match-empty-message">
                {availableDefenders.length === 0 ? (
                  <>
                    No opponents found on this ladder.<br/>
                    <small style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                      This could mean the ladder data hasn't loaded yet or there's a connection issue.
                    </small>
                  </>
                ) : (
                  'No suitable opponents found for smart match suggestions.'
                )}
              </p>
              {availableDefenders.length === 0 && (
                <button 
                  onClick={() => window.location.reload()} 
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    background: '#5b21b6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Refresh Page
                </button>
              )}
            </div>
          )}


          {!loading && suggestions.length > 0 && (
            <div className="ladder-smart-match-suggestions">
              <h4 className="ladder-smart-match-suggestions-title">
                Top Suggestions ({suggestions.length})
              </h4>
              
              <div className="ladder-smart-match-suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={`${suggestion.defender._id}-${suggestion.type}`}
                    className="ladder-smart-match-suggestion"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <div className="ladder-smart-match-suggestion-header">
                      <div className="ladder-smart-match-suggestion-info">
                        <h4 className="ladder-smart-match-suggestion-title">
                          {suggestion.defender.firstName} {suggestion.defender.lastName}
                          {!suggestion.defender.unifiedAccount?.hasUnifiedAccount && (
                            <span className="ladder-smart-match-asterisk" title="Incomplete profile - limited contact options">
                              *
                            </span>
                          )}
                          {hasHotStreak(suggestion.defender) && (
                            <span className="ladder-smart-match-hot-streak-badge" title="Hot Streak: 3+ consecutive wins!">
                              🔥
                            </span>
                          )}
                        </h4>
                        <span className="ladder-smart-match-suggestion-details">
                          Position {suggestion.defender.position} • {suggestion.defender.ladderName}
                        </span>
                      </div>
                      
                      <div className="ladder-smart-match-confidence">
                        <div 
                          className="ladder-smart-match-confidence-badge"
                          style={{ background: getConfidenceColor(suggestion.confidence) }}
                        >
                          {getConfidenceText(suggestion.confidence)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Availability & Location Info */}
                    <div style={{ 
                      marginBottom: '12px', 
                      padding: '8px 12px', 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      {/* Availability Info */}
                      {suggestion.availabilityDetails && suggestion.availabilityDetails !== 'No overlapping free time found' && (
                        <div style={{ marginBottom: '6px', textAlign: 'center' }}>
                          <div style={{ 
                            color: '#4CAF50', 
                            fontSize: '0.75rem', 
                            fontWeight: '600',
                            marginBottom: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}>
                            📅 <span>Overlapping Availability:</span>
                          </div>
                          <div style={{ 
                            color: '#81C784', 
                            fontSize: '0.7rem',
                            lineHeight: '1.3',
                            textAlign: 'center'
                          }}>
                            {suggestion.availabilityDetails}
                          </div>
                        </div>
                      )}
                      
                      {/* Location Info */}
                      {suggestion.locationDetails && suggestion.locationDetails !== 'No location data' && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ 
                            color: '#FFB74D', 
                            fontSize: '0.75rem', 
                            fontWeight: '600',
                            marginBottom: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}>
                            📍 <span>Location Match:</span>
                          </div>
                          <div style={{ 
                            color: '#FFCC80', 
                            fontSize: '0.7rem',
                            lineHeight: '1.3',
                            textAlign: 'center'
                          }}>
                            {suggestion.locationDetails}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="ladder-smart-match-suggestion-footer">
                      <div className="ladder-smart-match-tags">
                        {/* Show all applicable match types */}
                        {suggestion.allMatchTypes && suggestion.allMatchTypes.map((matchType, index) => (
                        <button 
                            key={index}
                          className="ladder-smart-match-tag ladder-smart-match-tag-primary"
                          title="Click to learn more about this match type"
                            onClick={(e) => handleMatchTypeClick(matchType.type, e)}
                          style={{ 
                            cursor: 'pointer', 
                            userSelect: 'none',
                            border: 'none',
                            background: 'transparent',
                            color: 'white',
                            padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                            fontWeight: '600',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0px',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                              textAlign: 'center',
                              minHeight: 'auto',
                              marginRight: '3px',
                              marginBottom: '2px'
                            }}
                          >
                            <div style={{ fontSize: '0.65rem' }}>Learn About</div>
                            <div style={{ fontSize: '0.65rem' }}>{getChallengeTypeName(matchType.type)} {getChallengeTypeIcon(matchType.type)}</div>
                        </button>
                        ))}
                        
                        {suggestion.availabilityScore > 0.7 && (
                          <span className="ladder-smart-match-tag ladder-smart-match-tag-success">
                            📅 Good Availability
                          </span>
                        )}
                        
                        {suggestion.locationScore > 0.7 && (
                          <span className="ladder-smart-match-tag ladder-smart-match-tag-info">
                            📍 Location Match
                          </span>
                        )}
                      </div>
                      
                      <div className="ladder-smart-match-actions">
                        {/* Single Schedule button that handles multiple match types */}
                        {suggestion.allMatchTypes && suggestion.allMatchTypes.length > 1 ? (
                          <button
                            className="ladder-smart-match-action-btn ladder-smart-match-action-btn-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open match type selection modal
                              setSelectedSuggestion(suggestion);
                              setShowMatchTypeSelection(true);
                            }}
                            style={{
                              marginRight: '8px'
                            }}
                          >
                            Schedule Match ({suggestion.allMatchTypes.length} options)
                          </button>
                        ) : (
                        <button
                          className="ladder-smart-match-action-btn ladder-smart-match-action-btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChallengeClick(suggestion);
                          }}
                            style={{
                              marginRight: '8px'
                          }}
                        >
                          Schedule {getChallengeTypeName(suggestion.type).replace('⚔️ ', '').replace('💥 ', '').replace('🆙 ', '').replace('🔄 ', '').replace('🔥 ', '').replace('⭐ ', '')}
                        </button>
                        )}
                        
                        <button
                          className="ladder-smart-match-action-btn ladder-smart-match-action-btn-secondary"
                          onClick={(e) => handleViewDetails(suggestion, e)}
                        >
                          📊 View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: 'rgba(255, 193, 7, 0.1)', 
                border: '1px solid rgba(255, 193, 7, 0.3)', 
                borderRadius: '4px',
                color: '#ffc107',
                fontSize: '0.9rem'
              }}>
                💡 <strong>Tip:</strong> Click on any suggestion to create a challenge. The confidence score indicates how likely the opponent is to respond positively.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            {/* Profile completion legend */}
            <div className="ladder-smart-match-legend">
              <p className="ladder-smart-match-legend-text">
                <span className="ladder-smart-match-asterisk">*</span> = Incomplete profile (limited contact options)
              </p>
            </div>

            <button
              onClick={handleClose}
              style={{
                padding: '12px 24px',
                background: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                marginLeft: 'auto'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </DraggableModal>

      {/* Challenge Modal */}
      {showChallengeModal && selectedDefender && (
        <LadderChallengeModal
          isOpen={showChallengeModal}
          onClose={() => setShowChallengeModal(false)}
          challenger={challenger}
          defender={selectedDefender}
          challengeType={challengeType}
          onChallengeComplete={(result) => {
            setShowChallengeModal(false);
            setSelectedDefender(null);
            if (onChallengeComplete) {
              onChallengeComplete(result);
            }
            handleClose();
          }}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedSuggestion && (
         <DraggableModal
           open={showDetailsModal}
           onClose={() => setShowDetailsModal(false)}
           title={`📊 Match Analysis: ${selectedSuggestion.defender.firstName} ${selectedSuggestion.defender.lastName}`}
           maxWidth="500px"
           maxHeight="80vh"
           className="ladder-smart-match-details-modal"
           borderColor="#5b21b6"
           glowColor="#5b21b6"
         >
           <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
             {/* Player Info */}
             <div style={{ 
               background: 'rgba(91, 33, 182, 0.15)', 
               border: '1px solid rgba(91, 33, 182, 0.4)', 
               borderRadius: '8px', 
               padding: '16px', 
               marginBottom: '20px' 
             }}>
               <h3 style={{ color: '#ffffff', margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                 {getChallengeTypeIcon(selectedSuggestion.type)} {getChallengeTypeName(selectedSuggestion.type)}
               </h3>
               <p style={{ color: '#e0e0e0', margin: '0', fontSize: '1rem', fontWeight: '500' }}>
                 Position {selectedSuggestion.defender.position} • {selectedSuggestion.defender.ladderName}
               </p>
             </div>

             {/* Confidence Breakdown */}
             <div style={{ marginBottom: '24px' }}>
               <h4 style={{ color: '#ffc107', marginBottom: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}>Match Compatibility</h4>
               <p style={{ color: '#d1d5db', fontSize: '0.95rem', marginBottom: '16px', fontStyle: 'italic' }}>
                 How easy this match will be to schedule and coordinate:
               </p>
               <div style={{ 
                 background: 'rgba(0, 0, 0, 0.4)', 
                 border: '1px solid #555', 
                 borderRadius: '8px', 
                 padding: '16px' 
               }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-start' }}>
                   <div style={{ flex: 1 }}>
                     <span style={{ color: '#ffffff', fontSize: '1rem', fontWeight: '600' }}>Scheduling Ease:</span>
                     <div style={{ fontSize: '0.85rem', color: '#d1d5db', marginTop: '4px' }}>
                       {selectedSuggestion.confidence >= 80 ? '🟢 Very easy to coordinate' :
                        selectedSuggestion.confidence >= 60 ? '🟡 Some coordination needed' :
                        '🔵 Requires more planning'}
                     </div>
                   </div>
                   <span style={{ 
                     color: getConfidenceColor(selectedSuggestion.confidence),
                     fontWeight: 'bold',
                     fontSize: '1rem',
                     padding: '4px 8px',
                     background: 'rgba(255, 255, 255, 0.1)',
                     borderRadius: '4px'
                   }}>
                     {getConfidenceText(selectedSuggestion.confidence)}
                   </span>
                 </div>
                
                 {selectedSuggestion.availabilityScore !== undefined && (
                   <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start' }}>
                       <div style={{ flex: 1 }}>
                         <span style={{ color: '#ffffff', fontSize: '1rem', fontWeight: '600' }}>📅 Availability Match:</span>
                         <div style={{ fontSize: '0.85rem', color: '#d1d5db', marginTop: '4px' }}>
                           {selectedSuggestion.availabilityScore === 0.5 ? '⚪ No availability data set' :
                            selectedSuggestion.availabilityScore > 0.7 ? '🟢 You have similar free times' :
                            selectedSuggestion.availabilityScore > 0.4 ? '🟡 Some matching availability' :
                            '🔴 Very different free time schedules'}
                         </div>
                       </div>
                       <span style={{ 
                         color: selectedSuggestion.availabilityScore === 0.5 ? '#9ca3af' :
                                selectedSuggestion.availabilityScore > 0.7 ? '#10b981' : '#f59e0b', 
                         fontSize: '1rem',
                         fontWeight: 'bold',
                         padding: '4px 8px',
                         background: 'rgba(255, 255, 255, 0.1)',
                         borderRadius: '4px'
                       }}>
                         {Math.round(selectedSuggestion.availabilityScore * 100)}%
                       </span>
                     </div>
                     {selectedSuggestion.availabilityDetails && (
                       <div style={{ 
                         fontSize: '0.85rem', 
                         color: '#e0e0e0', 
                         background: 'rgba(91, 33, 182, 0.15)', 
                         border: '1px solid rgba(91, 33, 182, 0.3)', 
                         borderRadius: '6px', 
                         padding: '8px 12px',
                         marginTop: '8px'
                       }}>
                         <strong style={{ color: '#ffffff' }}>Overlapping times:</strong> {selectedSuggestion.availabilityDetails}
                       </div>
                     )}
                   </div>
                 )}
                 
                 {selectedSuggestion.locationScore !== undefined && (
                   <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start' }}>
                       <div style={{ flex: 1 }}>
                         <span style={{ color: '#ffffff', fontSize: '1rem', fontWeight: '600' }}>📍 Location Match:</span>
                         <div style={{ fontSize: '0.85rem', color: '#d1d5db', marginTop: '4px' }}>
                           {selectedSuggestion.locationScore > 0.7 ? '🟢 You prefer the same pool halls' :
                            selectedSuggestion.locationScore > 0.4 ? '🟡 Some overlapping preferred venues' :
                            '🔴 You prefer different pool halls'}
                         </div>
                       </div>
                       <span style={{ 
                         color: selectedSuggestion.locationScore > 0.7 ? '#10b981' : '#f59e0b', 
                         fontSize: '1rem',
                         fontWeight: 'bold',
                         padding: '4px 8px',
                         background: 'rgba(255, 255, 255, 0.1)',
                         borderRadius: '4px'
                       }}>
                         {Math.round(selectedSuggestion.locationScore * 100)}%
                       </span>
                     </div>
                     {selectedSuggestion.locationDetails && (
                       <div style={{ 
                         fontSize: '0.85rem', 
                         color: '#e0e0e0', 
                         background: 'rgba(59, 130, 246, 0.15)', 
                         border: '1px solid rgba(59, 130, 246, 0.3)', 
                         borderRadius: '6px', 
                         padding: '8px 12px',
                         marginTop: '8px'
                       }}>
                         <strong style={{ color: '#ffffff' }}>Common venues:</strong> {selectedSuggestion.locationDetails}
                       </div>
                     )}
                   </div>
                 )}
                 
                 {selectedSuggestion.scheduleScore !== undefined && (
                   <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                       <div style={{ flex: 1 }}>
                         <span style={{ color: '#ffffff', fontSize: '1rem', fontWeight: '600' }}>📅 Schedule Conflicts:</span>
                         <div style={{ fontSize: '0.85rem', color: '#d1d5db', marginTop: '4px' }}>
                         {selectedSuggestion.scheduleScore > 0.7 ? '🟢 No upcoming matches - both players free' :
                          selectedSuggestion.scheduleScore > 0.4 ? '🟡 One player has upcoming matches' :
                          '🔴 Both players have upcoming matches'}
                       </div>
                     </div>
                       <span style={{ 
                         color: selectedSuggestion.scheduleScore > 0.7 ? '#10b981' : '#f59e0b', 
                         fontSize: '1rem',
                         fontWeight: 'bold',
                         padding: '4px 8px',
                         background: 'rgba(255, 255, 255, 0.1)',
                         borderRadius: '4px'
                       }}>
                       {Math.round(selectedSuggestion.scheduleScore * 100)}%
                     </span>
                     </div>
                   </div>
                 )}
              </div>
            </div>

             {/* Detailed Reasoning */}
             <div style={{ marginBottom: '24px' }}>
               <h4 style={{ color: '#ffc107', marginBottom: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}>Why This Match?</h4>
               <p style={{ color: '#d1d5db', fontSize: '0.95rem', marginBottom: '12px', fontStyle: 'italic' }}>
                 AI reasoning:
               </p>
               <div style={{ 
                 color: '#e0e0e0', 
                 lineHeight: '1.5',
                 background: 'rgba(0, 0, 0, 0.4)', 
                 border: '1px solid #555', 
                 borderRadius: '8px', 
                 padding: '16px',
                 fontSize: '1rem'
               }}>
                 {selectedSuggestion.reason}
               </div>
             </div>

             {/* Head-to-Head Record */}
             <div style={{ marginBottom: '24px' }}>
               <h4 style={{ color: '#ffc107', marginBottom: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}>Your Record vs {selectedSuggestion.defender.firstName}</h4>
               <p style={{ color: '#d1d5db', fontSize: '0.95rem', marginBottom: '12px', fontStyle: 'italic' }}>
                 Your history against this opponent:
               </p>
               <div style={{ 
                 background: 'rgba(0, 0, 0, 0.4)', 
                 border: '1px solid #555', 
                 borderRadius: '8px', 
                 padding: '16px' 
               }}>
                 {loadingHeadToHead ? (
                   <div style={{ textAlign: 'center', color: '#d1d5db', fontSize: '1rem' }}>
                     🔄 Loading head-to-head record...
                   </div>
                 ) : headToHeadRecord && headToHeadRecord.totalMatches === 0 ? (
                   <div style={{ textAlign: 'center', color: '#d1d5db', fontSize: '1rem' }}>
                     🆕 No previous matches - This would be your first game!
                   </div>
                 ) : headToHeadRecord ? (
                   <>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-start' }}>
                       <div style={{ flex: 1 }}>
                         <span style={{ color: '#ffffff', fontSize: '1rem', fontWeight: '600' }}>Your Record:</span>
                         <div style={{ fontSize: '0.85rem', color: '#d1d5db', marginTop: '4px' }}>
                           {(() => {
                             const winRate = Math.round((headToHeadRecord.wins / headToHeadRecord.totalMatches) * 100);
                             return winRate >= 70 ? '🟢 You dominate this matchup' :
                                    winRate >= 50 ? '🟡 Even matchup' :
                                    '🔴 They have your number';
                           })()}
                         </div>
                       </div>
                       <span style={{ 
                         color: (() => {
                           const winRate = Math.round((headToHeadRecord.wins / headToHeadRecord.totalMatches) * 100);
                           return winRate >= 50 ? '#10b981' : '#ef4444';
                         })(), 
                         fontSize: '1.2rem',
                         fontWeight: 'bold',
                         padding: '4px 8px',
                         background: 'rgba(255, 255, 255, 0.1)',
                         borderRadius: '4px'
                       }}>
                         {headToHeadRecord.wins}-{headToHeadRecord.losses}
                       </span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-start' }}>
                       <div style={{ flex: 1 }}>
                         <span style={{ color: '#ffffff', fontSize: '1rem', fontWeight: '600' }}>Win Rate:</span>
                         <div style={{ fontSize: '0.85rem', color: '#d1d5db', marginTop: '4px' }}>
                           {(() => {
                             const winRate = Math.round((headToHeadRecord.wins / headToHeadRecord.totalMatches) * 100);
                             return winRate >= 70 ? '🟢 Strong advantage' :
                                    winRate >= 50 ? '🟡 Competitive' :
                                    '🔴 Tough opponent';
                           })()}
                         </div>
                       </div>
                       <span style={{ 
                         color: (() => {
                           const winRate = Math.round((headToHeadRecord.wins / headToHeadRecord.totalMatches) * 100);
                           return winRate >= 50 ? '#10b981' : '#ef4444';
                         })(), 
                         fontSize: '1rem',
                         fontWeight: 'bold',
                         padding: '4px 8px',
                         background: 'rgba(255, 255, 255, 0.1)',
                         borderRadius: '4px'
                       }}>
                         {Math.round((headToHeadRecord.wins / headToHeadRecord.totalMatches) * 100)}%
                       </span>
                     </div>
                     {headToHeadRecord.lastMatch && (
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                         <div style={{ flex: 1 }}>
                           <span style={{ color: '#ffffff', fontSize: '1rem', fontWeight: '600' }}>Last Match:</span>
                           <div style={{ fontSize: '0.85rem', color: '#d1d5db', marginTop: '4px' }}>
                             {headToHeadRecord.lastMatch.winner === `${challenger.firstName} ${challenger.lastName}` ? 
                               '🟢 You won' : '🔴 They won'}
                           </div>
                         </div>
                         <span style={{ 
                           color: '#e0e0e0', 
                           fontSize: '1rem',
                           fontWeight: '500',
                           padding: '4px 8px',
                           background: 'rgba(255, 255, 255, 0.1)',
                           borderRadius: '4px'
                         }}>
                           {headToHeadRecord.lastMatch.date === 'Match completed' ? 
                             'Match completed' : 
                             (() => {
                               try {
                                 const date = new Date(headToHeadRecord.lastMatch.date);
                                 return isNaN(date.getTime()) ? 'Match completed' : date.toLocaleDateString();
                               } catch (e) {
                                 return 'Match completed';
                               }
                             })()}
                         </span>
                       </div>
                     )}
                   </>
                 ) : (
                   <div style={{ textAlign: 'center', color: '#d1d5db', fontSize: '1rem' }}>
                     ❌ Error loading head-to-head record
                   </div>
                 )}
               </div>
             </div>

             {/* Match Planning Helper */}
             <div style={{ marginBottom: '16px' }}>
               <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '0.95rem' }}>💡 Match Planning Guide</h4>
               <div style={{ 
                 background: selectedSuggestion.confidence >= 70 ? 'rgba(16, 185, 129, 0.1)' : 
                            selectedSuggestion.confidence >= 50 ? 'rgba(245, 158, 11, 0.1)' : 
                            'rgba(59, 130, 246, 0.1)', 
                 border: selectedSuggestion.confidence >= 70 ? '1px solid rgba(16, 185, 129, 0.3)' : 
                         selectedSuggestion.confidence >= 50 ? '1px solid rgba(245, 158, 11, 0.3)' : 
                         '1px solid rgba(59, 130, 246, 0.3)', 
                 borderRadius: '6px', 
                 padding: '10px' 
               }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                   <span style={{ fontSize: '1rem' }}>
                     {selectedSuggestion.confidence >= 70 ? '🟢' : 
                      selectedSuggestion.confidence >= 50 ? '🟡' : '🔵'}
                   </span>
                   <span style={{ 
                     color: selectedSuggestion.confidence >= 70 ? '#10b981' : 
                            selectedSuggestion.confidence >= 50 ? '#f59e0b' : '#3b82f6',
                     fontWeight: 'bold',
                     fontSize: '0.9rem'
                   }}>
                     {selectedSuggestion.confidence >= 70 ? 'EASY TO SCHEDULE' : 
                      selectedSuggestion.confidence >= 50 ? 'GOOD MATCH' : 'REQUIRES PLANNING'}
                   </span>
                 </div>
                 <p style={{ 
                   color: '#e0e0e0', 
                   fontSize: '0.8rem', 
                   margin: '0',
                   lineHeight: '1.3'
                 }}>
                   {selectedSuggestion.confidence >= 70 ? 
                     'Great compatibility - scheduling should be smooth!' :
                    selectedSuggestion.confidence >= 50 ? 
                     'Good match - some coordination needed for details.' :
                     'Challenging to coordinate - may need more back-and-forth to schedule.'}
                 </p>
               </div>
             </div>

             {/* Action Buttons */}
             <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
               <button
                 onClick={() => setShowDetailsModal(false)}
                 style={{
                   padding: '8px 16px',
                   background: '#666',
                   color: 'white',
                   border: 'none',
                   borderRadius: '6px',
                   cursor: 'pointer',
                   fontSize: '0.9rem'
                 }}
               >
                 Close
               </button>
               <button
                 onClick={() => handleChallengeFromDetails(selectedSuggestion)}
                 style={{
                   padding: '8px 16px',
                   background: selectedSuggestion.confidence >= 70 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                              selectedSuggestion.confidence >= 50 ? 'linear-gradient(135deg, #6b46c1 0%, #a855f7 100%)' :
                              'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                   color: 'white',
                   border: 'none',
                   borderRadius: '6px',
                   cursor: 'pointer',
                   fontWeight: 'bold',
                   fontSize: '0.9rem'
                 }}
               >
                 {selectedSuggestion.confidence >= 70 ? '🚀 Create Challenge' : 
                  selectedSuggestion.confidence >= 50 ? 'Create Challenge' : '⚠️ Create Challenge'}
               </button>
             </div>
          </div>
        </DraggableModal>
      )}

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <DraggableModal
          open={showAIAssistant}
          onClose={() => setShowAIAssistant(false)}
          title={`🤖 AI Match Assistant`}
          maxWidth="800px"
          className="ladder-ai-assistant-modal"
          borderColor="#5b21b6"
          glowColor="#5b21b6"
        >
          <div style={{ padding: '20px' }}>
            {/* AI Assistant Interface */}
            <div style={{ 
              background: 'rgba(91, 33, 182, 0.1)', 
              border: '1px solid rgba(91, 33, 182, 0.3)', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '20px' 
            }}>
              <h4 style={{ color: '#ffffff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🤖 AI Match Assistant
              </h4>
              <p style={{ color: '#e0e0e0', fontSize: '0.9rem', margin: '0 0 12px 0' }}>
                Ask me to find matches in natural language! Try: "Find me someone to challenge tonight" or "Who's available this weekend?"
              </p>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ask me to find a match..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAIQuery();
                    }
                  }}
                />
                <button
                  onClick={handleAIQuery}
                  style={{
                    background: 'linear-gradient(135deg, #6b46c1 0%, #a855f7 100%)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Ask
                </button>
              </div>
              
              {/* Quick suggestions */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  "Find me a challenge match",
                  "Who's available tonight?",
                  "Find someone 2 positions above me"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setAiQuery(suggestion)}
                    style={{
                      background: 'rgba(91, 33, 182, 0.2)',
                      border: '1px solid rgba(91, 33, 182, 0.4)',
                      color: '#c4b5fd',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Query Results */}
            {aiSuggestions.length > 0 && (
              <div className="ladder-smart-match-suggestions">
                <h4 className="ladder-smart-match-suggestions-title">
                  🤖 AI Results ({aiSuggestions.length} matches found)
                </h4>
                
                <div className="ladder-smart-match-suggestions-list">
                  {aiSuggestions.map((suggestion, index) => (
                    <div
                      key={`ai-${suggestion.defender._id}-${suggestion.type}`}
                      className="ladder-smart-match-suggestion"
                      onClick={() => {
                        setShowAIAssistant(false);
                        handleSuggestionSelect(suggestion);
                      }}
                      style={{ border: '2px solid #5b21b6' }}
                    >
                      <div className="ladder-smart-match-suggestion-header">
                        <div className="ladder-smart-match-suggestion-info">
                          <span className="ladder-smart-match-suggestion-icon">
                            🤖 {getChallengeTypeIcon(suggestion.type)}
                          </span>
                          <div>
                            <h4 className="ladder-smart-match-suggestion-title">
                              {suggestion.defender.firstName} {suggestion.defender.lastName}
                              {!suggestion.defender.unifiedAccount?.hasUnifiedAccount && (
                                <span className="ladder-smart-match-asterisk" title="Incomplete profile - limited contact options">
                                  *
                                </span>
                              )}
                            </h4>
                            <p className="ladder-smart-match-suggestion-details">
                              Position {suggestion.defender.position} • {suggestion.defender.ladderName}
                            </p>
                          </div>
                        </div>
                        
                        <div className="ladder-smart-match-confidence">
                          <div 
                            className="ladder-smart-match-confidence-badge"
                            style={{ background: getConfidenceColor(suggestion.confidence) }}
                          >
                            {getConfidenceText(suggestion.confidence)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="ladder-smart-match-suggestion-footer">
                        <div className="ladder-smart-match-tags">
                          <span className={`ladder-smart-match-tag ladder-smart-match-tag-${suggestion.type}`}>
                            {getChallengeTypeName(suggestion.type)}
                          </span>
                          
                          {suggestion.availabilityScore > 0.7 && (
                            <span className="ladder-smart-match-tag ladder-smart-match-tag-success">
                              📅 Good Availability
                            </span>
                          )}
                          
                          {suggestion.locationScore > 0.7 && (
                            <span className="ladder-smart-match-tag ladder-smart-match-tag-info">
                              📍 Location Match
                            </span>
                          )}
                          
                          {suggestion.learnedBonus > 0 && (
                            <span className="ladder-smart-match-tag ladder-smart-match-tag-success">
                              🧠 AI Enhanced
                            </span>
                          )}
                        </div>
                        
                        <button
                          className="ladder-smart-match-details-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAIAssistant(false);
                            handleViewDetails(suggestion, e);
                          }}
                          title="View detailed match analysis"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No results message */}
            {aiSuggestions.length === 0 && aiQuery && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#9ca3af' 
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤔</div>
                <h3 style={{ marginBottom: '8px' }}>No matches found</h3>
                <p>Try a different query or check the main suggestions below.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setShowAIAssistant(false)}
                style={{
                  padding: '10px 20px',
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </DraggableModal>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Fallback styles for GoDaddy hosting issues */
        .ladder-smart-match-modal {
          background: linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(26, 26, 26, 0.98)) !important;
          border: 2px solid #5b21b6 !important;
          border-radius: 12px !important;
          color: #ffffff !important;
        }
        
        .ladder-smart-match-content {
          background: transparent !important;
          color: #ffffff !important;
        }
        
        .ladder-smart-match-header {
          background: rgba(91, 33, 182, 0.1) !important;
          border: 1px solid rgba(91, 33, 182, 0.3) !important;
          border-radius: 6px !important;
          padding: 6px !important;
          margin-bottom: 8px !important;
        }
        
        .ladder-smart-match-title {
          color: #ffffff !important;
          margin: 0 0 2px 0 !important;
          text-align: center !important;
          font-size: 1.1rem !important;
          font-weight: bold !important;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5) !important;
        }
        
        .ladder-smart-match-subtitle {
          color: #e0e0e0 !important;
          text-align: center !important;
          margin: 0 !important;
          font-size: 0.8rem !important;
        }
        
        /* Compact card layout */
        .ladder-smart-match-suggestion-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .ladder-smart-match-details-btn {
          background: rgba(91, 33, 182, 0.8) !important;
          border: 1px solid #5b21b6 !important;
          color: #ffffff !important;
          padding: 6px 12px !important;
          border-radius: 4px !important;
          cursor: pointer !important;
          font-size: 0.85rem !important;
          transition: all 0.2s ease !important;
        }
        
        .ladder-smart-match-details-btn:hover {
          background: rgba(91, 33, 182, 1) !important;
          border-color: #7c3aed !important;
          transform: translateY(-1px) !important;
        }
        
        .ladder-smart-match-tag-info {
          background: rgba(59, 130, 246, 0.2) !important;
          color: #60a5fa !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
        }
        
        /* Mobile responsive adjustments for compact cards */
        @media (max-width: 768px) {
          .ladder-smart-match-suggestion-footer {
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
          }
          
          .ladder-smart-match-details-btn {
            width: 100% !important;
            text-align: center !important;
          }
        }
        
        .ladder-smart-match-hot-streak-badge {
          display: inline-block;
          margin-left: 6px;
          font-size: 0.9rem;
          animation: hotStreakPulse 2s infinite;
          filter: drop-shadow(0 0 4px rgba(255, 69, 0, 0.6));
        }
        
        @keyframes hotStreakPulse {
          0%, 100% { 
            transform: scale(1);
            filter: drop-shadow(0 0 4px rgba(255, 69, 0, 0.6));
          }
          50% { 
            transform: scale(1.1);
            filter: drop-shadow(0 0 8px rgba(255, 69, 0, 0.8));
          }
        }
      `}</style>

      {/* Match Type Explanation Modal - Rendered via Portal */}
      {console.log('🎯 Modal render check - showMatchTypeModal:', showMatchTypeModal, 'selectedMatchType:', selectedMatchType)}
      {showMatchTypeModal && selectedMatchType && createPortal(
        <div 
          className="modal-overlay" 
          onClick={() => setShowMatchTypeModal(false)} 
          style={{ 
            zIndex: 100001, 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              position: 'relative', 
              backgroundColor: '#1a1a1a', 
              padding: '20px', 
              borderRadius: '8px', 
              maxWidth: '400px', 
              width: '40%',
              maxHeight: '80vh',
              overflow: 'auto',
              border: '2px solid #a855f7',
              boxShadow: '0 10px 30px rgba(168, 85, 247, 0.3)'
            }}
          >
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.5rem' }}>
                {getChallengeTypeIcon(selectedMatchType)} {getMatchTypeDescription(selectedMatchType).title}
              </h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowMatchTypeModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p style={{ color: '#e0e0e0', fontSize: '1rem', marginBottom: '16px', lineHeight: '1.5' }}>
                {getMatchTypeDescription(selectedMatchType).description}
              </p>
              
              <h4 style={{ color: '#a855f7', marginBottom: '12px', fontSize: '1.1rem' }}>Match Rules:</h4>
              <ul style={{ color: '#ccc', paddingLeft: '20px', marginBottom: '20px' }}>
                {getMatchTypeDescription(selectedMatchType).rules.map((rule, index) => (
                  <li key={index} style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="modal-footer" style={{ textAlign: 'center' }}>
              <button 
                className="btn btn-primary"
                onClick={() => setShowMatchTypeModal(false)}
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  border: 'none',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Match Type Selection Modal */}
      {showMatchTypeSelection && selectedSuggestion && createPortal(
        <div 
          className="modal-overlay" 
          onClick={() => setShowMatchTypeSelection(false)} 
          style={{ 
            zIndex: 100001, 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              position: 'relative', 
              backgroundColor: '#1a1a1a', 
              padding: '20px', 
              borderRadius: '8px', 
              maxWidth: '400px', 
              width: '40%',
              maxHeight: '80vh',
              overflow: 'auto',
              border: '2px solid #a855f7',
              boxShadow: '0 10px 30px rgba(168, 85, 247, 0.3)'
            }}
          >
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.5rem' }}>
                Choose Match Type
              </h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowMatchTypeSelection(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p style={{ color: '#e0e0e0', fontSize: '1rem', marginBottom: '16px', lineHeight: '1.5' }}>
                Select the type of match you want to schedule with {selectedSuggestion.defender.firstName}:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedSuggestion.allMatchTypes.map((matchType, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const modifiedSuggestion = {
                        ...selectedSuggestion,
                        type: matchType.type,
                        confidence: matchType.confidence
                      };
                      handleChallengeClick(modifiedSuggestion);
                      setShowMatchTypeSelection(false);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                      border: 'none',
                      color: 'white',
                      padding: '12px 16px',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{getChallengeTypeName(matchType.type)} {getChallengeTypeIcon(matchType.type)}</span>
                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                      {Math.round(matchType.confidence * 100)}% confidence
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>,
    document.body
  );
};

export default LadderSmartMatchModal;
