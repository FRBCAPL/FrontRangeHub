import React, { useState, useEffect } from 'react';
import DraggableModal from './DraggableModal';
import { BACKEND_URL } from '../../config.js';
import { sendPaymentInstructionsEmail } from '../../utils/emailHelpers.js';
import { supabaseDataService } from '../../services/supabaseDataService.js';

/**
 * PlayerRegistrationModal - Comprehensive player registration form
 * Collects all data needed for the app: personal info, availability, locations, contact preferences
 */
export default function PlayerRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  isMobile = false,
  existingPlayer = null, // For editing existing player data
  isAdmin = false // Admin override for testing
}) {
  // Form state
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    textNumber: '', // Separate text number if different from phone
    
    // Contact Preferences
    preferredContacts: [],
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    
    // Availability (Mon-Sun, time slots)
    availability: {
      Mon: [],
      Tue: [],
      Wed: [],
      Thu: [],
      Fri: [],
      Sat: [],
      Sun: []
    },
    
    // Locations (newline-separated)
    locations: '',
    
    // Authentication (auto-generated)
    pin: '',
    
    // Payment Status
    paymentStatus: 'pending', // pending, paid, failed
    
    // Division (assigned by admin)
    division: ''
  });

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customTimes, setCustomTimes] = useState({}); // Track custom time inputs per day: {day: {start: '9:00 AM', end: '11:00 AM'}}
  const [availableLocations, setAvailableLocations] = useState([]); // Predefined locations from admin
  const [selectedLocations, setSelectedLocations] = useState([]); // Selected predefined locations
  const [customLocations, setCustomLocations] = useState(''); // Custom locations text

  // Time slot options
  const timeSlots = [
    '10:00 AM - 12:00 PM',
    '12:00 PM - 2:00 PM',
    '2:00 PM - 4:00 PM',
    '4:00 PM - 6:00 PM',
    '6:00 PM - 8:00 PM',
    '8:00 PM - 10:00 PM',
    '10:00 PM - 12:00 AM',
    'Other (specify)'
  ];

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Contact preference options
  const contactOptions = [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone Call' },
    { value: 'text', label: 'Text Message' }
  ];

  // Generate unique PIN function
  const generateUniquePIN = async () => {
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      // Generate 4-digit PIN
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      
      try {
        // Check if PIN already exists
        const response = await fetch(`${BACKEND_URL}/api/users/check-pin/${pin}`);
        if (response.ok) {
          const data = await response.json();
          if (!data.exists) {
            return pin;
          }
        }
      } catch (error) {
        console.error('Error checking PIN uniqueness:', error);
        // If we can't check, just return the generated PIN
        return pin;
      }
      
      attempts++;
    }
    
    // Fallback: generate with timestamp
    return Math.floor(1000 + Math.random() * 9000).toString() + Date.now().toString().slice(-1);
  };

  // Load available locations on component mount
  useEffect(() => {
    loadAvailableLocations();
  }, []);

  // Initialize form with existing player data if editing
  useEffect(() => {
    if (existingPlayer) {
      setFormData({
        firstName: existingPlayer.firstName || '',
        lastName: existingPlayer.lastName || '',
        email: existingPlayer.email || '',
        phone: existingPlayer.phone || '',
        textNumber: existingPlayer.textNumber || '',
        preferredContacts: existingPlayer.preferredContacts || [],
        emergencyContactName: existingPlayer.emergencyContactName || '',
        emergencyContactPhone: existingPlayer.emergencyContactPhone || '',
        availability: existingPlayer.availability || {
          Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: []
        },
        locations: existingPlayer.locations || '',
        pin: existingPlayer.pin || '',
        confirmPin: existingPlayer.pin || '',
        division: existingPlayer.division || ''
      });

      // Parse existing locations to separate predefined and custom
      if (existingPlayer.locations) {
        const locationLines = existingPlayer.locations.split('\n').map(loc => loc.trim()).filter(loc => loc);
        const predefined = [];
        const custom = [];
        
        locationLines.forEach(location => {
          const isPredefined = availableLocations.some(availLoc => availLoc.name === location);
          if (isPredefined) {
            predefined.push(location);
          } else {
            custom.push(location);
          }
        });
        
        setSelectedLocations(predefined);
        setCustomLocations(custom.join('\n'));
      }
    }
  }, [existingPlayer, availableLocations]);

  // Load available locations from backend
  const loadAvailableLocations = async () => {
    try {
      const result = await supabaseDataService.getLocations();
      if (result.success && Array.isArray(result.data)) {
        setAvailableLocations(result.data);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  // Handle form field changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(''); // Clear errors when user types
  };

  // Handle availability changes
  const handleAvailabilityChange = (day, slot, checked) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: checked 
          ? [...prev.availability[day], slot]
          : prev.availability[day].filter(s => s !== slot)
      }
    }));
  };

  // Handle custom time specification for "Other" option
  const handleCustomTimeChange = (day, startTime, endTime) => {
    setFormData(prev => {
      const currentSlots = prev.availability[day];
      const hasOther = currentSlots.includes('Other (specify)');
      
      if (hasOther && startTime && endTime) {
        // Replace "Other (specify)" with the custom time
        const customTimeSlot = `${startTime} - ${endTime}`;
        const updatedSlots = currentSlots.map(slot => 
          slot === 'Other (specify)' ? customTimeSlot : slot
        );
        return {
          ...prev,
          availability: {
            ...prev.availability,
            [day]: updatedSlots
          }
        };
      }
      return prev;
    });
  };

  // Handle contact preference changes
  const handleContactPreferenceChange = (preference, checked) => {
    setFormData(prev => ({
      ...prev,
      preferredContacts: checked
        ? [...prev.preferredContacts, preference]
        : prev.preferredContacts.filter(p => p !== preference)
    }));
  };

  // Handle location selection
  const handleLocationSelection = (locationName, checked) => {
    setSelectedLocations(prev => 
      checked 
        ? [...prev, locationName]
        : prev.filter(loc => loc !== locationName)
    );
  };

  // Handle custom locations change
  const handleCustomLocationsChange = (value) => {
    setCustomLocations(value);
  };

  // Combine selected and custom locations for form submission
  const getCombinedLocations = () => {
    const allLocations = [...selectedLocations];
    if (customLocations.trim()) {
      const customLocationsList = customLocations
        .split('\n')
        .map(loc => loc.trim())
        .filter(loc => loc.length > 0);
      allLocations.push(...customLocationsList);
    }
    return allLocations.join('\n');
  };

  // Validation functions
  const validateStep = (step) => {
    // Admin override - skip all validation for testing
    if (isAdmin) {
      return null;
    }

    switch (step) {
      case 1: // Personal Info
        if (!formData.firstName.trim()) return 'First name is required';
        if (!formData.lastName.trim()) return 'Last name is required';
        if (!formData.email.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Valid email is required';
        if (!formData.phone.trim()) return 'Phone number is required';
        return null;
      
      case 2: // Availability
        const hasAvailability = Object.values(formData.availability).some(day => day.length > 0);
        if (!hasAvailability) return 'Please select at least one time slot';
        return null;
      
      case 3: // Locations
        const combinedLocations = getCombinedLocations();
        if (!combinedLocations.trim()) return 'At least one location is required';
        return null;
      
      case 4: // Contact Preferences
        if (formData.preferredContacts.length === 0) return 'Please select at least one contact preference';
        return null;
      
             case 5: // Security & Payment
         // PIN is auto-generated, no validation needed
         return null;
      
      default:
        return null;
    }
  };

  // Handle step navigation
  const handleNextStep = () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

         try {
       // Generate unique PIN
       const generatedPIN = await generateUniquePIN();
       
       // For admin testing, fill in default values for empty required fields
       const adminPayload = isAdmin ? {
         firstName: formData.firstName.trim() || 'Test',
         lastName: formData.lastName.trim() || 'Player',
         email: formData.email.trim() || `test${Date.now()}@example.com`,
         phone: formData.phone.trim() || '555-1234',
         textNumber: formData.textNumber || '',
         emergencyContactName: formData.emergencyContactName || '',
         emergencyContactPhone: formData.emergencyContactPhone || '',
         preferredContacts: formData.preferredContacts.length > 0 ? formData.preferredContacts : ['email'],
         availability: formData.availability,
         locations: getCombinedLocations() || 'Test Location',
         pin: generatedPIN,
         paymentStatus: 'pending',
         division: '', // Will be assigned by admin
         notes: formData.notes || 'Created by admin for testing'
       } : {
         ...formData,
         pin: generatedPIN,
         paymentStatus: 'pending',
         division: '' // Will be assigned by admin
       };

      const payload = {
        ...adminPayload,
        // Remove confirmPin from payload
        confirmPin: undefined
      };

      const url = existingPlayer 
        ? `${BACKEND_URL}/api/users/${existingPlayer.id}/profile`
        : `${BACKEND_URL}/api/users/register`;

      const method = existingPlayer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

             const result = await response.json();
       
               // Send payment instructions email for new registrations
        if (!existingPlayer && !isAdmin) {
          try {
                                // Fetch payment configuration
                    const paymentConfigResponse = await fetch(`${BACKEND_URL}/api/payment-config/enabled-methods`);
                    let paymentConfig = {
                      enabledMethods: [],
                      registrationFee: 30,
                      additionalInstructions: '',
                      contactInfo: {}
                    };
                    
                    if (paymentConfigResponse.ok) {
                      paymentConfig = await paymentConfigResponse.json();
                    }
            
            await sendPaymentInstructionsEmail({
              to_email: formData.email,
              to_name: `${formData.firstName} ${formData.lastName}`,
              registrationId: result.user?.id || result.id || `REG-${Date.now()}`,
              registrationDate: new Date().toLocaleDateString(),
              registrationFee: paymentConfig.registrationFee || 30,
              paymentMethods: paymentConfig.enabledMethods || [],
              additionalInstructions: paymentConfig.additionalInstructions || '',
              contactInfo: paymentConfig.contactInfo || {}
            });
            console.log('Payment instructions email sent successfully');
          } catch (emailError) {
            console.error('Failed to send payment instructions email:', emailError);
            // Don't fail the registration if email fails
          }
        }
       
       setSuccess(existingPlayer ? 'Profile updated successfully!' : 
         isAdmin ? 'Test player created successfully!' : 'Registration submitted successfully! Payment instructions have been sent to your email.');
       
       // Call success callback after a short delay
       setTimeout(() => {
         if (onSuccess) onSuccess(result);
         onClose();
       }, 1500);

    } catch (err) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div style={{ padding: '10px' }}>
                         <h3 style={{ color: '#e53e3e', marginBottom: '20px', textAlign: 'center', fontSize: '20px' }}>
               Personal Information
             </h3>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #444',
                      background: '#222',
                      color: '#fff',
                      fontSize: '18px'
                    }}
                    placeholder="Enter first name"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #444',
                      background: '#222',
                      color: '#fff',
                      fontSize: '18px'
                    }}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    background: '#222',
                    color: '#fff',
                    fontSize: '18px'
                  }}
                  placeholder="Enter email address"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #444',
                      background: '#222',
                      color: '#fff',
                      fontSize: '18px'
                    }}
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                    Text Number (if different)
                  </label>
                  <input
                    type="tel"
                    value={formData.textNumber}
                    onChange={(e) => handleInputChange('textNumber', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #444',
                      background: '#222',
                      color: '#fff',
                      fontSize: '18px'
                    }}
                    placeholder="Optional text number"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold' }}>
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #444',
                      background: '#222',
                      color: '#fff',
                      fontSize: '16px'
                    }}
                    placeholder="Emergency contact name"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontWeight: 'bold' }}>
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #444',
                      background: '#222',
                      color: '#fff',
                      fontSize: '16px'
                    }}
                    placeholder="Emergency contact phone"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div style={{ padding: '10px' }}>
                         <h3 style={{ color: '#e53e3e', marginBottom: '15px', textAlign: 'center', fontSize: '18px' }}>
               Availability Schedule
             </h3>
                         <p style={{ color: '#ccc', textAlign: 'center', marginBottom: '15px', fontSize: '14px' }}>
               Select the time slots when you're available to play matches
             </p>
            
                                                                                                       <div style={{ 
                             display: 'grid', 
                             gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
                             gap: '10px', 
                             maxHeight: '50vh', 
                             overflowY: 'auto' 
                           }}>
              {days.map(day => (
                                                   <div key={day} style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    padding: '8px', 
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                                     <h4 style={{ color: '#e53e3e', marginBottom: '6px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>
                                         {day === 'Mon' ? 'Monday' : 
                      day === 'Tue' ? 'Tuesday' : 
                      day === 'Wed' ? 'Wednesday' : 
                      day === 'Thu' ? 'Thursday' : 
                      day === 'Fri' ? 'Friday' : 
                      day === 'Sat' ? 'Saturday' : 'Sunday'}
                  </h4>
                  
                                                         <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
                      gap: '6px',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '0 6px'
                    }}>
                                         {timeSlots.map(slot => (
                       <div key={slot}>
                         <label style={{
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           padding: '4px 8px',
                           borderRadius: '6px',
                           background: formData.availability[day].includes(slot) ? 'rgba(229, 62, 62, 0.2)' : 'rgba(255,255,255,0.05)',
                           border: formData.availability[day].includes(slot) ? '1px solid #e53e3e' : '1px solid rgba(255,255,255,0.1)',
                           cursor: 'pointer',
                           transition: 'all 0.2s ease',
                           fontSize: '12px',
                           width: '100%',
                           minWidth: '110px',
                           margin: '0 auto',
                           boxShadow: formData.availability[day].includes(slot) ? '0 2px 4px rgba(229, 62, 62, 0.3)' : '0 1px 2px rgba(0,0,0,0.1)'
                         }}>
                           <input
                             type="checkbox"
                             checked={formData.availability[day].includes(slot)}
                             onChange={(e) => handleAvailabilityChange(day, slot, e.target.checked)}
                             style={{ marginRight: '4px', transform: 'scale(1)' }}
                           />
                                                       <span style={{ color: '#fff', fontSize: '12px' }}>{slot}</span>
                         </label>
                         
                                                   {/* Custom time input for "Other" option */}
                          {slot === 'Other (specify)' && formData.availability[day].includes(slot) && (
                            <div style={{ 
                              marginTop: '6px', 
                              padding: '8px',
                              background: 'rgba(229, 62, 62, 0.1)',
                              borderRadius: '4px',
                              border: '1px solid rgba(229, 62, 62, 0.3)'
                            }}>
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '1fr auto 1fr', 
                                gap: '6px', 
                                alignItems: 'center',
                                marginBottom: '4px'
                              }}>
                                                                 <select
                                   value={customTimes[day]?.start || ''}
                                   onChange={(e) => {
                                     const newStart = e.target.value;
                                     setCustomTimes(prev => ({ 
                                       ...prev, 
                                       [day]: { 
                                         ...prev[day], 
                                         start: newStart 
                                       } 
                                     }));
                                     handleCustomTimeChange(day, newStart, customTimes[day]?.end);
                                   }}
                                   style={{
                                     padding: '4px 6px',
                                     borderRadius: '3px',
                                     border: '1px solid rgba(255,255,255,0.2)',
                                     background: 'rgba(0,0,0,0.3)',
                                     color: '#fff',
                                     fontSize: '14px',
                                     textAlign: 'center'
                                   }}
                                >
                                  <option value="">Start</option>
                                  <option value="6:00 AM">6:00 AM</option>
                                  <option value="7:00 AM">7:00 AM</option>
                                  <option value="8:00 AM">8:00 AM</option>
                                  <option value="9:00 AM">9:00 AM</option>
                                  <option value="10:00 AM">10:00 AM</option>
                                  <option value="11:00 AM">11:00 AM</option>
                                  <option value="12:00 PM">12:00 PM</option>
                                  <option value="1:00 PM">1:00 PM</option>
                                  <option value="2:00 PM">2:00 PM</option>
                                  <option value="3:00 PM">3:00 PM</option>
                                  <option value="4:00 PM">4:00 PM</option>
                                  <option value="5:00 PM">5:00 PM</option>
                                  <option value="6:00 PM">6:00 PM</option>
                                  <option value="7:00 PM">7:00 PM</option>
                                  <option value="8:00 PM">8:00 PM</option>
                                  <option value="9:00 PM">9:00 PM</option>
                                  <option value="10:00 PM">10:00 PM</option>
                                  <option value="11:00 PM">11:00 PM</option>
                                  <option value="12:00 AM">12:00 AM</option>
                                </select>
                                
                                <span style={{ color: '#fff', fontSize: '11px' }}>to</span>
                                
                                                                 <select
                                   value={customTimes[day]?.end || ''}
                                   onChange={(e) => {
                                     const newEnd = e.target.value;
                                     setCustomTimes(prev => ({ 
                                       ...prev, 
                                       [day]: { 
                                         ...prev[day], 
                                         end: newEnd 
                                       } 
                                     }));
                                     handleCustomTimeChange(day, customTimes[day]?.start, newEnd);
                                   }}
                                   style={{
                                     padding: '4px 6px',
                                     borderRadius: '3px',
                                     border: '1px solid rgba(255,255,255,0.2)',
                                     background: 'rgba(0,0,0,0.3)',
                                     color: '#fff',
                                     fontSize: '14px',
                                     textAlign: 'center'
                                   }}
                                >
                                  <option value="">End</option>
                                  <option value="6:00 AM">6:00 AM</option>
                                  <option value="7:00 AM">7:00 AM</option>
                                  <option value="8:00 AM">8:00 AM</option>
                                  <option value="9:00 AM">9:00 AM</option>
                                  <option value="10:00 AM">10:00 AM</option>
                                  <option value="11:00 AM">11:00 AM</option>
                                  <option value="12:00 PM">12:00 PM</option>
                                  <option value="1:00 PM">1:00 PM</option>
                                  <option value="2:00 PM">2:00 PM</option>
                                  <option value="3:00 PM">3:00 PM</option>
                                  <option value="4:00 PM">4:00 PM</option>
                                  <option value="5:00 PM">5:00 PM</option>
                                  <option value="6:00 PM">6:00 PM</option>
                                  <option value="7:00 PM">7:00 PM</option>
                                  <option value="8:00 PM">8:00 PM</option>
                                  <option value="9:00 PM">9:00 PM</option>
                                  <option value="10:00 PM">10:00 PM</option>
                                  <option value="11:00 PM">11:00 PM</option>
                                  <option value="12:00 AM">12:00 AM</option>
                                </select>
                              </div>
                              
                              {(customTimes[day]?.start && customTimes[day]?.end) && (
                                <div style={{ 
                                  fontSize: '10px', 
                                  color: '#4CAF50', 
                                  textAlign: 'center',
                                  fontWeight: 'bold'
                                }}>
                                  ✓ Custom time set: {customTimes[day].start} - {customTimes[day].end}
                                </div>
                              )}
                            </div>
                          )}
                       </div>
                     ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div style={{ padding: '10px' }}>
                         <h3 style={{ color: '#e53e3e', marginBottom: '15px', textAlign: 'center' }}>
               Playing Locations
             </h3>
             <p style={{ color: '#ccc', textAlign: 'center', marginBottom: '15px', fontSize: '13px' }}>
               Select from predefined locations and/or add your own custom locations
             </p>
            
            {/* Predefined Locations */}
            {availableLocations.length > 0 && (
                             <div style={{ marginBottom: '15px' }}>
                                 <label style={{ display: 'block', marginBottom: '10px', color: '#fff', fontWeight: 'bold', fontSize: '16px', textAlign: 'center', width: '100%' }}>
                   Select from Available Locations:
                 </label>
                                                   <div style={{ 
                    display: 'grid', 
                    gap: '3px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    padding: '6px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                   {availableLocations.map(location => (
                                           <label key={location._id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        background: selectedLocations.includes(location.name) ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255,255,255,0.05)',
                        border: selectedLocations.includes(location.name) ? '1px solid #4CAF50' : '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}>
                                               <input
                          type="checkbox"
                          checked={selectedLocations.includes(location.name)}
                          onChange={(e) => handleLocationSelection(location.name, e.target.checked)}
                          style={{ marginRight: '6px', transform: 'scale(1)' }}
                        />
                       <div style={{ flex: 1, textAlign: 'center' }}>
                                                   <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px', textAlign: 'center' }}>
                            {location.name}
                          </div>
                                                   {location.address && (
                            <div style={{ color: '#ccc', fontSize: '13px', marginTop: '1px', textAlign: 'center' }}>
                              📍 {location.address}
                            </div>
                          )}
                          {location.notes && (
                            <div style={{ color: '#999', fontSize: '12px', marginTop: '1px', textAlign: 'center' }}>
                              📝 {location.notes}
                            </div>
                          )}
                       </div>
                     </label>
                   ))}
                 </div>
              </div>
            )}

            {/* Custom Locations */}
            <div>
              <label style={{ display: 'block', marginBottom: '10px', color: '#fff', fontWeight: 'bold', fontSize: '16px', textAlign: 'center' }}>
                Add Custom Locations (Optional):
              </label>
                             <textarea
                 value={customLocations}
                 onChange={(e) => handleCustomLocationsChange(e.target.value)}
                                   style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    background: '#222',
                    color: '#fff',
                    fontSize: '16px',
                    resize: 'vertical'
                  }}
                 placeholder="Enter additional locations, one per line:&#10;My Home Table&#10;Friend's House&#10;Local Bar"
               />
            </div>

            {/* Selected Locations Summary */}
            {(selectedLocations.length > 0 || customLocations.trim()) && (
                             <div style={{ 
                 marginTop: '10px', 
                 padding: '10px', 
                 background: 'rgba(76, 175, 80, 0.1)', 
                 borderRadius: '6px',
                 border: '1px solid rgba(76, 175, 80, 0.3)'
               }}>
                <h4 style={{ color: '#4CAF50', margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>
                  📍 Your Selected Locations:
                </h4>
                <div style={{ color: '#ccc', fontSize: '13px' }}>
                  {getCombinedLocations().split('\n').map((location, index) => (
                    <div key={index} style={{ marginBottom: '2px' }}>
                      • {location}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
                         <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(229, 62, 62, 0.1)', borderRadius: '6px' }}>
                               <p style={{ color: '#ccc', fontSize: '14px', margin: 0 }}>
                 <strong>Tip:</strong> Select from the predefined locations above, or add your own custom locations. 
                 These will be used to help match you with other players in your area.
               </p>
             </div>
          </div>
        );

      case 4:
        return (
          <div style={{ padding: '10px' }}>
            <h3 style={{ color: '#e53e3e', marginBottom: '20px', textAlign: 'center' }}>
              Contact Preferences
            </h3>
            <p style={{ color: '#ccc', textAlign: 'center', marginBottom: '20px', fontSize: '14px' }}>
              How would you prefer other players to contact you for match scheduling?
            </p>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              {contactOptions.map(option => (
                <label key={option.value} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px',
                  borderRadius: '8px',
                  background: formData.preferredContacts.includes(option.value) ? 'rgba(229, 62, 62, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: formData.preferredContacts.includes(option.value) ? '1px solid #e53e3e' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.preferredContacts.includes(option.value)}
                    onChange={(e) => handleContactPreferenceChange(option.value, e.target.checked)}
                    style={{ marginRight: '12px', transform: 'scale(1.2)' }}
                  />
                  <span style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
            
            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
              <p style={{ color: '#ccc', fontSize: '14px', margin: 0 }}>
                <strong>Note:</strong> Your contact information will only be shared with players who are scheduling matches with you. 
                You can change these preferences later in your profile settings.
              </p>
            </div>
          </div>
        );

             case 5:
         return (
           <div style={{ padding: '10px' }}>
             <h3 style={{ color: '#e53e3e', marginBottom: '20px', textAlign: 'center' }}>
               Registration & Payment
             </h3>
             
             <div style={{ display: 'grid', gap: '20px' }}>
               {/* PIN Information */}
               <div style={{ 
                 padding: '15px', 
                 background: 'rgba(76, 175, 80, 0.1)', 
                 borderRadius: '8px', 
                 border: '1px solid rgba(76, 175, 80, 0.3)',
                 textAlign: 'center'
               }}>
                 <h4 style={{ color: '#4CAF50', margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>
                   🔐 Your PIN will be auto-generated
                 </h4>
                                   <p style={{ color: '#ccc', fontSize: '14px', margin: 0 }}>
                    A unique 4-digit PIN will be automatically generated for you. 
                    You'll receive it after payment is confirmed.
                  </p>
               </div>

               {/* Division Information */}
               <div style={{ 
                 padding: '15px', 
                 background: 'rgba(255, 193, 7, 0.1)', 
                 borderRadius: '8px', 
                 border: '1px solid rgba(255, 193, 7, 0.3)',
                 textAlign: 'center'
               }}>
                 <h4 style={{ color: '#ffc107', margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>
                   🏆 Division Assignment
                 </h4>
                 <p style={{ color: '#ccc', fontSize: '14px', margin: 0 }}>
                   Your division will be assigned by league administrators based on your skill level 
                   and availability. You'll be notified once assigned.
                 </p>
               </div>

               {/* Payment Information */}
               <div style={{ 
                 padding: '15px', 
                 background: 'rgba(229, 62, 62, 0.1)', 
                 borderRadius: '8px', 
                 border: '1px solid rgba(229, 62, 62, 0.3)',
                 textAlign: 'center'
               }}>
                 <h4 style={{ color: '#e53e3e', margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>
                   💳 Payment Required
                 </h4>
                                   <p style={{ color: '#ccc', fontSize: '14px', margin: 0 }}>
                    Registration fee: <strong>$30</strong> must be paid before you receive your PIN and can access the league system. 
                    Payment instructions will be sent to your email immediately after registration.
                  </p>
               </div>
             </div>
             
             <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0, 123, 255, 0.1)', borderRadius: '8px', border: '1px solid rgba(0, 123, 255, 0.3)' }}>
               <p style={{ color: '#ccc', fontSize: '14px', margin: 0 }}>
                 <strong>Next Steps:</strong> After registration, you'll receive payment instructions. 
                 Once payment is confirmed, you'll get your PIN and full access to the league system.
               </p>
             </div>
           </div>
         );

      default:
        return null;
    }
  };

    if (!isOpen) return null;

  return (
    <>
      <DraggableModal
        open={isOpen}
        onClose={onClose}
        title={existingPlayer ? 'Edit Player Profile' : 
          isAdmin ? 'Admin: Test Player Registration' : 'Player Registration'}
                 maxWidth={isMobile ? "95vw" : "800px"}
        className="player-registration-modal"
      >
      {/* Progress Bar */}
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        height: '4px',
        position: 'relative',
        marginBottom: '15px'
      }}>
        <div style={{
          background: 'linear-gradient(90deg, #e53e3e, #ff6b6b)',
          height: '100%',
          width: `${(currentStep / 5) * 100}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Step Indicator */}
      <div style={{ 
        padding: '10px 15px', 
        background: 'rgba(0,0,0,0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        marginBottom: '15px',
        borderRadius: '6px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <span style={{ color: '#fff', fontSize: '14px' }}>
            Step {currentStep} of 5
          </span>
          <span style={{ color: '#e53e3e', fontSize: '14px', fontWeight: 'bold' }}>
            {currentStep === 1 && 'Personal Info'}
            {currentStep === 2 && 'Availability'}
            {currentStep === 3 && 'Locations'}
            {currentStep === 4 && 'Contact Preferences'}
                         {currentStep === 5 && 'Registration & Payment'}
          </span>
        </div>
        
        {/* Admin Testing Notice */}
        {isAdmin && (
          <div style={{
            background: 'rgba(255, 193, 7, 0.2)',
            border: '1px solid rgba(255, 193, 7, 0.5)',
            borderRadius: '4px',
            padding: '6px 10px',
            marginTop: '8px',
            textAlign: 'center'
          }}>
            <span style={{ color: '#ffc107', fontSize: '12px', fontWeight: 'bold' }}>
              🔧 ADMIN MODE: Validation bypassed for testing
            </span>
          </div>
        )}
      </div>

             {/* Content */}
               <div style={{ 
          marginBottom: '25px', 
          maxHeight: '60vh', 
          overflowY: 'auto',
          paddingRight: '10px'
        }}>
         {renderStepContent()}
       </div>

      {/* Error/Success Messages */}
      {error && (
        <div style={{ 
          padding: '10px 15px', 
          background: 'rgba(229, 62, 62, 0.2)', 
          border: '1px solid #e53e3e',
          color: '#ff6b6b',
          textAlign: 'center',
          fontSize: '14px',
          borderRadius: '6px',
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          padding: '10px 15px', 
          background: 'rgba(76, 175, 80, 0.2)', 
          border: '1px solid #4CAF50',
          color: '#4CAF50',
          textAlign: 'center',
          fontSize: '14px',
          borderRadius: '6px',
          marginBottom: '15px'
        }}>
          {success}
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        gap: '10px'
      }}>
        <button
          onClick={currentStep === 1 ? onClose : handlePrevStep}
                     style={{
             padding: '12px 20px',
             borderRadius: '6px',
             border: '1px solid #666',
             background: 'transparent',
             color: '#fff',
             cursor: 'pointer',
             fontSize: '16px',
             transition: 'all 0.2s ease',
             flex: 1
           }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
          }}
        >
          {currentStep === 1 ? 'Cancel' : 'Previous'}
        </button>

        <button
          onClick={handleNextStep}
          disabled={loading}
                     style={{
             padding: '12px 20px',
             borderRadius: '6px',
             border: 'none',
             background: loading ? '#666' : '#e53e3e',
             color: '#fff',
             cursor: loading ? 'not-allowed' : 'pointer',
             fontSize: '16px',
             fontWeight: 'bold',
             transition: 'all 0.2s ease',
             flex: 1
           }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.background = '#ff6b6b';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.target.style.background = '#e53e3e';
            }
          }}
        >
          {loading ? 'Processing...' : 
           currentStep === 5 ? (existingPlayer ? 'Update Profile' : 'Complete Registration') : 'Next'}
        </button>
             </div>
     </DraggableModal>
     
     <style jsx>{`
               .player-registration-modal {
          max-height: 95vh !important;
          height: auto !important;
        }
        
        .player-registration-modal .draggable-modal {
          max-height: 95vh !important;
          height: auto !important;
        }
        
        .player-registration-modal .modal-content {
          max-height: 70vh !important;
          overflow-y: auto !important;
        }
       
       /* Custom scrollbar */
       .player-registration-modal .modal-content::-webkit-scrollbar {
         width: 6px;
       }
       
       .player-registration-modal .modal-content::-webkit-scrollbar-thumb {
         background: #e53e3e;
         border-radius: 3px;
       }
       
               .player-registration-modal .modal-content::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
        
                 /* Custom dropdown styling for dark theme */
         .player-registration-modal select option {
           background: #222 !important;
           color: #fff !important;
           border: none !important;
           font-size: 14px !important;
           padding: 4px 8px !important;
         }
        
        .player-registration-modal select:focus {
          outline: none !important;
          border-color: #e53e3e !important;
          box-shadow: 0 0 0 2px rgba(229, 62, 62, 0.2) !important;
        }
     `}</style>
     </>
   );
 }
