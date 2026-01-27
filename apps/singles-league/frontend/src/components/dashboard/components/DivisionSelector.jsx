import React from 'react';
import PropTypes from 'prop-types';

/**
 * DivisionSelector Component
 * Extracted from Dashboard.jsx to improve maintainability and reusability
 */
const DivisionSelector = ({
  divisions,
  selectedDivision,
  onDivisionChange,
  isMobile
}) => {
  if (divisions.length === 0) {
    return null;
  }

  return (
    <div style={{ 
      marginBottom: isMobile ? 8 : 16,
      display: 'flex',
      flexDirection: 'column',
      alignItems: isMobile ? 'flex-start' : 'center',
      gap: isMobile ? '8px' : '12px'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? '4px' : '12px',
        width: '100%'
      }}>
        <label style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
          Division:&nbsp;
          {divisions.length > 1 ? (
            <select
              value={selectedDivision}
              onChange={onDivisionChange}
              style={{ 
                fontSize: isMobile ? "0.9em" : "1em", 
                padding: isMobile ? 6 : 4, 
                borderRadius: 4 
              }}
            >
              {divisions.map(div =>
                <option key={div} value={div}>{div}</option>
              )}
            </select>
          ) : (
            <span style={{ fontWeight: 600 }}>{divisions[0]}</span>
          )}
        </label>
      </div>
    </div>
  );
};

DivisionSelector.propTypes = {
  divisions: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedDivision: PropTypes.string.isRequired,
  onDivisionChange: PropTypes.func.isRequired,
  isMobile: PropTypes.bool.isRequired
};

export default DivisionSelector;
