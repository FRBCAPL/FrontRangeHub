import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ContextualTip from './ContextualTip';
import { BREAK_OPENING_TIP, EIGHT_BREAK_OPENING_TIP, NINE_BREAK_OPENING_TIP, ONE_POCKET_BREAK_OPENING_TIP } from './tutorialGuide';
import { GAME_EIGHT, GAME_NINE, GAME_ONE_POCKET } from './gameRules';

const TIP_MUTE_KEY = 'frph-tenball-tip-mute';

export function readMutedTipSeats() {
  try {
    const raw = JSON.parse(localStorage.getItem(TIP_MUTE_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw.map(Number) : []);
  } catch {
    return new Set();
  }
}

export function writeMutedTipSeats(seats) {
  localStorage.setItem(TIP_MUTE_KEY, JSON.stringify([...seats]));
}

const TipManager = forwardRef(({ onTipShown, gameType }, ref) => {
  const openingTip = {
    key: 'break-open',
    text: gameType === GAME_NINE
      ? NINE_BREAK_OPENING_TIP
      : gameType === GAME_EIGHT
        ? EIGHT_BREAK_OPENING_TIP
        : gameType === GAME_ONE_POCKET
          ? ONE_POCKET_BREAK_OPENING_TIP
          : BREAK_OPENING_TIP
  };
  // Mounted only after the rules tutorial is closed — start with the break tip.
  const [queue, setQueue] = useState(() => [openingTip]);
  const [currentTip, setCurrentTip] = useState(null);
  const [isTipVisible, setIsTipVisible] = useState(false);
  const [tipsAllowed, setTipsAllowed] = useState(true);
  const seen = useRef(new Set([openingTip.key]));

  const enqueue = (tip) => {
    if (window.__tenballTipAllow === false) return;
    if (!tip?.key || !tip?.text) return;
    // Most tips show once per game. Ball-in-hand / foul tips may repeat.
    if (!tip.repeat && seen.current.has(tip.key)) return;
    if (!tip.repeat) seen.current.add(tip.key);
    window.dispatchEvent(new CustomEvent('tableTipVisibility', { detail: { open: true } }));
    setQueue((pending) => [...pending, tip]);
    onTipShown?.(tip.key);
  };

  useImperativeHandle(ref, () => ({
    triggerTip: (tipKey) => enqueue({ key: tipKey, text: tipKey }),
    resetTips: () => {
      seen.current = new Set();
      setQueue([]);
      setCurrentTip(null);
      setIsTipVisible(false);
    }
  }));

  useEffect(() => {
    const sync = () => setTipsAllowed(window.__tenballTipAllow !== false);
    window.addEventListener('tableTipAudience', sync);
    return () => window.removeEventListener('tableTipAudience', sync);
  }, []);

  useEffect(() => () => {
    window.dispatchEvent(new CustomEvent('tableTipVisibility', { detail: { open: false } }));
  }, []);

  useEffect(() => {
    if (!tipsAllowed) {
      if (isTipVisible || queue.length > 0) {
        setQueue([]);
        setCurrentTip(null);
        setIsTipVisible(false);
      }
      return;
    }
    if (isTipVisible || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setCurrentTip(next);
    setIsTipVisible(true);
  }, [isTipVisible, queue, tipsAllowed]);

  useEffect(() => {
    const open = isTipVisible || queue.length > 0;
    window.dispatchEvent(new CustomEvent('tableTipVisibility', { detail: { open } }));
  }, [isTipVisible, queue.length]);

  useEffect(() => {
    const onTableTip = (event) => {
      const { key, text, repeat } = event.detail || {};
      enqueue({ key, text, repeat: Boolean(repeat) });
    };
    window.addEventListener('tableTip', onTableTip);
    return () => window.removeEventListener('tableTip', onTableTip);
  }, []);

  return (
    <ContextualTip
      tip={currentTip?.text}
      isVisible={isTipVisible}
      onClose={() => {
        setIsTipVisible(false);
        setCurrentTip(null);
      }}
      onStopTips={() => {
        window.dispatchEvent(new CustomEvent('tableTipMute'));
      }}
    />
  );
});

export default TipManager;
