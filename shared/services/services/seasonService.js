import { BACKEND_URL } from '@shared/config/config.js';

class SeasonService {
  async getCurrentSeason(division) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/seasons/current/${encodeURIComponent(division)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching current season:', error);
      return null;
    }
  }

  async getCurrentPhaseAndWeek(division) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/seasons/phase/${encodeURIComponent(division)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching current phase and week:', error);
      return {
        currentWeek: null,
        phase: 'offseason',
        isActive: false,
        season: null
      };
    }
  }

  async getAllSeasons(division) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/seasons/${encodeURIComponent(division)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching all seasons:', error);
      return [];
    }
  }

  // Helper method to check if a match is within Phase 1 deadline
  isMatchWithinPhase1Deadline(matchDate, seasonData) {
    if (!seasonData || !seasonData.phase1End) {
      return true; // If no season data, assume it's valid
    }
    
    const matchDateTime = new Date(matchDate);
    const phase1End = new Date(seasonData.phase1End);
    
    return matchDateTime <= phase1End;
  }

  // Helper method to get days until Phase 1 deadline
  getDaysUntilPhase1Deadline(seasonData) {
    if (!seasonData || !seasonData.phase1End) {
      return null;
    }
    
    const now = new Date();
    const phase1End = new Date(seasonData.phase1End);
    const diffTime = phase1End - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  // Helper method to check if Phase 1 deadline has passed
  hasPhase1DeadlinePassed(seasonData) {
    if (!seasonData || !seasonData.phase1End) {
      return false;
    }
    
    const now = new Date();
    const phase1End = new Date(seasonData.phase1End);
    
    return now > phase1End;
  }

  // Helper method to check if Phase 2 has started
  hasPhase2Started(seasonData) {
    if (!seasonData || !seasonData.phase2Start) {
      return false;
    }
    
    const now = new Date();
    const phase2Start = new Date(seasonData.phase2Start);
    
    return now >= phase2Start;
  }

  // Helper method to get days until Phase 2 deadline
  getDaysUntilPhase2Deadline(seasonData) {
    if (!seasonData || !seasonData.phase2End) {
      return null;
    }
    
    const now = new Date();
    const phase2End = new Date(seasonData.phase2End);
    const diffTime = phase2End - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  // Helper method to check if Phase 2 deadline has passed
  hasPhase2DeadlinePassed(seasonData) {
    if (!seasonData || !seasonData.phase2End) {
      return false;
    }
    
    const now = new Date();
    const phase2End = new Date(seasonData.phase2End);
    
    return now > phase2End;
  }

  // Helper method to get current phase based on dates
  getCurrentPhaseFromDates(seasonData) {
    if (!seasonData) return 'offseason';
    
    const now = new Date();
    const phase1Start = new Date(seasonData.phase1Start);
    const phase1End = new Date(seasonData.phase1End);
    const phase2Start = new Date(seasonData.phase2Start);
    const phase2End = new Date(seasonData.phase2End);
    
    if (now < phase1Start) return 'offseason';
    if (now >= phase1Start && now <= phase1End) return 'scheduled';
    if (now >= phase2Start && now <= phase2End) return 'challenge';
    if (now > phase2End) return 'completed';
    
    return 'transition';
  }
}

export const seasonService = new SeasonService(); 