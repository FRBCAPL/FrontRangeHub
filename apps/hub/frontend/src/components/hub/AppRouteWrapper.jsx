import React, { useEffect } from 'react';

const AppRouteWrapper = ({ appName, children }) => {
  useEffect(() => {
    // This will run when the component mounts (route is accessed)
    if (appName) {
      // We'll need to pass this up to the parent component
      // For now, we'll use a custom event
      window.dispatchEvent(new CustomEvent('appNameChange', { detail: appName }));
    }
  }, [appName]);

  return children;
};

export default AppRouteWrapper;
