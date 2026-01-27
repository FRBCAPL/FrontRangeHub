import React from 'react';
import PropTypes from 'prop-types';
import { SkeletonLoader } from '@shared/components/common/LoadingSpinner';
import adminAuthService from '@shared/services/services/adminAuthService.js';

/**
 * NewsUpdatesSection Component
 * Extracted from Dashboard.jsx to improve maintainability and reusability
 */
const NewsUpdatesSection = ({
  notes,
  notesLoading,
  noteError,
  userPin,
  onDeleteNote,
  onClearNotes,
  styles
}) => {
  return (
    <section className={`${styles.dashboardSection} ${styles.dashboardSectionBox} ${styles.newsUpdatesSection}`}>
      <h2 className={styles.dashboardSectionTitle}>
        News & Updates
      </h2>
      {notesLoading ? (
        <SkeletonLoader lines={3} height="16px" />
      ) : (
        <ul className={styles.dashboardList}>
          {notes.length === 0 ? (
            <li className={styles.dashboardNoteItem}>No news yet.</li>
          ) : (
            notes.map((note, idx) => (
              <li
                key={note._id || idx}
                className={styles.dashboardNoteItem}
              >
                <span style={{ flex: 1 }}>{note.text}</span>
                                 {adminAuthService.getCurrentAdmin() && (
                  <button
                    onClick={() => onDeleteNote(note._id)}
                    style={{
                      background: "#e53935",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "2px 8px",
                      cursor: "pointer",
                      fontSize: "0.95em"
                    }}
                    aria-label="Delete note"
                    title="Delete note"
                    type="button"
                  >
                    Delete
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      )}
              {adminAuthService.getCurrentAdmin() && notes.length > 0 && (
        <button
          style={{
            marginTop: 10,
            background: "#444",
            color: "#fff",
            border: "none",
            borderRadius: 5,
            padding: "4px 14px",
            cursor: "pointer",
            fontSize: "0.98em"
          }}
          onClick={onClearNotes}
          type="button"
        >
          Clear All Notes
        </button>
      )}
      
      {noteError && (
        <div style={{
          marginTop: 10,
          padding: '10px',
          background: '#ffebee',
          color: '#c62828',
          border: '1px solid #ffcdd2',
          borderRadius: '4px',
          fontSize: '0.9em'
        }}>
          Error: {noteError}
        </div>
      )}
    </section>
  );
};

NewsUpdatesSection.propTypes = {
  notes: PropTypes.array.isRequired,
  notesLoading: PropTypes.bool.isRequired,
  noteError: PropTypes.string,
  userPin: PropTypes.string,
  onDeleteNote: PropTypes.func.isRequired,
  onClearNotes: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired
};

export default NewsUpdatesSection;
