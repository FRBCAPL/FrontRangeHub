/**
 * Browser Notification Service for Front Range Pool Hub
 * Handles all browser notification functionality for the ladder system
 */

class NotificationService {
  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
    this.isEnabled = false;
  }

  /**
   * Request permission for notifications
   * @returns {Promise<boolean>} - True if permission granted
   */
  async requestPermission() {
    if (!this.isSupported) {
      console.warn('Browser notifications are not supported');
      return false;
    }

    if (this.permission === 'granted') {
      this.isEnabled = true;
      return true;
    }

    if (this.permission === 'denied') {
      console.warn('Notification permission was denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      this.isEnabled = permission === 'granted';
      
      if (this.isEnabled) {
        console.log('✅ Notification permission granted');
        // Store preference in localStorage
        localStorage.setItem('notificationsEnabled', 'true');
      } else {
        console.log('❌ Notification permission denied');
        localStorage.setItem('notificationsEnabled', 'false');
      }
      
      return this.isEnabled;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled
   * @returns {boolean}
   */
  isNotificationEnabled() {
    if (!this.isSupported) return false;
    
    // Check localStorage preference
    const stored = localStorage.getItem('notificationsEnabled');
    if (stored === 'true' && this.permission === 'granted') {
      this.isEnabled = true;
      return true;
    }
    
    return this.isEnabled;
  }

  /**
   * Show a notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body text
   * @param {Object} options - Additional notification options
   */
  showNotification(title, body, options = {}) {
    if (!this.isNotificationEnabled()) {
      console.log('Notifications not enabled, skipping:', title);
      return null;
    }

    try {
      const notification = new Notification(title, {
        body: body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag || 'ladder-notification',
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        data: options.data || {}
      });

      // Auto-close after 5 seconds unless it requires interaction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Handle click to focus window
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Navigate to specific page if data contains route
        if (options.data && options.data.route) {
          // This will be handled by the calling component
          if (options.onClick) {
            options.onClick(options.data);
          }
        }
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Show challenge notification
   * @param {Object} challengeData - Challenge information
   */
  showChallengeNotification(challengeData) {
    const { challenger, challengeType, matchDetails } = challengeData;
    const title = `🎯 New Challenge!`;
    const body = `${challenger.firstName} ${challenger.lastName} challenged you to a ${challengeType} match!`;
    
    return this.showNotification(title, body, {
      tag: `challenge-${challengeData._id}`,
      requireInteraction: true,
      data: {
        type: 'challenge',
        challengeId: challengeData._id,
        route: '/ladder'
      }
    });
  }

  /**
   * Show challenge acceptance notification
   * @param {Object} challengeData - Challenge information
   */
  showChallengeAcceptedNotification(challengeData) {
    const { defender, challengeType } = challengeData;
    const title = `✅ Challenge Accepted!`;
    const body = `${defender.firstName} ${defender.lastName} accepted your ${challengeType} challenge!`;
    
    return this.showNotification(title, body, {
      tag: `challenge-accepted-${challengeData._id}`,
      data: {
        type: 'challenge-accepted',
        challengeId: challengeData._id,
        route: '/ladder'
      }
    });
  }

  /**
   * Show challenge declined notification
   * @param {Object} challengeData - Challenge information
   */
  showChallengeDeclinedNotification(challengeData) {
    const { defender, challengeType } = challengeData;
    const title = `❌ Challenge Declined`;
    const body = `${defender.firstName} ${defender.lastName} declined your ${challengeType} challenge.`;
    
    return this.showNotification(title, body, {
      tag: `challenge-declined-${challengeData._id}`,
      data: {
        type: 'challenge-declined',
        challengeId: challengeData._id,
        route: '/ladder'
      }
    });
  }

  /**
   * Show counter-proposal notification
   * @param {Object} challengeData - Challenge information
   */
  showCounterProposalNotification(challengeData) {
    const { defender, challengeType } = challengeData;
    const title = `🔄 Counter-Proposal!`;
    const body = `${defender.firstName} ${defender.lastName} submitted a counter-proposal to your ${challengeType} challenge!`;
    
    return this.showNotification(title, body, {
      tag: `counter-proposal-${challengeData._id}`,
      requireInteraction: true,
      data: {
        type: 'counter-proposal',
        challengeId: challengeData._id,
        route: '/ladder'
      }
    });
  }

  /**
   * Show match reminder notification
   * @param {Object} matchData - Match information
   */
  showMatchReminderNotification(matchData) {
    const { player1, player2, matchDate, location } = matchData;
    const title = `📅 Match Reminder`;
    const body = `Your match between ${player1.firstName} ${player1.lastName} and ${player2.firstName} ${player2.lastName} is coming up!`;
    
    return this.showNotification(title, body, {
      tag: `match-reminder-${matchData._id}`,
      data: {
        type: 'match-reminder',
        matchId: matchData._id,
        route: '/ladder'
      }
    });
  }

  /**
   * Show ladder position update notification
   * @param {Object} positionData - Position update information
   */
  showLadderUpdateNotification(positionData) {
    const { oldPosition, newPosition, ladderName } = positionData;
    const title = `📈 Ladder Update!`;
    const body = `You moved from position ${oldPosition} to position ${newPosition} on the ${ladderName} ladder!`;
    
    return this.showNotification(title, body, {
      tag: `ladder-update-${Date.now()}`,
      data: {
        type: 'ladder-update',
        route: '/ladder'
      }
    });
  }

  /**
   * Disable notifications
   */
  disableNotifications() {
    this.isEnabled = false;
    localStorage.setItem('notificationsEnabled', 'false');
    console.log('Notifications disabled');
  }

  /**
   * Enable notifications (if permission is granted)
   */
  async enableNotifications() {
    if (this.permission === 'granted') {
      this.isEnabled = true;
      localStorage.setItem('notificationsEnabled', 'true');
      console.log('Notifications enabled');
      return true;
    } else {
      return await this.requestPermission();
    }
  }

  /**
   * Get notification status
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      isSupported: this.isSupported,
      permission: this.permission,
      isEnabled: this.isEnabled,
      canRequest: this.permission === 'default'
    };
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
