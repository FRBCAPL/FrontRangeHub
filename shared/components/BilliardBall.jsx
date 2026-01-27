import React from "react";

export default function BilliardBall({ gameType, size = 22 }) {
  const config = {
    "8 Ball": { emoji: "🎱" },
    "9 Ball": { color: "#FFD700", number: 9 },
    "10 Ball": { color: "#2196F3", number: 10 },
  };

  if (gameType === "8 Ball") {
    return (
      <span
        role="img"
        aria-label="8-ball"
        style={{ fontSize: size, verticalAlign: "middle", marginRight: 4 }}
      >
        {config["8 Ball"].emoji}
      </span>
    );
  }

  const { color, number } = config[gameType] || {};
  if (!color || !number) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color: "#222",
        fontWeight: "bold",
        fontSize: size * 0.65,
        border: "2px solid #fff",
        boxShadow: "0 1px 2px #0003",
        marginRight: 4,
        verticalAlign: "middle"
      }}
      aria-label={`${number}-ball`}
    >
      {number}
    </span>
  );
}
