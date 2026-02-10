import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import SimpleLadderEmbed from '@apps/ladder/frontend/src/components/ladder/SimpleLadderEmbed.jsx';

// This is a completely standalone app for embedding
// It bypasses all authentication and only shows the ladder
const EmbedApp = () => {
  return (
    <HashRouter>
      <Routes>
        <Route 
          path="/ladder-embed" 
          element={
            <div style={{ 
              position: 'relative', 
              minHeight: '100vh', 
              width: '100%', 
              background: '#000',
              padding: 0,
              margin: 0
            }}>
              <SimpleLadderEmbed />
            </div>
          } 
        />
        <Route 
          path="*" 
          element={
            <div style={{ 
              position: 'relative', 
              minHeight: '100vh', 
              width: '100%', 
              background: '#000',
              padding: 0,
              margin: 0
            }}>
              <SimpleLadderEmbed />
            </div>
          } 
        />
      </Routes>
    </HashRouter>
  );
};

export default EmbedApp;