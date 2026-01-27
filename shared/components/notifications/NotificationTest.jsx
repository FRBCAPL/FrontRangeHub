import React, { useState } from 'react';
import notificationService from '@shared/services/services/notificationService';
import './NotificationTest.css';

const NotificationTest = () => {
  const [status, setStatus] = useState(null);

  const checkStatus = () => {
    setStatus(notificationService.getStatus());
  };

  const testNotification = () => {
    notificationService.showNotification(
      '🎯 Test Notification',
      'This is a test notification from the Front Range Pool Hub!',
      { requireInteraction: true }
    );
  };

  const testChallengeNotification = () => {
    const mockChallenge = {
      _id: 'test-challenge-123',
      challenger: {
        firstName: 'John',
        lastName: 'Smith'
      },
      challengeType: 'challenge',
      matchDetails: {
        entryFee: 5,
        raceLength: 5,
        gameType: '8-ball',
        location: 'Legends Brews & Cues'
      }
    };
    
    notificationService.showChallengeNotification(mockChallenge);
  };

  const testCounterProposalNotification = () => {
    const mockChallenge = {
      _id: 'test-counter-123',
      defender: {
        firstName: 'Sarah',
        lastName: 'Wilson'
      },
      challengeType: 'challenge'
    };
    
    notificationService.showCounterProposalNotification(mockChallenge);
  };

  const requestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setStatus(notificationService.getStatus());
    console.log('Permission granted:', granted);
  };

  return (
    <div className="notification-test">
      <h3>🔔 Notification Test Panel</h3>
      
      <div className="test-controls">
        <button onClick={checkStatus} className="test-btn">
          Check Status
        </button>
        
        <button onClick={requestPermission} className="test-btn primary">
          Request Permission
        </button>
        
        <button onClick={testNotification} className="test-btn">
          Test Basic Notification
        </button>
        
        <button onClick={testChallengeNotification} className="test-btn">
          Test Challenge Notification
        </button>
        
        <button onClick={testCounterProposalNotification} className="test-btn">
          Test Counter-Proposal Notification
        </button>
      </div>

      {status && (
        <div className="status-display">
          <h4>Notification Status:</h4>
          <ul>
            <li><strong>Supported:</strong> {status.isSupported ? '✅ Yes' : '❌ No'}</li>
            <li><strong>Permission:</strong> {status.permission}</li>
            <li><strong>Enabled:</strong> {status.isEnabled ? '✅ Yes' : '❌ No'}</li>
            <li><strong>Can Request:</strong> {status.canRequest ? '✅ Yes' : '❌ No'}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationTest;
