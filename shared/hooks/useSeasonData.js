import { useState, useEffect, useCallback, useRef } from 'react';
import { seasonService } from '@shared/services/services/seasonService.js';

export const useSeasonData = (division) => {
  const [seasonData, setSeasonData] = useState(null);
  const [currentPhaseInfo, setCurrentPhaseInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Refs for tracking
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  const fetchSeasonData = useCallback(async (isPolling = false) => {
    if (!division) return;
    
    // Cancel previous request if it's still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      if (!isPolling) {
        setLoading(true);
      }
      
      console.log('useSeasonData - Fetching season data for division:', division);
      
      const [seasonResult, phaseResult] = await Promise.all([
        seasonService.getCurrentSeason(division),
        seasonService.getCurrentPhaseAndWeek(division)
      ]);
      
      console.log('useSeasonData - Season result:', seasonResult);
      console.log('useSeasonData - Phase result:', phaseResult);
      
      // Only update if the request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        setSeasonData(seasonResult?.season || null);
        setCurrentPhaseInfo(phaseResult);
        setError(null);
        setLastUpdate(new Date());
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }
      console.error('Error fetching season data:', err);
      setError(err.message);
      if (!isPolling) {
        setSeasonData(null);
        setCurrentPhaseInfo(null);
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, [division]);

  // Start polling when component mounts or dependencies change
  useEffect(() => {
    if (division) {
      // Initial fetch
      fetchSeasonData();
      
      // Set up polling every 5 minutes (season data doesn't change frequently)
      intervalRef.current = setInterval(() => {
        fetchSeasonData(true); // true = isPolling
      }, 5 * 60 * 1000); // 5 minutes
      
      // Cleanup function
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }
  }, [division, fetchSeasonData]);

  // Enhanced refetch function that can be called manually
  const refetch = useCallback(() => {
    fetchSeasonData();
  }, [fetchSeasonData]);

  return {
    seasonData,
    currentPhaseInfo,
    loading,
    error,
    lastUpdate,
    refetch
  };
};
