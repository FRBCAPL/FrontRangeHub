import React, { useState, useEffect, useRef } from 'react';
import styles from './DirectMessagingModal.module.css';
import DraggableModal from '@shared/components/modal/modal/DraggableModal';
import { BACKEND_URL } from '@shared/config/config.js';

console.log('DirectMessagingModal BACKEND_URL in use:', BACKEND_URL);

export default function DirectMessagingModal({ userName, userEmail, userPin, selectedDivision, opponentEmails = [], onClose }) {
  console.log('Opponent Emails:', opponentEmails);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [players, setPlayers] = useState([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch all players for new conversations
  useEffect(() => {
    async function loadPlayers() {
      try {
        const response = await fetch(`${BACKEND_URL}/api/users`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setPlayers(data.filter(player => player.email !== userEmail));
        }
      } catch (err) {
        console.error('Failed to load players:', err);
      }
    }
    loadPlayers();
  }, [userEmail]);

  // Fetch conversations
  useEffect(() => {
    async function loadConversations() {
      setLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/messages/conversations?user=${encodeURIComponent(userEmail)}`);
        const data = await response.json();
        console.log('Conversations fetch data:', data);
        if (Array.isArray(data)) {
          setConversations(data);
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    }
    loadConversations();
  }, [userEmail]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/messages?user1=${encodeURIComponent(userEmail)}&user2=${encodeURIComponent(selectedConversation.email)}`
        );
        const data = await response.json();
        if (Array.isArray(data)) {
          setMessages(data);
          // Mark messages as read
          data.forEach(msg => {
            if (msg.receiverEmail === userEmail && !msg.read) {
              fetch(`${BACKEND_URL}/api/messages/${msg._id}/read`, { method: 'PUT' });
            }
          });
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
        setError('Failed to load messages');
      }
    }
    loadMessages();
  }, [selectedConversation, userEmail]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send a message
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    setSending(true);
    setError('');
    // Ensure we have a receiver email
    let receiverEmail = selectedConversation.email;
    if (!receiverEmail) {
      // Try to look up by name
      const found = players.find(p => p.name === selectedConversation.name && p.email);
      if (found) {
        receiverEmail = found.email;
      }
    }
    console.log('Sending message to:', receiverEmail);
    if (!receiverEmail) {
      setError('No email found for selected opponent.');
      setSending(false);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail: userEmail,
          receiverEmail,
          content: newMessage,
        }),
      });
      console.log('Send response:', res);
      if (!res.ok) throw new Error('Failed to send message');
      setNewMessage('');
      // Refetch messages
      const response = await fetch(
        `${BACKEND_URL}/api/messages?user1=${encodeURIComponent(userEmail)}&user2=${encodeURIComponent(receiverEmail)}`
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Start new conversation
  const handleStartConversation = async () => {
    if (!selectedPlayer) return;
    setSelectedConversation(selectedPlayer);
    setShowNewConversation(false);
    setSelectedPlayer(null);
  };

  // Get unread count for a conversation
  const getUnreadCount = (conversation) => {
    return conversation.unreadCount || 0;
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Filter and sort players by division, opponentEmails, and name
  const filteredPlayers = players
    .filter(player => {
      // Only show opponents if opponentEmails is provided and non-empty
      if (opponentEmails.length > 0) {
        return opponentEmails.includes(player.name);
      }
      // Support both string and array for player.divisions
      if (!selectedDivision) return true;
      if (Array.isArray(player.divisions)) {
        return player.divisions.includes(selectedDivision);
      } else if (typeof player.divisions === 'string') {
        return player.divisions.split(',').map(s => s.trim()).includes(selectedDivision);
      }
      return false;
    })
    .sort((a, b) => {
      const nameA = `${a.name || ''}`.trim().toLowerCase();
      const nameB = `${b.name || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Direct Messages</h2>
        <div className={styles.headerButtons}>
          <button
            className={styles.newChatButton}
            onClick={() => setShowNewConversation(true)}
            type="button"
          >
            💬 New Chat
          </button>
          <button
            className={styles.closeButton}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Conversations List */}
        <div className={styles.conversationsList}>
          <h3>Conversations</h3>
          {loading ? (
            <div className={styles.loading}>Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No conversations yet</p>
              <button
                className={styles.startChatButton}
                onClick={() => setShowNewConversation(true)}
                type="button"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            <div className={styles.conversationItems}>
              {conversations.map((conversation) => (
                <div
                  key={conversation.email}
                  className={`${styles.conversationItem} ${
                    selectedConversation?.email === conversation.email ? styles.active : ''
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationName}>
                      {conversation.name || conversation.email}
                    </div>
                    <div className={styles.lastMessage}>
                      {conversation.lastMessage || 'No messages yet'}
                    </div>
                  </div>
                  <div className={styles.conversationMeta}>
                    <div className={styles.timestamp}>
                      {conversation.lastMessageTime ? formatTime(conversation.lastMessageTime) : ''}
                    </div>
                    {getUnreadCount(conversation) > 0 && (
                      <div className={styles.unreadBadge}>
                        {getUnreadCount(conversation)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className={styles.messagesArea}>
          {selectedConversation ? (
            <>
              <div className={styles.messagesHeader}>
                <h3>Chat with {selectedConversation.name || selectedConversation.email}</h3>
              </div>
              <div className={styles.messagesList}>
                {messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`${styles.messageItem} ${
                      msg.senderEmail === userEmail ? styles.myMessage : styles.theirMessage
                    }`}
                  >
                    <div className={styles.messageBubble}>
                      <div className={styles.messageContent}>{msg.content}</div>
                      <div className={styles.messageTime}>
                        {formatTime(msg.timestamp)}
                        {msg.senderEmail === userEmail && (
                          <span className={styles.readStatus}>
                            {msg.read ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className={styles.messageInput}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  className={styles.sendButton}
                  type="button"
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className={styles.noConversation}>
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <DraggableModal
          open={showNewConversation}
          onClose={() => {
            setShowNewConversation(false);
            setSelectedPlayer(null);
          }}
          title="Start New Conversation"
          maxWidth="400px"
        >
          <button
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: 24,
              cursor: 'pointer',
              zIndex: 10001
            }}
            onClick={() => {
              setShowNewConversation(false);
              setSelectedPlayer(null);
            }}
            aria-label="Close"
            type="button"
          >
            ×
          </button>
          <div className={styles.playerList}>
            {filteredPlayers.map((player) => (
              <div
                key={player._id || player.email}
                className={`${styles.playerItem} ${
                  selectedPlayer?.email === player.email ? styles.selected : ''
                }`}
                onClick={() => setSelectedPlayer(player)}
              >
                <div className={styles.playerName}>
                  {player.name ? player.name : player.email}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.modalActions}>
            <button
              onClick={() => {
                setShowNewConversation(false);
                setSelectedPlayer(null);
              }}
              className={styles.cancelButton}
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleStartConversation}
              disabled={!selectedPlayer}
              className={styles.startButton}
              type="button"
            >
              Start Chat
            </button>
          </div>
        </DraggableModal>
      )}

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
