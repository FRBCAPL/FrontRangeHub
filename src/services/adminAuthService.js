import { BACKEND_URL } from '../config.js';

/**
 * Admin Authentication Service
 * Handles database-based admin authentication instead of hardcoded credentials
 */
class AdminAuthService {
  constructor() {
    this.backendUrl = BACKEND_URL;
    this.currentAdmin = null;
    this.isAuthenticated = false;
  }

  /**
   * Authenticate admin using email and PIN
   * @param {string} email - Admin email
   * @param {string} pin - Admin PIN
   * @returns {Promise<Object>} Admin data if successful
   */
  async authenticateAdmin(email, pin) {
    try {
      console.log('🔐 Authenticating admin:', email);
      
      const response = await fetch(`${this.backendUrl}/api/platform/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, pin })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Authentication failed');
      }

      const data = await response.json();
      
      if (data.success && data.admin) {
        this.currentAdmin = data.admin;
        this.isAuthenticated = true;
        
        // Store admin info in localStorage for persistence
        localStorage.setItem('adminData', JSON.stringify(data.admin));
        localStorage.setItem('isAdminAuthenticated', 'true');
        
        // Store JWT token if provided (for unified authentication)
        if (data.token) {
          localStorage.setItem('authToken', data.token);
          console.log('🔑 JWT token stored for unified authentication');
        }
        
        console.log('✅ Admin authenticated:', data.admin.email, 'Role:', data.admin.role);
        return data.admin;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Admin authentication failed:', error);
      this.currentAdmin = null;
      this.isAuthenticated = false;
      throw error;
    }
  }

  /**
   * Check if current user is a super admin
   * @param {string} userEmail - User email
   * @param {string} userPin - User PIN
   * @returns {Promise<boolean>} True if super admin
   */
  async isSuperAdmin(userEmail, userPin) {
    try {
      // First try to authenticate as admin
      const admin = await this.authenticateAdmin(userEmail, userPin);
      return admin && admin.role === 'super_admin';
    } catch (error) {
      console.log('🔍 User is not a super admin:', error.message);
      return false;
    }
  }

  /**
   * Check if current user is any type of admin
   * @param {string} userEmail - User email
   * @param {string} userPin - User PIN
   * @returns {Promise<boolean>} True if admin
   */
  async isAdmin(userEmail, userPin) {
    try {
      const admin = await this.authenticateAdmin(userEmail, userPin);
      return admin && (admin.role === 'admin' || admin.role === 'super_admin' || admin.role === 'support');
    } catch (error) {
      console.log('🔍 User is not an admin:', error.message);
      return false;
    }
  }

  /**
   * Get current admin data (from localStorage or memory)
   * @returns {Object|null} Admin data
   */
  getCurrentAdmin() {
    if (this.currentAdmin) {
      return this.currentAdmin;
    }

    // Try to get from localStorage
    const storedAdmin = localStorage.getItem('adminData');
    const isAuthenticated = localStorage.getItem('isAdminAuthenticated') === 'true';
    
    if (storedAdmin && isAuthenticated) {
      try {
        this.currentAdmin = JSON.parse(storedAdmin);
        this.isAuthenticated = true;
        return this.currentAdmin;
      } catch (error) {
        console.error('Error parsing stored admin data:', error);
        this.logout();
      }
    }

    return null;
  }

  /**
   * Check if admin has specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean} True if has permission
   */
  hasPermission(permission) {
    const admin = this.getCurrentAdmin();
    if (!admin || !admin.permissions) {
      return false;
    }
    return admin.permissions[permission] === true;
  }

  /**
   * Check if current admin is super admin
   * @returns {boolean} True if super admin
   */
  isSuperAdminRole() {
    const admin = this.getCurrentAdmin();
    return admin && admin.role === 'super_admin';
  }

  /**
   * Logout admin
   */
  logout() {
    this.currentAdmin = null;
    this.isAuthenticated = false;
    localStorage.removeItem('adminData');
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('authToken'); // Clear JWT token
    console.log('🔓 Admin logged out');
  }

  /**
   * Check if admin is authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return this.isAuthenticated && this.getCurrentAdmin() !== null;
  }
}

// Create singleton instance
const adminAuthService = new AdminAuthService();

export default adminAuthService;
