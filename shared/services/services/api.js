import { BACKEND_URL } from '@shared/config/config.js';

const API_BASE = BACKEND_URL;

// Enhanced API service with mobile-friendly settings
class ApiService {
  static async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    // Mobile-friendly timeout and retry settings
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      // Mobile-friendly timeout (30 seconds)
      signal: AbortSignal.timeout(30000),
      // Enable credentials for CORS
      credentials: 'include',
      mode: 'cors',
      ...options,
    };

    // Retry logic for mobile connections
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`API Request (attempt ${attempt}): ${url}`);
        
        const response = await fetch(url, defaultOptions);
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`API Success: ${url}`);
        return data;
        
      } catch (error) {
        lastError = error;
        console.warn(`API Request failed (attempt ${attempt}/${maxRetries}): ${url}`, error);
        
        // Don't retry on client errors (4xx)
        if (error.message.includes('400') || error.message.includes('401') || 
            error.message.includes('403') || error.message.includes('404')) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    console.error(`API Request failed after ${maxRetries} attempts: ${url}`, lastError);
    throw lastError;
  }

  static get(endpoint) {
    return this.request(endpoint);
  }

  static post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  static delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Test backend connectivity
  static async testConnection() {
    try {
      const response = await this.get('/health');
      console.log('Backend connection test successful:', response);
      return true;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }
}

export default ApiService; 