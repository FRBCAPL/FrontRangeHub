/*
 * Front Range Pool Hub - Advanced Challenge System
 * Copyright (c) 2025 FRBCAPL
 * All rights reserved.
 * 
 * This component contains proprietary challenge algorithms and tournament
 * management logic that are confidential trade secrets.
 * 
 * Challenge system innovations protected by copyright:
 * - 4-type challenge validation system
 * - Smart opponent selection algorithms
 * - Dynamic challenge limit calculations
 * - Integrated scheduling and location management
 * - Real-time challenge status tracking
 * 
 * Unauthorized copying, distribution, or use is strictly prohibited.
 */

import React, { useState, useEffect } from 'react';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import { BACKEND_URL } from '@shared/config/config.js';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';
import { getCurrentDateString, getMinDateForInput, getMaxDateForInput, formatDateForDisplay, dateStringToDate } from '@shared/utils/utils/dateUtils.js';
import './LadderChallengeModal.css';

const LadderChallengeModal = ({ 
  isOpen, 
  onClose, 
  challenger, 
  defender, 
  challengeType = 'challenge',
  onChallengeComplete 
}) => {
  const [formData, setFormData] = useState({
    entryFee: '',
    raceLength: '',
    gameType: '9-ball',
    tableSize: '9-foot',
    preferredDates: [],
    preferredTimes: {}, // Object to store time for each date
    postContent: '',
    location: 'Legends Brews & Cues'
  });
  
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');

  // Set default values based on ladder and challenge type
  useEffect(() => {
    if (defender && defender.ladderName) {
      const defaults = {
        '499-under': { entryFee: 20, raceLength: 5 },
        '500-549': { entryFee: 25, raceLength: 7 },
        '550-plus': { entryFee: 25, raceLength: 7 }
      };
      
      const ladderDefaults = defaults[defender.ladderName] || defaults['499-under'];
      
      setFormData(prev => ({
        ...prev,
        entryFee: ladderDefaults.entryFee.toString(),
        raceLength: ladderDefaults.raceLength.toString()
      }));
    }
  }, [defender]);

  // Debug logging for formData changes
  useEffect(() => {
    console.log('🔍 formData updated:', formData);
  }, [formData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateAdd = () => {
    try {
      console.log('🔍 handleDateAdd called');
      const dateInput = document.getElementById('preferredDate');
      const timeInput = document.getElementById('preferredTime');
      
      console.log('🔍 Input elements found:', { dateInput: !!dateInput, timeInput: !!timeInput });
      
      if (!dateInput || !timeInput) {
        console.error('Date or time input elements not found');
        return;
      }
      
      const rawDate = dateInput.value;
      const newTime = timeInput.value || '19:00'; // Default to 7:00 PM
      
      console.log('🔍 Input values:', { rawDate, newTime });
      console.log('🔍 Current formData.preferredDates:', formData.preferredDates);
      
      if (!rawDate) {
        console.log('No date selected');
        return;
      }
      
      // Convert the date string to a proper Date object and back to string to ensure consistency
      const dateObj = dateStringToDate(rawDate);
      const newDate = dateObj ? dateObj.toISOString().split('T')[0] : rawDate;
      
      console.log('🔍 Processed date:', { rawDate, newDate });
      
      // Check if date is already added
      if (formData.preferredDates.includes(newDate)) {
        console.log('🔍 Date already exists:', newDate);
        alert('This date has already been added. Please select a different date.');
        return;
      }
      
      console.log('🔍 About to update formData with new date:', newDate, 'at', newTime);
      
      setFormData(prev => {
        const newFormData = {
          ...prev,
          preferredDates: [...prev.preferredDates, newDate],
          preferredTimes: {
            ...prev.preferredTimes,
            [newDate]: newTime
          }
        };
        console.log('🔍 New formData after update:', newFormData);
        return newFormData;
      });
      
      // Clear the inputs
      dateInput.value = '';
      timeInput.value = '19:00';
      
      console.log('✅ Date added successfully:', newDate, 'at', newTime);
    } catch (error) {
      console.error('❌ Error in handleDateAdd:', error);
      alert('There was an error adding the date. Please try again.');
    }
  };

  const handleDateRemove = (index) => {
    try {
      if (index < 0 || index >= formData.preferredDates.length) {
        console.error('Invalid index for date removal:', index);
        return;
      }
      
      const dateToRemove = formData.preferredDates[index];
      setFormData(prev => {
        const newPreferredTimes = { ...prev.preferredTimes };
        delete newPreferredTimes[dateToRemove];
        return {
          ...prev,
          preferredDates: prev.preferredDates.filter((_, i) => i !== index),
          preferredTimes: newPreferredTimes
        };
      });
      
      console.log('Date removed successfully:', dateToRemove);
    } catch (error) {
      console.error('Error in handleDateRemove:', error);
      alert('There was an error removing the date. Please try again.');
    }
  };

  const handleTimeChange = (date, newTime) => {
    try {
      if (!date || !newTime) {
        console.error('Invalid date or time for time change:', { date, newTime });
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        preferredTimes: {
          ...prev.preferredTimes,
          [date]: newTime
        }
      }));
      
      console.log('Time changed successfully for', date, 'to', newTime);
    } catch (error) {
      console.error('Error in handleTimeChange:', error);
      alert('There was an error changing the time. Please try again.');
    }
  };

  // Get availability suggestions for a specific day
  const getAvailabilitySuggestions = (date) => {
    try {
      const dateObj = dateStringToDate(date);
      const dayOfWeek = dateObj ? dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() : new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const challengerAvailability = challenger.availability?.[dayOfWeek] || [];
      const defenderAvailability = defender.availability?.[dayOfWeek] || [];
      
      // Find overlapping time slots
      const overlappingTimes = challengerAvailability.filter(time => 
        defenderAvailability.includes(time)
      );
      
      return {
        challengerTimes: challengerAvailability,
        defenderTimes: defenderAvailability,
        overlappingTimes: overlappingTimes
      };
    } catch (error) {
      console.error('Error in getAvailabilitySuggestions:', error);
      return {
        challengerTimes: [],
        defenderTimes: [],
        overlappingTimes: []
      };
    }
  };

  const generatePostContent = () => {
    const challengeDescriptions = {
      'challenge': 'Challenge Match',
      'smackdown': 'SmackDown Match',
      'smackback': 'SmackBack Match',
      'fast-track': 'Fast Track Challenge'
    };

    const description = challengeDescriptions[challengeType] || 'Challenge Match';
    
    // Format dates and times
    const dateTimeInfo = formData.preferredDates.map(date => {
      const time = formData.preferredTimes[date] || '19:00';
      const formattedDate = formatDateForDisplay(date, { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      const formattedTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return `${formattedDate} at ${formattedTime}`;
    }).join(', ');
    
    const baseContent = `🏆 ${description} 🏆

${challenger.firstName} ${challenger.lastName} (Position ${challenger.position}) is calling out ${defender.firstName} ${defender.lastName} (Position ${defender.position}) for a ${description.toLowerCase()}!

💰 Entry Fee: $${formData.entryFee}
🎯 Race to: ${formData.raceLength}
🎱 Game: ${formData.gameType}
🏓 Table: ${formData.tableSize}
📍 Location: ${formData.location}
⏰ Proposed Times: ${dateTimeInfo}

${formData.postContent ? `\n💬 Message: ${formData.postContent}` : ''}

${defender.firstName}, you have 3 days to respond! ⏰`;

    // Add fast track specific information
    if (challengeType === 'fast-track') {
      const positionDifference = defender.position - challenger.position;
      return `${baseContent}

🚀 FAST TRACK CHALLENGE 🚀
This is a special fast track challenge with extended range!
• Challenger can challenge up to 6 spots (normal limit is 4)
• Position difference: ${positionDifference} spots
• Winner takes defender's position, others move down one spot
• This is one of the challenger's limited fast track privileges`;
    }

    return baseContent;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const challengeData = {
        challengerEmail: challenger.email,
        defenderEmail: defender.email,
        challengeType,
        entryFee: parseInt(formData.entryFee),
        raceLength: parseInt(formData.raceLength),
        gameType: formData.gameType,
        tableSize: formData.tableSize,
        preferredDates: formData.preferredDates,
        preferredTimes: formData.preferredTimes,
        postContent: generatePostContent(),
        location: formData.location
      };

      // Use Supabase instead of old backend API
      const result = await supabaseDataService.createChallenge(challengeData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create challenge');
      }

      // Send email notification to defender
      try {
          const emailNotificationService = (await import('@shared/services/services/emailNotificationService.js')).default;
        await emailNotificationService.sendChallengeNotification({
          defenderEmail: defender.email,
          defenderName: `${defender.firstName} ${defender.lastName}`,
          challengerName: `${challenger.firstName} ${challenger.lastName}`,
          challengerPosition: challenger.position,
          defenderPosition: defender.position,
          ladderName: selectedLadder,
          matchType: challengeType,
          entryFee: formData.entryFee,
          raceLength: formData.raceLength,
          gameType: formData.gameType,
          proposedDate: formData.preferredDates[0],
          proposedLocation: formData.location,
          expiresAt: result.data?.expires_at,
          message: formData.message || ''
        });
        console.log('📧 Challenge notification email sent to defender');
      } catch (emailError) {
        console.error('Failed to send challenge notification email:', emailError);
        // Don't fail the challenge creation if email fails
      }

      setShowConfirmation(true);
      
      if (onChallengeComplete) {
        onChallengeComplete(result.data);
      }
    } catch (err) {
      console.error('Error creating challenge:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    onClose();
  };

  if (!isOpen) return null;

  if (showConfirmation) {
    return (
      <DraggableModal
        open={true}
        onClose={handleConfirmationClose}
        title="🎯 Challenge Sent!"
        maxWidth="500px"
      >
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h3 style={{ color: '#ff4444', marginBottom: '16px' }}>
            Challenge Successfully Sent!
          </h3>
          <p style={{ color: '#e0e0e0', marginBottom: '20px' }}>
            Your {challengeType} challenge has been sent to {defender.firstName} {defender.lastName}.
          </p>
          <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '20px' }}>
            They have 3 days to respond. You'll be notified when they accept, decline, or counter-propose.
          </p>
          <button
            onClick={handleConfirmationClose}
            style={{
              background: 'linear-gradient(135deg, #ff4444, #cc3333)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Close
          </button>
        </div>
      </DraggableModal>
    );
  }

  return (
      <DraggableModal
        open={true}
        onClose={onClose}
        title={`⚔️ ${challengeType.charAt(0).toUpperCase() + challengeType.slice(1)} Challenge`}
        maxWidth="600px"
        className="ladder-challenge-modal"
        borderColor="#5b21b6"
        glowColor="#5b21b6"
      >
      <div style={{ padding: '16px' }}>
        {/* Challenge Header */}
        <div style={{ 
          background: 'rgba(255, 68, 68, 0.1)', 
          border: '1px solid rgba(255, 68, 68, 0.3)', 
          borderRadius: '6px', 
          padding: '8px', 
          marginBottom: '12px' 
        }}>
          <h3 style={{ color: '#ff4444', margin: '0 0 6px 0', textAlign: 'center', fontSize: '1rem' }}>
            {challenger.firstName} {challenger.lastName} vs {defender.firstName} {defender.lastName}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#e0e0e0', fontSize: '0.8rem' }}>
            <div style={{ textAlign: 'left' }}>
              <strong>Challenger:</strong> Pos {challenger.position} • {challenger.ladderName}
            </div>
            <div style={{ fontSize: '16px', color: '#ff4444', margin: '0 8px' }}>⚔️</div>
            <div style={{ textAlign: 'right' }}>
              <strong>Defender:</strong> Pos {defender.position} • {defender.ladderName}
            </div>
          </div>
        </div>

                <form onSubmit={handleSubmit}>
          {/* Match Details */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1rem' }}>Match Details</h4>
            
            <div className="form-row">
              <div className="form-column">
                <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                  Entry Fee ($)
                </label>
                <input
                  type="number"
                  name="entryFee"
                  value={formData.entryFee}
                  onChange={handleInputChange}
                  required
                  min="1"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    background: '#333',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div className="form-column">
                <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                  Race Length
                </label>
                <select
                  name="raceLength"
                  value={formData.raceLength}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    background: '#333',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                >
                  {Array.from({ length: 16 }, (_, i) => i + 5).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-column">
                <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                  Game Type
                </label>
                <select
                  name="gameType"
                  value={formData.gameType}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    background: '#333',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="9-ball">9-Ball</option>
                  <option value="8-ball">8-Ball</option>
                  <option value="10-ball">10-Ball</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>

              <div className="form-column">
                <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                  Table Size
                </label>
                <select
                  name="tableSize"
                  value={formData.tableSize}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    background: '#333',
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}
                >
                  <option value="9-foot">9-Foot</option>
                  <option value="7-foot">7-Foot</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                Location
              </label>
              <select
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  background: '#333',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              >
                <option value="Legends Brews & Cues">Legends Brews & Cues</option>
                <option value="Antiques">Antiques</option>
                <option value="Rac m">Rac m</option>
                <option value="Westside Billiards">Westside Billiards</option>
                <option value="Bijou Billiards">Bijou Billiards</option>
                <option value="Crooked Cue">Crooked Cue</option>
                <option value="Back on the Boulevard">Back on the Boulevard</option>
                <option value="Main Street Tavern">Main Street Tavern</option>
                <option value="Murray Street Darts">Murray Street Darts</option>
                <option value="My House">My House</option>
              </select>
            </div>
          </div>

          {/* Preferred Dates & Times */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ color: '#ffc107', marginBottom: '8px', fontSize: '1rem' }}>Preferred Dates & Times</h4>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="date"
                id="preferredDate"
                min={new Date().toISOString().split('T')[0]}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  background: '#333',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
              <input
                type="time"
                id="preferredTime"
                defaultValue="19:00"
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  background: '#333',
                  color: '#fff',
                  fontSize: '0.9rem',
                  width: '120px'
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDateAdd();
                }}
                style={{
                  padding: '8px 16px',
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#cc3333'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#ff4444'}
              >
                Add
              </button>
            </div>
            
                        {formData.preferredDates.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                  Selected Dates & Times:
                </label>
                {formData.preferredDates.map((date, index) => {
                  const availabilitySuggestions = getAvailabilitySuggestions(date);
                  const currentTime = formData.preferredTimes[date] || '19:00';
                  
                  return (
                    <div key={index} style={{
                      padding: '12px',
                      background: 'rgba(255, 68, 68, 0.1)',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      border: '1px solid rgba(255, 68, 68, 0.3)'
                    }}>
                      {/* Date and Time Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: '#e0e0e0', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {formatDateForDisplay(date, { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <input
                            type="time"
                            value={currentTime}
                            onChange={(e) => handleTimeChange(date, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #444',
                              background: '#333',
                              color: '#fff',
                              fontSize: '0.85rem',
                              width: '100px'
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDateRemove(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ff4444',
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: '4px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                      
                      {/* Availability Suggestions */}
                      {availabilitySuggestions.overlappingTimes.length > 0 && (
                        <div style={{ marginBottom: '6px' }}>
                          <div style={{ color: '#4CAF50', fontSize: '0.8rem', marginBottom: '4px' }}>
                            ✅ Both available at: {availabilitySuggestions.overlappingTimes.join(', ')}
                          </div>
                        </div>
                      )}
                      
                      {/* Individual Availability Info */}
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
                        <div style={{ color: '#81C784' }}>
                          You: {availabilitySuggestions.challengerTimes.length > 0 ? availabilitySuggestions.challengerTimes.join(', ') : 'No availability set'}
                        </div>
                        <div style={{ color: '#FFB74D' }}>
                          {defender.firstName}: {availabilitySuggestions.defenderTimes.length > 0 ? availabilitySuggestions.defenderTimes.join(', ') : 'No availability set'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Message */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#e0e0e0', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
              Additional Message (Optional)
            </label>
            <textarea
              name="postContent"
              value={formData.postContent}
              onChange={handleInputChange}
              rows="2"
              placeholder="Add any additional message for your challenge..."
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: '#333',
                color: '#fff',
                resize: 'vertical',
                fontSize: '0.9rem'
              }}
            />
          </div>

                    {/* Error Display */}
          {error && (
            <div style={{
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid #ff0000',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '12px',
              color: '#ff6666',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: loading ? '#666' : 'linear-gradient(135deg, #ff4444, #cc3333)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Sending...' : 'Send Challenge'}
            </button>
          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default LadderChallengeModal;
