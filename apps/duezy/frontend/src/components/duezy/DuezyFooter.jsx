import React from 'react';
import { Link } from 'react-router-dom';
import { DUEZY_PATH } from '../../data/duezyOptions.js';
import { OPERATOR, SUPPORT_EMAIL } from '../../data/duezyLegal.js';

/** Site footer on every Duezy screen: who runs it, how to reach us, privacy and terms. */
export default function DuezyFooter() {
  return (
    <footer className="dz-footer">
      <span>Duezy © {new Date().getFullYear()} · by <Link to="/" className="dz-footer-link">{OPERATOR}</Link></span>
      <nav className="dz-footer-nav" aria-label="Duezy policies and contact">
        <Link to={`${DUEZY_PATH}/privacy`} className="dz-footer-link">Privacy</Link>
        <Link to={`${DUEZY_PATH}/terms`} className="dz-footer-link">Terms</Link>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="dz-footer-link">Contact</a>
      </nav>
    </footer>
  );
}
