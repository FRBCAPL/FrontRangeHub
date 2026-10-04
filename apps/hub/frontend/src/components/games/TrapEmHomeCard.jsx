import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TRAP_EM_PATH, TRAP_EM_SUBTITLE, TRAP_EM_TITLE } from './trapEmContent.js';
import './TrapEmHomeCard.css';

export default function TrapEmHomeCard() {
  const navigate = useNavigate();
  return (
    <button type="button" className="trapem-home-card" onClick={() => navigate(TRAP_EM_PATH)}>
      <span className="trapem-home-ball" aria-hidden="true"><span>8</span></span>
      <span className="trapem-home-text">
        <span className="trapem-home-kicker">New game</span>
        <span className="trapem-home-title">{TRAP_EM_TITLE}</span>
        <span className="trapem-home-sub">{TRAP_EM_SUBTITLE}</span>
      </span>
      <span className="trapem-home-cta">Learn how to play →</span>
    </button>
  );
}
