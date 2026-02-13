import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import LocationSelectionModal from './LocationSelectionModal.jsx';
import ChangePasswordModal from './ChangePasswordModal.jsx';
import notificationService from '@shared/services/services/notificationService.js';
import { supabaseDataService } from '@shared/services/services/supabaseDataService.js';

const UserProfileModal = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  isMobile, 
  onUserUpdate
}) => {
  const [editingSection, setEditingSection] = useState(null);
  const [editData, setEditData] = useState({});
  const [localUser, setLocalUser] = useState(currentUser);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Sync local user state with currentUser prop changes
  useEffect(() => {
    setLocalUser(currentUser);
  }, [currentUser]);

  // Force re-render when localUser changes
  useEffect(() => {
    console.log('🔄 localUser state updated:', localUser);
  }, [localUser]);

  // Force re-render when refreshTrigger changes
  useEffect(() => {
    console.log('🔄 refreshTrigger changed to:', refreshTrigger);
  }, [refreshTrigger]);

    // Load profile data when modal opens
  useEffect(() => {
    const loadProfileData = async () => {
      if (isOpen && currentUser?.email) {
        try {
          console.log('🔄 Loading profile data for:', currentUser.email);
          
          // Use Supabase instead of old backend API
          const result = await supabaseDataService.getUserProfileData(currentUser.email);
          console.log('📥 Supabase profile result:', result);
          
          if (result.success) {
            const data = result.data;
            console.log('✅ Loaded profile data:', data);
            console.log('📍 Locations from Supabase:', data.profile?.locations);
            console.log('⏰ Availability from Supabase:', data.profile?.availability);
            console.log('📞 Phone from Supabase:', data.profile?.phone);
            
            setLocalUser(prev => {
              const updated = {
                ...prev,
                locations: data.profile?.locations || '',
                availability: data.profile?.availability || {},
                phone: data.profile?.phone || '',
                divisions: data.profile?.divisions || [],
                ladderInfo: data.profile?.ladderInfo || null
              };
              console.log('🔄 Updated localUser:', updated);
              return updated;
            });
          } else {
            console.error('❌ Failed to load profile data:', result.error);
          }
        } catch (error) {
          console.error('💥 Error loading profile data:', error);
        }
      } else {
        console.log('⚠️ Modal not open or no email:', { isOpen, email: currentUser?.email });
      }
    };

    loadProfileData();
  }, [isOpen, currentUser?.email]);

  // Load available locations when modal opens
  useEffect(() => {
    const loadAvailableLocations = async () => {
      if (isOpen) {
        try {
          console.log('🔄 Loading available locations...');
          
          // Use Supabase instead of old backend API
          const result = await supabaseDataService.getLocations();
          console.log('📡 Locations from Supabase:', result);
          
          if (result.success) {
            const rawLocations = result.data || [];
            console.log('🔍 Raw locations structure:', rawLocations);
            
            // Extract location names from objects if they're not strings
            const locations = rawLocations.map(location => {
              if (typeof location === 'string') {
                console.log(`  ✅ String location: "${location}"`);
                return location;
              } else if (location && typeof location === 'object') {
                console.log(`  🔍 Object location:`, location);
                // Try to find the location name in common fields
                const locationName = location.name || location.locationName || location.title || 
                                   location.location || location.value || JSON.stringify(location);
                console.log(`  📍 Extracted name: "${locationName}"`);
                return locationName;
              } else {
                console.log(`  ⚠️ Other type location:`, location);
                return String(location);
              }
            }).filter(Boolean); // Remove any undefined/null values
            
            console.log('📍 Final processed locations:', locations);
            
            console.log('📍 Setting availableLocations to:', locations);
            setAvailableLocations(locations);
          } else {
            console.error('❌ Failed to load locations. Status:', response.status);
          }
        } catch (error) {
          console.error('💥 Error loading locations:', error);
        }
      }
    };

    loadAvailableLocations();
  }, [isOpen]);

  // Start editing a specific section
  const startEditing = (section, data) => {
    setEditingSection(section);
    setEditData(data);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingSection(null);
    setEditData({});
  };

  // Save changes for a section
  const saveSection = async (section) => {
    try {
      console.log('Saving section:', section);
      console.log('Edit data:', editData);
      console.log('Current user:', currentUser);
      console.log('User ID:', currentUser?._id);
      console.log('User email:', currentUser?.email);
      console.log('All user fields:', Object.keys(currentUser || {}));
      console.log('Environment VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
      
      // Check if we have a valid user email
      const userEmail = currentUser?.email;
      if (!userEmail) {
        console.error('No valid user email found');
        alert('Error: No valid user email found. Please refresh the page and try again.');
        return;
      }
      
      console.log('Using user email:', userEmail);
      
      console.log('Using Supabase for profile update');
      
      // Prepare profile updates based on section
      let profileUpdates = {};

      if (section === 'basic') {
        profileUpdates = {
          firstName: editData.firstName,
          lastName: editData.lastName,
          phone: editData.phone
        };
      } else if (section === 'locations') {
        profileUpdates = {
          locations: editData.locations
        };
      } else if (section === 'availability') {
        profileUpdates = {
          availability: editData.availability
        };
      }

      console.log('Sending Supabase profile update:', profileUpdates);

      // Use Supabase instead of old backend API
      const result = await supabaseDataService.updateUserProfile(userEmail, profileUpdates);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      console.log('Supabase profile update successful:', result);

      // Refresh profile data from Supabase
      try {
        const profileResult = await supabaseDataService.getUserProfileData(userEmail);
        if (profileResult.success) {
          const profileData = profileResult.data;
          console.log('Refreshed profile data:', profileData);

          // Update local state with the fresh data
          setLocalUser(prev => ({
            ...prev,
            firstName: profileData.profile.firstName,
            lastName: profileData.profile.lastName,
            phone: profileData.profile.phone,
            locations: profileData.profile.locations || '',
            availability: profileData.profile.availability || {}
          }));

          // Notify parent component to refresh profile data
          if (onUserUpdate) {
            onUserUpdate();
          }
        }
      } catch (error) {
        console.error('Error refreshing profile data:', error);
      }

      setEditingSection(null);
      setEditData({});
      alert('✅ Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  // Handle availability changes
  const handleAvailabilityChange = (day, slot, checked) => {
    const currentAvailability = editData.availability || localUser.availability || {};
    const currentDaySlots = currentAvailability[day] || [];
    
    const newDaySlots = checked 
      ? [...currentDaySlots, slot]
      : currentDaySlots.filter(s => s !== slot);
    
    setEditData(prev => ({
      ...prev,
      availability: {
        ...currentAvailability,
        [day]: newDaySlots
      }
    }));
  };

  // Handle location changes
  const handleLocationChange = (location, checked) => {
    const currentLocations = editData.locations || localUser.locations || '';
    const locationArray = currentLocations.split('\n').filter(Boolean);
    
    const newLocations = checked
      ? [...locationArray, location]
      : locationArray.filter(loc => loc !== location);
    
    setEditData(prev => ({
      ...prev,
      locations: newLocations.join('\n')
    }));
  };

    // Handle locations modal save
  const handleLocationsModalSave = async (locationsString) => {
    try {
      console.log('🔄 Starting location save process...');
      console.log('📍 New locations string:', locationsString);
      
      // Update local state immediately for instant UI feedback
      setLocalUser(prev => {
        const updated = {
          ...prev,
          locations: locationsString
        };
        console.log('🔄 Updated localUser immediately:', updated);
        return updated;
      });

      // Force immediate re-render
      setRefreshTrigger(prev => prev + 1);
      console.log('🔄 Triggered refresh for immediate update');

      // Save to backend
      const userEmail = currentUser?.email;
      if (!userEmail) {
        console.error('No valid user email found');
        alert('Error: No valid user email found. Please refresh the page and try again.');
        return;
      }

      // Use Supabase to save locations
      const result = await supabaseDataService.updateUserProfile(userEmail, {
        locations: locationsString
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update locations');
      }
      
      console.log('✅ Locations updated successfully in Supabase');
      setEditingSection(null);
      
      // Force another refresh to ensure the display updates
      setRefreshTrigger(prev => prev + 1);
      console.log('🔄 Final refresh triggered after backend save');
      
      // Notify parent component to refresh profile data
      if (onUserUpdate) {
        onUserUpdate();
      }
    } catch (error) {
      console.error('Error saving locations:', error);
      alert('Error saving locations. Please try again.');
    }
  };

  // Handle new location addition
  const handleAddNewLocation = (newLocation) => {
    if (!newLocation.trim()) return;
    
    const currentLocations = editData.locations || localUser.locations || '';
    const locationArray = currentLocations.split('\n').filter(Boolean);
    
    // Check if location already exists
    if (locationArray.some(loc => loc.trim().toLowerCase() === newLocation.trim().toLowerCase())) {
      alert('This location is already in your list!');
        return;
      }

    const newLocations = [...locationArray, newLocation.trim()];
    setEditData(prev => ({
      ...prev,
      locations: newLocations.join('\n')
    }));
  };

  // Get user's current locations (from edit data or current user)
  const getUserLocations = () => {
    try {
      // Force recalculation when refreshTrigger changes
      const locations = localUser.locations || '';
      console.log('🔍 getUserLocations called with refreshTrigger:', refreshTrigger);
      console.log('🔍 Current locations data:', locations);
      console.log('🔍 localUser.locations:', localUser.locations);
      
      if (!locations) return [];
      
      // Handle both newline and comma-separated formats
      if (typeof locations === 'string') {
        if (locations.includes('\n')) {
          const result = locations.split('\n').filter(Boolean).map(loc => String(loc).trim());
          console.log('🔍 Parsed newline locations:', result);
          return result;
        } else if (locations.includes(',')) {
          const result = locations.split(',').map(l => String(l).trim()).filter(Boolean);
          console.log('🔍 Parsed comma locations:', result);
          return result;
        } else {
          const result = locations.trim() ? [String(locations).trim()] : [];
          console.log('🔍 Parsed single location:', result);
          return result;
        }
      }
      
      // If locations is an array, ensure all items are strings
      if (Array.isArray(locations)) {
        const result = locations.map(loc => String(loc).trim()).filter(Boolean);
        console.log('🔍 Parsed array locations:', result);
        return result;
      }
      
      console.log('🔍 No valid locations found, returning empty array');
      return [];
    } catch (error) {
      console.error('❌ Error in getUserLocations:', error);
      return [];
    }
  };

  // Get locations not yet selected by user
  const getUnselectedLocations = () => {
    const userLocations = getUserLocations();
    console.log('🔍 getUnselectedLocations called:');
    console.log('  - availableLocations:', availableLocations);
    console.log('  - userLocations:', userLocations);
    
    if (!availableLocations || !Array.isArray(availableLocations)) {
      console.log('  - ❌ availableLocations is not an array or is empty');
      return [];
    }
    
    const filtered = availableLocations.filter(location => {
      // Ensure location is a string
      if (typeof location !== 'string') {
        console.warn('⚠️ Non-string location found:', location);
        return false;
      }
      
      const isSelected = userLocations.some(userLoc => {
        // Ensure userLoc is also a string
        if (typeof userLoc !== 'string') {
          console.warn('⚠️ Non-string userLoc found:', userLoc);
          return false;
        }
        
        return userLoc.trim().toLowerCase() === location.trim().toLowerCase();
      });
      
      if (isSelected) {
        console.log(`  - ❌ "${location}" is already selected`);
        } else {
        console.log(`  - ✅ "${location}" is available to add`);
      }
      
      return !isSelected;
    });
    
    console.log('  - Final filtered result:', filtered);
    return filtered;
  };



  if (!isOpen || !localUser) return null;

  const divisions = localUser.divisions || [];
  
  // Debug logging
  console.log('🎯 Modal rendering with localUser:', localUser);
  console.log('📍 Current locations:', localUser.locations);
  console.log('⏰ Current availability:', localUser.availability);
  console.log('📞 Current phone:', localUser.phone);

  return createPortal(
    <>
      <style>{`
        [data-profile-modal-box] {
          height: 85vh !important;
          max-height: 85vh !important;
          min-height: 0 !important;
          overflow: hidden !important;
          flex-shrink: 0 !important;
        }
        @media (min-width: 769px) {
          [data-profile-modal-box] {
            height: 88vh !important;
            max-height: 88vh !important;
          }
        }
        [data-profile-modal-body] {
          position: absolute !important;
          top: 52px !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          overflow-y: scroll !important;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch;
        }
        @media (max-width: 768px) {
          [data-profile-modal-body] {
            top: 48px !important;
          }
        }
      `}</style>
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
        padding: isMobile ? "10px" : "20px",
        overflow: "hidden"
      }}
      onClick={onClose}
    >
             <div
         data-profile-modal-box
         style={{
           transform: `translate(0px, 0px)`,
           cursor: "default",
           background: "linear-gradient(120deg, #232323 80%, #2a0909 100%)",
           color: "#fff",
           border: "2px solid #e53e3e",
           borderRadius: isMobile ? "0" : "1rem",
           boxShadow: "0 0 32px #e53e3e, 0 0 40px rgba(0,0,0,0.85)",
           width: isMobile ? "95vw" : "auto",
           maxWidth: isMobile ? "95vw" : "750px",
           minWidth: isMobile ? "auto" : "500px",
           margin: isMobile ? "0" : "0 auto",
           left: 0,
           right: 0,
           animation: "modalBounceIn 0.5s cubic-bezier(.21,1.02,.73,1.01)",
           padding: 0,
           position: "relative",
           fontFamily: "inherit",
           boxSizing: "border-box",
           textAlign: "center",
           height: isMobile ? "85vh" : "88vh",
           maxHeight: isMobile ? "85vh" : "88vh",
           minHeight: 0,
           display: "flex",
           flexDirection: "column",
           overflow: "hidden",
           flexShrink: 0,
           alignSelf: "center"
         }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - flex-shrink: 0 so it stays visible */}
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
          gap: "0.8rem",
          flexShrink: 0
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
              fontSize: isMobile ? "0.9rem" : "1rem",
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
            👤 Profile Information
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

        {/* Modal Content - absolutely positioned so it cannot expand the modal; fills space below header */}
        <div data-profile-modal-body style={{
             position: "absolute",
             top: isMobile ? "48px" : "52px",
             left: 0,
             right: 0,
             bottom: 0,
             padding: isMobile ? "0.8rem" : "1rem",
             overflowY: "scroll",
             overflowX: "hidden",
             WebkitOverflowScrolling: "touch"
           }}>
          <div style={{
              display: 'grid',
              gap: isMobile ? '8px' : '10px'
            }}>
            
                         {/* Basic Info */}
             <div style={{
               background: 'rgba(255, 255, 255, 0.05)',
               padding: isMobile ? '6px' : '8px',
               borderRadius: '6px',
               border: '1px solid rgba(255, 255, 255, 0.1)'
             }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                                 <div style={{
                   fontWeight: 'bold',
                   color: '#ffffff',
                   fontSize: isMobile ? '0.9rem' : '1rem'
                 }}>
                   👤 Basic Information
                 </div>
                {editingSection !== 'basic' && (
                  <button
                                         onClick={() => startEditing('basic', {
                       firstName: localUser.firstName || '',
                       lastName: localUser.lastName || '',
                       phone: localUser.phone || ''
                     })}
                    style={{
                      background: 'rgba(76, 175, 80, 0.2)',
                      border: '1px solid rgba(76, 175, 80, 0.4)',
                      color: '#4CAF50',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: isMobile ? '0.7rem' : '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(76, 175, 80, 0.3)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(76, 175, 80, 0.2)'}
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>
              
              {editingSection === 'basic' ? (
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      value={editData.firstName || ''}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="First Name"
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(0, 0, 0, 0.3)',
                        color: '#ffffff',
                        fontSize: '0.9rem'
                      }}
                    />
                    <input
                      type="text"
                      value={editData.lastName || ''}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Last Name"
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(0, 0, 0, 0.3)',
                        color: '#ffffff',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                  <div style={{ padding: '8px', color: '#aaa', fontSize: '0.85rem' }}>
                    <strong>Email:</strong> {localUser.email}
                    <span style={{ display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>To change your email/password login email, use Login & Security below.</span>
                  </div>
                  <input
                    type="tel"
                    value={editData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Phone"
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#ffffff',
                      fontSize: '0.9rem'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      onClick={() => saveSection('basic')}
                      style={{
                        background: '#4CAF50',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      💾 Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      style={{
                        background: '#6c757d',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                                                                   <div style={{ color: '#cccccc', lineHeight: '1.4', fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
                   <div><strong>Name:</strong> {localUser.firstName} {localUser.lastName}</div>
                   <div><strong>Email:</strong> {localUser.email}</div>
                   <div><strong>Phone:</strong> {localUser.phone || 'Not provided'}</div>
                 </div>
              )}
            </div>

            {/* Login & Security Button */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: isMobile ? '6px' : '8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button
                onClick={() => setShowChangePasswordModal(true)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  border: 'none',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '6px',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                🔐 Login & Security
              </button>
            </div>

            {/* League & Ladder Status */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: isMobile ? '6px' : '8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                                <div style={{
                   fontWeight: 'bold',
                   color: '#ffffff',
                   marginBottom: '4px',
                   fontSize: isMobile ? '0.9rem' : '1rem'
                 }}>
                   🏆 League & Ladder Status
                 </div>
                             
                             {/* League and Ladder Data - Side by Side */}
                             <div style={{ 
                               display: 'flex', 
                               gap: '16px',
                               flexDirection: isMobile ? 'column' : 'row'
                             }}>
                               {/* League Divisions */}
                               <div style={{ 
                                 flex: 1,
                                 minWidth: isMobile ? 'auto' : '200px'
                               }}>
                                 <div style={{ 
                                   color: '#4CAF50', 
                                   fontWeight: 'bold', 
                                   fontSize: isMobile ? '0.8rem' : '0.9rem',
                                   marginBottom: '2px'
                                 }}>
                                   🏆 League Divisions:
                                 </div>
                                 <div style={{ 
                                   color: '#cccccc', 
                                   lineHeight: '1.5', 
                                   fontSize: isMobile ? '0.8rem' : '0.9rem',
                                   paddingLeft: '8px'
                                 }}>
                {divisions.length > 0 ? divisions.join(', ') : 'No divisions assigned'}
                                 </div>
                               </div>
                               
                               {/* Ladder Info */}
                               <div style={{ 
                                 flex: 1,
                                 minWidth: isMobile ? 'auto' : '200px'
                               }}>
                                 <div style={{ 
                                   color: '#FF9800', 
                                   fontWeight: 'bold', 
                                   fontSize: isMobile ? '0.8rem' : '0.9rem',
                                   marginBottom: '2px'
                                 }}>
                                   🏅 Ladder Status:
                                 </div>
                                 <div style={{ 
                                   color: '#cccccc', 
                                   lineHeight: '1.5', 
                                   fontSize: isMobile ? '0.8rem' : '0.9rem',
                                   paddingLeft: '8px'
                                 }}>
                                   {localUser.ladderInfo ? (
                                     <div>
                                       <div>📊 Ladder: {localUser.ladderInfo.ladderName}</div>
                                       <div>🏆 Position: {localUser.ladderInfo.position}</div>
                                     </div>
                                   ) : (
                                     'Not on any ladder'
                                   )}
                                 </div>
                               </div>
              </div>
            </div>

                         {/* League Availability */}
             <div style={{
               background: 'rgba(255, 255, 255, 0.05)',
               padding: isMobile ? '6px' : '8px',
               borderRadius: '6px',
               border: '1px solid rgba(255, 255, 255, 0.1)'
             }}>
               <div style={{
                 display: 'flex',
                 justifyContent: 'space-between',
                 alignItems: 'center',
                 marginBottom: '4px'
               }}>
                 <div style={{
                   fontWeight: 'bold',
                   color: '#ffffff',
                   fontSize: isMobile ? '0.9rem' : '1rem'
                 }}>
                                       ⏰ Availability
                 </div>
                {editingSection !== 'availability' && (
                    <button
                      onClick={() => startEditing('availability', {
                        availability: localUser.availability || {}
                      })}
                      style={{
                        background: 'rgba(76, 175, 80, 0.2)',
                        border: '1px solid rgba(76, 175, 80, 0.4)',
                        color: '#4CAF50',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: isMobile ? '0.7rem' : '0.8rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(76, 175, 80, 0.3)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(76, 175, 80, 0.2)'}
                    >
                      ✏️ Edit
                    </button>
                )}
              </div>
              
                             {editingSection === 'availability' ? (
                 <div style={{ display: 'grid', gap: '6px' }}>
                                       <div style={{ 
                      color: '#ffc107', 
                      fontSize: '0.85rem', 
                      fontWeight: 'bold',
                      marginBottom: '4px'
                    }}>
                      Quick Time Slot Editor:
                    </div>
                   
                   {/* Quick Add Section */}
                   <div style={{
                     padding: '4px',
                     background: 'rgba(255, 255, 255, 0.03)',
                     borderRadius: '3px',
                     border: '1px solid rgba(255, 255, 255, 0.08)'
                   }}>
                                           <div style={{ 
                        color: '#4CAF50', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold',
                        marginBottom: '3px'
                      }}>
                        ➕ Quick Add:
                      </div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '3px', alignItems: 'end' }}>
                                               <select
                          id="quick-day"
                          style={{
                            padding: '3px 4px',
                            borderRadius: '3px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            background: 'rgba(0, 0, 0, 0.4)',
                            color: '#ffffff',
                            fontSize: '0.8rem',
                            minHeight: '24px'
                          }}
                       >
                         <option value="">Day</option>
                         <option value="Mon">Mon</option>
                         <option value="Tue">Tue</option>
                         <option value="Wed">Wed</option>
                         <option value="Thu">Thu</option>
                         <option value="Fri">Fri</option>
                         <option value="Sat">Sat</option>
                         <option value="Sun">Sun</option>
                       </select>
                                               <input
                          type="time"
                          id="quick-start"
                          style={{
                            padding: '3px 4px',
                            borderRadius: '3px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            background: 'rgba(0, 0, 0, 0.4)',
                            color: '#ffffff',
                            fontSize: '0.8rem',
                            minHeight: '24px'
                          }}
                       />
                                               <input
                          type="time"
                          id="quick-end"
                          style={{
                            padding: '3px 4px',
                            borderRadius: '3px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            background: 'rgba(0, 0, 0, 0.4)',
                            color: '#ffffff',
                            fontSize: '0.8rem',
                            minHeight: '24px'
                          }}
                       />
                       <button
                         type="button"
                         onClick={() => {
                           const daySelect = document.getElementById('quick-day');
                           const startInput = document.getElementById('quick-start');
                           const endInput = document.getElementById('quick-end');
                           const day = daySelect.value;
                           const startTime = startInput.value;
                           const endTime = endInput.value;
                           
                           if (!day || !startTime || !endTime) {
                             alert('Please select day, start, and end times.');
                             return;
                           }
                           
                           if (startTime >= endTime) {
                             alert('End time must be after start time.');
                             return;
                           }
                           
                           const formatTime = (time) => {
                             const [hours, minutes] = time.split(':');
                             const hour = parseInt(hours);
                             const ampm = hour >= 12 ? 'PM' : 'AM';
                             const displayHour = hour % 12 || 12;
                             return `${displayHour}:${minutes} ${ampm}`;
                           };
                           
                           const newSlot = `${formatTime(startTime)} - ${formatTime(endTime)}`;
                           const currentSlots = editData.availability?.[day] || localUser.availability?.[day] || [];
                           
                           if (currentSlots.includes(newSlot)) {
                             alert('This time slot already exists.');
                             return;
                           }
                           
                           const newSlots = [...currentSlots, newSlot];
                           
                           setEditData(prev => ({
                             ...prev,
                             availability: {
                               ...prev.availability,
                               [day]: newSlots
                             }
                           }));
                           
                           // Clear inputs
                           daySelect.value = '';
                           startInput.value = '';
                           endInput.value = '';
                         }}
                                                   style={{
                            background: 'rgba(76, 175, 80, 0.3)',
                            border: '1px solid rgba(76, 175, 80, 0.5)',
                            color: '#4CAF50',
                            padding: '3px 6px',
                            borderRadius: '3px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            minHeight: '24px'
                          }}
                       >
                         Add
                       </button>
                     </div>
                   </div>
                   
                   {/* Current Slots Display */}
                   <div style={{
                     padding: '4px',
                     background: 'rgba(255, 255, 255, 0.02)',
                     borderRadius: '3px',
                     border: '1px solid rgba(255, 255, 255, 0.05)'
                   }}>
                                           <div style={{ 
                        color: '#4CAF50', 
                        fontSize: '0.8rem', 
                        fontWeight: 'bold',
                        marginBottom: '3px'
                      }}>
                        📅 Current Slots:
                      </div>
                     <div style={{ display: 'grid', gap: '2px', maxHeight: '120px', overflowY: 'auto' }}>
                       {Object.entries(editData.availability || localUser.availability || {}).map(([day, slots]) => 
                         slots && slots.length > 0 ? slots.map((slot, index) => (
                           <div key={`${day}-${index}`} style={{
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'space-between',
                             padding: '2px 4px',
                             background: 'rgba(76, 175, 80, 0.08)',
                             borderRadius: '2px',
                             border: '1px solid rgba(76, 175, 80, 0.2)'
                           }}>
                                                           <span style={{ color: '#4CAF50', fontSize: '0.75rem', fontWeight: '500' }}>
                               <strong>{day}:</strong> {slot}
                             </span>
                             <button
                               type="button"
                               onClick={() => {
                                 const newSlots = slots.filter((_, i) => i !== index);
                                 setEditData(prev => ({
                                   ...prev,
                                   availability: {
                                     ...prev.availability,
                                     [day]: newSlots
                                   }
                                 }));
                               }}
                                                               style={{
                                  background: 'rgba(220, 53, 69, 0.2)',
                                  border: '1px solid rgba(220, 53, 69, 0.3)',
                                  color: '#dc3545',
                                  padding: '2px 4px',
                                  borderRadius: '2px',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                             >
                               ✕
                             </button>
                           </div>
                         )) : null
                       ).flat().filter(Boolean)}
                     </div>
                   </div>
                   
                   <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                     <button
                       onClick={() => saveSection('availability')}
                       style={{
                         background: '#4CAF50',
                         color: '#fff',
                         border: 'none',
                         padding: '4px 8px',
                         borderRadius: '3px',
                         fontSize: '0.7rem',
                         cursor: 'pointer'
                       }}
                     >
                       💾 Save
                     </button>
                     <button
                       onClick={cancelEditing}
                       style={{
                         background: '#6c757d',
                         color: '#fff',
                         border: 'none',
                         padding: '4px 8px',
                         borderRadius: '3px',
                         fontSize: '0.7rem',
                         cursor: 'pointer'
                       }}
                     >
                       ❌ Cancel
                     </button>
                   </div>
                 </div>
                                                           ) : (
                                                                                                                   <div style={{ color: '#cccccc', lineHeight: '1.4', fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
                      {localUser.availability && Object.keys(localUser.availability).length > 0 
                        ? (() => {
                           const availableDays = Object.entries(localUser.availability)
                             .filter(([day, slots]) => slots && slots.length > 0);
                           
                           if (availableDays.length === 0) return 'No availability set';
                           
                           // Group days into a more compact format
                           const dayNames = {
                             'Mon': 'Mon',
                             'Tue': 'Tue', 
                             'Wed': 'Wed',
                             'Thu': 'Thu',
                             'Fri': 'Fri',
                             'Sat': 'Sat',
                             'Sun': 'Sun'
                           };
                           
                           return (
                             <div style={{
                               display: 'grid',
                               gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                               gap: '6px'
                             }}>
                               {availableDays.map(([day, slots]) => (
                                                                                                      <div key={day} style={{ 
                                     padding: '4px 6px',
                                     background: 'rgba(255, 255, 255, 0.05)',
                                     borderRadius: '4px',
                                     border: '1px solid rgba(255, 255, 255, 0.1)',
                                     fontSize: '0.85rem'
                                   }}>
                                    <span style={{ fontWeight: 'bold', color: '#ffc107' }}>{dayNames[day]}:</span> {slots.join(', ')}
                                  </div>
                               ))}
                             </div>
                           );
                         })()
                       : 'No availability set'
                     }
                   </div>
               )}
            </div>

                         {/* Locations */}
             <div style={{
               background: 'rgba(255, 255, 255, 0.05)',
               padding: isMobile ? '6px' : '8px',
               borderRadius: '6px',
               border: '1px solid rgba(255, 255, 255, 0.1)'
             }}>
               <div style={{
                 display: 'flex',
                 justifyContent: 'space-between',
                 alignItems: 'center',
                 marginBottom: '4px'
               }}>
                 <div style={{
                   fontWeight: 'bold',
                   color: '#ffffff',
                   fontSize: isMobile ? '0.9rem' : '1rem'
                 }}>
                   📍 Preferred Locations
                 </div>
                                 {editingSection !== 'locations' && (
                   <button
                     onClick={() => setShowLocationsModal(true)}
                     style={{
                       background: 'rgba(76, 175, 80, 0.2)',
                       border: '1px solid rgba(76, 175, 80, 0.4)',
                       color: '#4CAF50',
                       padding: '4px 8px',
                       borderRadius: '4px',
                       fontSize: isMobile ? '0.7rem' : '0.8rem',
                       cursor: 'pointer',
                       transition: 'all 0.2s ease'
                     }}
                     onMouseEnter={(e) => e.target.style.background = 'rgba(76, 175, 80, 0.3)'}
                     onMouseLeave={(e) => e.target.style.background = 'rgba(76, 175, 80, 0.2)'}
                   >
                     ✏️ Edit
                   </button>
                 )}
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                gap: '6px'
              }}
              key={refreshTrigger} // Force re-render when refreshTrigger changes
              >
                    {(() => {
                      try {
                        const locations = getUserLocations();
                        if (!locations || locations.length === 0) {
                          return (
                            <span style={{
                              color: '#888',
                              fontSize: '0.8rem',
                              fontStyle: 'italic',
                              gridColumn: '1 / -1',
                              textAlign: 'center',
                              padding: '10px'
                            }}>
                              No locations selected
                            </span>
                          );
                        }
                        
                        return locations.map((location, index) => (
                     <span 
                       key={`${location}-${index}-${refreshTrigger}`} // Include refreshTrigger in key
                                              style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          padding: '5px 8px',
                          borderRadius: '8px',
                          fontSize: isMobile ? '0.75rem' : '0.8rem',
                         display: 'flex',
                         justifyContent: 'center',
                         alignItems: 'center',
                         gap: '3px',
                         width: '100%',
                         minHeight: '24px',
                         textAlign: 'center',
                         overflow: 'hidden',
                         textOverflow: 'ellipsis',
                         whiteSpace: 'nowrap'
                       }}
                            title={String(location)}
                     >
                            📍 {String(location)}
                     </span>
                        ));
                      } catch (error) {
                        console.error('❌ Error rendering locations display:', error);
                        return (
                          <span style={{
                            color: '#ff6b6b',
                            fontSize: '0.8rem',
                            fontStyle: 'italic',
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            padding: '10px'
                          }}>
                            Error loading locations
                          </span>
                        );
                      }
                    })()}
                 </div>
            </div>

            {/* Notification Preferences */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: isMobile ? '6px' : '8px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                fontWeight: 'bold',
                color: '#ffffff',
                marginBottom: '4px',
                fontSize: isMobile ? '0.9rem' : '1rem'
              }}>
                🔔 Notification Preferences
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0'
              }}>
                <div style={{
                  color: '#cccccc',
                  fontSize: isMobile ? '0.85rem' : '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>🔔 Browser Notifications:</span>
                  <span style={{
                    color: notificationService.isNotificationEnabled() ? '#4CAF50' : '#f44336',
                    fontWeight: 'bold'
                  }}>
                    {notificationService.isNotificationEnabled() ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '6px' }}>
                  {notificationService.isNotificationEnabled() ? (
                    <button
                      onClick={async () => {
                        notificationService.disableNotifications();
                        // Force re-render by updating a dummy state
                        setRefreshTrigger(prev => prev + 1);
                      }}
                      style={{
                        background: 'rgba(244, 67, 54, 0.2)',
                        border: '1px solid rgba(244, 67, 54, 0.4)',
                        color: '#f44336',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: isMobile ? '0.7rem' : '0.8rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(244, 67, 54, 0.3)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(244, 67, 54, 0.2)'}
                    >
                      🔕 Disable
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        const enabled = await notificationService.enableNotifications();
                        if (enabled) {
                          // Force re-render by updating a dummy state
                          setRefreshTrigger(prev => prev + 1);
                        }
                      }}
                      style={{
                        background: 'rgba(76, 175, 80, 0.2)',
                        border: '1px solid rgba(76, 175, 80, 0.4)',
                        color: '#4CAF50',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: isMobile ? '0.7rem' : '0.8rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(76, 175, 80, 0.3)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(76, 175, 80, 0.2)'}
                    >
                      🔔 Enable
                    </button>
                  )}
                </div>
              </div>
              
              <div style={{
                color: '#9ca3af',
                fontSize: isMobile ? '0.75rem' : '0.8rem',
                fontStyle: 'italic',
                marginTop: '4px'
              }}>
                {notificationService.getStatus().permission === 'denied' 
                  ? '⚠️ Notifications are blocked by your browser. Check your browser settings to enable them.'
                  : notificationService.getStatus().permission === 'default'
                  ? '💡 Click "Enable" to allow browser notifications for match updates and challenges.'
                  : '✅ You\'ll receive instant alerts for challenges, match updates, and ladder changes.'
                }
              </div>
            </div>

          </div>

          {/* Close Button */}
          <div style={{
            marginTop: '20px',
            textAlign: 'center'
          }}>
            <button
              style={{
                background: 'linear-gradient(135deg, #6c757d, #5a6268)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: isMobile ? '10px 20px' : '12px 24px',
                fontSize: isMobile ? '0.9rem' : '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(108, 117, 125, 0.3)',
                minWidth: isMobile ? '100px' : '120px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #5a6268, #495057)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #6c757d, #5a6268)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(108, 117, 125, 0.3)';
              }}
              onClick={onClose}
            >
              ❌ Close
            </button>
          </div>
        </div>
      </div>

      {/* Location Selection Modal */}
      <LocationSelectionModal
        isOpen={showLocationsModal}
        onClose={() => setShowLocationsModal(false)}
        currentLocations={localUser.locations || ''}
        availableLocations={availableLocations}
        isMobile={isMobile}
        onSave={handleLocationsModalSave}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        userEmail={localUser.email}
        isMobile={isMobile}
        onUserUpdate={onUserUpdate}
      />
    </div>
    </>,
    document.body
  );
};

export default UserProfileModal;
