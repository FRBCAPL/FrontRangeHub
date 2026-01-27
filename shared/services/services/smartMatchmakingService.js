import { parseAvailability } from '@shared/utils/utils/parseAvailability.js';

export const smartMatchmakingService = {
  // Parse availability string and find overlapping time slots
  findOverlappingAvailability(player1Availability, player2Availability) {
    try {
      console.log('Smart Match Debug - Parsing P1 availability:', player1Availability);
      
      // Handle both string and object availability formats
      let p1Avail;
      if (typeof player1Availability === 'string') {
        p1Avail = parseAvailability(player1Availability);
      } else if (typeof player1Availability === 'object' && player1Availability !== null) {
        p1Avail = player1Availability;
      } else {
        p1Avail = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
      }
      console.log('Smart Match Debug - Parsed P1 availability:', p1Avail);
      
      console.log('Smart Match Debug - Parsing P2 availability:', player2Availability);
      
      // Handle both string and object availability formats
      let p2Avail;
      if (typeof player2Availability === 'string') {
        p2Avail = parseAvailability(player2Availability);
      } else if (typeof player2Availability === 'object' && player2Availability !== null) {
        p2Avail = player2Availability;
      } else {
        p2Avail = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
      }
      console.log('Smart Match Debug - Parsed P2 availability:', p2Avail);
      
      const overlapping = {};
      
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
        overlapping[day] = [];
        
        if (p1Avail[day] && p2Avail[day]) {
          console.log(`Smart Match Debug - Checking ${day}: P1 slots:`, p1Avail[day], 'P2 slots:', p2Avail[day]);
          p1Avail[day].forEach(p1Slot => {
            p2Avail[day].forEach(p2Slot => {
              const overlap = this.findTimeOverlap(p1Slot, p2Slot);
              if (overlap) {
                overlapping[day].push(overlap);
                console.log(`Smart Match Debug - Found overlap on ${day}:`, overlap);
              }
            });
          });
        }
      });
      
      console.log('Smart Match Debug - Final overlapping slots:', overlapping);
      return overlapping;
    } catch (error) {
      console.error('Error parsing availability:', error);
      // Return empty overlapping slots if parsing fails
      return { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
    }
  },

  // Find overlapping time between two time slots
  findTimeOverlap(slot1, slot2) {
    console.log('Smart Match Debug - Finding overlap between:', slot1, 'and', slot2);
    
    const [start1, end1] = slot1.split(' - ');
    const [start2, end2] = slot2.split(' - ');
    
    console.log('Smart Match Debug - Parsed times:', { start1, end1, start2, end2 });
    
    const start1Time = this.parseTime(start1);
    const end1Time = this.parseTime(end1);
    const start2Time = this.parseTime(start2);
    const end2Time = this.parseTime(end2);
    
    console.log('Smart Match Debug - Parsed minutes:', { start1Time, end1Time, start2Time, end2Time });
    
    const overlapStart = Math.max(start1Time, start2Time);
    const overlapEnd = Math.min(end1Time, end2Time);
    
    console.log('Smart Match Debug - Overlap calculation:', { overlapStart, overlapEnd });
    
    if (overlapStart < overlapEnd) {
      const result = `${this.formatTime(overlapStart)} - ${this.formatTime(overlapEnd)}`;
      console.log('Smart Match Debug - Found overlap:', result);
      return result;
    }
    
    console.log('Smart Match Debug - No overlap found');
    return null;
  },

  // Parse time string to minutes since midnight
  parseTime(timeStr) {
    console.log('Smart Match Debug - Parsing time:', timeStr);
    
    // Handle formats like "2pm", "630pm", "11pm", etc.
    let cleanTime = timeStr.trim().toLowerCase();
    
    // Extract period (am/pm)
    let period = 'am';
    if (cleanTime.includes('pm')) {
      period = 'pm';
      cleanTime = cleanTime.replace('pm', '');
    } else if (cleanTime.includes('am')) {
      period = 'am';
      cleanTime = cleanTime.replace('am', '');
    }
    
    // Handle formats like "630pm" -> "6:30"
    let hours, minutes = 0;
    
    if (cleanTime.includes(':')) {
      [hours, minutes] = cleanTime.split(':').map(Number);
    } else {
      // Handle formats like "630" -> 6:30, "2" -> 2:00
      if (cleanTime.length <= 2) {
        hours = parseInt(cleanTime);
        minutes = 0;
      } else {
        // Handle "630" -> 6:30
        hours = parseInt(cleanTime.slice(0, -2));
        minutes = parseInt(cleanTime.slice(-2));
      }
    }
    
    // Convert to 24-hour format
    let hour24 = hours;
    if (period === 'pm' && hours !== 12) hour24 += 12;
    if (period === 'am' && hours === 12) hour24 = 0;
    
    const result = hour24 * 60 + minutes;
    console.log('Smart Match Debug - Parsed time result:', { timeStr, hours, minutes, period, hour24, result });
    
    return result;
  },

  // Format minutes since midnight to time string
  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    let period = 'AM';
    let hour12 = hours;
    
    if (hours >= 12) {
      period = 'PM';
      if (hours > 12) hour12 = hours - 12;
    }
    if (hour12 === 0) hour12 = 12;
    
    return `${hour12}:${mins.toString().padStart(2, '0')} ${period}`;
  },

  // Calculate confidence score for a match suggestion
  calculateConfidenceScore(player1, player2, overlappingSlots) {
    let score = 0;
    
    // Base score for having any overlapping availability
    const totalSlots = Object.values(overlappingSlots).flat().length;
    score += totalSlots * 10;
    
    // Bonus for multiple days
    const daysWithSlots = Object.keys(overlappingSlots).filter(day => 
      overlappingSlots[day].length > 0
    ).length;
    score += daysWithSlots * 5;
    
    // Bonus for longer time slots
    Object.values(overlappingSlots).flat().forEach(slot => {
      const [start, end] = slot.split(' - ');
      const duration = this.parseTime(end) - this.parseTime(start);
      if (duration >= 120) score += 5; // 2+ hours
      if (duration >= 180) score += 5; // 3+ hours
    });
    
    // Location compatibility bonus
    if (player1.locations && player2.locations) {
      // Convert locations to arrays if they're strings
      const p1Locations = typeof player1.locations === 'string' 
        ? player1.locations.split('\n').map(loc => loc.trim()).filter(Boolean)
        : Array.isArray(player1.locations) ? player1.locations : [];
      
      const p2Locations = typeof player2.locations === 'string' 
        ? player2.locations.split('\n').map(loc => loc.trim()).filter(Boolean)
        : Array.isArray(player2.locations) ? player2.locations : [];
      
      const commonLocations = p1Locations.filter(loc => 
        p2Locations.includes(loc)
      );
      score += commonLocations.length * 10;
    }
    
    return Math.min(score, 100); // Cap at 100
  },

  // Find optimal location for both players
  findOptimalLocation(player1, player2) {
    if (!player1.locations || !player2.locations) {
      return null;
    }
    
    // Convert locations to arrays if they're strings
    const p1Locations = typeof player1.locations === 'string' 
      ? player1.locations.split('\n').map(loc => loc.trim()).filter(Boolean)
      : Array.isArray(player1.locations) ? player1.locations : [];
    
    const p2Locations = typeof player2.locations === 'string' 
      ? player2.locations.split('\n').map(loc => loc.trim()).filter(Boolean)
      : Array.isArray(player2.locations) ? player2.locations : [];
    
    const commonLocations = p1Locations.filter(loc => 
      p2Locations.includes(loc)
    );
    
    return commonLocations.length > 0 ? commonLocations[0] : null;
  },

  // Check for scheduling conflicts
  checkForConflicts(player1, player2, upcomingMatches) {
    const conflicts = [];
    
    upcomingMatches.forEach(match => {
      if (match.player1 === player1.firstName || match.player2 === player1.firstName ||
          match.player1 === player2.firstName || match.player2 === player2.firstName) {
        conflicts.push(match);
      }
    });
    
    return conflicts;
  },

  // Generate smart match suggestions
  generateSuggestions(player1, player2, upcomingMatches = []) {
    console.log('Smart Match Debug - Player 1:', player1);
    console.log('Smart Match Debug - Player 2:', player2);
    
    // Provide default availability if players don't have specific availability
    const defaultAvailability = `Day: Monday, Available From: 6:00 PM, Available Until: 10:00 PM
Day: Tuesday, Available From: 6:00 PM, Available Until: 10:00 PM
Day: Wednesday, Available From: 6:00 PM, Available Until: 10:00 PM
Day: Thursday, Available From: 6:00 PM, Available Until: 10:00 PM
Day: Friday, Available From: 6:00 PM, Available Until: 10:00 PM
Day: Saturday, Available From: 2:00 PM, Available Until: 8:00 PM`;
    
    const p1Availability = player1.availability || defaultAvailability;
    const p2Availability = player2.availability || defaultAvailability;
    
    console.log('Smart Match Debug - P1 Availability:', p1Availability);
    console.log('Smart Match Debug - P2 Availability:', p2Availability);

    const overlappingSlots = this.findOverlappingAvailability(
      p1Availability, 
      p2Availability
    );
    
    console.log('Smart Match Debug - Overlapping Slots:', overlappingSlots);
    
    const confidence = this.calculateConfidenceScore(player1, player2, overlappingSlots);
    const optimalLocation = this.findOptimalLocation(player1, player2);
    const conflicts = this.checkForConflicts(player1, player2, upcomingMatches);
    
    const suggestions = [];
    
    // Generate suggestions for each day with overlapping slots
    Object.entries(overlappingSlots).forEach(([day, slots]) => {
      slots.forEach(slot => {
        suggestions.push({
          day,
          timeSlot: slot,
          location: optimalLocation,
          confidence: Math.min(confidence + (slots.length * 2), 100),
          player1: player1.firstName,
          player2: player2.firstName
        });
      });
    });
    
    // Sort by confidence and limit to top 3
    suggestions.sort((a, b) => b.confidence - a.confidence);
    const topSuggestions = suggestions.slice(0, 3);
    
    const usingDefaultAvailability = !player1.availability || !player2.availability;
    
    return {
      suggestions: topSuggestions,
      confidence,
      conflicts,
      message: topSuggestions.length > 0 
        ? `Found ${suggestions.length} potential match times, showing top ${topSuggestions.length}${usingDefaultAvailability ? ' (using default availability)' : ''}`
        : 'No overlapping availability found'
    };
  },

  // Generate quick proposal from suggestion
  generateQuickProposal(suggestion, player1, player2) {
    const dayNames = {
      'Mon': 'Monday',
      'Tue': 'Tuesday', 
      'Wed': 'Wednesday',
      'Thu': 'Thursday',
      'Fri': 'Friday',
      'Sat': 'Saturday',
      'Sun': 'Sunday'
    };
    
    return {
      player1: player1.firstName,
      player2: player2.firstName,
      proposedDate: dayNames[suggestion.day],
      proposedTime: suggestion.timeSlot,
      proposedLocation: suggestion.location || 'TBD',
      confidence: suggestion.confidence,
      message: `Smart Match Suggestion: ${dayNames[suggestion.day]} at ${suggestion.timeSlot}${suggestion.location ? ` at ${suggestion.location}` : ''}`
    };
  }
};
