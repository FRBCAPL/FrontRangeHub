import { useState, useEffect, useCallback, useRef } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';

export const useSchedule = (division) => {
  const [scheduledMatches, setScheduledMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Refs for tracking
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  const fetchSchedule = useCallback(async (isPolling = false) => {
    if (!division) {
      setScheduledMatches([]);
      return;
    }
    
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
      
      // Handle specific division name mappings
      let scheduleFileName;
      if (division === "FRBCAPL TEST") {
        scheduleFileName = "schedule_FRBCAPL_TEST.json";
      } else if (division === "Singles Test") {
        scheduleFileName = "schedule_Singles_Test.json";
      } else {
        // Fallback: create safe filename
        const safeDivision = division.replace(/[^A-Za-z0-9]/g, '_');
        scheduleFileName = `schedule_${safeDivision}.json`;
      }
      
      const scheduleUrl = `${BACKEND_URL}/static/${scheduleFileName}`;

      const response = await fetch(scheduleUrl, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error("Schedule not found");
      }
      
      const data = await response.json();
      
      // Only update if the request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        console.log('Schedule loaded for', division, ':', data.length, 'matches');
        setScheduledMatches(data);
        setError(null);
        setLastUpdate(new Date());
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }
      console.error('Failed to load schedule for', division, ':', err);
      setError(err.message);
      if (!isPolling) {
        setScheduledMatches([]);
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
      fetchSchedule();
      
      // Set up polling every 15 minutes (schedule doesn't change frequently)
      intervalRef.current = setInterval(() => {
        fetchSchedule(true); // true = isPolling
      }, 15 * 60 * 1000); // 15 minutes
      
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
  }, [division, fetchSchedule]);

  // Enhanced refetch function that can be called manually
  const refetch = useCallback(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return {
    scheduledMatches,
    loading,
    error,
    lastUpdate,
    refetch
  };
};
