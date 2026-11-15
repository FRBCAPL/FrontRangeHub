import React, { createContext, useContext } from 'react';

const LegendsAdminContext = createContext({ canAdmin: false, isAuthenticated: false });

export function LegendsAdminProvider({ canAdmin, isAuthenticated, children }) {
  return (
    <LegendsAdminContext.Provider value={{ canAdmin: Boolean(canAdmin), isAuthenticated: Boolean(isAuthenticated) }}>
      {children}
    </LegendsAdminContext.Provider>
  );
}

export function useLegendsAdmin() {
  return useContext(LegendsAdminContext);
}
