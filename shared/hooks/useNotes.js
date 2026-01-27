import { useState, useEffect, useCallback, useRef } from 'react';
import { noteService } from '@shared/services/services/noteService.js';

export const useNotes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Refs for tracking
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  const fetchNotes = useCallback(async (isPolling = false) => {
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
      
      const notesData = await noteService.getAllNotes();
      
      // Only update if the request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        setNotes(notesData);
        setError(null);
        setLastUpdate(new Date());
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }
      console.error('Error fetching notes:', err);
      setError(err.message);
      if (!isPolling) {
        setNotes([]);
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Start polling when component mounts
  useEffect(() => {
    // Initial fetch
    fetchNotes();
    
    // Set up polling every 2 minutes (notes might be updated by admins)
    intervalRef.current = setInterval(() => {
      fetchNotes(true); // true = isPolling
    }, 2 * 60 * 1000); // 2 minutes
    
    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchNotes]);

  // Enhanced refetch function that can be called manually
  const refetch = useCallback(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Function to immediately update local state when a note is added/updated/deleted
  const updateNoteLocally = useCallback((note, action = 'add') => {
    if (action === 'add') {
      setNotes(prev => [note, ...prev]);
    } else if (action === 'update') {
      setNotes(prev => prev.map(n => n._id === note._id ? note : n));
    } else if (action === 'remove') {
      setNotes(prev => prev.filter(n => n._id !== note._id));
    }
    setLastUpdate(new Date());
  }, []);

  return {
    notes,
    loading,
    error,
    lastUpdate,
    refetch,
    updateNoteLocally
  };
};
