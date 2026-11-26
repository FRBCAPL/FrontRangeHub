import React, { useState } from 'react';
import SimplePoolGame from './tenball/SimplePoolGame';
import TutorialRules from './tenball/TutorialRules';
import GameModeSelector from './tenball/GameModeSelector';
import PlayerSetupModal from './tenball/PlayerSetupModal';
import { DEFAULT_MATCH } from './tenball/matchFormat';
import TipManager from './tenball/TipManager';
import styles from './tenball/TenBallTutorial.module.css';

const TenBallTutorial = ({ fromLogin = false, onBackToLogin }) => {
  const [currentMode, setCurrentMode] = useState('menu'); // menu, tutorial, game
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showHints, setShowHints] = useState(true);
  const [showRules, setShowRules] = useState(true);
  const [playerNames, setPlayerNames] = useState({ 1: '', 2: '' });
  const [vsComputer, setVsComputer] = useState(true);
  const [match, setMatch] = useState(DEFAULT_MATCH);
  const [setupOpen, setSetupOpen] = useState(false);
  const [gameState, setGameState] = useState({
    player1Score: 0,
    player2Score: 0,
    currentPlayer: 1,
    gamePhase: 'break',
    rules: {
      callPocket: true,
      pushOut: true,
      threeFoulRule: true,
      jumpShots: true
    }
  });

  const tutorialSteps = [
    {
      title: "Welcome to 10-Ball!",
      content: "10-Ball is a call-shot game where you must hit the lowest numbered ball first and call your shots. The 10-ball is the game-winning ball!",
      proTip: "Always hit the lowest numbered ball first!"
    },
    {
      title: "The Break Shot",
      content: "Start the game with a legal break shot. You must break from the kitchen hitting the 1-ball first and drive at least 4 balls to the rails or pocket a ball.",
      proTip: "A good break can set up your entire game!"
    },
  
    {
      title: "Call Shot Rules",
      content: "After the break, you must call both the ball and the pocket for every shot. If you don't call it, it doesn't count!",
      proTip: "Always call a ball abnd a pocket for every shot."
    },
    {
      title: "Illegal Ball",
      content: "A ball is illegal if the called ball goes in the wrong pocket, or another ball falls when the called shot was not made. The other player can accept the table or make the shooter shoot again. An illegal 10-ball is spotted. Other illegal balls stay down.",
      proTip: "If the called ball also goes in the called pocket, extra balls stay down and the shooter continues. An extra 10-ball is still spotted."
    },
    {
      title: "Push Out Option",
      content: "After a legal break, the player at the table may push out. The cue ball does not have to hit a ball or a rail. Balls that fall stay down, except the 10-ball, which is spotted. The other player then shoots, or gives the shot back.",
      proTip: "Use push out to improve your position when the table is difficult!"
    },
    {
      title: "Fouls and Penalties",
      content: "Common fouls include: scratching (cue ball in pocket), hitting wrong ball first, not hitting any rail after contact, and jumping any ball off the table.",
      proTip: "Three consecutive fouls by the same player results in loss of game!"
    },
    {
      title: "Winning the Game",
      content: "Legally pocket the 10-ball to win! Yes, you can win with an early ten ball...Remember, you must call the 10-ball and the pocket, and hit the lowest numbered ball first.",
      proTip: "The 10-ball is the only ball that matters for winning!"
    },
    {
      title: "Strategy Tips",
      content: "Plan your shots ahead, use defensive play when needed, and always consider your opponent's options after your shot.",
      proTip: "Sometimes the best shot is the one that leaves your opponent nothing!"
    },
    {
      title: "Ready to Play!",
      content: "You now know the basics of 10-Ball! Practice these rules and strategies to improve your game.",
      proTip: "Practice makes perfect - keep playing and learning!"
    }
  ];

  const handleGameModeSelect = (mode) => {
    if (mode === 'tutorial') setSetupOpen(true);
  };

  const confirmSetup = ({ names, vsComputer: computer, match: nextMatch }) => {
    setPlayerNames(names);
    setVsComputer(computer);
    if (nextMatch) setMatch(nextMatch);
    setSetupOpen(false);
    if (currentMode === 'menu') {
      setCurrentMode('tutorial');
      setTutorialStep(0);
      setShowHints(true);
      setShowRules(true);
    }
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
    setGameState(prev => ({
      ...prev,
      gamePhase: 'end',
      player1Score: winner === 1 ? prev.player1Score + 1 : prev.player1Score,
      player2Score: winner === 2 ? prev.player2Score + 1 : prev.player2Score
    }));
  };

  const resetGame = () => {
    setGameState({
      player1Score: 0,
      player2Score: 0,
      currentPlayer: 1,
      gamePhase: 'break',
      rules: {
        callPocket: true,
        pushOut: true,
        threeFoulRule: true,
        jumpShots: true
      }
    });
  };

  const cancelMatch = () => {
    setSetupOpen(false);
    setShowRules(false);
    setCurrentMode('menu');
    setPlayerNames({ 1: '', 2: '' });
    setVsComputer(true);
    setMatch(DEFAULT_MATCH);
    resetGame();
  };

  const playing = currentMode === 'tutorial' || currentMode === 'game';
  const rulesOpen = currentMode === 'tutorial' && showRules;

  const renderContent = () => {
    switch (currentMode) {
      case 'menu':
        return (
          <GameModeSelector 
            onModeSelect={handleGameModeSelect}
            fromLogin={fromLogin}
          />
        );
      
      case 'tutorial':
      case 'game':
        return (
          <div className={styles.tutorialContainer}>
            <SimplePoolGame
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
              onEditPlayers={() => setSetupOpen(true)}
            />
          </div>
        );
      
      default:
        return <GameModeSelector onModeSelect={handleGameModeSelect} />;
    }
  };

  return (
    <div className={styles.container}>
      {renderContent()}
      
      {/* Contextual Tips Manager */}
      {(currentMode === 'game' || currentMode === 'tutorial') && (
        <TipManager 
          gameState={gameState}
          onTipShown={(tipKey) => console.log(`Tip shown: ${tipKey}`)}
          ref={(tipManagerRef) => {
            // Store the tip manager reference so the game can trigger tips
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
              }}
            >
              Show Tutorial
            </button>
          )}
        </div>
      )}
      
      {rulesOpen && (
        <TutorialRules
          step={tutorialSteps[tutorialStep]}
          currentStep={tutorialStep}
          totalSteps={tutorialSteps.length}
          onNext={handleTutorialNext}
          onBack={handleTutorialBack}
          onSkip={() => setShowRules(false)}
        />
      )}

      {setupOpen && (
        <PlayerSetupModal
          initialNames={playerNames}
          initialVsComputer={vsComputer}
          initialMatch={match}
          title={currentMode === 'menu' ? 'New match' : 'Edit match'}
          confirmLabel={currentMode === 'menu' ? 'Start' : 'Save'}
          onConfirm={confirmSetup}
          onCancel={() => setSetupOpen(false)}
          onCancelMatch={currentMode === 'menu' ? undefined : cancelMatch}
        />
      )}
    </div>
  );
};

export default TenBallTutorial; 