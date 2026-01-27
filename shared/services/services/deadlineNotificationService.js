import { sendDeadlineReminderEmail } from '@shared/utils/utils/emailHelpers.js';
import { seasonService } from './seasonService.js';
import { format } from 'date-fns';

class DeadlineNotificationService {
  // Check if user needs deadline reminder and send email
  async checkAndSendDeadlineReminder(userEmail, userName, division) {
    try {
      // Get current season data
      const seasonResult = await seasonService.getCurrentSeason(division);
      if (!seasonResult?.season) {
        console.log('No current season found for division:', division);
        return;
      }

      const season = seasonResult.season;
      const now = new Date();
      const phase1End = new Date(season.phase1End);
      
      // Only send reminders during Phase 1
      if (now > phase1End) {
        console.log('Phase 1 deadline has passed, no reminder needed');
        return;
      }

      // Calculate days until deadline
      const daysUntilDeadline = Math.ceil((phase1End - now) / (1000 * 60 * 60 * 24));
      
      // Only send reminders at specific intervals
      const shouldSendReminder = this.shouldSendReminder(daysUntilDeadline);
      if (!shouldSendReminder) {
        return;
      }

      // Get user's match completion status
      const matchStatus = await this.getUserMatchStatus(userName, division);
      
      // Send reminder email
      await sendDeadlineReminderEmail({
        to_email: userEmail,
        to_name: userName,
        division,
        daysUntilDeadline,
        completedMatches: matchStatus.completedCount,
        totalRequiredMatches: matchStatus.totalRequired,
        deadlineDate: format(phase1End, 'EEEE, MMMM d, yyyy'),
        remainingMatches: matchStatus.remainingCount
      });

      console.log(`Deadline reminder sent to ${userName} for ${division}`);
      
    } catch (error) {
      console.error('Error sending deadline reminder:', error);
    }
  }

  // Determine if reminder should be sent based on days until deadline
  shouldSendReminder(daysUntilDeadline) {
    // Send reminders at: 7 days, 3 days, 1 day, and day of deadline
    const reminderDays = [7, 3, 1, 0];
    return reminderDays.includes(daysUntilDeadline);
  }

  // Get user's match completion status
  async getUserMatchStatus(userName, division) {
    try {
      // This would need to be implemented based on your match data structure
      // For now, returning mock data
      return {
        completedCount: 1, // This should come from actual match data
        totalRequired: 6,
        remainingCount: 5
      };
    } catch (error) {
      console.error('Error getting user match status:', error);
      return { completedCount: 0, totalRequired: 6, remainingCount: 6 };
    }
  }

  // Send bulk deadline reminders to all users in a division
  async sendBulkDeadlineReminders(division) {
    try {
      // This would need to fetch all users in the division
      // For now, this is a placeholder
      console.log(`Sending bulk deadline reminders for ${division}`);
      
      // You would iterate through all users and call checkAndSendDeadlineReminder
      // for each user in the division
      
    } catch (error) {
      console.error('Error sending bulk deadline reminders:', error);
    }
  }
}

export const deadlineNotificationService = new DeadlineNotificationService(); 