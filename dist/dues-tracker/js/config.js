// Configuration constants
export const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8080/api' 
  : 'https://atlasbackend-bnng.onrender.com/api';

export const SUPABASE_URL = 'https://vzsbiixeonfmyvjqzvxc.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2JpaXhlb25mbXl2anF6dnhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4ODAzODYsImV4cCI6MjA3NTQ1NjM4Nn0.yGrcfXHsiqEsSMDmIWaDKpNwjIlGYxadk0_FEM4ITUE';

export const THEME_STORAGE_KEY = 'duesTrackerTheme';
