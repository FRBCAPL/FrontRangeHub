/**
 * Convert CSV data to JSON format for ladder import
 * @param {string} csvData - Raw CSV data from Google Sheets
 * @param {Object} columnMapping - Mapping of CSV columns to JSON fields
 * @returns {Array} Array of player objects
 */
export const csvToJson = (csvData, columnMapping = {}) => {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  // Default column mapping
  const defaultMapping = {
    position: 'Position',
    firstName: 'First Name',
    lastName: 'Last Name', 
    name: 'Name',
    email: 'Email',
    fargoRate: 'FargoRate',
    ...columnMapping
  };
  
  const players = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const player = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      
      // Map header to field name
      let fieldName = null;
      for (const [field, headerName] of Object.entries(defaultMapping)) {
        if (header.toLowerCase() === headerName.toLowerCase()) {
          fieldName = field;
          break;
        }
      }
      
      if (fieldName) {
        // Convert value based on field type
        switch (fieldName) {
          case 'position':
          case 'fargoRate':
            player[fieldName] = parseInt(value) || 0;
            break;
          case 'firstName':
          case 'lastName':
          case 'email':
            player[fieldName] = value || '';
            break;
          case 'name':
            // Split full name into first and last
            const nameParts = value.split(' ');
            player.firstName = nameParts[0] || '';
            player.lastName = nameParts.slice(1).join(' ') || '';
            break;
          default:
            player[fieldName] = value;
        }
      }
    });
    
    // Only add if we have at least an email
    if (player.email) {
      players.push(player);
    }
  }
  
  return players;
};

/**
 * Generate sample CSV format for reference
 * @returns {string} Sample CSV data
 */
export const getSampleCSV = () => {
  return `Position,Name,Email,FargoRate
1,John Doe,john@example.com,485
2,Jane Smith,jane@example.com,472
3,Bob Johnson,bob@example.com,458`;
};

/**
 * Validate player data before import
 * @param {Array} players - Array of player objects
 * @returns {Object} Validation results
 */
export const validatePlayerData = (players) => {
  const results = {
    valid: [],
    errors: []
  };
  
  players.forEach((player, index) => {
    const errors = [];
    
    // Check required fields
    if (!player.email) {
      errors.push('Email is required');
    }
    
    if (!player.firstName && !player.name) {
      errors.push('Name is required');
    }
    
    // Check email format
    if (player.email && !isValidEmail(player.email)) {
      errors.push('Invalid email format');
    }
    
    // Check FargoRate range
    if (player.fargoRate && (player.fargoRate < 0 || player.fargoRate > 9999)) {
      errors.push('FargoRate must be between 0 and 9999');
    }
    
    if (errors.length > 0) {
      results.errors.push({
        row: index + 1,
        player,
        errors
      });
    } else {
      results.valid.push(player);
    }
  });
  
  return results;
};

/**
 * Simple email validation
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default {
  csvToJson,
  getSampleCSV,
  validatePlayerData
};
