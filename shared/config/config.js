/** Set to true to show the League App in the Hub. Hidden by default while in development. */
export const SHOW_LEAGUE_APP = false;

// Use local backend for development, production backend for deployed app
// Ensure HTTPS for production to avoid mixed content issues on mobile
export const BACKEND_URL = import.meta.env.DEV 
  ? "http://localhost:8080" 
  : "https://atlasbackend-bnng.onrender.com";

// Add a fallback mechanism for mobile connections
export const getBackendUrl = () => {
  if (import.meta.env.DEV) {
    return "http://localhost:8080";
  }
  
  // Ensure HTTPS for production
  return "https://atlasbackend-bnng.onrender.com";
};

/** Production app URL for TV display links (admin modal). Set VITE_PUBLIC_APP_URL in production if different. */
export const PUBLIC_APP_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL
  ? import.meta.env.VITE_PUBLIC_APP_URL.replace(/\/$/, '')
  : 'https://www.frontrangepool.com'; 