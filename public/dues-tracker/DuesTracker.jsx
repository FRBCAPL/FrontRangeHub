import React, { useEffect } from 'react';

const DuesTracker = () => {
  useEffect(() => {
    // Load the original dues tracker app
    const loadOriginalApp = () => {
      // Create an iframe to load the original HTML file
      const iframe = document.createElement('iframe');
      iframe.src = '/dues-tracker/index.html';
      iframe.style.width = '100%';
      iframe.style.height = '100vh';
      iframe.style.border = 'none';
      iframe.style.overflow = 'auto';
      
      const container = document.getElementById('dues-tracker-container');
      if (container) {
        container.innerHTML = '';
        container.appendChild(iframe);
      }
    };

    loadOriginalApp();
  }, []);

  return (
    <div 
      id="dues-tracker-container" 
      style={{ 
        width: '100%', 
        height: '100vh',
        overflow: 'auto'
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        Loading original dues tracker...
      </div>
    </div>
  );
};

export default DuesTracker;
