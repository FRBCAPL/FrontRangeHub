import React, { useState, useEffect } from 'react';
import Modal from './DraggableModal.jsx';
import LoadingSpinner from '@shared/components/common/LoadingSpinner';
import styles from './SelectOpponentModal.module.css';

const SelectOpponentModal = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  allPlayers, 
  onOpponentSelected,
  isMobile = false 
}) => {
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && allPlayers && currentUser) {
      // Filter out the current user only
      const availableOpponents = allPlayers.filter(player => 
        player.firstName !== currentUser.firstName
      );
      
      setFilteredPlayers(availableOpponents);
    }
  }, [isOpen, allPlayers, currentUser]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPlayers(allPlayers?.filter(player => 
        player.firstName !== currentUser?.firstName
      ) || []);
    } else {
      const filtered = allPlayers?.filter(player => 
        player.firstName !== currentUser?.firstName &&
        (player.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         player.lastName?.toLowerCase().includes(searchTerm.toLowerCase()))
      ) || [];
      setFilteredPlayers(filtered);
    }
  }, [searchTerm, allPlayers, currentUser]);

  const handleOpponentSelect = (opponent) => {
    setSelectedOpponent(opponent);
    setLoading(true);
    
    // Simulate a brief loading state for better UX
    setTimeout(() => {
      setLoading(false);
      onOpponentSelected(opponent);
      onClose();
    }, 500);
  };

  const handleClose = () => {
    setSelectedOpponent(null);
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Select Opponent for Smart Match"
      isMobile={isMobile}
      className={styles.modal}
    >
      <div className={styles.content}>
        {loading && (
          <div className={styles.loadingOverlay}>
            <LoadingSpinner />
            <p>Analyzing availability...</p>
          </div>
        )}
        
        <div className={styles.searchSection}>
          <input
            type="text"
            placeholder="Search for opponent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.playersList}>
          {filteredPlayers.length === 0 ? (
            <div className={styles.noResults}>
              <p>No available opponents found.</p>
              <p className={styles.hint}>
                Make sure players have availability data in the system.
              </p>
            </div>
          ) : (
            filteredPlayers.map((player) => (
              <div
                key={`${player.firstName}-${player.lastName}`}
                className={styles.playerCard}
                onClick={() => handleOpponentSelect(player)}
              >
                <div className={styles.playerInfo}>
                  <h3>{player.firstName} {player.lastName}</h3>
                  <p className={styles.availability}>
                    {player.availability && typeof player.availability === 'string' && player.availability.trim() !== '' 
                      ? '✅ Has availability data' 
                      : '⚠️ No availability data (will use default times)'}
                  </p>
                  {player.locations && Array.isArray(player.locations) && player.locations.length > 0 && (
                    <p className={styles.locations}>
                      Preferred: {player.locations.join(', ')}
                    </p>
                  )}
                </div>
                <div className={styles.selectButton}>
                  <span>Select</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <button 
            onClick={handleClose}
            className={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SelectOpponentModal;
