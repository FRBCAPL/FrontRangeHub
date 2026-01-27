// Security utilities for input sanitization and secure API calls

/**
 * Sanitizes user input to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @returns {string} - Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Sanitizes email input
 * @param {string} email - Email to sanitize
 * @returns {string} - Sanitized email
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  
  // Basic email validation and sanitization
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized;
};

/**
 * Sanitizes numeric input
 * @param {any} input - Input to sanitize
 * @returns {number} - Sanitized number
 */
export const sanitizeNumber = (input) => {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number format');
  }
  return num;
};

/**
 * Creates secure headers for API requests
 * @param {string} userPin - User PIN for authentication
 * @returns {Object} - Headers object
 */
export const createSecureHeaders = (userPin) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  // Add authentication header if userPin is provided
  if (userPin && typeof userPin === 'string') {
    headers['Authorization'] = `Bearer ${sanitizeInput(userPin)}`;
  }

  return headers;
};

/**
 * Validates and sanitizes challenge data
 * @param {Object} challengeData - Challenge data to validate
 * @returns {Object} - Sanitized challenge data
 */
export const sanitizeChallengeData = (challengeData) => {
  if (!challengeData || typeof challengeData !== 'object') {
    throw new Error('Invalid challenge data');
  }

  return {
    ...challengeData,
    // Sanitize string fields
    location: challengeData.location ? sanitizeInput(challengeData.location) : '',
    gameType: challengeData.gameType ? sanitizeInput(challengeData.gameType) : '',
    // Validate numeric fields
    raceLength: challengeData.raceLength ? sanitizeNumber(challengeData.raceLength) : 0,
    entryFee: challengeData.entryFee ? sanitizeNumber(challengeData.entryFee) : 0,
  };
};

/**
 * Validates and sanitizes player data
 * @param {Object} playerData - Player data to validate
 * @returns {Object} - Sanitized player data
 */
export const sanitizePlayerData = (playerData) => {
  if (!playerData || typeof playerData !== 'object') {
    throw new Error('Invalid player data');
  }

  return {
    ...playerData,
    firstName: playerData.firstName ? sanitizeInput(playerData.firstName) : '',
    lastName: playerData.lastName ? sanitizeInput(playerData.lastName) : '',
    email: playerData.email ? sanitizeEmail(playerData.email) : '',
    fargoRate: playerData.fargoRate ? sanitizeNumber(playerData.fargoRate) : 0,
  };
};

/**
 * Escapes HTML entities to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export const escapeHtml = (text) => {
  if (typeof text !== 'string') return text;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Validates URL to prevent open redirects
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether URL is safe
 */
export const isValidUrl = (url) => {
  if (typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    // Only allow same origin or trusted domains
    const allowedDomains = [
      'frontrangepool.com',
      'localhost',
      '127.0.0.1'
    ];
    
    return allowedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
};
