import React from 'react';
import { FaChevronLeft, FaChevronRight, FaPlay, FaLightbulb } from 'react-icons/fa';
import styles from './TutorialRules.module.css';

const TutorialRules = ({ step, currentStep, totalSteps, onNext, onBack, onSkip }) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className={styles.overlay} onClick={onSkip}>
    <div className={styles.tutorialRules} onClick={(event) => event.stopPropagation()}>
      <button type="button" className={styles.close} onClick={onSkip} aria-label="Close tutorial">×</button>
      <div className={styles.header}>
        <h3>10-Ball Rules Tutorial</h3>
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className={styles.progressText}>
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.stepContent}>
          <h4>{step.title}</h4>
          <p>{step.content}</p>
          
          {step.highlight && (
            <div className={styles.highlightBox}>
              <FaLightbulb className={styles.highlightIcon} />
              <span>This concept will be highlighted on the table</span>
            </div>
          )}
        </div>

        <div className={styles.tipSection}>
          <h5>💡 Pro Tip</h5>
          <p>{step.proTip}</p>
        </div>
      </div>

      <div className={styles.navigation}>
        <button 
          className={`${styles.navButton} ${currentStep === 0 ? styles.disabled : ''}`}
          onClick={onBack}
          disabled={currentStep === 0}
        >
          <FaChevronLeft />
          Previous
        </button>

        <div className={styles.centerButtons}>
          <button 
            className={styles.skipButton}
            onClick={onSkip}
          >
            Skip Tutorial
          </button>
          
          {currentStep === totalSteps - 1 ? (
            <button 
              className={styles.startButton}
              onClick={onNext}
            >
              <FaPlay />
              Start Playing
            </button>
          ) : (
            <button 
              className={styles.nextButton}
              onClick={onNext}
            >
              Next
              <FaChevronRight />
            </button>
          )}
        </div>
      </div>

      <div className={styles.quickRules}>
        <h5>Quick Reference</h5>
        <div className={styles.ruleGrid}>
          <div className={styles.ruleItem}>
            <span className={styles.ruleNumber}>1</span>
            <span>Hit lowest ball first</span>
          </div>
          <div className={styles.ruleItem}>
            <span className={styles.ruleNumber}>2</span>
            <span>Call your shots</span>
          </div>
          <div className={styles.ruleItem}>
            <span className={styles.ruleNumber}>3</span>
            <span>10-ball wins the game</span>
          </div>
          <div className={styles.ruleItem}>
            <span className={styles.ruleNumber}>4</span>
            <span>Push out after break</span>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default TutorialRules; 