import { useState, useEffect, useCallback, useRef } from 'react';
import { BACKEND_URL } from '@shared/config/config.js';

export const useStandings = (division) => {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Refs for tracking
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  const fetchStandings = useCallback(async (isPolling = false) => {
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
      
      // Use the backend to fetch standings JSON for the division
      const safeDivision = division.replace(/[^A-Za-z0-9]/g, '_');
      const standingsUrl = `${BACKEND_URL}/static/standings_${safeDivision}.json`;
      
      const response = await fetch(standingsUrl, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch standings: ${response.status} - ${response.statusText}`);
        if (!isPolling) {
          setError(`Failed to fetch standings: ${response.status}`);
        }
        return;
      }
      
      const standingsData = await response.json();

      // Validate standings data structure
      if (!Array.isArray(standingsData)) {
        console.error('Standings data is not an array:', standingsData);
        if (!isPolling) {
          setError('Invalid standings data format');
        }
        return;
      }

      // Validate each entry has required fields
      const validStandings = standingsData.filter(entry => {
        if (!entry || typeof entry !== 'object') {
          console.warn('Invalid standings entry:', entry);
          return false;
        }
        if (!entry.name || !entry.rank) {
          console.warn('Standings entry missing name or rank:', entry);
          return false;
        }
        const rank = parseInt(entry.rank);
        if (isNaN(rank) || rank <= 0) {
          console.warn('Invalid rank in standings entry:', entry);
          return false;
        }
        return true;
      });

      // Only update if the request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        setStandings(validStandings);
        setError(null);
        setLastUpdate(new Date());
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }
      console.error('Failed to load standings:', err);
      setError(err.message);
      if (!isPolling) {
        setStandings([]);
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
      fetchStandings();
      
      // Set up polling every 10 minutes (standings don't change frequently)
      intervalRef.current = setInterval(() => {
        fetchStandings(true); // true = isPolling
      }, 10 * 60 * 1000); // 10 minutes
      
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
  }, [division, fetchStandings]);

  // Enhanced refetch function that can be called manually
  const refetch = useCallback(() => {
    fetchStandings();
  }, [fetchStandings]);

  return {
    standings,
    loading,
    error,
    lastUpdate,
    refetch
  };
};
