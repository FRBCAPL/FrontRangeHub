import React, { useState, useEffect } from 'react';
import { createSecureHeaders } from '../../utils/security';
import './EmailManager.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

const EmailManager = ({ userPin }) => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [emailType, setEmailType] = useState('test');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageStatus, setMessageStatus] = useState('');
  const [error, setError] = useState(null);

  // Error boundary for the component
  if (error) {
    return (
      <div className="emailManager">
        <div className="header">
          <h2>📧 Email Manager</h2>
          <p>Error loading email manager</p>
        </div>
        <div className="message error">
          Error: {error.message}
        </div>
        <button onClick={() => setError(null)}>Try Again</button>
      </div>
    );
  }

  // Email templates
  const emailTemplates = {
    test: {
      name: 'Test Email',
      subject: 'Test Email from Ladder Admin',
      template: 'This is a test email to verify the email system is working correctly.'
    },
    matchApproval: {
      name: 'Match Approval',
      subject: '🎉 Match Request Approved!',
      template: `Hi [PLAYER_NAME],

Great news! Your match scheduling request has been approved.

Match Details:
- Opponent: [OPPONENT_NAME]
- Date: [MATCH_DATE]
- Time: [MATCH_TIME]
- Location: [LOCATION]

What's Next?
- Mark your calendar for the match date
- Arrive at the location on time
- Contact your opponent if needed
- Play your best game!

Good luck with your match! 🎱
Front Range Pool Hub - Ladder of Legends`
    },
    matchScheduled: {
      name: 'Match Scheduled',
      subject: '🎱 Match Scheduled - You\'re Playing!',
      template: `Hi [PLAYER_NAME],

A match has been scheduled and you're playing! Here are the details:

Match Details:
- Opponent: [OPPONENT_NAME]
- Date: [MATCH_DATE]
- Time: [MATCH_TIME]
- Location: [LOCATION]

What's Next?
- Mark your calendar for the match date
- Arrive at the location on time
- Contact your opponent if you need to reschedule
- Play your best game!

Good luck with your match! 🎱
Front Range Pool Hub - Ladder of Legends`
    },
    allLadderEmails: {
      name: '🧪 Test ALL Ladder Emails',
      subject: '🧪 Test: All Ladder System Emails',
      template: 'This will send test versions of ALL ladder system emails to your email address for review.\n\nIncluding:\n- Match Scheduling (Approval, Rejection, Defender Notification, Don\'s Business Email)\n- Challenge System (Challenge Notification, Challenge Confirmation, Counter Proposals)\n- Account Management (Ladder Application Approval)\n- Total: 8 different email types'
    },
    challengeNotification: {
      name: 'Challenge Notification',
      subject: '⚔️ Challenge Received!',
      template: `Hi [PLAYER_NAME],

[CHALLENGER_NAME] has challenged you to a match! Here are the details:

Ladder Positions:
- [CHALLENGER_NAME] (Position [CHALLENGER_POSITION]) vs You (Position [DEFENDER_POSITION])
- [LADDER_NAME] Ladder

Match Details:
- Challenge Type: [CHALLENGE_TYPE]
- Entry Fee: $[ENTRY_FEE]
- Race Length: [RACE_LENGTH]
- Game Type: [GAME_TYPE]
- Table Size: [TABLE_SIZE]
- Location: [LOCATION]

Preferred Match Dates:
[DATES_LIST]

Message from [CHALLENGER_NAME]:
"[MESSAGE]"

You have 48 hours to respond to this challenge.

Good luck! 🎱
Front Range Pool Hub - Ladder of Legends`
    },
    challengeConfirmation: {
      name: 'Challenge Confirmation',
      subject: '🎉 Challenge Accepted - Match Confirmed!',
      template: `Hi [PLAYER_NAME],

Great news! Your challenge has been accepted and the match is confirmed.

Match Details:
- Opponent: [OPPONENT_NAME]
- Challenge Type: [CHALLENGE_TYPE]
- Entry Fee: $[ENTRY_FEE]
- Race Length: [RACE_LENGTH]
- Game Type: [GAME_TYPE]
- Table Size: [TABLE_SIZE]
- Location: [LOCATION]
- Match Date: [MATCH_DATE]

What's Next?
- Mark your calendar for the match date
- Arrive at the location on time
- Contact your opponent if needed
- Play your best game!

Good luck with your match! 🎱
Front Range Pool Hub - Ladder of Legends`
    },
    counterProposal: {
      name: 'Counter Proposal',
      subject: '🔄 Counter-Proposal from [FROM_NAME]',
      template: `Hi [PLAYER_NAME],

[FROM_NAME] has sent you a counter-proposal for your challenge.

Original Challenge:
- Challenge Type: [CHALLENGE_TYPE]
- Entry Fee: $[ENTRY_FEE]
- Race Length: [RACE_LENGTH]

Counter-Proposal:
- New Entry Fee: $[NEW_ENTRY_FEE]
- New Race Length: [NEW_RACE_LENGTH]
- Message: "[MESSAGE]"

Please review the counter-proposal and respond accordingly.

Good luck! 🎱
Front Range Pool Hub - Ladder of Legends`
    },
    ladderApproval: {
      name: 'Ladder Position Approval',
      subject: '🎉 Ladder Position Approved!',
      template: `Hi [PLAYER_NAME],

Congratulations! Your ladder position claim has been approved.

Position Details:
- Ladder: [LADDER_NAME]
- Position: #[POSITION]
- Your PIN: [PIN]

You can now:
- View the ladder standings
- Challenge other players (with membership)
- Report match results (with membership)

Login URL: [LOGIN_URL]

Welcome to the ladder! 🎱
Front Range Pool Hub - Ladder of Legends`
    },
    custom: {
      name: 'Custom Message',
      subject: '',
      template: ''
    }
  };

  useEffect(() => {
    if (userPin) {
      loadPlayers();
    }
  }, [userPin]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/ladder/players`, {
        headers: createSecureHeaders(userPin)
      });

      if (response.ok) {
        const data = await response.json();
        setPlayers(data || []);
      } else {
        setMessageStatus('Error loading players');
      }
    } catch (error) {
      console.error('Error loading players:', error);
      setError(error);
      setMessageStatus('Error loading players');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateKey) => {
    setEmailType(templateKey);
    const template = emailTemplates[templateKey];
    setSubject(template.subject);
    setMessage(template.template);
  };

  const handlePlayerSelect = (playerId) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  const selectAllPlayers = () => {
    setSelectedPlayers(players.map(player => player._id));
  };

  const clearSelection = () => {
    setSelectedPlayers([]);
  };

  const sendEmail = async () => {
    // Special handling for "Test ALL Ladder Emails"
    if (emailType === 'allLadderEmails') {
      await sendAllLadderTestEmails();
      return;
    }

    if (!recipientEmail && selectedPlayers.length === 0) {
      setMessageStatus('Please select recipients or enter an email address');
      return;
    }

    if (!subject.trim()) {
      setMessageStatus('Please enter a subject');
      return;
    }

    if (!message.trim()) {
      setMessageStatus('Please enter a message');
      return;
    }

    try {
      setLoading(true);
      setMessageStatus('');

      const emailData = {
        emailType,
        subject: subject.trim(),
        message: message.trim(),
        recipientEmail: recipientEmail.trim() || null,
        selectedPlayers: selectedPlayers.length > 0 ? selectedPlayers : null,
        players: selectedPlayers.length > 0 ? players.filter(p => selectedPlayers.includes(p._id)) : []
      };

      const response = await fetch(`${BACKEND_URL}/api/admin/send-email`, {
        method: 'POST',
        headers: {
          ...createSecureHeaders(userPin),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();

      if (result.success) {
        setMessageStatus(`✅ Email sent successfully! ${result.emailsSent} email(s) sent.`);
        // Clear form
        setRecipientEmail('');
        setSelectedPlayers([]);
        setSubject('');
        setMessage('');
      } else {
        setMessageStatus(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setMessageStatus('❌ Error sending email');
    } finally {
      setLoading(false);
    }
  };

  const sendAllLadderTestEmails = async () => {
    if (!recipientEmail) {
      setMessageStatus('Please enter an email address to receive the test emails');
      return;
    }

    try {
      setLoading(true);
      setMessageStatus('Sending all ladder test emails...');

      const response = await fetch(`${BACKEND_URL}/api/match-scheduling/test-emails`, {
        method: 'POST',
        headers: {
          ...createSecureHeaders(userPin),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testEmail: recipientEmail
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessageStatus(`✅ All ladder test emails sent successfully! Check ${recipientEmail} for the test emails.`);
        // Clear form
        setRecipientEmail('');
        setSelectedPlayers([]);
        setSubject('');
        setMessage('');
      } else {
        setMessageStatus(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error sending all ladder test emails:', error);
      setMessageStatus('❌ Error sending test emails');
    } finally {
      setLoading(false);
    }
  };

  const getRecipientCount = () => {
    if (recipientEmail) return 1;
    return selectedPlayers.length;
  };

  return (
    <div className="emailManager">
      <div className="header">
        <h2>📧 Email Manager</h2>
        <p>Send test emails, player notifications, and mass mailings</p>
      </div>

      {messageStatus && (
        <div className={`message ${messageStatus.includes('✅') ? 'success' : 'error'}`}>
          {messageStatus}
        </div>
      )}

      <div className="emailForm">
        {/* Email Type Selection */}
        <div className="formGroup">
          <label>Email Type:</label>
          <select 
            value={emailType} 
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="select"
          >
            {Object.entries(emailTemplates).map(([key, template]) => (
              <option key={key} value={key}>{template.name}</option>
            ))}
          </select>
        </div>

        {/* Recipients */}
        <div className="recipientsSection">
          <h3>Recipients</h3>
          
          {/* Direct Email Input */}
          <div className="formGroup">
            <label>Send to specific email address:</label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="Enter email address (e.g., test@example.com)"
              className="input"
            />
          </div>

          {/* Player Selection */}
          <div className="playerSelection">
            <div className="playerSelectionHeader">
              <h4>Or select players:</h4>
              <div className="playerActions">
                <button onClick={selectAllPlayers} className="actionBtn">
                  Select All
                </button>
                <button onClick={clearSelection} className="actionBtn">
                  Clear All
                </button>
              </div>
            </div>

            <div className="playersList">
              {players.length > 0 ? (
                players.map(player => (
                  <div key={player._id} className="playerItem">
                    <label className="playerLabel">
                      <input
                        type="checkbox"
                        checked={selectedPlayers.includes(player._id)}
                        onChange={() => handlePlayerSelect(player._id)}
                        className="checkbox"
                      />
                      <span className="playerName">
                        {player.firstName} {player.lastName}
                      </span>
                      <span className="playerEmail">
                        {player.email || player.unifiedAccount?.email || 'No email'}
                      </span>
                    </label>
                  </div>
                ))
              ) : (
                <div className="playerItem">
                  <p>No players loaded. You can still send emails to specific addresses.</p>
                </div>
              )}
            </div>
          </div>

          <div className="recipientCount">
            <strong>Total Recipients: {getRecipientCount()}</strong>
          </div>
        </div>

        {/* Email Content */}
        <div className="formGroup">
          <label>Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input"
            placeholder="Email subject"
          />
        </div>

        <div className="formGroup">
          <label>Message:</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="textarea"
            rows={10}
            placeholder="Email message content"
          />
        </div>

        {/* Send Button */}
        <div className="sendSection">
          <button
            onClick={sendEmail}
            disabled={loading || getRecipientCount() === 0}
            className="sendBtn"
          >
            {loading ? 'Sending...' : `📧 Send Email${getRecipientCount() > 1 ? 's' : ''} (${getRecipientCount()})`}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quickActions">
        <h3>Quick Actions</h3>
        <div className="actionButtons">
          <button 
            onClick={() => {
              setEmailType('test');
              setRecipientEmail('sslampro@gmail.com');
              handleTemplateChange('test');
            }}
            className="quickBtn"
          >
            🧪 Send Test Email
          </button>
          <button 
            onClick={() => {
              setEmailType('custom');
              setRecipientEmail('sacodo752@gmail.com');
              setSubject('Business Update');
              setMessage('Hello Don,\n\nThis is a business update from the ladder system.\n\nBest regards,\nAdmin');
            }}
            className="quickBtn"
          >
            📋 Send to Don
          </button>
          <button 
            onClick={() => {
              setEmailType('custom');
              selectAllPlayers();
              setSubject('Important Ladder Update');
              setMessage('Hello Players,\n\nThis is an important update about the ladder system.\n\nThank you,\nAdmin');
            }}
            className="quickBtn"
          >
            📢 Mass Email All Players
          </button>
          <button 
            onClick={() => {
              setEmailType('allLadderEmails');
              setRecipientEmail('sslampro@gmail.com');
              setSubject('🧪 Test: All Ladder System Emails');
              setMessage('This will send test versions of ALL ladder system emails to your email address for review.\n\nIncluding:\n- Match Scheduling (Approval, Rejection, Defender Notification, Don\'s Business Email)\n- Challenge System (Challenge Notification, Challenge Confirmation, Counter Proposals)\n- Account Management (Ladder Application Approval)\n- Total: 8 different email types');
            }}
            className="quickBtn"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
          >
            🧪 Test ALL Ladder Emails
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailManager;
