import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StreamChat } from "stream-chat";
import CustomChannelHeader from "@shared/components/CustomChannelHeader";
import CustomMessageUi from "@shared/components/CustomMessageUi";
import PoolSimulation from "@shared/components/PoolSimulation";
import AdminAnnouncementInput from "@shared/components/AdminAnnouncementInput";
import DivisionSelectorModal from '@shared/components/modal/modal/DivisionSelectorModal';

import styles from "./MatchChat.module.css";
import { BACKEND_URL } from '@shared/config/config.js';

// Try multiple ways to access the environment variable
const apiKey = import.meta.env.VITE_STREAM_API_KEY || 'nbvut8j4y6se';
console.log('🔑 Stream Chat API Key:', apiKey);
console.log('🔑 Environment variables:', import.meta.env);

// Debug: Check if API key is valid
if (!apiKey) {
  console.error('❌ VITE_STREAM_API_KEY is not set!');
  console.error('❌ Please check your .env file in the FrontEnd directory');
} else {
  console.log('✅ VITE_STREAM_API_KEY is set:', apiKey);
}
const API_BASE = BACKEND_URL;
const GENERAL_CHANNEL_ID = "general";
const ANNOUNCEMENTS_CHANNEL_ID = "announcements";

// Global flag to prevent multiple connections
let globalConnectionInProgress = false;

// Available divisions - this can be expanded as you add more divisions
const AVAILABLE_DIVISIONS = [
  "FRBCAPL TEST",
  "Singles Test"
];

// Channel categories for better organization
const CHANNEL_CATEGORIES = {
  GENERAL: "general",
  DIVISIONS: "divisions", 
  ANNOUNCEMENTS: "announcements",
  GAME_ROOMS: "game-rooms"
};

function cleanId(id) {
  return id.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

const ChannelNameOnlyPreview = ({ channel }) => (
  <div className={styles.channelNamePreview}>
    {channel.data?.name || channel.id}
  </div>
);

function getPinnedChannels() {
  return JSON.parse(localStorage.getItem("pinnedChannels") || "[]");
}
function setPinnedChannels(ids) {
  localStorage.setItem("pinnedChannels", JSON.stringify(ids));
}

const PinIcon = ({ pinned, onClick }) => (
  <span
    onClick={onClick}
    className={`${styles.pinIcon}${pinned ? " " + styles.pinned : ""}`}
    title={pinned ? "Unpin channel" : "Pin channel"}
  >
    {pinned ? "📌" : "📍"}
  </span>
);

const SectionHeader = ({ children, icon, sectionKey, isCollapsed, onToggle }) => (
  <div 
    className={`${styles.sectionHeader} ${isCollapsed ? styles.collapsed : ''}`}
    onClick={() => onToggle(sectionKey)}
  >
    {icon && <span style={{ marginRight: '8px' }}>{icon}</span>}
    {children}
  </div>
);

export default function MatchChat({ userName, userEmail, userPin, channelId, onClose }) {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatClient, setChatClient] = useState(null);
  const [generalChannel, setGeneralChannel] = useState(null);
  const [announcementsChannel, setAnnouncementsChannel] = useState(null);
  const [divisionChannels, setDivisionChannels] = useState({});
  const [gameRoomChannels, setGameRoomChannels] = useState([]);
  const [channel, setChannel] = useState(null);
  const [pinnedIds, setPinnedIds] = useState(getPinnedChannels());
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [showDivisionSelector, setShowDivisionSelector] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(1800);
  const [channelSearch, setChannelSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState({
    announcements: false, // false = expanded
    divisions: false,     // false = expanded  
    gameRooms: false      // false = expanded
  });

  useEffect(() => {
    if (secondsLeft <= 0) {
      logoutAndRedirect();
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  // Initialize chat client and create channels
  useEffect(() => {
    // Use global flag to prevent multiple simultaneous initializations
    if (globalConnectionInProgress) {
      return;
    }
    
    globalConnectionInProgress = true;
    // Use the API key from the backend instead of the frontend
    // The frontend API key might not be valid for client-side usage
    let client = StreamChat.getInstance(apiKey);
    console.log('🔑 Using API key for Stream Chat client:', apiKey);
    let didConnect = false;
    let isMounted = true;

    async function init() {
      try {
        // Check if already connected
        if (client.userID) {
          try {
            await client.disconnectUser();
          } catch (disconnectError) {
            // Ignore disconnect errors
          }
        }

        // Add a small delay to ensure disconnect completes
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const userId = cleanId(userEmail);
        const response = await fetch(`${API_BASE}/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        
        const { token, userId: actualUserId } = await response.json();

        await client.connectUser(
          {
            id: actualUserId,
            name: userName,
            email: userEmail,
          },
          token
        );
        
        didConnect = true;
        if (!isMounted) return;

        setChatClient(client);

        // Create or get general channel
        const general = client.channel("messaging", GENERAL_CHANNEL_ID, {
          name: "General Chat",
          description: "General discussion for all players"
        });
        
        // Try to watch the channel with retry and better error handling
        let retryCount = 0;
        let generalLoaded = false;
        while (retryCount < 3 && !generalLoaded) {
          try {
            await general.watch({ limit: 100 }); // Increased limit to load more messages
            generalLoaded = true;
            console.log('Successfully loaded general channel with', general.state.messages?.length || 0, 'messages');
          } catch (error) {
            retryCount++;
            console.log(`Retry ${retryCount} for general channel:`, error.message);
            if (retryCount >= 3) {
              console.error('Failed to load general channel after 3 retries, but continuing...');
              // Continue anyway - the channel might still work
              generalLoaded = true;
            } else {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        // Create or get announcements channel
        const announcements = client.channel("messaging", ANNOUNCEMENTS_CHANNEL_ID, {
          name: "📢 Announcements",
          description: "Important announcements and updates"
        });
        try {
          await announcements.watch({ limit: 100 });
          console.log('Successfully loaded announcements channel with', announcements.state.messages?.length || 0, 'messages');
        } catch (error) {
          console.error('Error loading announcements channel:', error);
          // Continue anyway - the channel might still work
        }

        // Create division-specific channels
        const divisionChannelsObj = {};
        for (const division of AVAILABLE_DIVISIONS) {
          const divisionId = cleanId(division);
          const divisionChannel = client.channel("messaging", `division-${divisionId}`, {
            name: `🏆 ${division}`,
            description: `Discussion for ${division} players`,
            category: CHANNEL_CATEGORIES.DIVISIONS
          });
          try {
            await divisionChannel.watch({ limit: 100 });
            divisionChannelsObj[division] = divisionChannel;
            console.log(`Successfully loaded division channel ${division} with`, divisionChannel.state.messages?.length || 0, 'messages');
          } catch (error) {
            console.error(`Error loading division channel ${division}:`, error);
            // Continue anyway - the channel might still work
            divisionChannelsObj[division] = divisionChannel;
          }
        }

        // Create game room channels
        const gameRooms = [];
        for (let i = 1; i <= 5; i++) {
          const gameRoomId = `game-room-${i}`;
          const gameRoom = client.channel("messaging", gameRoomId, {
            name: `🎮 Game Room ${i}`,
            description: `Multiplayer game room ${i} - for future online play`,
            category: CHANNEL_CATEGORIES.GAME_ROOMS
          });
          try {
            await gameRoom.watch({ limit: 100 });
            gameRooms.push(gameRoom);
            console.log(`Successfully loaded game room ${i} with`, gameRoom.state.messages?.length || 0, 'messages');
          } catch (error) {
            console.error(`Error loading game room ${i}:`, error);
            // Continue anyway - the channel might still work
            gameRooms.push(gameRoom);
          }
        }

        if (isMounted) {
          console.log('Setting channels:', {
            general: general,
            announcements: announcements,
            divisions: Object.keys(divisionChannelsObj),
            gameRooms: gameRooms.length
          });
          setGeneralChannel(general);
          setAnnouncementsChannel(announcements);
          setDivisionChannels(divisionChannelsObj);
          setGameRoomChannels(gameRooms);
          // Ensure user starts in general chat with a small delay to ensure proper state
          setTimeout(() => {
            if (isMounted) {
              console.log('Setting general channel as active');
              setChannel(general);
              setLoading(false);
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        if (isMounted) {
          setLoading(false);
        }
      } finally {
        globalConnectionInProgress = false;
      }
    }

    init();

    return () => {
      isMounted = false;
      if (client && didConnect) {
        try {
          client.disconnectUser();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      globalConnectionInProgress = false;
    };
  }, [userEmail, userName]);

  useEffect(() => {
    setPinnedChannels(pinnedIds);
  }, [pinnedIds]);

  // Load messages when channel changes and listen for new messages
  useEffect(() => {
    if (channel) {
      console.log('Channel changed to:', channel.id, channel.state.messages?.length || 0, 'messages');
      const channelMessages = channel.state.messages || [];
      setMessages(channelMessages);

      // Listen for new messages
      const handleNewMessage = (event) => {
        console.log('New message received in channel:', channel.id);
        const updatedMessages = channel.state.messages || [];
        setMessages([...updatedMessages]);
      };

      // Listen for channel state updates
      const handleChannelUpdate = () => {
        console.log('Channel state updated:', channel.id);
        const updatedMessages = channel.state.messages || [];
        setMessages([...updatedMessages]);
      };

      // Set up event listeners
      channel.on('message.new', handleNewMessage);
      channel.on('message.updated', handleChannelUpdate);
      channel.on('message.deleted', handleChannelUpdate);

      // Cleanup listener when channel changes
      return () => {
        channel.off('message.new', handleNewMessage);
        channel.off('message.updated', handleChannelUpdate);
        channel.off('message.deleted', handleChannelUpdate);
      };
    } else if (generalChannel && !channel) {
      // Fallback: if no channel is set but general channel is available, set it
      console.log('Fallback: setting general channel');
      setChannel(generalChannel);
    } else {
      setMessages([]);
    }
  }, [channel, generalChannel]);

  function logoutAndRedirect() {
    if (chatClient) chatClient.disconnectUser();
    localStorage.clear();
    if (onClose) {
      onClose();
    } else {
      navigate("/");
      window.location.reload();
    }
  }

  // Handle Schedule Match button - show division selector
  function handleScheduleMatch() {
    setShowDivisionSelector(true);
  }

  // Send message function
  const sendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }
    
    if (!channel) {
      return;
    }
    
    try {
      const response = await channel.sendMessage({
        text: newMessage,
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <div>Loading chat...Please wait</div>
      </div>
    );
  }

  const currentUserId = chatClient?.user?.id;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  // Helper function to render channel with pin
  const renderChannelWithPin = (ch, category = null) => {
    if (!ch || !ch.cid) return null;
    return (
      <div
        key={ch.cid}
        className={`${styles.channelListRow} ${category ? styles[category] : ''} ${channel?.id === ch.id ? styles.active : ''}`}
        onClick={() => {
          setChannel(ch);
          setSidebarOpen(false);
        }}
      >
        <div className={styles.channelListName}>
          <ChannelNameOnlyPreview channel={ch} />
        </div>
        <PinIcon
          pinned={pinnedIds.includes(ch.id)}
          onClick={(e) => {
            e.stopPropagation();
            let newIds;
            if (pinnedIds.includes(ch.id)) {
              newIds = pinnedIds.filter((id) => id !== ch.id);
            } else {
              newIds = [...pinnedIds, ch.id];
            }
            setPinnedIds(newIds);
          }}
        />
      </div>
    );
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        background: "linear-gradient(120deg, #232323 80%, #2a0909 100%)",
        color: "#fff",
        border: "2px solid #e53e3e",
        borderRadius: "1rem",
        boxShadow: "0 0 32px #e53e3e, 0 0 40px rgba(0,0,0,0.85)",
        width: "90vw",
        maxWidth: "1000px",
        height: "80vh",
        maxHeight: "600px",
        display: "flex",
        flexDirection: "column",
        position: "relative"
      }}>
        <button
          className={styles.hamburgerButton}
          onClick={() => setSidebarOpen(true)}
          aria-label="Open channel list"
        >
          <span className={styles.hamburgerIcon}>☰</span>
        </button>

        {sidebarOpen && (
          <div
            className={styles.sidebarBackdrop}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Simple Header */}
        <div style={{
          padding: "1rem",
          borderBottom: "2px solid #e53e3e",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative"
        }}>
          <h2 style={{ margin: 0, color: "#fff", fontSize: "1.5rem", fontWeight: "bold" }}>League Chat - {userName}</h2>
          <button
            onClick={onClose || (() => navigate("/"))}
            style={{
              position: "absolute",
              right: "1rem",
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: "2rem",
              cursor: "pointer",
              padding: "0.5rem"
            }}
          >
            ×
          </button>
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          display: "flex",
          minHeight: 0
        }}>
          {/* Sidebar */}
          <div style={{
            width: "250px",
            backgroundColor: "linear-gradient(180deg, #1a1a1a 0%, #2a2a2a 100%)",
            borderRight: "2px solid #e53e3e",
            overflowY: "auto",
            padding: "1rem",
            boxShadow: "inset -2px 0 8px rgba(0,0,0,0.3)"
          }}>
            <button
              className={styles.closeSidebarButton}
              onClick={() => setSidebarOpen(false)}
              aria-label="Close channel list"
            >
              ×
            </button>

            {/* Mobile Navigation Buttons */}
            <div className={styles.mobileNavButtons}>
              <button
                className={styles.mobileNavButton}
                onClick={() => {
                  if (onClose) {
                    onClose();
                  } else {
                    navigate("/");
                    window.location.reload();
                  }
                  setSidebarOpen(false);
                }}
              >
                🏠 Dashboard
              </button>
              <button
                className={styles.mobileNavButton}
                onClick={() => {
                  handleScheduleMatch();
                  setSidebarOpen(false);
                }}
              >
                📅 Schedule a Match
              </button>
              <button
                className={styles.mobileNavButton}
                onClick={() => {
                  logoutAndRedirect();
                  setSidebarOpen(false);
                }}
              >
                🚪 Logout
              </button>
              <div className={styles.mobileTimerBox}>
                Auto Logout: {minutes}:{seconds.toString().padStart(2, "0")}
              </div>
            </div>

            {/* General Channel */}
            <div
              className={`${styles.generalChannelRow}${
                (channel?.id === GENERAL_CHANNEL_ID || channel === generalChannel) ? " " + styles.active : ""
              }`}
              onClick={() => {
                setChannel(generalChannel);
                setSidebarOpen(false);
              }}
            >
              <span style={{ marginRight: 8 }}>#</span> General Chat
            </div>

            {/* Search */}
            <div className={styles.sidebarSearch}>
              <input
                type="text"
                placeholder="Search channels..."
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
              />
            </div>

            <div className={styles.channelListWrapper}>
              {/* Announcements Section */}
              <SectionHeader 
                icon="📢" 
                sectionKey="announcements"
                isCollapsed={collapsedSections.announcements}
                onToggle={(key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))}
              >
                Announcements
              </SectionHeader>
              <div className={`${styles.sectionContent} ${collapsedSections.announcements ? styles.collapsed : styles.expanded}`}>
                {announcementsChannel ? renderChannelWithPin(announcementsChannel, 'announcements') : (
                  <div style={{ padding: '8px', color: '#888', fontStyle: 'italic' }}>No announcements channel available</div>
                )}
              </div>

              {/* Division Channels Section */}
              <SectionHeader 
                icon="🏆" 
                sectionKey="divisions"
                isCollapsed={collapsedSections.divisions}
                onToggle={(key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))}
              >
                Division Channels
              </SectionHeader>
              <div className={`${styles.sectionContent} ${collapsedSections.divisions ? styles.collapsed : styles.expanded}`}>
                {Object.values(divisionChannels).length > 0 ? 
                  Object.values(divisionChannels).map(ch => renderChannelWithPin(ch, 'divisions')) : 
                  <div style={{ padding: '8px', color: '#888', fontStyle: 'italic' }}>No division channels available</div>
                }
              </div>

              {/* Game Rooms Section */}
              <SectionHeader 
                icon="🎮" 
                sectionKey="gameRooms"
                isCollapsed={collapsedSections.gameRooms}
                onToggle={(key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))}
              >
                Game Rooms
              </SectionHeader>
              <div className={`${styles.sectionContent} ${collapsedSections.gameRooms ? styles.collapsed : styles.expanded}`}>
                {gameRoomChannels.length > 0 ? 
                  gameRoomChannels.map(ch => renderChannelWithPin(ch, 'game-rooms')) : 
                  <div style={{ padding: '8px', color: '#888', fontStyle: 'italic' }}>No game room channels available</div>
                }
              </div>
              
              {/* Play Game Button */}
              <div 
                className={`${styles.channelListRow} ${styles.gameButton}`}
                onClick={() => {
                  navigate("/tenball");
                  setSidebarOpen(false);
                }}
              >
                <span style={{ marginRight: 8 }}>🎯</span>
                Play Pool Game
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className={styles.mainChatWindow} style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            position: "relative"
          }}>
            {/* Pool Simulation Background */}
            <div className={styles.poolBackground}>
              <PoolSimulation />
            </div>
            
            {/* Channel Header */}
            <CustomChannelHeader 
              channel={channel}
              currentUser={chatClient?.user}
            />
            
            {/* Messages Area */}
            <div className={styles.messagesArea} style={{
              flex: 1,
              overflowY: "auto",
              paddingBottom: "80px" // Space for input box
            }}>
              {messages.map((message) => {
                const messageUserId = message.user?.id;
                const currentUserId = chatClient?.user?.id;
                let isCurrentUser = messageUserId === currentUserId;
                
                if (!isCurrentUser && messageUserId && currentUserId) {
                  const baseUserId = messageUserId.split('_')[0];
                  isCurrentUser = currentUserId.startsWith(baseUserId);
                }
                
                return (
                  <div 
                    key={message.id} 
                    className={`${styles.messageItem} ${isCurrentUser ? styles.messageItemRight : styles.messageItemLeft}`}
                  >
                    <div className={styles.messageHeader}>
                      <span className={styles.messageAuthor}>
                        {message.user?.name || message.user?.id}
                      </span>
                      <span className={styles.messageTime}>
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={styles.messageText}>
                      {message.text}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Message Input */}
            <div className={styles.messageInputContainer} style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 10
            }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className={styles.messageInput}
              />
              <button
                onClick={sendMessage}
                className={styles.sendButton}
                disabled={!newMessage.trim()}
              >
                🚀 Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDivisionSelector && (
        <DivisionSelectorModal
          userName={userName}
          userEmail={userEmail}
          userPin={userPin}
          onClose={() => setShowDivisionSelector(false)}
          fromChat={true}
        />
      )}
    </div>
  );
}
