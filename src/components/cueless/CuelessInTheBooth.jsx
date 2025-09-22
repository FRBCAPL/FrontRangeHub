import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CuelessBookingModal from './CuelessBookingModal';
import './CuelessInTheBooth.css';
import legendsLogo from '../../assets/LBC logo with address.png';
import cuelessLogo from '../../assets/Culess pic.jpg';

const CuelessInTheBooth = () => {
  const navigate = useNavigate();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successfulBooking, setSuccessfulBooking] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: '',
    eventDate: '',
    endDate: '',
    setupDate: '',
    eventTime: '',
    endTime: '',
    location: '',
    numberOfMatches: '',
      playerNames: '',
        player1: '',
        player2: '',
        teamName: '',
        opponentTeamName: '',
        leagueName: '',
        matchType: '',
        format1: '',
        format2: '',
        eventDescription: '',
        tournamentDirector: '',
        assistantDirector: '',
        tournamentName: '',
    specialRequests: '',
    budget: '',
    agreeToTerms: false,
    venueName: '',
    venueCity: 'Colorado Springs',
    venueState: 'CO',
    venueAwareness: '',
    venueContactName: '',
    venueContactEmail: '',
    venueContactPhone: '',
    isMultiDay: false,
    numberOfCameras: '2'
  });

  // Smart form state for multi-day events
  const [eventDays, setEventDays] = useState([]);
  const [showAdvancedScheduling, setShowAdvancedScheduling] = useState(false);
  const [currentTimeSlots, setCurrentTimeSlots] = useState([]);
  const [timePickerKey, setTimePickerKey] = useState(0);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const newData = {
      ...prev,
      [name]: type === 'checkbox' ? checked : value
      };
      
      // Smart logic: Generate event days when dates change
      if (name === 'eventDate' || name === 'endDate') {
        generateEventDays(newData.eventDate, newData.endDate);
      }
      
      // Smart logic: Show advanced scheduling for multi-day events
      if (name === 'eventDate' || name === 'endDate') {
        const isMultiDay = newData.eventDate && newData.endDate && newData.eventDate !== newData.endDate;
        setShowAdvancedScheduling(isMultiDay);
      }
      
      // Auto-set location for ladder matches or any Legends booking
      if (name === 'eventType' && (value === 'ladderMatch' || selectedService === 'legends')) {
        newData.location = 'Legends Brews & Cues';
      }
      
      // Clear time when date changes to ensure valid time slot selection
      if (name === 'eventDate' && newData.eventTime) {
        newData.eventTime = '';
      }
      
      // Update time slots and force re-render when date changes
      if (name === 'eventDate') {
        console.log('🚀 handleInputChange: Date changed to:', value);
        const slots = generateTimeSlots(value);
        console.log('🚀 handleInputChange: Generated slots:', slots.length, 'slots');
        setCurrentTimeSlots(slots);
        setTimePickerKey(prev => prev + 1); // Force complete re-render
        console.log('🚀 handleInputChange: State updated, key incremented');
      }
      
      return newData;
    });
  };

  // Generate array of days for multi-day events
  const generateEventDays = (startDate, endDate) => {
    if (!startDate || !endDate) {
      setEventDays([]);
      return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push({
        date: d.toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        description: ''
      });
    }
    
    setEventDays(days);
  };

  // Handle individual day time changes
  const handleDayTimeChange = (dayIndex, field, value) => {
    setEventDays(prev => prev.map((day, index) => {
      if (index === dayIndex) {
        const updatedDay = { ...day, [field]: value };
        
        // If start time is selected, automatically set end time 2 hours later
        if (field === 'startTime' && value && value !== 'no-stream') {
          const startHour = parseInt(value.split(':')[0]);
          const endHour = startHour + 2;
          const endTime = endHour === 24 ? '00:00' : endHour.toString().padStart(2, '0') + ':00';
          updatedDay.endTime = endTime;
        } else if (field === 'startTime' && value === 'no-stream') {
          updatedDay.endTime = '';
        }
        
        return updatedDay;
      }
      return day;
    }));
    
    // Also update the tournament day selections in formData
    const dayKey = `tournamentDay${dayIndex}${field}`;
    const endTimeKey = `tournamentDay${dayIndex}endTime`;
    
    setFormData(prev => {
      const newData = { ...prev, [dayKey]: value };
      
      // If start time is set to "no-stream", clear the end time
      if (field === 'startTime' && value === 'no-stream') {
        newData[endTimeKey] = '';
      } else if (field === 'startTime' && value && value !== 'no-stream') {
        // Auto-set end time 2 hours after start time
        const startHour = parseInt(value.split(':')[0]);
        const endHour = startHour + 2;
        const endTime = endHour === 24 ? '00:00' : endHour.toString().padStart(2, '0') + ':00';
        newData[endTimeKey] = endTime;
      }
      
      return newData;
    });
  };

  // Check if contact info and disclaimer are complete
  const isContactInfoComplete = () => {
    return formData.name && formData.email && formData.agreeToTerms;
  };

  // Generate time slots based on Legends operating hours
  const generateTimeSlots = (date) => {
    if (!date) return [];
    
    // Fix timezone issue by parsing date string directly
    const [year, month, day] = date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day); // month is 0-indexed
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    console.log('🔍 generateTimeSlots called with date:', date);
    console.log('🔍 Parsed as:', selectedDate.toDateString());
    console.log('🔍 Day of week:', dayOfWeek, '(0=Sunday, 6=Saturday)');
    
    // Weekend hours: 2pm-11pm (Sat & Sun)
    // Weekday hours: 5pm-11pm (Mon-Fri)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const startHour = isWeekend ? 14 : 17; // 2pm or 5pm
    const endHour = 23; // 11pm
    
    console.log('🔍 Is weekend:', isWeekend);
    console.log('🔍 Start hour:', startHour, 'End hour:', endHour);
    
    const timeSlots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      // Add hourly slots
      timeSlots.push({
        value: `${hour.toString().padStart(2, '0')}:00`,
        label: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`
      });
      
      // Add half-hour slots (except for the last hour)
      if (hour < endHour - 1) {
        timeSlots.push({
          value: `${hour.toString().padStart(2, '0')}:30`,
          label: `${hour > 12 ? hour - 12 : hour}:30 ${hour >= 12 ? 'PM' : 'AM'}`
        });
      }
    }
    
    console.log('🔍 Generated', timeSlots.length, 'time slots');
    console.log('🔍 First few slots:', timeSlots.slice(0, 3));
    
    return timeSlots;
  };

  // Generate time slots for on-location events (10am-7pm)
  const generateOnLocationTimeSlots = () => {
    const slots = [];
    for (let hour = 10; hour <= 19; hour++) { // 10am to 7pm
      const timeString = hour.toString().padStart(2, '0') + ':00';
      const displayTime = hour === 12 ? '12:00 PM' : 
                         hour > 12 ? `${hour - 12}:00 PM` : 
                         `${hour}:00 AM`;
      
      slots.push({
        value: timeString,
        label: displayTime
      });
    }
    return slots;
  };

  // Generate end time slots for on-location private matches (2 hours after start time to midnight)
  const generateOnLocationEndTimeSlots = (startTime) => {
    if (!startTime) return [];
    
    const slots = [];
    const startHour = parseInt(startTime.split(':')[0]);
    const minEndHour = startHour + 2; // 2-hour minimum
    const maxEndHour = 24; // Midnight (24:00 = 12:00 AM next day)
    
    for (let hour = minEndHour; hour <= maxEndHour; hour++) {
      const timeString = hour === 24 ? '00:00' : hour.toString().padStart(2, '0') + ':00';
      const displayTime = hour === 12 ? '12:00 PM' : 
                         hour === 24 ? '12:00 AM (Midnight)' :
                         hour > 12 ? `${hour - 12}:00 PM` : 
                         `${hour}:00 AM`;
      
      slots.push({
        value: timeString,
        label: displayTime
      });
    }
    return slots;
  };

  // Calculate hours and total price for on-location private matches
  const calculateOnLocationPrice = (startTime, endTime) => {
    if (!startTime || !endTime) return { hours: 0, totalPrice: 0 };
    
    const startHour = parseInt(startTime.split(':')[0]);
    let endHour = parseInt(endTime.split(':')[0]);
    
    // Handle midnight (00:00)
    if (endTime === '00:00') {
      endHour = 24;
    }
    
    const hours = endHour - startHour;
    const hourlyRate = 50;
    const totalPrice = hours * hourlyRate;
    
    return { hours, totalPrice };
  };

  // Calculate on-location private match pricing
  const calculateOnLocationPrivatePrice = (startTime, endTime, numberOfCameras) => {
    if (!startTime || !numberOfCameras) {
      return { 
        hours: 0, 
        totalPrice: 0, 
        setupFee: 0, 
        hourlyRate: 0,
        totalSetupFee: 0,
        cameras: 0,
        additionalCameras: 0,
        additionalCameraSetupFee: 0,
        baseHourlyRate: 0,
        hourlyCameraFee: 0,
        totalHourlyCost: 0
      };
    }
    
    // If no end time is selected, use 2-hour minimum for calculation
    const actualEndTime = endTime || (startTime ? (() => {
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = startHour + 2;
      return endHour === 24 ? '00:00' : endHour.toString().padStart(2, '0') + ':00';
    })() : '');
    
    if (!actualEndTime) {
      return { 
        hours: 0, 
        totalPrice: 0, 
        setupFee: 0, 
        hourlyRate: 0,
        totalSetupFee: 0,
        cameras: 0,
        additionalCameras: 0,
        additionalCameraSetupFee: 0,
        baseHourlyRate: 0,
        hourlyCameraFee: 0,
        totalHourlyCost: 0
      };
    }
    
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(actualEndTime.split(':')[0]);
    
    const hours = endHour - startHour;
    const cameras = parseInt(numberOfCameras);
    
    // Setup fees (one-time)
    const setupFee = 50; // $50 setup fee includes 1 camera
    const additionalCameras = Math.max(0, cameras - 1); // Additional cameras beyond the first
    const additionalCameraSetupFee = additionalCameras * 10; // $10 per additional camera setup
    
    // Hourly rates
    const baseHourlyRate = 50; // $50/hour base rate
    const hourlyCameraFee = Math.max(0, cameras - 1) * 5; // $5 per camera starting with camera 2
    const hourlyRate = baseHourlyRate + hourlyCameraFee;
    
    const totalSetupFee = setupFee + additionalCameraSetupFee;
    const totalHourlyCost = hours * hourlyRate;
    const totalPrice = totalSetupFee + totalHourlyCost;
    
    return { 
      hours, 
      cameras, 
      additionalCameras, 
      setupFee, 
      additionalCameraSetupFee, 
      totalSetupFee,
      baseHourlyRate,
      hourlyCameraFee,
      hourlyRate,
      totalHourlyCost,
      totalPrice 
    };
  };

  // Get operating hours text based on date
  const getOperatingHoursText = (date) => {
    if (!date) return '';
    
    // Fix timezone issue by parsing date string directly
    const [year, month, day] = date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day); // month is 0-indexed
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    return isWeekend ? 'Weekend hours: 2:00 PM - 10:00 PM' : 'Weekday hours: 5:00 PM - 10:00 PM';
  };

  // Calculate on-location tournament pricing
  const calculateOnLocationTournamentPrice = (numberOfCameras, totalStreamHours, noStreamDays) => {
    if (!numberOfCameras) {
      return { 
        hours: 0, 
        totalPrice: 0, 
        setupFee: 0, 
        hourlyRate: 0,
        totalSetupFee: 0,
        cameras: 0,
        additionalCameras: 0,
        additionalCameraSetupFee: 0,
        baseHourlyRate: 0,
        hourlyCameraFee: 0,
        totalHourlyCost: 0,
        noStreamDays: 0,
        noStreamCost: 0
      };
    }
    
    const cameras = parseInt(numberOfCameras);
    const streamHours = parseFloat(totalStreamHours) || 0;
    const noStreamCount = parseInt(noStreamDays) || 0;
    
    // Setup fees (one-time)
    const setupFee = 100; // $100 setup fee includes 2 cameras
    const additionalCameras = Math.max(0, cameras - 2); // Additional cameras beyond the first 2
    const additionalCameraSetupFee = additionalCameras * 20; // $20 per additional camera setup
    
    // Hourly rates
    const baseHourlyRate = 50; // $50/hour base rate
    const hourlyCameraFee = Math.max(0, cameras - 2) * 10; // $10 per camera starting with camera 3
    const hourlyRate = baseHourlyRate + hourlyCameraFee;
    
    // No-stream day cost
    const noStreamCost = noStreamCount * 50; // $50 per no-stream day
    
    const totalSetupFee = setupFee + additionalCameraSetupFee;
    const totalHourlyCost = streamHours * hourlyRate;
    const totalPrice = totalSetupFee + totalHourlyCost + noStreamCost;
    
    return { 
      hours: streamHours, 
      cameras, 
      additionalCameras, 
      setupFee, 
      additionalCameraSetupFee,
      totalSetupFee,
      baseHourlyRate,
      hourlyCameraFee,
      hourlyRate,
      totalHourlyCost,
      noStreamDays: noStreamCount,
      noStreamCost,
      totalPrice 
    };
  };

  // Helper function to format date for input (fixes timezone issues)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    // Parse the date string directly to avoid timezone conversion issues
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date in local timezone
    const localDate = new Date(year, month - 1, day);
    // Format as YYYY-MM-DD for input
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  // Helper function to handle date input changes (fixes timezone issues)
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    if (value) {
      // Store the date string directly without timezone conversion
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Helper functions for success page formatting
  const getEventTypeDisplayName = (eventType) => {
    switch (eventType) {
      case 'ladderMatch': return 'Ladder Match (Not top 5) - Legends';
      case 'privateMatch': return 'Private Match - Legends';
      case 'tournament': return 'Tournament - Legends';
      case 'leagueNight': return 'Team League Night - Legends';
      case 'other': return 'Custom Event';
      default: return eventType;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Generate tournament days between start and end date
  const generateTournamentDays = () => {
    if (!formData.eventDate || !formData.endDate) return [];
    
    // Parse dates directly without Date objects to avoid timezone issues
    const [startYear, startMonth, startDay] = formData.eventDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = formData.endDate.split('-').map(Number);
    
    const days = [];
    let currentYear = startYear;
    let currentMonth = startMonth;
    let currentDay = startDay;
    
    // Create a date string for comparison
    const createDateString = (year, month, day) => {
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    };
    
    // Loop through dates without using Date objects
    while (true) {
      const dateString = createDateString(currentYear, currentMonth, currentDay);
      
      // Create a Date object only for formatting the display string
      const displayDate = new Date(currentYear, currentMonth - 1, currentDay);
      const formattedDate = displayDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
      
      days.push({
        date: dateString,
        dateString: formattedDate,
        startTime: formData[`tournamentDay${days.length}startTime`] || '',
        endTime: formData[`tournamentDay${days.length}endTime`] || '',
        description: formData[`tournamentDay${days.length}description`] || ''
      });
      
      // Check if we've reached the end date
      if (currentYear === endYear && currentMonth === endMonth && currentDay === endDay) {
        break;
      }
      
      // Move to next day
      currentDay++;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      if (currentDay > daysInMonth) {
        currentDay = 1;
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
    }
    
    return days;
  };

  // Calculate total tournament hours
  const calculateTotalTournamentHours = () => {
    const days = generateTournamentDays();
    let totalHours = 0;
    
    days.forEach(day => {
      // Skip if either start or end time is "no-stream"
      if (day.startTime === 'no-stream' || day.endTime === 'no-stream') {
        return; // Don't add any hours for no-stream days
      }
      
      if (day.startTime && day.endTime) {
        const start = new Date(`2000-01-01T${day.startTime}:00`);
        const end = new Date(`2000-01-01T${day.endTime}:00`);
        const hours = (end - start) / (1000 * 60 * 60);
        if (hours > 0) {
          totalHours += hours;
        }
      }
    });
    
    return totalHours.toFixed(1);
  };

  // Calculate tournament price
  const calculateTournamentPrice = () => {
    const totalHours = parseFloat(calculateTotalTournamentHours());
    const minHours = 4;
    const hoursToCharge = Math.max(minHours, totalHours);
    return Math.round(hoursToCharge * 30);
  };

  // Initialize time slots when component mounts or eventDate changes
  useEffect(() => {
    if (formData.eventDate) {
      console.log('⚡ useEffect: Date changed to:', formData.eventDate);
      const slots = generateTimeSlots(formData.eventDate);
      console.log('⚡ useEffect: Generated slots:', slots.length, 'slots');
      setCurrentTimeSlots(slots);
      console.log('⚡ useEffect: State updated');
    }
  }, [formData.eventDate]);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Form validation function
  const isFormValid = () => {
    // Basic required fields
    if (!formData.name || !formData.email || !formData.eventType || !formData.agreeToTerms) {
      return false;
    }

    // Event type specific validation
    if (formData.eventType === 'ladderMatch') {
      return formData.player1 && formData.player2 && formData.eventDate && formData.eventTime;
    }
    
    if (formData.eventType === 'privateMatch') {
      return formData.player1 && formData.player2 && formData.eventDate && formData.eventTime && formData.numberOfMatches && parseInt(formData.numberOfMatches) >= 2;
    }

    if (formData.eventType === 'tournament') {
      return formData.eventDate && formData.endDate && formData.tournamentDirector && formData.tournamentName && calculateTotalTournamentHours() >= 0;
    }

    if (formData.eventType === 'leagueNight') {
      const basicFields = formData.eventDate && formData.eventTime && formData.teamName && formData.opponentTeamName && formData.leagueName && formData.matchType;
      
      if (formData.matchType === 'single') {
        return basicFields && formData.format1;
      }
      
      if (formData.matchType === 'doublePlay') {
        return basicFields && formData.format1 && formData.format2;
      }
      
      return basicFields;
    }

    if (formData.eventType === 'other') {
      return formData.eventDate && formData.eventTime && formData.eventDescription;
    }

    // On-location event validation
    if (formData.eventType === 'onLocationPrivate') {
      const basicFields = formData.player1 && formData.player2 && formData.eventDate && formData.eventTime && formData.venueName && formData.venueCity && formData.venueState && formData.venueAwareness && formData.numberOfCameras;
      // End date is required only for multi-day events
      if (formData.isMultiDay) {
        return basicFields && formData.endDate;
      }
      return basicFields;
    }

    if (formData.eventType === 'onLocationTournament') {
      return formData.eventDate && formData.endDate && formData.venueName && formData.venueCity && formData.venueState && formData.venueAwareness && formData.numberOfCameras;
    }

    if (formData.eventType === 'onLocationOther') {
      return formData.eventDate && formData.eventTime && formData.venueName && formData.venueCity && formData.venueState && formData.venueAwareness && formData.numberOfCameras;
    }

    return true;
  };

  const handleServiceClick = (service) => {
    setSelectedService(service);
    
    if (service === 'legends') {
      // Pre-fill form for Legends booking
    setFormData(prev => ({
      ...prev,
        eventType: '',
        location: 'Legends Brews & Cues',
        numberOfMatches: '',
        budget: '25',
        specialRequests: 'Professional streaming setup with multiple camera angles and multiview on stream capabilities. Live commentary (unfiltered!) - No League or Ladder membership required.',
        endDate: '',
        endTime: '',
        playerNames: '',
        player1: '',
        player2: '',
        tournamentDirector: '',
        assistantDirector: '',
        tournamentName: ''
      }));
    } else if (service === 'onLocation') {
      // Pre-fill form for On-Location booking (but don't set eventType yet - let user go through steps)
      setFormData(prev => ({
        ...prev,
        location: '',
        numberOfMatches: '',
        budget: 'discuss',
        specialRequests: 'Mobile streaming setup - Travel to your location - Event commentary - Custom branding options',
        endDate: '',
        endTime: '',
        playerNames: '',
        player1: '',
        player2: '',
        tournamentDirector: '',
        assistantDirector: '',
        tournamentName: ''
      }));
    } else {
      // Reset form for other services
      setFormData(prev => ({
        ...prev,
        eventType: '',
        location: '',
        numberOfMatches: '',
        budget: '',
        specialRequests: '',
        endDate: '',
        endTime: '',
        playerNames: '',
        player1: '',
        player2: '',
        tournamentDirector: '',
        assistantDirector: '',
        tournamentName: ''
      }));
    }
    
    setShowBookingModal(true);
  };

  const closeModal = () => {
    setShowBookingModal(false);
    setSelectedService('');
    setSuccessMessage('');
    setErrorMessage('');
    setSuccessfulBooking(null);
    setEventDays([]);
    setShowAdvancedScheduling(false);
    // Reset form data to initial state
    setFormData({
      name: '',
      email: '',
      phone: '',
      eventType: '',
      eventDate: '',
      endDate: '',
      setupDate: '',
      eventTime: '',
      endTime: '',
      location: '',
      numberOfMatches: '',
      playerNames: '',
      player1: '',
      player2: '',
      teamName: '',
      opponentTeamName: '',
      leagueName: '',
      matchType: '',
      format1: '',
      format2: '',
      eventDescription: '',
      tournamentDirector: '',
      assistantDirector: '',
      tournamentName: '',
      budget: '',
      specialRequests: '',
      agreeToTerms: false,
      venueName: '',
      venueCity: 'Colorado Springs',
      venueState: 'CO',
      venueAwareness: '',
      venueContactName: '',
      venueContactEmail: '',
      venueContactPhone: '',
      isMultiDay: false,
      numberOfCameras: '2'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    setErrorMessage('');
    setSuccessMessage('');
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.eventDate || !formData.eventTime || !formData.location || !formData.agreeToTerms) {
      setErrorMessage('Please fill in all required fields and acknowledge our commentary style.');
      return;
    }

    setIsLoading(true);

    try {
      // Send booking request to backend
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cueless/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Store successful booking details for success page
        setSuccessfulBooking({
          id: result.booking.id,
          ...formData,
          submittedAt: new Date().toLocaleString()
        });
        
        // Reset form on success
        setFormData({
          name: '',
          email: '',
          phone: '',
          eventType: '',
          eventDate: '',
          endDate: '',
          eventTime: '',
          endTime: '',
          location: '',
          numberOfMatches: '',
          playerNames: '',
          player1: '',
          player2: '',
          teamName: '',
          opponentTeamName: '',
          leagueName: '',
          matchType: '',
          format1: '',
          format2: '',
          eventDescription: '',
          tournamentDirector: '',
          assistantDirector: '',
          tournamentName: '',
          budget: '',
          specialRequests: '',
          agreeToTerms: false,
          venueName: '',
          venueCity: 'Colorado Springs',
          venueState: 'CO',
          venueAwareness: '',
          venueContactName: '',
          venueContactEmail: '',
          venueContactPhone: '',
          isMultiDay: false,
          numberOfCameras: '2'
        });
        
        // Don't close modal immediately - show success page instead
      } else {
        setErrorMessage(result.message || 'Failed to submit booking request. Please try again.');
      }

    } catch (error) {
      console.error('Error submitting booking:', error);
      setErrorMessage('Failed to submit booking request. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="cueless-page">
      {/* Navigation Header */}
      <div className={`cueless-nav ${isMobile ? 'mobile-nav' : ''}`}>
        <button className="back-button" onClick={handleBackToHome}>
          <span className="back-arrow">←</span>
          <span className="back-text">Back to Front Range Pool.com</span>
          <span className="back-text-mobile">← Back</span>
        </button>
        <h1 className="cueless-title">Cueless in the Booth</h1>
      </div>

      {/* Hero Section */}
      <div className="cueless-hero">
        <div className="hero-content">
          <h2>Live Stream Your Pool Matches</h2>
          <div className="hero-logo-container">
            <img src={cuelessLogo} alt="Cueless in the Booth" className="cueless-hero-logo" />
          </div>
          <p className="hero-subtitle">
            Book Cueless in the Booth for live streaming with... "commentary" 😅
          </p>
          <div className="hero-features">
            <span className="feature-badge">Live Streaming</span>   
            <span className="feature-badge">Multi Camera Options</span>
            <span className="feature-badge">Telestrator</span>
            <span className="feature-badge">Instant Replay</span>
            <span className="feature-badge">Not really "Expert" - But it is Commentary</span>
            <span className="feature-badge">Mark & Don - Unfiltered & Real</span>
           
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="services-section">
        <h3>Our Services</h3>
        <div className="services-grid">
          <div className="service-card" onClick={() => handleServiceClick('legends')}>
            <div className="service-tag">Got game?<br></br>Want it streamed?<br></br>We got you covered!</div>
            <h4 style={{ 
              color: '#9c27b0',
              fontFamily: 'Orbitron, "Courier New", monospace',
              fontWeight: '900',
              fontSize: '1.8rem',
              textShadow: '2px 2px 0px #000000, -2px -2px 0px #000000, 2px -2px 0px #000000, -2px 2px 0px #000000, 0 0 15px #9c27b0, 0 0 25px #9c27b0',
              letterSpacing: '2px',
              textTransform: 'uppercase'
            }}>At Legends Brews & Cues</h4>
            <div className="service-logo">
              <img src={legendsLogo} alt="Legends Brews & Cues" className="legends-logo" />
            </div>
            <p>Book a match to be live streamed at our home location.<br></br>Legends provides all of the equipment and we do the "commentary".</p>
            <ul>
              <li>Professional streaming setup with multiple camera angles and multiview on stream capabilities</li>
              <li>Live commentary (unfiltered!)</li>
              <li>No League or Ladder membership required</li>
            </ul>
            <div className="book-now-btn">Book Now</div>
          </div>
          
          <div 
            className="service-card" 
            onClick={() => handleServiceClick('onLocation')}
          >
            <div 
              className="service-icon" 
              style={{
                fontSize: '4rem',
                textShadow: '0 0 15px rgba(0, 255, 65, 0.8)',
                filter: 'drop-shadow(0 0 10px rgba(0, 255, 65, 0.5))'
              }}
            >
              🚐
            </div>
            <h4 style={{
              color: '#00ff41',
              fontFamily: 'Orbitron, "Courier New", monospace',
              fontWeight: '900',
              fontSize: '1.6rem',
              textShadow: '2px 2px 0px #000000, -2px -2px 0px #000000, 2px -2px 0px #000000, -2px 2px 0px #000000, 0 0 15px #00ff41, 0 0 25px #00ff41',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '15px'
            }}>
              On-Location Events
            </h4>
            <p>
              Have Cueless come to your event, tournament, or venue with all our equipment.
            </p>
            <div style={{ margin: '20px 0' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 0',
                color: '#00ff41',
                fontSize: '1rem',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
              }}>
                <span style={{
                  marginRight: '8px',
                  color: '#00ff41',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  textShadow: '0 0 10px rgba(0, 255, 65, 0.8)'
                }}>🚀</span>
                Mobile streaming setup
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 0',
                color: '#00ff41',
                fontSize: '1rem',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
              }}>
                <span style={{
                  marginRight: '8px',
                  color: '#00ff41',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  textShadow: '0 0 10px rgba(0, 255, 65, 0.8)'
                }}>🚗</span>
                Travel to your location
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 0',
                color: '#00ff41',
                fontSize: '1rem',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
              }}>
                <span style={{
                  marginRight: '8px',
                  color: '#00ff41',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  textShadow: '0 0 10px rgba(0, 255, 65, 0.8)'
                }}>🎙️</span>
                Event commentary
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 0',
                color: '#00ff41',
                fontSize: '1rem',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
              }}>
                <span style={{
                  marginRight: '8px',
                  color: '#00ff41',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  textShadow: '0 0 10px rgba(0, 255, 65, 0.8)'
                }}>🏷️</span>
                Custom branding options
              </div>
            </div>
            <div className="book-now-btn">Book Now</div>
          </div>
        </div>
        
        {/* Disclaimer Section */}
        <div className="disclaimer-section">
          <div className="disclaimer-content">
            <h4>⚠️ Important Notice ⚠️ </h4>
              <p>
                <strong>Please Note:</strong> We are not your typical pool commentators.<br></br> 
                We are not professional commentators - and we do not pretend to be.<br></br>
                Our commentary is unfiltered and may contain adult language.<br></br> 
                We are just two pool players who love the game, and are not afraid to call it as they see it.<br></br>
                Whether it's with each other, the players, or the shots! 😅
              </p>
            <p>
              By booking our services, you agree that Cueless in the Booth provides unfiltered commentary 
              and understand the nature of our content.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="contact-section">
        <h3>Get in Touch</h3>
        <div className="contact-info">
          <div className="contact-item">
            <span className="contact-icon">📧</span>
            <span>frbcapl@gmail.com</span>
          </div>
          <div className="contact-item">
            <span className="contact-icon">📱</span>
            <span>Text or call for immediate booking</span>
          </div>
          <div className="contact-item">
            <span className="contact-icon">📍</span>
            <span>Based at Legends Brews & Cues</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="cueless-footer">
        <p>&copy; 2025 Cueless in the Booth. Unfiltered commentary for the love of pool! 🎱</p>
      </div>

      {/* Booking Modal */}
      <CuelessBookingModal
        open={showBookingModal}
        onClose={closeModal}
        title={selectedService === 'legends' ? "🎬 Book Cueless at Legends" : selectedService === 'onLocation' ? "🚐 Book On-Location Stream" : "🎬 Book Your Stream"}
      >
        {!successfulBooking ? (
        <form 
          className="booking-form" 
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            padding: '1rem 1.2rem 0.8rem 1.2rem',
            boxSizing: 'border-box'
          }}
        >
          {/* Step 1: Contact/Billing Info Section - Show when incomplete */}
          {!isContactInfoComplete() && (
            <div className="contact-billing-section" style={{
              background: 'rgba(0, 255, 255, 0.05)',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <h4 style={{ 
                color: '#00ffff', 
                marginBottom: '10px', 
                fontSize: '1.1rem',
                textAlign: 'center',
                textShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
              }}>
                📞 Contact/Billing Info
              </h4>
              
              <div style={{
                background: 'rgba(0, 255, 255, 0.08)',
                border: '1px solid rgba(0, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '15px',
                textAlign: 'center'
              }}>
                <p style={{
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  margin: '0 0 8px 0',
                  fontWeight: '500'
                }}>
                  <strong>Step 1:</strong> Please fill out your contact information below
                </p>
                <p style={{
                  color: '#b0e0e6',
                  fontSize: '0.8rem',
                  margin: '0',
                  fontStyle: 'italic'
                }}>
                  Once complete, you'll proceed to select your event type and provide event details
                </p>
              </div>
              
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
                {/* Empty div for layout balance */}
              </div>
            </div>
            </div>
          )}

          {/* Step 2: Event Type Selection - Show when contact info complete */}
          {isContactInfoComplete() && (
            <div className="event-type-section" style={{
              background: 'rgba(0, 255, 255, 0.05)',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              {/* Show contact info summary at the top */}
              <div className="contact-summary" style={{
                background: 'rgba(0, 255, 255, 0.03)',
                border: '1px solid rgba(0, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '10px',
                marginBottom: '15px'
              }}>
                <p style={{ 
                  color: '#00ffff', 
                  fontSize: '0.85rem', 
                  margin: 0,
                  textAlign: 'center'
                }}>
                  <strong>Contact:</strong> {formData.name} • {formData.email}
                  {formData.phone && ` • ${formData.phone}`}
                </p>
              </div>
              
              <h4 style={{ 
                color: '#00ffff', 
                marginBottom: '10px', 
                fontSize: '1.1rem',
                textAlign: 'center',
                textShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
              }}>
                🎯 Select Event Type
              </h4>
              
              {/* Instructions for event type selection */}
              <div style={{
                background: 'rgba(0, 255, 255, 0.03)',
                border: '1px solid rgba(0, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '15px',
                textAlign: 'center'
              }}>
                <p style={{ 
                  color: '#b0e0e6', 
                  fontSize: '0.85rem', 
                  margin: '0 0 8px 0',
                  lineHeight: '1.4'
                }}>
                  <strong style={{ color: '#00ffff' }}>
                    {selectedService === 'onLocation' 
                      ? "Choose the type of event you'd like us to stream at your location:" 
                      : "Choose the type of event you'd like us to live stream:"
                    }
                  </strong>
                </p>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#a0d0d6',
                  lineHeight: '1.3'
                }}>
                  {selectedService === 'onLocation' ? (
                    <>
                      <p style={{ margin: '4px 0' }}>
                        <strong>• Private Match - Your Location:</strong> Personal games at your venue
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>• Tournament - Your Location:</strong> Multi-day competitive events at your venue
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>• Other Event - Your Location:</strong> Special events or custom requests at your venue
                      </p>
                      <p style={{ margin: '4px 0', color: '#ffa500' }}>
                        <strong>🚐 We bring all equipment and travel to your location!</strong>
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: '4px 0' }}>
                        <strong>• Ladder Match:</strong> Ladder Of Legends match that is not top 5
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>• Private Match:</strong> Personal games between opponents
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>• Tournament:</strong> Organized competitive events
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>• Team League Night:</strong> Team-based league matches
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>• Other:</strong> Special events or custom requests
                      </p>
                    </>
                  )}
                  <p style={{ margin: '4px 0' }}>
                    <strong>After selecting your event type, you will be prompted to provide additional details</strong> 
                  </p>
                </div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <div style={{ 
                  maxWidth: '400px', 
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <label htmlFor="eventType" style={{ 
                    textAlign: 'center', 
                    display: 'block', 
                    marginBottom: '8px',
                    color: '#00ffff',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}>Event Type *</label>
              <select
                id="eventType"
                name="eventType"
                value={formData.eventType}
                onChange={handleInputChange}
                required
                className="form-input"
                    style={{ 
                      textAlign: 'center',
                      width: '100%',
                      backgroundColor: 'rgba(0, 255, 255, 0.1)',
                      color: '#e0f7fa',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: '8px',
                      padding: '0.75rem'
                    }}
                  >
                    <option value="" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Select event type</option>
                    {selectedService !== 'onLocation' && (
                      <option value="ladderMatch" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Ladder Match (Not top 5) - Legends</option>
                    )}
                    {selectedService === 'onLocation' ? (
                      <>
                        <option value="onLocationPrivate" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Private Match - Your Location</option>
                        <option value="onLocationTournament" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Tournament - Your Location</option>
                        <option value="onLocationOther" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Other Event - Your Location</option>
                      </>
                    ) : (
                      <>
                        <option value="privateMatch" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Private Match - Legends</option>
                        <option value="tournament" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Tournament - Legends</option>
                        <option value="leagueNight" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Team League Night - Legends</option>
                        <option value="other" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Other</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

            </div>
          )}

          {/* Disclaimer Section - Show text until checkbox is checked */}
          {!formData.agreeToTerms && (
            <div className="form-disclaimer" style={{
              background: 'rgba(255, 165, 0, 0.05)',
              border: '1px solid rgba(255, 165, 0, 0.2)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <h4 style={{ 
                color: '#ffa500', 
                marginBottom: '10px', 
                fontSize: '1rem',
                textAlign: 'center',
                textShadow: '0 0 10px rgba(255, 165, 0, 0.3)'
              }}>
                ⚠️ Important Notice
              </h4>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                <strong>Please Note:</strong> We are not your typical pool commentators.<br></br> 
                We are not professional commentators - and we do not pretend to be.<br></br>
                Our commentary is unfiltered and may contain adult language.<br></br> 
                We are just two pool players who love the game,<br></br> 
                and are not afraid to call it as they see it.<br></br>
                Whether it's with each other, the players, or the shots! 😅
              </p>
            </div>
          )}


          {/* Smart Conditional Fields Based on Event Type */}
          {formData.eventType && !formData.eventType.startsWith('onLocation') && (
            <div className="smart-conditional-fields" style={{
              background: 'rgba(0, 255, 255, 0.03)',
              border: '1px solid rgba(0, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '15px'
            }}>
              <h5 style={{ 
                color: '#00ffff', 
                marginBottom: '10px', 
                fontSize: '1rem',
                textAlign: 'center'
              }}>
                🎯 Event-Specific Details
              </h5>

              {/* Player Names Section */}
              <div className="player-names-subsection" style={{
                background: 'rgba(255, 165, 0, 0.05)',
                border: '1px solid rgba(255, 165, 0, 0.2)',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '15px'
              }}>
                {formData.eventType !== 'other' && !formData.eventType.startsWith('onLocation') && (
                  <h6 style={{ 
                    color: '#ffa500', 
                    marginBottom: '10px', 
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    textShadow: '0 0 8px rgba(255, 165, 0, 0.3)'
                  }}>
                    👥 Player Names
                  </h6>
                )}
                
                {/* Ladder Match - Two specific player fields */}
                {formData.eventType === 'ladderMatch' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="player1">Player 1 Name *</label>
                      <input
                        type="text"
                        id="player1"
                        name="player1"
                        value={formData.player1}
                        onChange={handleInputChange}
                        placeholder="Enter first player name"
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="player2">Player 2 Name *</label>
                      <input
                        type="text"
                        id="player2"
                        name="player2"
                        value={formData.player2}
                        onChange={handleInputChange}
                        placeholder="Enter second player name"
                        required
                        className="form-input"
                      />
                    </div>
                  </div>
                )}

                {/* Private Match - Two specific player fields */}
                {formData.eventType === 'privateMatch' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="player1">Player 1 Name *</label>
                      <input
                        type="text"
                        id="player1"
                        name="player1"
                        value={formData.player1}
                        onChange={handleInputChange}
                        placeholder="Enter first player name"
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="player2">Player 2 Name *</label>
                      <input
                        type="text"
                        id="player2"
                        name="player2"
                        value={formData.player2}
                        onChange={handleInputChange}
                        placeholder="Enter second player name"
                        required
                        className="form-input"
                      />
                    </div>
                  </div>
                )}

                {/* Tournament - Tournament-specific fields */}
                {formData.eventType === 'tournament' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="tournamentDirector">Tournament Director *</label>
                        <input
                          type="text"
                          id="tournamentDirector"
                          name="tournamentDirector"
                          value={formData.tournamentDirector || ''}
                          onChange={handleInputChange}
                          placeholder="Enter tournament director name"
                          required
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="assistantDirector">Assistant Director (Optional)</label>
                        <input
                          type="text"
                          id="assistantDirector"
                          name="assistantDirector"
                          value={formData.assistantDirector || ''}
                          onChange={handleInputChange}
                          placeholder="Enter assistant director name"
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="tournamentName">Tournament Name *</label>
                      <input
                        type="text"
                        id="tournamentName"
                        name="tournamentName"
                        value={formData.tournamentName || ''}
                        onChange={handleInputChange}
                        placeholder="Enter tournament name (e.g., Spring 8-Ball Championship)"
                        required
                        className="form-input"
                      />
                    </div>
                  </>
                )}

                {/* Team League Night - Specific team fields */}
                {formData.eventType === 'leagueNight' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="teamName">Your Team Name *</label>
                        <input
                          type="text"
                          id="teamName"
                          name="teamName"
                          value={formData.teamName || ''}
                          onChange={handleInputChange}
                          placeholder="e.g., Team Alpha, APA Team 1"
                          required
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="opponentTeamName">Opponent Team Name *</label>
                        <input
                          type="text"
                          id="opponentTeamName"
                          name="opponentTeamName"
                          value={formData.opponentTeamName || ''}
                          onChange={handleInputChange}
                          placeholder="e.g., Team Beta, APA Team 2"
                          required
                          className="form-input"
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="leagueName">League *</label>
                        <select
                          id="leagueName"
                          name="leagueName"
                          value={formData.leagueName || ''}
                          onChange={handleInputChange}
                          required
                          className="form-input"
                        >
                          <option value="" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Select League</option>
                          <option value="USAPL" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>USAPL (USA Pool League)</option>
                          <option value="APA" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>APA (American Poolplayers Association)</option>
                          <option value="BCA" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>BCA (Billiards Congress of America)</option>
                          <option value="TAP" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>TAP (The Association for Pool)</option>
                          <option value="NPL" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>NPL (National Pool League)</option>
                          <option value="VNEA" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>VNEA (Valley National 8-Ball League)</option>
                          <option value="other" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Other League</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="matchType">Match Type *</label>
                        <select
                          id="matchType"
                          name="matchType"
                          value={formData.matchType || ''}
                          onChange={handleInputChange}
                          required
                          className="form-input"
                        >
                          <option value="" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Select Match Type</option>
                          <option value="single" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Single Match</option>
                          <option value="doublePlay" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Double Play (2 formats)</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Single Match Format Selection */}
                    {formData.matchType === 'single' && (
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="format1">Game Format *</label>
                          <select
                            id="format1"
                            name="format1"
                            value={formData.format1 || ''}
                            onChange={handleInputChange}
                            required
                            className="form-input"
                          >
                            <option value="" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Select Game Format</option>
                            <option value="8ball" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>8-Ball</option>
                            <option value="9ball" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>9-Ball</option>
                            <option value="10ball" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>10-Ball</option>
                            <option value="straightPool" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Straight Pool</option>
                            <option value="onePocket" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>One Pocket</option>
                            <option value="bankPool" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Bank Pool</option>
                          </select>
                        </div>
                      </div>
                    )}
                    
                    {/* Double Play Format Selection */}
                    {formData.matchType === 'doublePlay' && (
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="format1">Format 1 *</label>
                          <select
                            id="format1"
                            name="format1"
                            value={formData.format1 || ''}
                            onChange={handleInputChange}
                            required
                            className="form-input"
                          >
                            <option value="" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Select First Format</option>
                            <option value="8ball" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>8-Ball</option>
                            <option value="9ball" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>9-Ball</option>
                            <option value="10ball" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>10-Ball</option>
                            <option value="straightPool" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Straight Pool</option>
                            <option value="onePocket" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>One Pocket</option>
                            <option value="bankPool" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Bank Pool</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="format2">Format 2 *</label>
                          <select
                            id="format2"
                            name="format2"
                            value={formData.format2 || ''}
                            onChange={handleInputChange}
                            required
                            className="form-input"
                          >
                            <option value="" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Select Second Format</option>
                            <option value="8ball" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>8-Ball</option>
                            <option value="9ball" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>9-Ball</option>
                            <option value="10ball" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>10-Ball</option>
                            <option value="straightPool" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Straight Pool</option>
                            <option value="onePocket" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>One Pocket</option>
                            <option value="bankPool" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Bank Pool</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Other Events - Simple description */}
                {formData.eventType === 'other' && (
                  <div className="form-group">
                    <label htmlFor="eventDescription">What would you like to have live streamed? *</label>
                    <textarea
                      id="eventDescription"
                      name="eventDescription"
                      value={formData.eventDescription || ''}
                      onChange={handleInputChange}
                      rows="4"
                      placeholder="Describe your event, tournament, match, or activity that you'd like to have live streamed..."
                      required
                      className="form-input"
                      style={{
                        backgroundColor: 'rgba(255, 165, 0, 0.1)',
                        color: '#ffa500',
                        border: '1px solid rgba(255, 165, 0, 0.3)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        fontSize: '1rem',
                        width: '100%',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                )}
              </div>
              
              {formData.eventType === 'tournament' && (
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="tournamentFormat">Tournament Format</label>
                    <select
                      id="tournamentFormat"
                      name="tournamentFormat"
                      className="form-input"
                    >
                      <option value="">Select format</option>
                      <option value="singleElimination">Single Elimination</option>
                      <option value="doubleElimination">Double Elimination</option>
                      <option value="roundRobin">Round Robin</option>
                      <option value="swiss">Swiss System</option>
                <option value="other">Other</option>
              </select>
            </div>
                  <div className="form-group">
                    <label htmlFor="expectedPlayers">Expected Players</label>
                    <input
                      type="number"
                      id="expectedPlayers"
                      name="expectedPlayers"
                      placeholder="e.g., 16, 32, 64"
                      className="form-input"
                    />
          </div>
                </div>
              )}
              
              
              {formData.eventType === 'tournament' && selectedService !== 'legends' && (
                <div className="form-group">
                  <label htmlFor="setupRequirements">Setup Requirements</label>
                  <select
                    id="setupRequirements"
                    name="setupRequirements"
                    className="form-input"
                  >
                    <option value="">Select setup needs</option>
                    <option value="basic">Basic streaming (2 cameras)</option>
                    <option value="standard">Standard setup (3-4 cameras)</option>
                    <option value="premium">Premium setup (5+ cameras, multiple angles)</option>
                    <option value="custom">Custom requirements</option>
                  </select>
                </div>
              )}
              
              {formData.eventType === 'privateMatch' && (
          <div className="form-row">
            <div className="form-group">
                    <label htmlFor="matchType">Match Type</label>
                    <select
                      id="matchType"
                      name="matchType"
                      className="form-input"
                    >
                      <option value="">Select match type</option>
                      <option value="8ball">8-Ball</option>
                      <option value="9ball">9-Ball</option>
                      <option value="10ball">10-Ball</option>
                      <option value="straightPool">Straight Pool</option>
                      <option value="onePocket">One Pocket</option>
                      <option value="bankPool">Bank Pool</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="skillLevel">Skill Level</label>
                    <select
                      id="skillLevel"
                      name="skillLevel"
                      className="form-input"
                    >
                      <option value="">Select skill level</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="professional">Professional</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quote Builder - Dynamic Fields Based on Event Type */}
          {formData.eventType && (
            <div className="quote-builder-section" style={{
              background: 'rgba(255, 165, 0, 0.05)',
              border: '2px solid rgba(255, 165, 0, 0.2)',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h4 style={{ 
                color: '#ffa500', 
                marginBottom: '15px', 
                fontSize: '1.2rem',
                textAlign: 'center',
                textShadow: '0 0 10px rgba(255, 165, 0, 0.3)'
              }}>
                💰 Quote Builder - {formData.eventType === 'ladderMatch' ? 'Ladder Match' : 
                                   formData.eventType === 'tournament' ? 'Tournament' :
                                   formData.eventType === 'leagueNight' ? 'Team League Night' :
                                   formData.eventType === 'privateMatch' ? 'Private Match' :
                                   formData.eventType === 'onLocationPrivate' ? 'Private Match - Your Location' :
                                   formData.eventType === 'onLocationTournament' ? 'Tournament - Your Location' :
                                   formData.eventType === 'onLocationOther' ? 'Other Event - Your Location' :
                                   formData.eventType === 'onLocation' ? 'On-Location Event' : 'Event'}
              </h4>

              {/* Ladder Match - Simplified Quote */}
              {formData.eventType === 'ladderMatch' && (
                <div className="ladder-match-quote">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="eventDate">Match Date *</label>
              <input
                type="date"
                id="eventDate"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
                      <label htmlFor="eventTime">Start Time *</label>
                      <select
                id="eventTime"
                name="eventTime"
                        key={`time-picker-${timePickerKey}-${formData.eventDate}`}
                        data-date={formData.eventDate}
                value={formData.eventTime}
                onChange={handleInputChange}
                required
                className="form-input"
                        style={{ 
                          backgroundColor: 'rgba(0, 255, 255, 0.1)',
                          color: '#e0f7fa',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '1rem',
                          textAlign: 'center',
                          width: '100%',
                          minWidth: '180px'
                        }}
                      >
                        <option value="">Select start time</option>
                        {currentTimeSlots.map((slot, index) => (
                          <option key={index} value={slot.value} style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                      {formData.eventDate && (
                        <div style={{ fontSize: '0.75rem', color: '#00ffff', marginTop: '4px', textAlign: 'center' }}>
                          {getOperatingHoursText(formData.eventDate)}
                          <br />
                          <em style={{ color: '#ccc' }}>Special times available upon request</em>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group" style={{ flex: '1' }}>
                      <label>Fixed Price</label>
                      <div style={{
                        background: 'rgba(255, 165, 0, 0.1)',
                        border: '1px solid rgba(255, 165, 0, 0.3)',
                        borderRadius: '5px',
                        padding: '12px',
                        color: '#ffa500',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        textAlign: 'center'
                      }}>
                        $25.00 Per Match
                      </div>
              <input
                        type="hidden"
                        name="budget"
                        value="25"
              />
            </div>
            <div className="form-group" style={{ flex: '1' }}>
                      <label>Important Notice</label>
                      <div style={{
                        background: 'rgba(0, 255, 255, 0.08)',
                        border: '1px solid rgba(0, 255, 255, 0.2)',
                        borderRadius: '5px',
                        padding: '12px',
                        color: '#00ffff',
                        fontSize: '0.85rem',
                        textAlign: 'center',
                        lineHeight: '1.4',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div>
                          <strong>📢 Important:</strong><br />
                          Ladder matches involving one or more top 5 players do not need to be scheduled through this form. All top 5 matches are automatically held at Legends and live streamed.
                        </div>
                      </div>
            </div>
          </div>
                </div>
              )}

              {/* Private Match - $30/hour */}
              {formData.eventType === 'privateMatch' && (
                <div className="private-match-quote">
          <div className="form-row">
            <div className="form-group">
                      <label htmlFor="eventDate">Match Date *</label>
              <input
                        type="date"
                        id="eventDate"
                        name="eventDate"
                        value={formData.eventDate}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
                      <label htmlFor="eventTime">Start Time *</label>
                      <select
                id="eventTime"
                name="eventTime"
                        key={`time-picker-${timePickerKey}-${formData.eventDate}`}
                        data-date={formData.eventDate}
                value={formData.eventTime}
                onChange={handleInputChange}
                required
                        className="form-input"
                        style={{ 
                          backgroundColor: 'rgba(0, 255, 255, 0.1)',
                          color: '#e0f7fa',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '1rem',
                          textAlign: 'center',
                          width: '100%',
                          minWidth: '180px'
                        }}
                      >
                        <option value="">Select start time</option>
                        {currentTimeSlots.map((slot, index) => (
                          <option key={index} value={slot.value} style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                      {formData.eventDate && (
                        <div style={{ fontSize: '0.75rem', color: '#00ffff', marginTop: '4px', textAlign: 'center' }}>
                          {getOperatingHoursText(formData.eventDate)}
                          <br />
                          <em style={{ color: '#ccc' }}>Special times available upon request</em>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="numberOfMatches">Estimated Number of Hours *</label>
              <input
                        type="number"
                id="numberOfMatches"
                name="numberOfMatches"
                value={formData.numberOfMatches}
                onChange={handleInputChange}
                        placeholder="Minimum 2 hours"
                        min="2"
                        required
                className="form-input"
              />
            </div>
                    <div className="form-group">
                      <label>Price Calculation</label>
                      <div style={{
                        background: 'rgba(255, 165, 0, 0.1)',
                        border: '1px solid rgba(255, 165, 0, 0.3)',
                        borderRadius: '5px',
                        padding: '12px',
                        color: '#ffa500',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        textAlign: 'center'
                      }}>
                        ${formData.numberOfMatches && parseInt(formData.numberOfMatches) >= 2 ? (parseInt(formData.numberOfMatches) * 30) : '60'}.00
                        <div style={{ fontSize: '0.8rem', fontWeight: 'normal', marginTop: '5px' }}>
                          $30.00 per hour (2-hour minimum)
          </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tournament - Multi-day stream scheduling */}
              {formData.eventType === 'tournament' && (
                <div className="tournament-quote">
          <div className="form-row">
            <div className="form-group">
                      <label htmlFor="eventDate">Tournament Start Date *</label>
                      <input
                        type="date"
                        id="eventDate"
                        name="eventDate"
                        value={formatDateForInput(formData.eventDate)}
                        onChange={handleDateChange}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="endDate">Tournament End Date *</label>
                      <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={formatDateForInput(formData.endDate)}
                        onChange={handleDateChange}
                        required
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Individual day stream times */}
                  {formData.eventDate && formData.endDate && (
                    <div className="daily-stream-schedule">
                      <h5 style={{ color: '#00ffff', marginBottom: '15px', textAlign: 'center' }}>
                        📅 Daily Stream Schedule
                      </h5>
                      {generateTournamentDays().map((day, index) => (
                        <div key={index} className="form-row" style={{ marginBottom: '15px' }}>
                          <div className="form-group">
                            <label style={{ color: '#ffa500', fontWeight: 'bold' }}>
                              {day.dateString}
                            </label>
                            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center', marginTop: '10px' }}>
                              <div style={{ width: '200px' }}>
                                <select
                                  name={`day_${index}_startTime`}
                                  value={day.startTime || ''}
                                  onChange={(e) => handleDayTimeChange(index, 'startTime', e.target.value)}
                                  className="form-input"
                                  style={{ 
                                    backgroundColor: 'rgba(0, 255, 255, 0.1)',
                                    color: '#e0f7fa',
                                    border: '1px solid rgba(0, 255, 255, 0.3)',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    fontSize: '1rem',
                                    textAlign: 'center',
                                    width: '100%'
                                  }}
                                >
                                  <option value="">Select start time</option>
                                  <option value="no-stream" style={{ backgroundColor: '#1a1a1a', color: '#ff6b6b' }}>
                                    🚫 No Stream
                                  </option>
                                  {generateTimeSlots(day.date).map((slot, slotIndex) => (
                                    <option key={slotIndex} value={slot.value} style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>
                                      {slot.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {/* Only show end time dropdown if start time is not "no-stream" */}
                              {day.startTime !== 'no-stream' && (
                                <div style={{ width: '200px' }}>
                                  <select
                                    name={`day_${index}_endTime`}
                                    value={day.endTime || ''}
                                    onChange={(e) => handleDayTimeChange(index, 'endTime', e.target.value)}
                                    className="form-input"
                                    style={{ 
                                      backgroundColor: 'rgba(0, 255, 255, 0.1)',
                                      color: '#e0f7fa',
                                      border: '1px solid rgba(0, 255, 255, 0.3)',
                                      borderRadius: '8px',
                                      padding: '0.75rem',
                                      fontSize: '1rem',
                                      textAlign: 'center',
                                      width: '100%'
                                    }}
                                  >
                                    <option value="">Select end time</option>
                                    {generateTimeSlots(day.date).map((slot, slotIndex) => (
                                      <option key={slotIndex} value={slot.value} style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>
                                        {slot.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                            
                            {/* Day Description Field */}
                            <div style={{ marginTop: '15px' }}>
              <input
                type="text"
                                name={`day_${index}_description`}
                                value={day.description || ''}
                                onChange={(e) => handleDayTimeChange(index, 'description', e.target.value)}
                                placeholder="e.g., Qualifying rounds, Finals, Championship matches..."
                                className="form-input"
                                style={{ 
                                  backgroundColor: 'rgba(255, 165, 0, 0.1)',
                                  color: '#ffa500',
                                  border: '1px solid rgba(255, 165, 0, 0.3)',
                                  borderRadius: '8px',
                                  padding: '0.75rem',
                                  fontSize: '1rem',
                                  textAlign: 'center',
                                  width: '100%',
                                  maxWidth: '420px'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Price calculation */}
                      <div style={{
                        background: 'rgba(255, 165, 0, 0.1)',
                        border: '1px solid rgba(255, 165, 0, 0.3)',
                        borderRadius: '10px',
                        padding: '15px',
                        marginTop: '20px',
                        textAlign: 'center'
                      }}>
                        <div style={{ color: '#ffa500', fontWeight: 'bold', fontSize: '1.2rem' }}>
                          Total Stream Hours: {calculateTotalTournamentHours()}
                        </div>
                        <div style={{ color: '#ffa500', fontWeight: 'bold', fontSize: '1.4rem', marginTop: '8px' }}>
                          ${calculateTournamentPrice()}.00
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#ccc', marginTop: '5px' }}>
                          $30.00 per hour (4-hour minimum)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Team League Night - Fixed $100 */}
              {formData.eventType === 'leagueNight' && (
                <div className="league-night-quote">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="eventDate">League Night Date *</label>
                      <input
                        type="date"
                        id="eventDate"
                        name="eventDate"
                        value={formData.eventDate}
                onChange={handleInputChange}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
                      <label htmlFor="eventTime">Start Time *</label>
                      <select
                        id="eventTime"
                        name="eventTime"
                        key={`time-picker-${timePickerKey}-${formData.eventDate}`}
                        data-date={formData.eventDate}
                        value={formData.eventTime}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                        style={{ 
                          backgroundColor: 'rgba(0, 255, 255, 0.1)',
                          color: '#e0f7fa',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '1rem',
                          textAlign: 'center',
                          width: '100%',
                          minWidth: '180px'
                        }}
                      >
                        <option value="">Select start time</option>
                        {currentTimeSlots.map((slot, index) => (
                          <option key={index} value={slot.value} style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                      {formData.eventDate && (
                        <div style={{ fontSize: '0.75rem', color: '#00ffff', marginTop: '4px', textAlign: 'center' }}>
                          {getOperatingHoursText(formData.eventDate)}
                          <br />
                          <em style={{ color: '#ccc' }}>Special times available upon request</em>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="endTime">End Time</label>
                      <input
                        type="time"
                        id="endTime"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleInputChange}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Fixed Price</label>
                      <div style={{
                        background: 'rgba(255, 165, 0, 0.1)',
                        border: '1px solid rgba(255, 165, 0, 0.3)',
                        borderRadius: '5px',
                        padding: '12px',
                        color: '#ffa500',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        textAlign: 'center'
                      }}>
                        $100.00
                        <div style={{ fontSize: '0.8rem', fontWeight: 'normal', marginTop: '5px' }}>
                          Flat rate for team league night
                        </div>
                      </div>
                      <input
                        type="hidden"
                        name="budget"
                        value="100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Player Names Section - Only for On-Location Private Matches */}
              {formData.eventType === 'onLocationPrivate' && (
                <div className="player-names-section" style={{
                  background: 'rgba(255, 165, 0, 0.05)',
                  border: '1px solid rgba(255, 165, 0, 0.2)',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '20px'
                }}>
                  <h5 style={{ 
                    color: '#ffa500', 
                    marginBottom: '10px', 
                    fontSize: '1rem',
                    textAlign: 'center',
                    textShadow: '0 0 8px rgba(255, 165, 0, 0.3)'
                  }}>
                    👥 Player Names
                  </h5>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="player1">Player 1 Name *</label>
              <input
                type="text"
                        id="player1"
                        name="player1"
                        value={formData.player1 || ''}
                        onChange={handleInputChange}
                        required
                        placeholder="First player's name"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="player2">Player 2 Name *</label>
                      <input
                        type="text"
                        id="player2"
                        name="player2"
                        value={formData.player2 || ''}
                        onChange={handleInputChange}
                        required
                        placeholder="Second player's name"
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* On-Location Tournament - Multi-day stream scheduling */}
              {formData.eventType === 'onLocationTournament' && (
                <div className="on-location-tournament-quote">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="eventDate">Tournament Start Date *</label>
                      <input
                        type="date"
                        id="eventDate"
                        name="eventDate"
                        value={formatDateForInput(formData.eventDate)}
                        onChange={handleDateChange}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="endDate">Tournament End Date *</label>
                      <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={formatDateForInput(formData.endDate)}
                        onChange={handleDateChange}
                        required
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Location Setup Date */}
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="setupDate">Location Setup Date</label>
                      <input
                        type="date"
                        id="setupDate"
                        name="setupDate"
                        value={formatDateForInput(formData.setupDate)}
                        onChange={handleDateChange}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Setup Date Notice</label>
                      <div style={{
                        background: 'rgba(255, 165, 0, 0.08)',
                        border: '1px solid rgba(255, 165, 0, 0.2)',
                        borderRadius: '8px',
                        padding: '12px 15px',
                        color: '#ffa500',
                        fontSize: '0.85rem',
                        textAlign: 'center',
                        lineHeight: '1.4',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div>
                          <strong>💰 $50/day charge</strong><br />
                          for equipment on location<br />
                          without streaming<br />
                          <em style={{ fontSize: '0.75rem', color: '#ffcc80' }}>
                            Allow at least 4 hours for setup
                          </em>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Individual day stream times */}
                  {formData.eventDate && formData.endDate && (
                    <div className="daily-stream-schedule">
                      <h5 style={{ color: '#00ffff', marginBottom: '15px', textAlign: 'center' }}>
                        📅 Daily Stream Schedule
                      </h5>
                      {generateTournamentDays().map((day, index) => (
                        <div key={index} className="form-row" style={{ marginBottom: '15px' }}>
                          <div className="form-group">
                            <label style={{ color: '#ffa500', fontWeight: 'bold' }}>
                              {day.dateString}
                            </label>
                            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center', marginTop: '10px' }}>
                              <div style={{ width: '200px' }}>
                                <select
                                  name={`day_${index}_startTime`}
                                  value={day.startTime || ''}
                                  onChange={(e) => handleDayTimeChange(index, 'startTime', e.target.value)}
                                  className="form-input"
                                  style={{ 
                                    backgroundColor: 'rgba(0, 255, 255, 0.1)',
                                    color: '#e0f7fa',
                                    border: '1px solid rgba(0, 255, 255, 0.3)',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    fontSize: '1rem',
                                    textAlign: 'center',
                                    width: '100%'
                                  }}
                                >
                                  <option value="">Select start time</option>
                                  <option value="no-stream" style={{ backgroundColor: '#1a1a1a', color: '#ff6b6b' }}>
                                    🚫 No Stream
                                  </option>
                                  {generateTimeSlots(day.date).map((slot, slotIndex) => (
                                    <option key={slotIndex} value={slot.value} style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>
                                      {slot.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {/* Only show end time dropdown if start time is not "no-stream" */}
                              {day.startTime !== 'no-stream' && (
                                <div style={{ width: '200px' }}>
                                  <select
                                    name={`day_${index}_endTime`}
                                    value={day.endTime || ''}
                                    onChange={(e) => handleDayTimeChange(index, 'endTime', e.target.value)}
                                    className="form-input"
                                    style={{ 
                                      backgroundColor: 'rgba(0, 255, 255, 0.1)',
                                      color: '#e0f7fa',
                                      border: '1px solid rgba(0, 255, 255, 0.3)',
                                      borderRadius: '8px',
                                      padding: '0.75rem',
                                      fontSize: '1rem',
                                      textAlign: 'center',
                                      width: '100%'
                                    }}
                                  >
                                    <option value="">Select end time</option>
                                    {generateTimeSlots(day.date).map((slot, slotIndex) => (
                                      <option key={slotIndex} value={slot.value} style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>
                                        {slot.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                            
                            {/* 2-Hour Minimum Notice */}
                            {day.startTime && day.startTime !== 'no-stream' && (
                              <div style={{ 
                                fontSize: '0.8rem', 
                                color: '#ffa500', 
                                marginTop: '8px', 
                                textAlign: 'center',
                                fontWeight: 'bold',
                                background: 'rgba(255, 165, 0, 0.1)',
                                border: '1px solid rgba(255, 165, 0, 0.3)',
                                borderRadius: '4px',
                                padding: '6px 8px'
                              }}>
                                ⏰ 2 Hour Minimum Per Stream Day
                              </div>
                            )}
                            
                            {/* Day Description Field */}
                            <div style={{ marginTop: '15px' }}>
                              <input
                                type="text"
                                name={`day_${index}_description`}
                                value={day.description || ''}
                                onChange={(e) => handleDayTimeChange(index, 'description', e.target.value)}
                                placeholder="e.g., Qualifying rounds, Finals, Championship matches..."
                                className="form-input"
                                style={{ 
                                  backgroundColor: 'rgba(255, 165, 0, 0.1)',
                                  color: '#ffa500',
                                  border: '1px solid rgba(255, 165, 0, 0.3)',
                                  borderRadius: '8px',
                                  padding: '0.75rem',
                                  fontSize: '1rem',
                                  textAlign: 'center',
                                  width: '100%',
                                  maxWidth: '420px'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Price calculation */}
                      <div style={{
                        background: 'rgba(255, 165, 0, 0.1)',
                        border: '1px solid rgba(255, 165, 0, 0.3)',
                        borderRadius: '10px',
                        padding: '15px',
                        marginTop: '20px',
                        textAlign: 'center'
                      }}>
                        <div style={{ color: '#ffa500', fontSize: '1.1rem', fontWeight: 'bold' }}>
                          Custom Quote Required
                        </div>
                        <div style={{ color: '#e0f7fa', fontSize: '0.9rem', marginTop: '8px' }}>
                          Pricing based on tournament duration, setup requirements, and travel distance
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Venue Information */}
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="venueName">Venue Name *</label>
                      <input
                        type="text"
                        id="venueName"
                        name="venueName"
                        value={formData.venueName || ''}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Legends Brews & Cues, Private Residence, Community Center"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="venueCity">City *</label>
                      <input
                        type="text"
                        id="venueCity"
                        name="venueCity"
                        value={formData.venueCity || ''}
                        onChange={handleInputChange}
                        required
                        placeholder="City"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="venueState">State *</label>
                      <input
                        type="text"
                        id="venueState"
                        name="venueState"
                        value={formData.venueState || ''}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., CO, CA, TX"
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Venue Awareness Notice */}
                  <div style={{
                    background: 'rgba(255, 165, 0, 0.08)',
                    border: '1px solid rgba(255, 165, 0, 0.2)',
                    borderRadius: '8px',
                    padding: '15px 20px',
                    color: '#ffa500',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    lineHeight: '1.4',
                    margin: '15px 0'
                  }}>
                    <strong>⚠️ Venue Approval Required:</strong> We must have venue approval before confirming any on-location bookings. Please ensure the venue is aware of your request.
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: '1' }}>
                      <label htmlFor="venueAwareness">Venue Awareness *</label>
                      <select
                        id="venueAwareness"
                        name="venueAwareness"
                        value={formData.venueAwareness || ''}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                        style={{ 
                          backgroundColor: 'rgba(0, 255, 255, 0.1)',
                          color: '#e0f7fa',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '1rem',
                          textAlign: 'center',
                          width: '100%'
                        }}
                      >
                        <option value="" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Select option</option>
                        <option value="yes" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Yes - Venue has approved the booking</option>
                        <option value="no" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>No - Venue is not yet aware</option>
                        <option value="pending" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Pending - Working on getting approval</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: '1' }}>
                      <label htmlFor="venueContactName">Venue Contact Name</label>
                      <input
                        type="text"
                        id="venueContactName"
                        name="venueContactName"
                        value={formData.venueContactName || ''}
                        onChange={handleInputChange}
                        placeholder="Name of venue contact person"
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Camera Count Selection */}
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="numberOfCameras">Number of Cameras *</label>
                      <select
                        id="numberOfCameras"
                        name="numberOfCameras"
                        value={formData.numberOfCameras || ''}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                        style={{ 
                          backgroundColor: 'rgba(0, 255, 255, 0.1)',
                          color: '#e0f7fa',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '1rem',
                          textAlign: 'center',
                          width: '100%'
                        }}
                      >
                        <option value="" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Select number of cameras</option>
                        <option value="2" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>2 Cameras ($100 setup, $50/hour)</option>
                        <option value="3" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>3 Cameras ($120 setup, $60/hour)</option>
                        <option value="4" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>4 Cameras ($140 setup, $70/hour)</option>
                        <option value="5" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>5 Cameras ($160 setup, $80/hour)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Camera Pricing</label>
                      <div style={{
                        background: 'rgba(0, 255, 255, 0.05)',
                        border: '1px solid rgba(0, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '15px',
                        color: '#e0f7fa',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          {formData.numberOfCameras ? (
                            (() => {
                              const noStreamDays = generateTournamentDays().filter(day => day.startTime === 'no-stream').length;
                              const setupDays = formData.setupDate ? 1 : 0; // Add 1 day if setup date is selected
                              const { totalSetupFee, hourlyRate, totalPrice, hours, noStreamCost } = calculateOnLocationTournamentPrice(
                                formData.numberOfCameras, 
                                calculateTotalTournamentHours(), 
                                noStreamDays + setupDays
                              );
                              const hoursText = hours > 0 ? `${hours} hour${hours !== 1 ? 's' : ''}` : '2-hour minimum per day';
                              return (
                                <>
                                  <div style={{ fontWeight: 'bold', color: '#ffa500', fontSize: '1.1rem' }}>
                                    ${totalPrice.toFixed(2)}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', marginTop: '5px', color: '#e0f7fa' }}>
                                    {hours > 0 ? `(${hoursText})` : '(2-hour minimum per day)'}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', marginTop: '3px', color: '#ffcc80' }}>
                                    Setup Fee: ${totalSetupFee.toFixed(2)} (one-time)
                                  </div>
                                  <div style={{ fontSize: '0.7rem', marginTop: '3px', color: '#ffcc80' }}>
                                    Hourly Rate: ${hourlyRate.toFixed(2)}/hour
                                  </div>
                                  {noStreamCost > 0 && (
                                    <div style={{ fontSize: '0.7rem', marginTop: '3px', color: '#ffcc80' }}>
                                      Equipment on location: ${noStreamCost.toFixed(2)} (${(noStreamCost / (noStreamDays + setupDays)).toFixed(0)}/day)
                                    </div>
                                  )}
                                </>
                              );
                            })()
                          ) : (
                            <>
                              <div style={{ fontWeight: 'bold', color: '#00ffff' }}>$100.00 Setup Fee (One-Time)</div>
                              <div style={{ fontSize: '0.8rem', marginTop: '5px', color: '#e0f7fa' }}>Includes 2 cameras</div>
                              <div style={{ fontSize: '0.7rem', marginTop: '3px', color: '#ffcc80' }}>
                                +$20 per additional camera setup (one-time)
                              </div>
                              <div style={{ fontSize: '0.7rem', marginTop: '3px', color: '#ffcc80' }}>
                                Hourly Rate: $50/hour + $10 per additional camera
                              </div>
                              <div style={{ fontSize: '0.7rem', marginTop: '3px', color: '#ffcc80' }}>
                                2-hour minimum per stream day
                              </div>
                              <div style={{ fontSize: '0.7rem', marginTop: '3px', color: '#ffcc80' }}>
                                Equipment on location: $50/day
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: '1' }}>
                      <label>What's Included</label>
                      <div style={{
                        background: 'rgba(0, 255, 255, 0.05)',
                        border: '1px solid rgba(0, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '15px',
                        color: '#e0f7fa',
                        fontSize: '0.9rem',
                        lineHeight: '1.6'
                      }}>
                        <div style={{ marginBottom: '8px' }}>🎥 <strong>Mobile streaming setup</strong> - Professional cameras and equipment</div>
                        <div style={{ marginBottom: '8px' }}>🚗 <strong>Travel</strong> - We come to your location</div>
                        <div style={{ marginBottom: '8px' }}>🎙️ <strong>Live commentary</strong> - Unfiltered, entertaining coverage</div>
                        <div>🏷️ <strong>Branding</strong> - Cueless in the Booth graphics + custom branding options</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* On-Location Events - Custom Quote (Private Match and Other) */}
              {(formData.eventType === 'onLocation' || 
                formData.eventType === 'onLocationPrivate' || 
                formData.eventType === 'onLocationOther') && (
                <div className="on-location-quote">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="eventDate">Event Date *</label>
                      <input
                        type="date"
                        id="eventDate"
                        name="eventDate"
                        value={formatDateForInput(formData.eventDate)}
                        onChange={handleDateChange}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="eventTime">Start Time *</label>
                      <select
                        id="eventTime"
                        name="eventTime"
                        value={formData.eventTime}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                        style={{ 
                          backgroundColor: 'rgba(0, 255, 255, 0.1)',
                          color: '#e0f7fa',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '1rem',
                          textAlign: 'center',
                          width: '100%',
                          minWidth: '180px'
                        }}
                      >
                        <option value="">Select start time</option>
                        {generateOnLocationTimeSlots().map((slot, index) => (
                          <option key={index} value={slot.value} style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                      <div style={{ fontSize: '0.75rem', color: '#00ffff', marginTop: '4px', textAlign: 'center' }}>
                        Available times: 10:00 AM - 7:00 PM
                        <br />
                        <em style={{ color: '#ccc' }}>Special times available upon request</em>
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    {formData.eventType === 'onLocationPrivate' ? (
                      <div className="form-group">
                        <label htmlFor="isMultiDay">Is this a multi-day event?</label>
                        <select
                          id="isMultiDay"
                          name="isMultiDay"
                          value={formData.isMultiDay ? 'true' : 'false'}
                          onChange={(e) => handleInputChange({
                            target: {
                              name: 'isMultiDay',
                              value: e.target.value === 'true'
                            }
                          })}
                          className="form-input"
                          style={{ 
                            backgroundColor: 'rgba(0, 255, 255, 0.1)',
                            color: '#e0f7fa',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            fontSize: '1rem',
                            textAlign: 'center',
                            width: '100%',
                            minWidth: '180px'
                          }}
                        >
                          <option value="false" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>No - Single Day</option>
                          <option value="true" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Yes - Multi-Day</option>
                        </select>
                      </div>
                    ) : (
                      <div className="form-group">
                        <label htmlFor="endDate">End Date</label>
                        <input
                          type="date"
                          id="endDate"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleInputChange}
                          className="form-input"
                        />
                      </div>
                    )}
                    
                    {/* Conditional End Date for Multi-Day Private Matches */}
                    {formData.eventType === 'onLocationPrivate' && formData.isMultiDay && (
                      <div className="form-group">
                        <label htmlFor="endDate">End Date *</label>
                        <input
                          type="date"
                          id="endDate"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleInputChange}
                          required
                          className="form-input"
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label htmlFor="endTime">End Time</label>
                      <select
                        id="endTime"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleInputChange}
                        className="form-input"
                        style={{ 
                          backgroundColor: 'rgba(0, 255, 255, 0.1)',
                          color: '#e0f7fa',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '1rem',
                          textAlign: 'center',
                          width: '100%',
                          minWidth: '180px'
                        }}
                      >
                        <option value="">Select end time (optional)</option>
                        {formData.eventType === 'onLocationPrivate' ? (
                          generateOnLocationEndTimeSlots(formData.eventTime).map((slot, index) => (
                            <option key={index} value={slot.value} style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>
                              {slot.label}
                            </option>
                          ))
                        ) : (
                          generateOnLocationTimeSlots().map((slot, index) => (
                            <option key={index} value={slot.value} style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>
                              {slot.label}
                            </option>
                          ))
                        )}
                      </select>
                      {formData.eventType === 'onLocationPrivate' && (
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: '#ffa500', 
                          marginTop: '6px', 
                          textAlign: 'center',
                          fontWeight: 'bold',
                          background: 'rgba(255, 165, 0, 0.1)',
                          border: '1px solid rgba(255, 165, 0, 0.3)',
                          borderRadius: '4px',
                          padding: '6px 8px'
                        }}>
                          ⏰ 2 Hour Minimum Required
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="venueName">Venue Name *</label>
                      <input
                        type="text"
                        id="venueName"
                        name="venueName"
                        value={formData.venueName || ''}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Legends Brews & Cues, Private Residence, Community Center"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="numberOfMatches">Expected Number of Matches</label>
                      <select
                id="numberOfMatches"
                name="numberOfMatches"
                value={formData.numberOfMatches}
                onChange={handleInputChange}
                        className="form-input"
                      >
                        <option value="">Select range</option>
                        <option value="1-5">1-5 matches</option>
                        <option value="6-10">6-10 matches</option>
                        <option value="11-20">11-20 matches</option>
                        <option value="20+">20+ matches</option>
                        <option value="all-day">All day event</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="venueCity">City *</label>
                      <input
                        type="text"
                        id="venueCity"
                        name="venueCity"
                        value={formData.venueCity || ''}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Colorado Springs, Denver, Pueblo"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="venueState">State *</label>
                      <input
                        type="text"
                        id="venueState"
                        name="venueState"
                        value={formData.venueState || ''}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., CO, CA, TX"
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Venue Awareness Notice */}
                  <div style={{
                    background: 'rgba(255, 165, 0, 0.08)',
                    border: '1px solid rgba(255, 165, 0, 0.2)',
                    borderRadius: '8px',
                    padding: '15px 20px',
                    color: '#ffa500',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    lineHeight: '1.4',
                    margin: '15px 0'
                  }}>
                    <strong>⚠️ Venue Approval Required:</strong> We must have venue approval before confirming any on-location bookings. Please ensure the venue is aware of your request.
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: '1' }}>
                      <label htmlFor="venueAwareness">Venue Awareness *</label>
                      <select
                        id="venueAwareness"
                        name="venueAwareness"
                        value={formData.venueAwareness || ''}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                        style={{ 
                          backgroundColor: 'rgba(0, 255, 255, 0.1)',
                          color: '#e0f7fa',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '1rem',
                          textAlign: 'center',
                          width: '100%'
                        }}
                      >
                        <option value="" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Select option</option>
                        <option value="yes" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Yes - Venue has approved the booking</option>
                        <option value="no" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>No - Venue is not yet aware</option>
                        <option value="pending" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Pending - Working on getting approval</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: '1' }}>
                      <label htmlFor="venueContactName">Venue Contact Name</label>
                      <input
                        type="text"
                        id="venueContactName"
                        name="venueContactName"
                        value={formData.venueContactName || ''}
                        onChange={handleInputChange}
                        placeholder="Name of venue contact person"
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Venue Contact Information */}
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="venueContactPhone">Venue Contact Phone</label>
                      <input
                        type="tel"
                        id="venueContactPhone"
                        name="venueContactPhone"
                        value={formData.venueContactPhone || ''}
                        onChange={handleInputChange}
                        placeholder="(555) 123-4567"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="venueContactEmail">Venue Contact Email</label>
                      <input
                        type="email"
                        id="venueContactEmail"
                        name="venueContactEmail"
                        value={formData.venueContactEmail || ''}
                        onChange={handleInputChange}
                        placeholder="venue@example.com"
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Camera Count Selection */}
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="numberOfCameras">Number of Cameras *</label>
                      <select
                        id="numberOfCameras"
                        name="numberOfCameras"
                        value={formData.numberOfCameras || ''}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                        style={{ 
                          backgroundColor: 'rgba(0, 255, 255, 0.1)',
                          color: '#e0f7fa',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '1rem',
                          textAlign: 'center',
                          width: '100%'
                        }}
                      >
                        <option value="" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>Select number of cameras</option>
                        <option value="1" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>1 Camera ($50 setup, $50/hour)</option>
                        <option value="2" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>2 Cameras ($60 setup, $55/hour)</option>
                        <option value="3" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>3 Cameras ($70 setup, $60/hour)</option>
                        <option value="4" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>4 Cameras ($80 setup, $65/hour)</option>
                        <option value="5" style={{ backgroundColor: '#1a1a1a', color: '#e0f7fa' }}>5 Cameras ($90 setup, $70/hour)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Camera Pricing</label>
                      <div style={{
                        background: 'rgba(0, 255, 255, 0.05)',
                        border: '1px solid rgba(0, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '15px',
                        color: '#e0f7fa',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold', color: '#00ffff' }}>$50/hour (includes 1 camera)</div>
                          <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>Additional cameras: $10/hour each</div>
                          <div style={{ fontSize: '0.8rem', marginTop: '3px' }}>Up to 5 cameras maximum</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: '1' }}>
                      <label>Pricing Information</label>
                      <div style={{
                        background: 'rgba(255, 165, 0, 0.1)',
                        border: '1px solid rgba(255, 165, 0, 0.3)',
                        borderRadius: '5px',
                        padding: '12px',
                        color: '#ffa500',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        textAlign: 'center'
                      }}>
                        {formData.eventType === 'onLocationPrivate' ? (
                          formData.numberOfCameras ? (
                            (() => {
                              const { totalSetupFee, hourlyRate, totalPrice, hours } = calculateOnLocationPrivatePrice(formData.eventTime, formData.endTime, formData.numberOfCameras);
                              const hoursText = hours > 0 ? `${hours} hour${hours !== 1 ? 's' : ''}` : '2-hour example';
                              return (
                                <>
                                  ${totalPrice.toFixed(2)} {hours > 0 ? `(${hoursText})` : '(2-hour example)'}
                                  <div style={{ fontSize: '0.8rem', fontWeight: 'normal', marginTop: '5px' }}>
                                    Setup: ${totalSetupFee.toFixed(2)} (one-time) + ${hourlyRate.toFixed(2)}/hour
                                  </div>
                                  <div style={{ fontSize: '0.7rem', fontWeight: 'normal', marginTop: '3px', color: '#ffcc80' }}>
                                    $50 setup (one-time) + $10 per additional camera setup (one-time)
                                  </div>
                                  <div style={{ fontSize: '0.7rem', fontWeight: 'normal', marginTop: '3px', color: '#ffcc80' }}>
                                    $50/hour + $5 per additional camera 
                                  </div>
                                </>
                              );
                            })()
                          ) : (
                            <>
                              $50.00 Setup Fee (One-Time)
                              <div style={{ fontSize: '0.8rem', fontWeight: 'normal', marginTop: '5px' }}>
                                Includes 1 camera
                              </div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 'normal', marginTop: '3px', color: '#ffcc80' }}>
                                +$10 per additional camera setup (one-time)
                              </div>
                              <div style={{ fontSize: '0.7rem', fontWeight: 'normal', marginTop: '3px', color: '#ffcc80' }}>
                                $50/hour + $5 per additional camera
                              </div>
                            </>
                          )
                        ) : (
                          'Custom Quote Required'
                        )}
                      </div>
                    </div>
                    <div className="form-group" style={{ flex: '1' }}>
                      <label>What's Included</label>
                      <div style={{
                        background: 'rgba(0, 255, 255, 0.08)',
                        border: '1px solid rgba(0, 255, 255, 0.2)',
                        borderRadius: '5px',
                        padding: '12px',
                        color: '#00ffff',
                        fontSize: '0.85rem',
                        textAlign: 'center',
                        lineHeight: '1.4',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div>
                          <strong>🚐 Mobile Setup:</strong><br />
                          • Full streaming equipment<br />
                          • Travel to your location<br />
                          • Live commentary<br />
                          • Cueless in the Booth graphics
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Events - Simple Quote */}
              {formData.eventType === 'other' && (
                <div className="other-event-quote">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="eventDate">Event Date *</label>
                      <input
                        type="date"
                        id="eventDate"
                        name="eventDate"
                        value={formatDateForInput(formData.eventDate)}
                        onChange={handleDateChange}
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="eventTime">Start Time *</label>
                      <select
                        id="eventTime"
                        name="eventTime"
                        key={`time-picker-${timePickerKey}-${formData.eventDate}`}
                        data-date={formData.eventDate}
                        value={formData.eventTime}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                        style={{ 
                          backgroundColor: 'rgba(0, 255, 255, 0.1)',
                          color: '#e0f7fa',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          fontSize: '1rem',
                          textAlign: 'center',
                          width: '100%',
                          minWidth: '180px'
                        }}
                      >
                        <option value="">Select start time</option>
                        {currentTimeSlots.map((slot, index) => (
                          <option key={index} value={slot.value} style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                      {formData.eventDate && (
                        <div style={{ fontSize: '0.75rem', color: '#00ffff', marginTop: '4px', textAlign: 'center' }}>
                          {getOperatingHoursText(formData.eventDate)}
                          <br />
                          <em style={{ color: '#ccc' }}>Special times available upon request</em>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-row">
          <div className="form-group">
            <label htmlFor="budget">Budget Range (Optional)</label>
            <select
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleInputChange}
              className="form-input"
            >
              <option value="">Select budget range</option>
                        <option value="under-100" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Under $100</option>
                        <option value="100-200" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>$100 - $200</option>
                        <option value="200-300" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>$200 - $300</option>
                        <option value="300-500" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>$300 - $500</option>
                        <option value="500-plus" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>$500+</option>
                        <option value="custom" style={{ backgroundColor: '#000000', color: '#e0f7fa' }}>Let's discuss</option>
            </select>
          </div>
                    <div className="form-group">
                      <label>Next Steps</label>
                      <div style={{
                        background: 'rgba(255, 165, 0, 0.1)',
                        border: '1px solid rgba(255, 165, 0, 0.3)',
                        borderRadius: '5px',
                        padding: '12px',
                        color: '#ffa500',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        textAlign: 'center'
                      }}>
                        We'll Contact You
                        <div style={{ fontSize: '0.8rem', fontWeight: 'normal', marginTop: '5px' }}>
                          For a custom quote
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* Location Field - Only show when event type is selected (but not for on-location events) */}
          {formData.eventType && !formData.eventType.startsWith('onLocation') && (
            <div style={{ marginBottom: '20px' }}>
              {(formData.eventType === 'ladderMatch' || selectedService === 'legends') ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label htmlFor="location" style={{ textAlign: 'center', display: 'block', marginBottom: '8px', color: '#00ffff', fontSize: '0.9rem', fontWeight: '500' }}>Location</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value="Legends Brews & Cues"
                    readOnly
                    className="form-input"
                    style={{ 
                      backgroundColor: 'rgba(0, 255, 255, 0.1)',
                      color: '#00ffff',
                      cursor: 'not-allowed',
                      opacity: '0.9',
                      textAlign: 'center',
                      fontWeight: '500',
                      width: '100%',
                      maxWidth: '400px',
                      padding: '12px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              ) : (
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="location">Location *</label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="e.g., Legends Brews & Cues, Private Residence"
                      required
                      className="form-input"
                    />
                  </div>
                </div>
              )}
            {/* Number of Matches/Hours - Hide for ladder matches, Legends bookings, and on-location events */}
            {formData.eventType !== 'ladderMatch' && selectedService !== 'legends' && !formData.eventType.startsWith('onLocation') && (
              <div className="form-group">
                <label htmlFor="numberOfMatches">Number of Matches/Hours</label>
                <input
                  type="text"
                  id="numberOfMatches"
                  name="numberOfMatches"
                  value={formData.numberOfMatches}
                  onChange={handleInputChange}
                  placeholder="e.g., 2 matches, 3 hours"
                  className="form-input"
                />
              </div>
            )}
          </div>
          )}


          {/* Special Requests - Only show when event type is selected */}
          {formData.eventType && (
          <div className="form-group">
            <label htmlFor="specialRequests">Special Requests or Additional Info</label>
            <textarea
              id="specialRequests"
              name="specialRequests"
              value={formData.specialRequests}
              onChange={handleInputChange}
              rows="3"
              placeholder="Any special requests, equipment needs, or additional information..."
              className="form-input"
            />
          </div>
          )}

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleInputChange}
                required
                className="form-checkbox"
              />
              I understand and acknowledge that Cueless in the Booth provides unfiltered commentary and may use adult language during live streams.
            </label>
          </div>

          {/* Submit Button - Only show when event type is selected */}
          {formData.eventType && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                type="submit" 
                className="submit-button" 
                disabled={isLoading || !isFormValid()}
                style={{
                  flex: 1,
                  opacity: (!isFormValid() || isLoading) ? 0.6 : 1,
                  cursor: (!isFormValid() || isLoading) ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? 'Submitting...' : 
                 !isFormValid() ? 'Complete Required Fields' : 
                 'SUBMIT BOOKING REQUEST'}
          </button>
              
              {/* Preview Success Page Button */}
              <button
                type="button"
                onClick={() => {
                  // Create sample request data for preview
                  const sampleBooking = {
                    id: 'REQ123',
                    name: formData.name || 'John Doe',
                    email: formData.email || 'john@example.com',
                    phone: formData.phone || '555-1234',
                    eventType: formData.eventType,
                    eventDate: formData.eventDate || '2025-09-25',
                    endDate: formData.endDate || '',
                    eventTime: formData.eventTime || '18:00',
                    endTime: formData.endTime || '',
                    location: formData.location || 'Legends Brews & Cues',
                    numberOfMatches: formData.numberOfMatches || '',
                    playerNames: formData.playerNames || '',
                    player1: formData.player1 || 'John Doe',
                    player2: formData.player2 || 'Jane Smith',
                    teamName: formData.teamName || 'Shark Attack',
                    opponentTeamName: formData.opponentTeamName || 'Ball Busters',
                    leagueName: formData.leagueName || 'USAPL',
                    matchType: formData.matchType || 'single',
                    format1: formData.format1 || '8ball',
                    format2: formData.format2 || '',
                    eventDescription: formData.eventDescription || 'Live streaming a charity pool tournament with 16 players, multiple tables, and celebrity commentary',
                    tournamentDirector: formData.tournamentDirector || 'Mike Johnson',
                    assistantDirector: formData.assistantDirector || 'Sarah Wilson',
                    tournamentName: formData.tournamentName || 'Legends Championship',
                    budget: formData.budget || '100',
                    specialRequests: formData.specialRequests || '',
                    agreeToTerms: true,
                    submittedAt: new Date().toLocaleString()
                  };
                  setSuccessfulBooking(sampleBooking);
                }}
                style={{
                  padding: '12px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #ffa500, #ff8c00)',
                  color: '#000',
                  boxShadow: '0 4px 15px rgba(255, 165, 0, 0.3)',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(255, 165, 0, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(255, 165, 0, 0.3)';
                }}
              >
                👁️ Preview
              </button>
            </div>
          )}

          {successfulBooking && (
            <div className="success-page" style={{
              background: 'rgba(0, 255, 0, 0.1)',
              border: '2px solid rgba(0, 255, 0, 0.3)',
              borderRadius: '12px',
              padding: '25px',
              marginTop: '20px',
              textAlign: 'center'
            }}>
              {/* Success Header */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
                <h3 style={{ color: '#00ff00', fontSize: '1.8rem', margin: '0 0 10px 0', textShadow: '0 0 10px rgba(0, 255, 0, 0.5)' }}>
                  Booking Confirmed!
                </h3>
                <p style={{ color: '#ccc', fontSize: '1rem', margin: '0' }}>
                  Your Cueless streaming request has been submitted successfully
                </p>
              </div>

              {/* Booking Details */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                <h4 style={{ color: '#00ffff', margin: '0 0 15px 0', textAlign: 'center', fontSize: '1.2rem' }}>
                  📋 Booking Details
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.9rem' }}>
                  <div>
                    <strong style={{ color: '#ffa500' }}>Booking ID:</strong><br />
                    <span style={{ color: '#e0f7fa', fontFamily: 'monospace' }}>#{successfulBooking.id}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#ffa500' }}>Event Type:</strong><br />
                    <span style={{ color: '#e0f7fa' }}>{getEventTypeDisplayName(successfulBooking.eventType)}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#ffa500' }}>Date:</strong><br />
                    <span style={{ color: '#e0f7fa' }}>{formatDate(successfulBooking.eventDate)}</span>
                  </div>
                  <div>
                    <strong style={{ color: '#ffa500' }}>Time:</strong><br />
                    <span style={{ color: '#e0f7fa' }}>{formatTime(successfulBooking.eventTime)}</span>
                  </div>
                  {successfulBooking.endDate && (
                    <div>
                      <strong style={{ color: '#ffa500' }}>End Date:</strong><br />
                      <span style={{ color: '#e0f7fa' }}>{formatDate(successfulBooking.endDate)}</span>
                    </div>
                  )}
                  <div>
                    <strong style={{ color: '#ffa500' }}>Location:</strong><br />
                    <span style={{ color: '#e0f7fa' }}>{successfulBooking.location}</span>
                  </div>
                </div>

                {/* Event-specific details */}
                {successfulBooking.eventType === 'ladderMatch' && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 165, 0, 0.3)' }}>
                    <strong style={{ color: '#ffa500' }}>Players:</strong><br />
                    <span style={{ color: '#e0f7fa' }}>
                      {successfulBooking.player1} vs {successfulBooking.player2}
                    </span>
                  </div>
                )}

                {successfulBooking.eventType === 'tournament' && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 165, 0, 0.3)' }}>
                    <strong style={{ color: '#ffa500' }}>Tournament:</strong> {successfulBooking.tournamentName}<br />
                    <strong style={{ color: '#ffa500' }}>Director:</strong> {successfulBooking.tournamentDirector}
                    {successfulBooking.assistantDirector && (
                      <><br /><strong style={{ color: '#ffa500' }}>Assistant:</strong> {successfulBooking.assistantDirector}</>
                    )}
                  </div>
                )}

                {successfulBooking.eventType === 'leagueNight' && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 165, 0, 0.3)' }}>
                    <strong style={{ color: '#ffa500' }}>Teams:</strong> {successfulBooking.teamName} vs {successfulBooking.opponentTeamName}<br />
                    <strong style={{ color: '#ffa500' }}>League:</strong> {successfulBooking.leagueName}
                    {successfulBooking.matchType && (
                      <><br /><strong style={{ color: '#ffa500' }}>Format:</strong> {successfulBooking.format1}</>
                    )}
                  </div>
                )}

                {successfulBooking.eventType === 'other' && successfulBooking.eventDescription && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 165, 0, 0.3)' }}>
                    <strong style={{ color: '#ffa500' }}>Event Description:</strong><br />
                    <span style={{ color: '#e0f7fa', fontStyle: 'italic' }}>{successfulBooking.eventDescription}</span>
                  </div>
                )}
              </div>

              {/* Next Steps */}
              <div style={{
                background: 'rgba(255, 165, 0, 0.1)',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <h4 style={{ color: '#ffa500', margin: '0 0 15px 0', textAlign: 'center', fontSize: '1.2rem' }}>
                  📞 What Happens Next?
                </h4>
                <div style={{ color: '#e0f7fa', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  <p style={{ margin: '0 0 10px 0' }}>
                    <strong>1.</strong> We'll review your booking request as soon as possible
                  </p>
                  <p style={{ margin: '0 0 10px 0' }}>
                    <strong>2.</strong> We'll contact you to confirm details and discuss logistics
                  </p>
                  <p style={{ margin: '0 0 10px 0' }}>
                    <strong>3.</strong> We'll send you a final confirmation with all the details
                  </p>
                  <p style={{ margin: '0' }}>
                    <strong>4.</strong> Show up and get ready to be live streamed! 🎱
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div style={{
                background: 'rgba(0, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <h4 style={{ color: '#00ffff', margin: '0 0 10px 0', fontSize: '1.1rem' }}>
                  📧 Questions? Contact Us
                </h4>
                <div style={{ color: '#e0f7fa', fontSize: '0.9rem' }}>
                  <p style={{ margin: '0 0 5px 0' }}>
                    <strong>Email:</strong> cuelessinthebooth@gmail.com
                  </p>
                  <p style={{ margin: '0', fontSize: '0.8rem', color: '#ccc' }}>
                    Reference your booking ID: #{successfulBooking.id}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={closeModal}
                style={{
                  background: 'linear-gradient(135deg, #00ff00, #00cc00)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 30px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(0, 255, 0, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 0, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 0, 0.3)';
                }}
              >
                ✨ Close & Return to Home
              </button>
            </div>
          )}

          {successMessage && (
            <div className="success-message">{successMessage}</div>
          )}
          {errorMessage && (
            <div className="error-message">{errorMessage}</div>
          )}
        </form>
        ) : (
          /* Success Page */
          <div style={{
            width: '100%',
            padding: '1rem 1.2rem 0.8rem 1.2rem',
            boxSizing: 'border-box'
          }}>
            {successfulBooking && (
              <div className="success-page" style={{
                background: 'rgba(0, 255, 0, 0.1)',
                border: '2px solid rgba(0, 255, 0, 0.3)',
                borderRadius: '12px',
                padding: '25px',
                marginTop: '20px',
                textAlign: 'center'
              }}>
                {/* Success Header */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📝</div>
                  <h3 style={{ color: '#00ff00', fontSize: '1.8rem', margin: '0 0 10px 0', textShadow: '0 0 10px rgba(0, 255, 0, 0.5)' }}>
                    Request Submitted!
                  </h3>
                  <p style={{ color: '#ccc', fontSize: '1rem', margin: '0' }}>
                    Your Cueless streaming request has been received and will be reviewed
                  </p>
                </div>

                {/* Booking Details */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '20px',
                  textAlign: 'left'
                }}>
                  <h4 style={{ color: '#00ffff', margin: '0 0 15px 0', textAlign: 'center', fontSize: '1.2rem' }}>
                    📋 Request Details
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.9rem' }}>
                    <div>
                      <strong style={{ color: '#ffa500' }}>Request ID:</strong><br />
                      <span style={{ color: '#e0f7fa', fontFamily: 'monospace' }}>#{successfulBooking.id}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#ffa500' }}>Contact Name:</strong><br />
                      <span style={{ color: '#e0f7fa' }}>{successfulBooking.name}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#ffa500' }}>Email:</strong><br />
                      <span style={{ color: '#e0f7fa' }}>{successfulBooking.email}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#ffa500' }}>Phone:</strong><br />
                      <span style={{ color: '#e0f7fa' }}>{successfulBooking.phone || 'Not provided'}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#ffa500' }}>Event Type:</strong><br />
                      <span style={{ color: '#e0f7fa' }}>{getEventTypeDisplayName(successfulBooking.eventType)}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#ffa500' }}>Date:</strong><br />
                      <span style={{ color: '#e0f7fa' }}>{formatDate(successfulBooking.eventDate)}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#ffa500' }}>Time:</strong><br />
                      <span style={{ color: '#e0f7fa' }}>{formatTime(successfulBooking.eventTime)}</span>
                    </div>
                    {successfulBooking.endDate && (
                      <div>
                        <strong style={{ color: '#ffa500' }}>End Date:</strong><br />
                        <span style={{ color: '#e0f7fa' }}>{formatDate(successfulBooking.endDate)}</span>
                      </div>
                    )}
                    <div>
                      <strong style={{ color: '#ffa500' }}>Location:</strong><br />
                      <span style={{ color: '#e0f7fa' }}>{successfulBooking.location}</span>
                    </div>
                  </div>

                  {/* Event-specific details */}
                  {successfulBooking.eventType === 'ladderMatch' && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 165, 0, 0.3)' }}>
                      <strong style={{ color: '#ffa500' }}>Players:</strong><br />
                      <span style={{ color: '#e0f7fa' }}>
                        {successfulBooking.player1} vs {successfulBooking.player2}
                      </span>
                    </div>
                  )}

                  {successfulBooking.eventType === 'tournament' && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 165, 0, 0.3)' }}>
                      <strong style={{ color: '#ffa500' }}>Tournament:</strong> {successfulBooking.tournamentName}<br />
                      <strong style={{ color: '#ffa500' }}>Director:</strong> {successfulBooking.tournamentDirector}
                      {successfulBooking.assistantDirector && (
                        <><br /><strong style={{ color: '#ffa500' }}>Assistant:</strong> {successfulBooking.assistantDirector}</>
                      )}
                    </div>
                  )}

                  {successfulBooking.eventType === 'leagueNight' && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 165, 0, 0.3)' }}>
                      <strong style={{ color: '#ffa500' }}>Teams:</strong> {successfulBooking.teamName} vs {successfulBooking.opponentTeamName}<br />
                      <strong style={{ color: '#ffa500' }}>League:</strong> {successfulBooking.leagueName}
                      {successfulBooking.matchType && (
                        <><br /><strong style={{ color: '#ffa500' }}>Format:</strong> {successfulBooking.format1}</>
                      )}
                    </div>
                  )}

                  {successfulBooking.eventType === 'other' && successfulBooking.eventDescription && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 165, 0, 0.3)' }}>
                      <strong style={{ color: '#ffa500' }}>Event Description:</strong><br />
                      <span style={{ color: '#e0f7fa', fontStyle: 'italic' }}>{successfulBooking.eventDescription}</span>
                    </div>
                  )}
                </div>

                {/* Next Steps */}
                <div style={{
                  background: 'rgba(255, 165, 0, 0.1)',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ color: '#ffa500', margin: '0 0 15px 0', textAlign: 'center', fontSize: '1.2rem' }}>
                    📞 What Happens Next?
                  </h4>
                  <div style={{ color: '#e0f7fa', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    <p style={{ margin: '0 0 10px 0' }}>
                      <strong>1.</strong> We'll review your streaming request as soon as possible
                    </p>
                    <p style={{ margin: '0 0 10px 0' }}>
                      <strong>2.</strong> We'll contact you to discuss availability and logistics
                    </p>
                    <p style={{ margin: '0 0 10px 0' }}>
                      <strong>3.</strong> If we can accommodate your request, we'll send a confirmation
                    </p>
                    <p style={{ margin: '0 0 10px 0' }}>
                      <strong>4.</strong> If not available, we may suggest alternative dates or options
                    </p>
                    <p style={{ margin: '0' }}>
                      <strong>5.</strong> Once confirmed, get ready to be live streamed! 🎱
                    </p>
                  </div>
                </div>

                {/* Contact Info */}
                <div style={{
                  background: 'rgba(0, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ color: '#00ffff', margin: '0 0 10px 0', fontSize: '1.1rem' }}>
                    📧 Questions About Your Request?
                  </h4>
                  <div style={{ color: '#e0f7fa', fontSize: '0.9rem' }}>
                    <p style={{ margin: '0 0 5px 0' }}>
                      <strong>Email:</strong> cuelessinthebooth@gmail.com
                    </p>
                    <p style={{ margin: '0', fontSize: '0.8rem', color: '#ccc' }}>
                      Reference your request ID: #{successfulBooking.id}
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={closeModal}
                  style={{
                    background: 'linear-gradient(135deg, #00ff00, #00cc00)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 30px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0, 255, 0, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 0, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 0, 0.3)';
                  }}
                >
                  ✨ Close & Return to Home
                </button>
              </div>
            )}
          </div>
        )}
      </CuelessBookingModal>
    </div>
  );
};

export default CuelessInTheBooth;