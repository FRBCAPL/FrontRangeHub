import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ContextualTip from './ContextualTip';

const OPENING_TIP = {
  key: 'break-open',
  text: 'Break from the kitchen. Hit the 1-ball first, and either pocket a ball or drive four balls to a rail.'
};

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

const TipManager = forwardRef(({ onTipShown }, ref) => {
  const [queue, setQueue] = useState(() => (window.__tenballTipAllow === false ? [] : [OPENING_TIP]));
  const [currentTip, setCurrentTip] = useState(null);
  const [isTipVisible, setIsTipVisible] = useState(false);
  const [tipsAllowed, setTipsAllowed] = useState(() => window.__tenballTipAllow !== false);
  const seen = useRef(new Set([OPENING_TIP.key]));

  const enqueue = (tip) => {
    if (window.__tenballTipAllow === false) return;
    if (!tip?.key || !tip?.text || seen.current.has(tip.key)) return;
    seen.current.add(tip.key);
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
      const { key, text } = event.detail || {};
      enqueue({ key, text });
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
