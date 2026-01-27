// API call functions
import { API_BASE_URL } from './config.js';
import { appState } from './state.js';

export async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (appState.authToken) {
    defaultOptions.headers['Authorization'] = `Bearer ${appState.authToken}`;
  }
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  };
  
  try {
    const response = await fetch(url, finalOptions);
    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

export async function fetchOperatorProfile() {
  try {
    const response = await apiCall('/dues-tracker/profile');
    if (response.ok) {
      const data = await response.json();
      if (data.operator) {
        appState.setCurrentOperator(data.operator);
      }
      return data;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch operator profile:', error);
    return null;
  }
}
