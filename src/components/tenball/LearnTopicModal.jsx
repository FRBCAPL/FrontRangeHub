import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './LearnTopicModal.module.css';

const LearnTopicModal = ({ topic, onClose }) => {
  useEffect(() => {
    if (!topic) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [topic, onClose]);

  if (!topic) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="learn-topic-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 id="learn-topic-title">{topic.label}</h2>
        {topic.steps.filter(Boolean).map((item) => (
          <section key={item.title} className={styles.section}>
            <h3>{item.title}</h3>
            <p>{item.content}</p>
            <div className={styles.tip}>
              <h4>Pro Tip</h4>
              <p>{item.proTip}</p>
            </div>
          </section>
        ))}
        {(topic.moreTips || []).map((tip) => (
          <div key={tip} className={styles.tip}>
            <h4>Pro Tip</h4>
            <p>{tip}</p>
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
};

export default LearnTopicModal;
