import { useState, useEffect, useCallback, useRef } from 'react';
import { proposalService } from '@shared/services/services/proposalService.js';

// This hook expects the backend to filter proposals using $in on 'divisions' array
export const useProposals = (playerName, division) => {
  const [pendingProposals, setPendingProposals] = useState([]);
  const [sentProposals, setSentProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Refs for tracking
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  const fetchProposals = useCallback(async (isPolling = false) => {
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
      
      const [pending, sent] = await Promise.all([
        proposalService.getPendingProposals(playerName, division),
        proposalService.getSentProposals(playerName, division)
      ]);
      
      // Only update if the request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        setPendingProposals(pending.filter(p => p.status === "pending"));
        setSentProposals(sent.filter(p => ["pending", "countered"].includes(p.status)));
        setError(null);
        setLastUpdate(new Date());
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }
      setError(err.message);
      if (!isPolling) {
        setPendingProposals([]);
        setSentProposals([]);
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, [playerName, division]);

  // Start polling when component mounts or dependencies change
  useEffect(() => {
    if (playerName && division) {
      // Initial fetch
      fetchProposals();
      
      // Set up polling every 30 seconds
      intervalRef.current = setInterval(() => {
        fetchProposals(true); // true = isPolling
      }, 30000); // 30 seconds
      
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
  }, [playerName, division, fetchProposals]);

  // Enhanced refetch function that can be called manually
  const refetch = useCallback(() => {
    fetchProposals();
  }, [fetchProposals]);

  // Function to immediately update local state when a proposal is created/updated
  const updateProposalLocally = useCallback((newProposal, action = 'add') => {
    if (action === 'add') {
      setSentProposals(prev => [newProposal, ...prev]);
    } else if (action === 'update') {
      setPendingProposals(prev => prev.map(p => p._id === newProposal._id ? newProposal : p));
      setSentProposals(prev => prev.map(p => p._id === newProposal._id ? newProposal : p));
    } else if (action === 'remove') {
      setPendingProposals(prev => prev.filter(p => p._id !== newProposal._id));
      setSentProposals(prev => prev.filter(p => p._id !== newProposal._id));
    }
    setLastUpdate(new Date());
  }, []);

  return {
    pendingProposals,
    sentProposals,
    loading,
    error,
    lastUpdate,
    refetch,
    updateProposalLocally
  };
}; 