import React, { useState } from "react";
import { useChatContext, useChannelStateContext } from "stream-chat-react";
import styles from "./CustomMessageUi.module.css"; // or your main chat CSS module

const ADMIN_USER_ID = "frbcaplgmailcom";

export default function AdminAnnouncementInput() {
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();
  const [text, setText] = useState("");
  const isAdmin = client?.userID === ADMIN_USER_ID;

  if (!isAdmin) return null;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        await channel.sendMessage({ text, customType: "announcement" });
        setText("");
      }}
      className={styles.adminAnnouncementForm}
    >
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Send announcement to this channel..."
        className={styles.adminAnnouncementInput}
      />
      <button type="submit" className={styles.adminAnnouncementBtn}>Send</button>
    </form>
  );
}
