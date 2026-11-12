import React from 'react';
import {
  LEGENDS, LEGENDS_DIRECTIONS_URL, LEGENDS_FULL_ADDRESS, LEGENDS_MAP_EMBED_URL, LEGENDS_MAP_URL,
} from '../../data/consignmentConstants.js';
import ConsignmentModal from './ConsignmentModal.jsx';
import './consignment-map-modal.css';

/** Google map to Legends, where drop-off, pickup and payment happen. */
export default function ConsignmentLegendsMapModal({ onClose }) {
  return (
    <ConsignmentModal titleId="cs-map-title" onClose={onClose}>
      <div className="cs-modal-card cs-map-modal">
        <div className="cs-map-head">
          <div>
            <h2 id="cs-map-title">{LEGENDS.name}</h2>
            <p className="cs-meta">{LEGENDS_FULL_ADDRESS}</p>
          </div>
          <button type="button" className="cs-how-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <iframe
          className="cs-map-frame"
          title={`Map to ${LEGENDS.name}`}
          src={LEGENDS_MAP_EMBED_URL}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <div className="cs-actions">
          <a className="cs-btn" href={LEGENDS_DIRECTIONS_URL} target="_blank" rel="noopener noreferrer">Get directions</a>
          <a className="cs-btn-secondary" href={LEGENDS_MAP_URL} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
        </div>
        <p className="cs-hint">Drop-off, pickup and payment for the shop all happen here.</p>
      </div>
    </ConsignmentModal>
  );
}
