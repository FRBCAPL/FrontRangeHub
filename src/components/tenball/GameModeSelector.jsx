import React, { useState } from 'react';
import { FaGraduationCap, FaPlay } from 'react-icons/fa';
import styles from './GameModeSelector.module.css';
import { EIGHT_LEARN_TOPICS, LEARN_TOPICS, NINE_LEARN_TOPICS, ONE_POCKET_LEARN_TOPICS } from './learnTopics';
import LearnTopicModal from './LearnTopicModal';
import tenBallImg from '../../assets/tenball.svg';
import nineBallImg from '../../assets/ball9.svg';
import eightBallImg from '../../assets/8ball.svg';
import onePocketImg from '../../assets/ball8.svg';

const GameModeSelector = ({ onModeSelect, fromLogin = false }) => {
  const [openTopicId, setOpenTopicId] = useState(null);
  const allTopics = [...LEARN_TOPICS, ...NINE_LEARN_TOPICS, ...EIGHT_LEARN_TOPICS, ...ONE_POCKET_LEARN_TOPICS];
  const openTopic = allTopics.find((topic) => topic.id === openTopicId) || null;

  const tenTutorial = {
    id: 'tutorial',
    title: 'Interactive Tutorial',
    description: 'CSI 10-Ball rules, tips, and a match.',
    icon: FaGraduationCap,
    color: '#42a5f5'
  };
  const tenPlay = {
    id: 'play',
    title: 'Play 10-Ball',
    description: 'Match vs computer or a friend.',
    icon: FaPlay,
    color: '#1e88e5'
  };
  const nineTutorial = {
    id: 'nine-tutorial',
    title: '9-Ball Tutorial',
    description: 'CSI 9-Ball rules. No call shot.',
    icon: FaGraduationCap,
    color: '#ffd54a'
  };
  const ninePlay = {
    id: 'nine-play',
    title: 'Play 9-Ball',
    description: 'Match vs computer or a friend.',
    icon: FaPlay,
    color: '#f9a825'
  };
  const eightTutorial = {
    id: 'eight-tutorial',
    title: '8-Ball Tutorial',
    description: 'Solids, stripes, and calling the 8.',
    icon: FaGraduationCap,
    color: '#ef5350'
  };
  const eightPlay = {
    id: 'eight-play',
    title: 'Play 8-Ball',
    description: 'Match vs computer or a friend.',
    icon: FaPlay,
    color: '#c62828'
  };
  const onePocketTutorial = {
    id: 'onepocket-tutorial',
    title: 'One Pocket Tutorial',
    description: 'CSI foot-corner scoring. Race to 8.',
    icon: FaGraduationCap,
    color: '#66bb6a'
  };
  const onePocketPlay = {
    id: 'onepocket-play',
    title: 'Play One Pocket',
    description: 'Match vs computer or a friend.',
    icon: FaPlay,
    color: '#2e7d32'
  };

  const renderLauncher = (mode, className) => {
    const IconComponent = mode.icon;
    return (
      <div
        className={className}
        onClick={() => onModeSelect(mode.id)}
      >
        <div className={styles.modeIcon} style={{ backgroundColor: mode.color }}>
          <IconComponent />
        </div>
        <div className={styles.modeContent}>
          <h3>{mode.title}</h3>
          <p>{mode.description}</p>
        </div>
        <div className={styles.modeArrow}>→</div>
      </div>
    );
  };

  return (
    <div className={styles.gameModeSelector}>
      <div className={styles.header}>
        {!fromLogin && (
          <button
            className={styles.backToDashboardButton}
            onClick={() => { window.location.href = '/dashboard'; }}
          >
            ← Back to Dashboard
          </button>
        )}
        <h2>Play Pool</h2>
      </div>

      <div className={styles.bundlesRow}>
        <div className={`${styles.tutorialBundle} ${styles.eightBundle}`}>
          <div className={styles.tutorialIntro}>
            <img src={eightBallImg} alt="8-ball" className={styles.gameBall} />
            <h3>8-Ball</h3>
            <p>Solids & stripes · call the 8</p>
          </div>
          <div className={styles.whatYoullLearn}>
            <h3>What You'll Learn</h3>
            <ul>
              {EIGHT_LEARN_TOPICS.map((topic) => (
                <li key={topic.id}>
                  <button type="button" onClick={() => setOpenTopicId(topic.id)}>
                    {topic.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.launcherStack}>
            {renderLauncher(eightTutorial, `${styles.modeCard} ${styles.eightCard}`)}
            {renderLauncher(eightPlay, `${styles.modeCard} ${styles.eightPlayCard}`)}
          </div>
        </div>

        <div className={`${styles.tutorialBundle} ${styles.nineBundle}`}>
          <div className={styles.tutorialIntro}>
            <img src={nineBallImg} alt="9-ball" className={styles.gameBall} />
            <h3>9-Ball</h3>
            <p>CSI 9-Ball · diamond rack · no call shot</p>
          </div>
          <div className={styles.whatYoullLearn}>
            <h3>What You'll Learn</h3>
            <ul>
              {NINE_LEARN_TOPICS.map((topic) => (
                <li key={topic.id}>
                  <button type="button" onClick={() => setOpenTopicId(topic.id)}>
                    {topic.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.launcherStack}>
            {renderLauncher(nineTutorial, `${styles.modeCard} ${styles.nineCard}`)}
            {renderLauncher(ninePlay, `${styles.modeCard} ${styles.ninePlayCard}`)}
          </div>
        </div>

        <div className={styles.tutorialBundle}>
          <div className={styles.recommendedBadge}>Recommended</div>
          <div className={styles.tutorialIntro}>
            <img src={tenBallImg} alt="10-ball" className={styles.gameBall} />
            <h3>10-Ball</h3>
            <p>Official CSI 10-Ball rules</p>
          </div>
          <div className={styles.whatYoullLearn}>
            <h3>What You'll Learn</h3>
            <ul>
              {LEARN_TOPICS.map((topic) => (
                <li key={topic.id}>
                  <button type="button" onClick={() => setOpenTopicId(topic.id)}>
                    {topic.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.launcherStack}>
            {renderLauncher(tenTutorial, `${styles.modeCard} ${styles.recommended}`)}
            {renderLauncher(tenPlay, `${styles.modeCard} ${styles.playCard}`)}
          </div>
        </div>
      </div>

      <div className={`${styles.bundlesRow} ${styles.bundlesRowSecondary}`}>
        <div className={`${styles.tutorialBundle} ${styles.onePocketBundle}`}>
          <div className={styles.tutorialIntro}>
            <img src={onePocketImg} alt="One Pocket" className={styles.gameBall} />
            <h3>One Pocket</h3>
            <p>Foot corners · race to 8</p>
          </div>
          <div className={styles.whatYoullLearn}>
            <h3>What You'll Learn</h3>
            <ul>
              {ONE_POCKET_LEARN_TOPICS.map((topic) => (
                <li key={topic.id}>
                  <button type="button" onClick={() => setOpenTopicId(topic.id)}>
                    {topic.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.launcherStack}>
            {renderLauncher(onePocketTutorial, `${styles.modeCard} ${styles.onePocketCard}`)}
            {renderLauncher(onePocketPlay, `${styles.modeCard} ${styles.onePocketPlayCard}`)}
          </div>
        </div>
      </div>

      <LearnTopicModal topic={openTopic} onClose={() => setOpenTopicId(null)} />
    </div>
  );
};

export default GameModeSelector;
