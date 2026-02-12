import React, { useState, useEffect } from 'react';

const LocationSelectionModal = ({ 
  isOpen, 
  onClose, 
  currentLocations = '', 
  availableLocations = [], 
  isMobile = false,
  onSave 
}) => {
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [customLocation, setCustomLocation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize selected locations when modal opens
  useEffect(() => {
    if (isOpen && currentLocations) {
      const locations = currentLocations.split('\n').filter(Boolean);
      console.log('📍 LocationSelectionModal: Initializing with currentLocations:', currentLocations);
      console.log('📍 Parsed locations array:', locations);
      setSelectedLocations(locations);
    } else {
      console.log('📍 LocationSelectionModal: No currentLocations, setting empty array');
      setSelectedLocations([]);
    }
    setCustomLocation('');
    setSearchTerm('');
  }, [isOpen, currentLocations]);

  // Get user's current locations as an array
  const getUserLocations = () => {
    try {
      // Use selectedLocations state instead of currentLocations prop for live updates
      if (selectedLocations && Array.isArray(selectedLocations)) {
        return selectedLocations.map(loc => String(loc).trim()).filter(Boolean);
      }
      // Fallback to currentLocations prop if selectedLocations is empty
      if (!currentLocations || typeof currentLocations !== 'string') {
        return [];
      }
      return currentLocations.split('\n').filter(Boolean).map(loc => String(loc).trim());
    } catch (error) {
      console.error('Error parsing user locations:', error);
      return [];
    }
  };

  // Get locations that are not currently selected
  const getUnselectedLocations = () => {
    try {
      if (!availableLocations || !Array.isArray(availableLocations)) {
        return [];
      }
      
      // Use selectedLocations state directly for more accurate filtering
      const userLocations = selectedLocations.length > 0 ? selectedLocations : getUserLocations();
      return availableLocations.filter(location => {
        if (typeof location !== 'string') {
          return false;
        }
        
        return !userLocations.some(userLoc => {
          if (typeof userLoc !== 'string') {
            return false;
          }
          return userLoc.trim().toLowerCase() === location.trim().toLowerCase();
        });
      });
    } catch (error) {
      console.error('Error getting unselected locations:', error);
      return [];
    }
  };

  // Filter locations based on search term
  const getFilteredLocations = (locations) => {
    if (!searchTerm.trim()) return locations;
    
    return locations.filter(location => 
      String(location).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Handle location selection/deselection
  const handleLocationToggle = (location) => {
    const locationStr = String(location);
    console.log('📍 LocationSelectionModal: Toggling location:', locationStr);
    setSelectedLocations(prev => {
      const newState = prev.includes(locationStr) 
        ? prev.filter(loc => loc !== locationStr)
        : [...prev, locationStr];
      console.log('📍 LocationSelectionModal: Updated selectedLocations:', newState);
      return newState;
    });
  };

  // Handle adding custom location
  const handleAddCustomLocation = () => {
    if (customLocation.trim()) {
      const trimmedLocation = customLocation.trim();
      if (!selectedLocations.includes(trimmedLocation)) {
        setSelectedLocations(prev => [...prev, trimmedLocation]);
      }
      setCustomLocation('');
    }
  };

  // Handle saving locations
  const handleSave = () => {
    const locationsString = selectedLocations.join('\n');
    console.log('📍 LocationSelectionModal: Saving locations...');
    console.log('📍 selectedLocations state:', selectedLocations);
    console.log('📍 locationsString being sent:', locationsString);
    onSave(locationsString);
    onClose();
  };

  // Handle Enter key for custom location input
  const handleCustomLocationKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddCustomLocation();
    }
  };

  if (!isOpen) return null;

  const userLocations = getUserLocations();
  const unselectedLocations = getUnselectedLocations();
  const filteredUserLocations = getFilteredLocations(userLocations);
  const filteredUnselectedLocations = getFilteredLocations(unselectedLocations);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        padding: isMobile ? "10px" : "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          transform: `translate(0px, 0px)`,
          cursor: "default",
          background: "linear-gradient(120deg, #232323 80%, #2a0909 100%)",
          color: "#fff",
          border: "2px solid #e53e3e",
          borderRadius: isMobile ? "0.75rem" : "1rem",
          boxShadow: "0 0 32px #e53e3e, 0 0 40px rgba(0,0,0,0.85)",
          width: isMobile ? "95vw" : "auto",
          maxWidth: isMobile ? "95vw" : "850px",
          minWidth: isMobile ? "auto" : "700px",
          margin: "0 auto",
          left: 0,
          right: 0,
          animation: "modalBounceIn 0.5s cubic-bezier(.21,1.02,.73,1.01)",
          padding: 0,
          position: "relative",
          fontFamily: "inherit",
          boxSizing: "border-box",
          textAlign: "center",
          maxHeight: isMobile ? "88vh" : "85vh",
          overflowY: "auto"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#e53e3e",
          padding: "0.8rem 1rem 0.6rem 1rem",
          borderTopLeftRadius: "1rem",
          borderTopRightRadius: "1rem",
          position: "relative",
          cursor: "grab",
          userSelect: "none",
          gap: "0.8rem"
        }}>
          <span 
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "4px",
              background: "linear-gradient(90deg, #fff0 0%, #e53e3e 60%, #fff0 100%)",
              borderTopLeftRadius: "1rem",
              borderTopRightRadius: "1rem",
              pointerEvents: "none"
            }}
          ></span>
          <h2 
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: "bold",
              textAlign: "center",
              letterSpacing: "0.02em",
              color: "#fff",
              textShadow: "0 1px 12px #000a",
              zIndex: 2,
              flex: 1,
              wordBreak: "break-word",
              minWidth: 0
            }}
          >
            📍 Select Your Locations
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: "1.5rem",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              transition: "background-color 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              minWidth: "24px",
              zIndex: 3
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
         <div style={{
           padding: isMobile ? "0.45rem" : "0.5rem",
           overflowY: "auto",
           maxHeight: isMobile ? "calc(80vh - 80px)" : "calc(75vh - 80px)"
         }}>
                                           {/* Search Bar */}
            <div style={{ marginBottom: '8px' }}>
             <div style={{ 
               display: 'flex', 
               alignItems: 'center', 
               gap: '8px',
               marginBottom: '4px'
             }}>
               <input
                 type="text"
                 placeholder="🔍 Search locations..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 style={{
                   flex: 1,
                   padding: '8px 10px',
                   borderRadius: '6px',
                   border: '1px solid #333',
                   backgroundColor: '#2a2a2a',
                   color: '#fff',
                   fontSize: '14px'
                 }}
               />
               <span style={{ 
                 color: '#888', 
                 fontSize: '0.8rem',
                 whiteSpace: 'nowrap'
               }}>
                 {searchTerm ? `${filteredUnselectedLocations.length} of ${unselectedLocations.length}` : `${unselectedLocations.length} total`}
               </span>
               {searchTerm && (
                 <button
                   onClick={() => setSearchTerm('')}
                   style={{
                     padding: '4px 8px',
                     borderRadius: '4px',
                     border: '1px solid #555',
                     backgroundColor: 'transparent',
                     color: '#888',
                     cursor: 'pointer',
                     fontSize: '0.75rem'
                   }}
                 >
                   Clear
                 </button>
               )}
             </div>
           </div>

                     {/* Custom Location Input */}
           <div style={{ marginBottom: '8px' }}>
            <div style={{ 
              color: '#ffc107', 
              fontSize: '0.9rem', 
              fontWeight: 'bold',
              marginBottom: '6px',
              textAlign: 'left'
            }}>
              ➕ Add Custom Location:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
              <input
                type="text"
                placeholder="Type a custom location name..."
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                onKeyPress={handleCustomLocationKeyPress}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={handleAddCustomLocation}
                disabled={!customLocation.trim()}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: customLocation.trim() ? '#dc3545' : '#555',
                  color: '#fff',
                  cursor: customLocation.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                Add
              </button>
            </div>
          </div>

                                                                 {/* Selected Locations Section */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                color: '#4CAF50', 
                fontSize: '0.9rem', 
                fontWeight: 'bold',
                marginBottom: '6px',
                textAlign: 'left'
              }}>
                ✅ Selected ({selectedLocations.length})
              </div>
                            <div style={{ 
                 maxHeight: '120px', 
                 overflowY: 'auto',
                 padding: '6px',
                 backgroundColor: 'rgba(76, 175, 80, 0.05)',
                 borderRadius: '6px',
                 border: '1px solid rgba(76, 175, 80, 0.2)'
               }}>
                                                                 {selectedLocations.length > 0 ? (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '4px'
                    }}>
                      {selectedLocations.map((location, index) => (
                        <div 
                          key={index} 
                          onClick={() => handleLocationToggle(location)}
                          style={{ 
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'rgba(76, 175, 80, 0.2)',
                            border: '1px solid rgba(76, 175, 80, 0.4)',
                            color: '#4CAF50',
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textAlign: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(76, 175, 80, 0.3)';
                            e.target.style.transform = 'scale(1.02)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(76, 175, 80, 0.2)';
                            e.target.style.transform = 'scale(1)';
                          }}
                        >
                          ✓ {String(location)}
                        </div>
                      ))}
                    </div>
                 ) : (
                   <div style={{ 
                     color: '#888', 
                     fontSize: '0.8rem', 
                     textAlign: 'center',
                     fontStyle: 'italic',
                     padding: '8px'
                   }}>
                     No locations selected
                   </div>
                 )}
              </div>
            </div>

           {/* Available Locations Section */}
           <div style={{ marginBottom: '12px' }}>
             <div style={{ 
               color: '#ffc107', 
               fontSize: '0.9rem', 
               fontWeight: 'bold',
               marginBottom: '6px',
               textAlign: 'left'
             }}>
               ➕ Available ({filteredUnselectedLocations.length})
             </div>
                           <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto',
                padding: '6px',
                backgroundColor: 'rgba(255, 193, 7, 0.05)',
                borderRadius: '6px',
                border: '1px solid rgba(255, 193, 7, 0.2)'
              }}>
                               {filteredUnselectedLocations.length > 0 ? (
                  <div style={{ 
                     display: 'grid', 
                     gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(120px, 1fr))',
                     gap: '4px'
                   }}>
                    {filteredUnselectedLocations.map((location, index) => (
                      <div 
                        key={index} 
                        onClick={() => handleLocationToggle(location)}
                        style={{ 
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: selectedLocations.includes(location) 
                            ? 'rgba(255, 193, 7, 0.3)' 
                            : 'rgba(255, 193, 7, 0.1)',
                          border: '1px solid rgba(255, 193, 7, 0.4)',
                          color: '#ffc107',
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          textAlign: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!selectedLocations.includes(location)) {
                            e.target.style.background = 'rgba(255, 193, 7, 0.2)';
                            e.target.style.transform = 'scale(1.02)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selectedLocations.includes(location)) {
                            e.target.style.background = 'rgba(255, 193, 7, 0.1)';
                            e.target.style.transform = 'scale(1)';
                          }
                        }}
                      >
                        {selectedLocations.includes(location) ? '✓ ' : ''}{String(location)}
                      </div>
                    ))}
                  </div>
               ) : (
                 <div style={{ 
                   color: '#888', 
                   fontSize: '0.8rem', 
                   textAlign: 'center',
                   fontStyle: 'italic',
                   padding: '8px'
                 }}>
                   {searchTerm ? 'No locations match your search' : 'No available locations to add'}
                 </div>
               )}
             </div>
           </div>

                     {/* Footer Actions */}
           <div style={{
             display: 'flex',
             justifyContent: 'flex-end',
             gap: '12px',
             paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            flexDirection: isMobile ? 'column' : 'row'
           }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #555',
                backgroundColor: 'transparent',
                color: '#888',
                cursor: 'pointer',
                fontSize: '14px',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#4CAF50',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              Save Locations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSelectionModal;
