import React, { useEffect, useRef, useState } from 'react';
import SimplePoolGame from './tenball/SimplePoolGame';
import TutorialRules from './tenball/TutorialRules';
import GameModeSelector from './tenball/GameModeSelector';
import PlayerSetupModal from './tenball/PlayerSetupModal';
import CoinFlipBreak from './tenball/CoinFlipBreak';
import { DEFAULT_MATCH } from './tenball/matchFormat';
import TipManager from './tenball/TipManager';
import { EIGHTBALL_TUTORIAL_STEPS, NINEBALL_TUTORIAL_STEPS, ONE_POCKET_TUTORIAL_STEPS, TUTORIAL_STEPS } from './tenball/tutorialGuide';
import { HOW_TO_PLAY_TOPIC } from './tenball/learnTopics';
import LearnTopicModal from './tenball/LearnTopicModal';
import { GAME_EIGHT, GAME_NINE, GAME_ONE_POCKET, GAME_TEN, getGameRules } from './tenball/gameRules';
import { getPlayPoolAdminSettings } from './tenball/admin/playPoolAdminStore';
import usePlayPoolAdminSettings from './tenball/admin/usePlayPoolAdminSettings';
import usePlayPoolPageVisitTracker from './tenball/visits/usePlayPoolPageVisitTracker';
import { playPoolSessionView } from './tenball/visits/playPoolVisitPages';
import styles from './tenball/TenBallTutorial.module.css';

const TenBallTutorial = ({ fromLogin = false, onBackToLogin, canAdmin = false }) => {
  const adminSettings = usePlayPoolAdminSettings();
  const [currentMode, setCurrentMode] = useState('menu'); // menu, tutorial, game
  const [gameType, setGameType] = useState(GAME_TEN);
  const [lessonOn, setLessonOn] = useState(true);
  usePlayPoolPageVisitTracker(
    playPoolSessionView({
      gameType,
      lessonOn,
      mode: currentMode === 'menu' ? 'menu' : 'game'
    })
  );
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showHints, setShowHints] = useState(true);
  const [showRules, setShowRules] = useState(true);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [playerNames, setPlayerNames] = useState({ 1: '', 2: '' });
  const [vsComputer, setVsComputer] = useState(() => getPlayPoolAdminSettings().defaultVsComputer !== false);
  const [match, setMatch] = useState(DEFAULT_MATCH);
  const [setupOpen, setSetupOpen] = useState(false);
  const [flipOpen, setFlipOpen] = useState(false);
  const [openingBreaker, setOpeningBreaker] = useState(1);
  const [gameKey, setGameKey] = useState(0);
  const [pendingMatchStart, setPendingMatchStart] = useState(false);
  const pendingMatchStartRef = useRef(false);
  pendingMatchStartRef.current = pendingMatchStart;
  const rules = getGameRules(gameType);
  const tutorialSteps = gameType === GAME_NINE
    ? NINEBALL_TUTORIAL_STEPS
    : gameType === GAME_EIGHT
      ? EIGHTBALL_TUTORIAL_STEPS
      : gameType === GAME_ONE_POCKET
        ? ONE_POCKET_TUTORIAL_STEPS
        : TUTORIAL_STEPS;
  const [gameState, setGameState] = useState({
    player1Score: 0,
    player2Score: 0,
    currentPlayer: 1,
    gamePhase: 'break',
    rules: {
      callPocket: rules.callShot,
      pushOut: rules.pushOut !== false,
      threeFoulRule: rules.threeFoulRule !== false,
      jumpShots: true
    }
  });

  const handleGameModeSelect = (mode) => {
    if (mode === 'tutorial' || mode === 'play') {
      setGameType(GAME_TEN);
      setLessonOn(mode === 'tutorial');
      setSetupOpen(true);
      return;
    }
    if (mode === 'nine-tutorial' || mode === 'nine-play') {
      setGameType(GAME_NINE);
      setLessonOn(mode === 'nine-tutorial');
      setSetupOpen(true);
      return;
    }
    if (mode === 'eight-tutorial' || mode === 'eight-play') {
      setGameType(GAME_EIGHT);
      setLessonOn(mode === 'eight-tutorial');
      setSetupOpen(true);
      return;
    }
    if (mode === 'onepocket-tutorial' || mode === 'onepocket-play') {
      setGameType(GAME_ONE_POCKET);
      setLessonOn(mode === 'onepocket-tutorial');
      setSetupOpen(true);
    }
  };

  const confirmSetup = ({ names, vsComputer: computer, match: nextMatch }) => {
    setPlayerNames(names);
    setVsComputer(computer);
    if (nextMatch) setMatch(nextMatch);
    setSetupOpen(false);
    if (currentMode === 'menu') {
      setPendingMatchStart(true);
      setFlipOpen(true);
      return;
    }
  };

  const finishFlip = (breaker) => {
    const startNew = pendingMatchStartRef.current || currentMode === 'menu';
    setOpeningBreaker(breaker);
    setFlipOpen(false);
    setPendingMatchStart(false);
    setGameKey((key) => key + 1);
    if (startNew) {
      setCurrentMode(lessonOn ? 'tutorial' : 'game');
      setTutorialStep(0);
      setShowHints(lessonOn);
      setShowRules(lessonOn);
      setGameState((prev) => ({
        ...prev,
        player1Score: 0,
        player2Score: 0,
        currentPlayer: breaker,
        gamePhase: 'break',
        rules: {
          ...prev.rules,
          callPocket: getGameRules(gameType).callShot,
          pushOut: getGameRules(gameType).pushOut !== false,
          threeFoulRule: getGameRules(gameType).threeFoulRule !== false
        }
      }));
      return;
    }
    // Keep session / match scores — only the opening breaker changes.
    setGameState((prev) => ({
      ...prev,
      currentPlayer: breaker,
      gamePhase: 'break'
    }));
  };

  const handleTutorialNext = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowRules(false);
    }
  };

  const handleTutorialBack = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    }
  };

  const handleGameEnd = (winner) => {
    setGameState((prev) => ({
      ...prev,
      gamePhase: 'end',
      player1Score: winner === 1 ? prev.player1Score + 1 : prev.player1Score,
      player2Score: winner === 2 ? prev.player2Score + 1 : prev.player2Score
    }));
  };

  const resetGame = () => {
    const nextRules = getGameRules(gameType);
    setGameState({
      player1Score: 0,
      player2Score: 0,
      currentPlayer: 1,
      gamePhase: 'break',
      rules: {
        callPocket: nextRules.callShot,
        pushOut: nextRules.pushOut !== false,
        threeFoulRule: nextRules.threeFoulRule !== false,
        jumpShots: true
      }
    });
  };

  const cancelMatch = () => {
    setSetupOpen(false);
    setFlipOpen(false);
    setPendingMatchStart(false);
    setShowRules(false);
    setCurrentMode('menu');
    setPlayerNames({ 1: '', 2: '' });
    setVsComputer(getPlayPoolAdminSettings().defaultVsComputer !== false);
    setMatch(DEFAULT_MATCH);
    setOpeningBreaker(1);
    resetGame();
  };

  const [gameMenuSlot, setGameMenuSlot] = useState(null);
  const playing = currentMode === 'tutorial' || currentMode === 'game';
  const rulesOpen = currentMode === 'tutorial' && showRules;
  // Pro tips wait until the rules tutorial is dismissed and the table is live.
  const tipsReady = lessonOn && playing && !rulesOpen && adminSettings.tipsEnabled !== false;
  // Keep the window flag in sync during render so TipManager mounts with tips allowed.
  window.__tenballTipAllow = tipsReady;

  useEffect(() => {
    if (!tipsReady) {
      window.tipManager = null;
      window.dispatchEvent(new CustomEvent('tableTipVisibility', { detail: { open: false } }));
      return undefined;
    }
    window.dispatchEvent(new CustomEvent('tableTipAudience'));
    return undefined;
  }, [tipsReady]);

  const renderContent = () => {
    switch (currentMode) {
      case 'menu':
        return (
          <GameModeSelector
            onModeSelect={handleGameModeSelect}
            fromLogin={fromLogin}
            canAdmin={canAdmin}
          />
        );

      case 'tutorial':
      case 'game':
        return (
          <div className={`${styles.tutorialContainer} pool-game-live`}>
            <SimplePoolGame
              key={gameKey}
              gameType={gameType}
              initialBreaker={openingBreaker}
              onGameEnd={handleGameEnd}
              playerNames={playerNames}
              vsComputer={vsComputer}
              matchScores={{ 1: gameState.player1Score, 2: gameState.player2Score }}
              matchFormat={match}
              onRestartMatch={() => setGameState((prev) => ({
                ...prev,
                player1Score: 0,
                player2Score: 0
              }))}
              onRequestFirstBreak={() => {
                setPendingMatchStart(false);
                setFlipOpen(true);
              }}
              onEditPlayers={() => setSetupOpen(true)}
              onContinue={({ names, vsComputer: computer }) => {
                setPlayerNames(names);
                setVsComputer(computer);
              }}
              onLeaveMatch={() => {
                setCurrentMode('menu');
                setShowRules(false);
                setSetupOpen(false);
                setFlipOpen(false);
                setPendingMatchStart(false);
              }}
              menuSlot={gameMenuSlot}
            />
          </div>
        );

      default:
        return (
          <GameModeSelector
            onModeSelect={handleGameModeSelect}
            canAdmin={canAdmin}
          />
        );
    }
  };

  return (
    <div className={styles.container}>
      {renderContent()}

      {tipsReady && (
        <TipManager
          gameType={gameType}
          onTipShown={(tipKey) => console.log(`Tip shown: ${tipKey}`)}
          ref={(tipManagerRef) => {
            if (tipManagerRef) {
              window.tipManager = tipManagerRef;
            }
          }}
        />
      )}

      {playing && (
        <div className={styles.navigation}>
          {!fromLogin && (
            <button
              className={styles.backButton}
              onClick={() => setCurrentMode('menu')}
            >
              ← Back to Menu
            </button>
          )}
          {!rulesOpen && (
            <button
              className={styles.backButton}
              onClick={() => {
                setCurrentMode('tutorial');
                setShowRules(true);
                setTutorialStep(0);
              }}
            >
              Show Tutorial
            </button>
          )}
          <button
            type="button"
            className={styles.backButton}
            onClick={() => setShowHowToPlay(true)}
          >
            How to Play
          </button>
          <div ref={setGameMenuSlot} className={styles.gameMenuSlot} />
        </div>
      )}

      <LearnTopicModal
        topic={showHowToPlay ? HOW_TO_PLAY_TOPIC : null}
        onClose={() => setShowHowToPlay(false)}
      />

      {rulesOpen && (
        <TutorialRules
          step={tutorialSteps[tutorialStep]}
          currentStep={tutorialStep}
          totalSteps={tutorialSteps.length}
          onNext={handleTutorialNext}
          onBack={handleTutorialBack}
          onSkip={() => setShowRules(false)}
          title={
            gameType === GAME_NINE
              ? '9-Ball Rules Tutorial'
              : gameType === GAME_EIGHT
                ? '8-Ball Rules Tutorial'
                : gameType === GAME_ONE_POCKET
                  ? 'One Pocket Rules Tutorial'
                  : '10-Ball Rules Tutorial'
          }
          quickRules={
            gameType === GAME_NINE
              ? [
                  'Hit lowest ball first',
                  'No call shot required',
                  '9-ball wins the game',
                  'Push out after break'
                ]
              : gameType === GAME_EIGHT
                ? [
                    'Solids vs stripes',
                    'Call ball & pocket (except obvious shots)',
                    '8-ball wins last',
                    'No three-foul rule'
                  ]
                : gameType === GAME_ONE_POCKET
                  ? [
                      'Choose a foot corner',
                      'Score only in your pocket',
                      'Race to 8 balls',
                      'Foul = spot one / owe one'
                    ]
                  : [
                      'Hit lowest ball first',
                      'Call ball & pocket (except obvious shots)',
                      '10-ball wins the game',
                      'Push out after break'
                    ]
          }
        />
      )}

      {setupOpen && (
        <PlayerSetupModal
          initialNames={playerNames}
          initialVsComputer={vsComputer}
          initialMatch={match}
          title={currentMode === 'menu' ? `New ${rules.label} match` : 'Edit match'}
          confirmLabel={currentMode === 'menu' ? 'Start' : 'Save'}
          onConfirm={confirmSetup}
          onCancel={() => {
            setSetupOpen(false);
            setPendingMatchStart(false);
          }}
          onCancelMatch={currentMode === 'menu' ? undefined : cancelMatch}
        />
      )}

      {flipOpen && (
        <CoinFlipBreak
          name1={playerNames[1]}
          name2={playerNames[2]}
          vsComputer={vsComputer}
          onDone={finishFlip}
        />
      )}
    </div>
  );
};

export default TenBallTutorial;
