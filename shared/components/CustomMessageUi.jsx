import React, { useState } from "react";
import { useMessageContext, Avatar, useChatContext, useChannelStateContext } from "stream-chat-react";
import styles from "./CustomMessageUi.module.css";
import { format } from "date-fns";

const ADMIN_USER_ID = "frbcaplgmailcom"; // your admin Stream Chat user ID

export default function CustomMessageUi() {
  const { message, isMyMessage, handleReaction, handleDelete, handleEdit } = useMessageContext();
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();

  const isMine = isMyMessage();
  const user = message.user || {};
  const isOnline = user.online;
  const timestamp = message.created_at
    ? format(new Date(message.created_at), "p")
    : "";

  // Get current logged-in Stream Chat user ID
  const currentUserId = client?.userID || "";
  const isAdmin = currentUserId === ADMIN_USER_ID;

  // State for editing message
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");

  // State for user info hover
  const [showUserInfo, setShowUserInfo] = useState(false);

  // Stream default reaction types
  const reactions = ["like", "love", "haha", "wow", "sad", "angry"];
  const reactionEmojis = {
    like: "👍",
    love: "❤️",
    haha: "😂",
    wow: "😮",
    sad: "😢",
    angry: "😠",
  };

  // Group reactions by type
  const reactionGroups = {};
  (message.latest_reactions || []).forEach((reaction) => {
    if (!reactionGroups[reaction.type]) reactionGroups[reaction.type] = [];
    reactionGroups[reaction.type].push(reaction.user);
  });

  // Tooltip state for which emoji is hovered
  const [hovered, setHovered] = useState(null);

  // Pin/unpin logic
  const isPinned = !!message.pinned;

  // Admin action handlers
  const handleMute = async () => {
    try {
      await channel.muteUser(user.id);
      alert(`${user.name || user.id} has been muted.`);
    } catch (err) {
      alert("Failed to mute user.");
    }
  };

  const handleBan = async () => {
    try {
      await channel.banUser(user.id);
      alert(`${user.name || user.id} has been banned.`);
    } catch (err) {
      alert("Failed to ban user.");
    }
  };

  const handlePin = async () => {
    try {
      if (!isPinned) {
        await channel.pinMessage(message);
        alert("Message pinned!");
      } else {
        await channel.unpinMessage(message);
        alert("Message unpinned!");
      }
    } catch (err) {
      alert("Failed to pin/unpin message.");
    }
  };

  // Edit logic
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await handleEdit({ ...message, text: editText });
      setEditing(false);
    } catch (err) {
      alert("Failed to edit message.");
    }
  };

  // Only show mute/ban for non-admin users
  const showModeration = isAdmin && user.id !== ADMIN_USER_ID;

  return (
    <div className={`${styles.customMessageUi} ${isMine ? styles.myMessage : ""}`}>
      <div
        className={styles.avatarWrapper}
        onMouseEnter={() => setShowUserInfo(true)}
        onMouseLeave={() => setShowUserInfo(false)}
        style={{ position: "relative" }}
      >
        <Avatar
          image={user.image}
          name={user.name || user.id}
          size={40}
          shape="rounded"
        />
        <span
          className={`${styles.onlineDot} ${isOnline ? styles.online : styles.offline}`}
          title={isOnline ? "Online" : "Offline"}
        />
        {/* Admin-only: User info popup */}
        {isAdmin && showUserInfo && (
          <div className={styles.adminUserInfo}>
            <strong>User ID:</strong> {user.id} <br />
            <strong>Name:</strong> {user.name || "(none)"} <br />
            <strong>Status:</strong> {isOnline ? "Online" : "Offline"}
          </div>
        )}
      </div>
      <div className={`${styles.customMessageBubble} ${isMine ? styles.myMessageBubble : ""}`}>
        <div className={styles.messageHeader}>
          <span className={styles.senderName}>
            {user.name || user.id}
            {/* ADMIN badge */}
            {user.id === ADMIN_USER_ID && (
              <span className={styles.adminBadge}>ADMIN</span>
            )}
          </span>
          <span className={styles.timestamp}>{timestamp}</span>
        </div>
        <div className={styles.messageText}>
          {editing ? (
            <form onSubmit={handleEditSubmit} style={{ display: "flex", alignItems: "center" }}>
              <input
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className={styles.adminEditInput}
                autoFocus
              />
              <button type="submit" className={styles.adminEditMessageBtn}>Save</button>
              <button type="button" className={styles.adminEditMessageBtn} onClick={() => setEditing(false)}>Cancel</button>
            </form>
          ) : (
            message.text
          )}
        </div>
        <div className={styles.reactionsBar}>
          {reactions.map((type) => {
            const users = reactionGroups[type] || [];
            return (
              <span
                key={type}
                role="img"
                aria-label={type}
                className={styles.reaction}
                onClick={() => handleReaction(type)}
                onMouseEnter={() => setHovered(type)}
                onMouseLeave={() => setHovered(null)}
                style={{ opacity: message.own_reactions?.some(r => r.type === type) ? 1 : 0.6 }}
              >
                {reactionEmojis[type]}
                {users.length > 0 && (
                  <span className={styles.reactionCount}> {users.length}</span>
                )}
                {/* Tooltip with user names */}
                {hovered === type && users.length > 0 && (
                  <span className={styles.reactionTooltip}>
                    {users.map(u => u.name || u.id).join(", ")}
                  </span>
                )}
              </span>
            );
          })}
        </div>
        {/* ADMIN controls */}
        {isAdmin && (
          <div className={styles.adminControls}>
            <button
              className={styles.adminDeleteMessageBtn}
              onClick={() => handleDelete(message)}
              title="Delete this message"
            >
              Delete
            </button>
            <button
              className={styles.adminEditMessageBtn}
              onClick={() => {
                setEditText(message.text || "");
                setEditing(true);
              }}
              title="Edit this message"
            >
              Edit
            </button>
            <button
              className={styles.adminPinMessageBtn}
              onClick={handlePin}
              title={isPinned ? "Unpin this message" : "Pin this message"}
            >
              {isPinned ? "Unpin" : "Pin"}
            </button>
            {showModeration && (
              <>
                <button
                  className={styles.adminMuteBtn}
                  onClick={handleMute}
                  title="Mute this user"
                >
                  Mute
                </button>
                <button
                  className={styles.adminBanBtn}
                  onClick={handleBan}
                  title="Ban this user"
                >
                  Ban
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
