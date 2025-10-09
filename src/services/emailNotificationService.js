/**
 * Email Notification Service
 * Integrates with the Nodemailer backend to send email notifications
 * Works with Supabase data
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

class EmailNotificationService {
  /**
   * Send challenge notification email when someone is challenged
   */
  async sendChallengeNotification(challengeData) {
    try {
      const emailData = {
        to_email: challengeData.defenderEmail,
        to_name: challengeData.defenderName,
        from_name: challengeData.challengerName,
        challenger_position: challengeData.challengerPosition,
        defender_position: challengeData.defenderPosition,
        ladder_name: challengeData.ladderName,
        challenge_type: challengeData.matchType || 'Standard',
        entry_fee: challengeData.entryFee || 5,
        race_length: challengeData.raceLength || 'Race to 7',
        game_type: challengeData.gameType || '9-ball',
        proposed_date: challengeData.proposedDate,
        proposed_location: challengeData.proposedLocation,
        expires_at: challengeData.expiresAt,
        message: challengeData.message || ''
      };

      const response = await fetch(`${BACKEND_URL}/api/email/send-challenge-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();
      console.log('📧 Challenge notification email sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending challenge notification email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send challenge accepted confirmation email
   */
  async sendChallengeAccepted(challengeData) {
    try {
      const emailData = {
        to_email: challengeData.challengerEmail,
        to_name: challengeData.challengerName,
        from_name: challengeData.defenderName,
        challenger_position: challengeData.challengerPosition,
        defender_position: challengeData.defenderPosition,
        ladder_name: challengeData.ladderName,
        match_date: challengeData.matchDate,
        match_location: challengeData.location,
        game_type: challengeData.gameType || '9-ball',
        race_length: challengeData.raceLength || 'Race to 7'
      };

      const response = await fetch(`${BACKEND_URL}/api/email/send-challenge-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();
      console.log('📧 Challenge accepted email sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending challenge accepted email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send challenge declined email
   */
  async sendChallengeDeclined(challengeData) {
    try {
      const emailData = {
        to_email: challengeData.challengerEmail,
        to_name: challengeData.challengerName,
        from_name: challengeData.defenderName,
        challenger_position: challengeData.challengerPosition,
        defender_position: challengeData.defenderPosition,
        ladder_name: challengeData.ladderName,
        decline_reason: challengeData.declineReason || 'No reason provided'
      };

      const response = await fetch(`${BACKEND_URL}/api/email/send-challenge-decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();
      console.log('📧 Challenge declined email sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending challenge declined email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send counter-proposal email
   */
  async sendCounterProposal(challengeData) {
    try {
      const emailData = {
        to_email: challengeData.challengerEmail,
        to_name: challengeData.challengerName,
        from_name: challengeData.defenderName,
        original_date: challengeData.originalDate,
        original_location: challengeData.originalLocation,
        counter_date: challengeData.counterDate,
        counter_location: challengeData.counterLocation,
        ladder_name: challengeData.ladderName,
        message: challengeData.message || ''
      };

      const response = await fetch(`${BACKEND_URL}/api/email/send-counter-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();
      console.log('📧 Counter-proposal email sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending counter-proposal email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send match completed notification
   */
  async sendMatchCompleted(matchData) {
    try {
      const emailData = {
        to_email: matchData.loserEmail,
        player_name: matchData.loserName,
        opponent_name: matchData.winnerName,
        match_date: matchData.matchDate,
        location: matchData.location,
        score: matchData.score,
        ladder_name: matchData.ladderName,
        new_position: matchData.newPosition
      };

      const response = await fetch(`${BACKEND_URL}/api/email/send-match-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();
      console.log('📧 Match completed email sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending match completed email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send match reminder email
   */
  async sendMatchReminder(matchData) {
    try {
      const emailData = {
        to_email: matchData.playerEmail,
        to_name: matchData.playerName,
        opponent_name: matchData.opponentName,
        match_date: matchData.matchDate,
        match_time: matchData.matchTime,
        location: matchData.location,
        ladder_name: matchData.ladderName
      };

      const response = await fetch(`${BACKEND_URL}/api/email/send-match-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();
      console.log('📧 Match reminder email sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending match reminder email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send ladder application approved email
   */
  async sendLadderApproval(userData) {
    try {
      const emailData = {
        to_email: userData.email,
        to_name: `${userData.firstName} ${userData.lastName}`,
        pin: userData.pin || 'Check your profile',
        ladder_name: userData.ladderName,
        position: userData.position
      };

      const response = await fetch(`${BACKEND_URL}/api/email/send-ladder-approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();
      console.log('📧 Ladder approval email sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending ladder approval email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminder(userData) {
    try {
      // This would need a new backend endpoint
      // For now, we can use a generic admin email or create this endpoint
      console.log('📧 Payment reminder not yet implemented');
      return { success: false, error: 'Not implemented yet' };
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const emailNotificationService = new EmailNotificationService();
export default emailNotificationService;

