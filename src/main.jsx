import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import "stream-chat-react/dist/css/v2/index.css";
import "./index.css";
import "./App.css";
import "./styles/global.css";  // Correct relative path to your override CSS

// Safely set up ResizeObserver polyfill
try {
  import('resize-observer-polyfill').then(({ default: ResizeObserver }) => {
    if (!window.ResizeObserver) {
      window.ResizeObserver = ResizeObserver;
    }
  }).catch(() => {
    // If polyfill fails to load, continue without it
    console.warn('ResizeObserver polyfill not available');
  });
} catch (error) {
  console.warn('ResizeObserver polyfill setup failed:', error);
}

// Detect if we're running in an iframe and add data attribute
if (typeof window !== 'undefined') {
  const isInIframe = window.self !== window.top;
  if (isInIframe) {
    document.documentElement.setAttribute('data-iframe', 'true');
    document.body.setAttribute('data-iframe', 'true');
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.setAttribute('data-iframe', 'true');
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
