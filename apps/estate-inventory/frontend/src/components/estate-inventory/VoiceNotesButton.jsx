import React, { useEffect, useRef, useState } from 'react';

/**
 * Web Speech API dictation control for description fields.
 * Appends recognized text into the current value.
 */
const VoiceNotesButton = ({ value, onChange, disabled }) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    if (!SpeechRecognition) {
      setSupported(false);
      return undefined;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0]?.transcript || '')
        .join(' ')
        .trim();
      if (!transcript) return;
      const prev = (value || '').trim();
      onChange?.(prev ? `${prev} ${transcript}` : transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      setError('Voice input failed. Try again or type.');
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [onChange, value]);

  if (!supported) return null;

  const toggle = () => {
    setError('');
    const recognition = recognitionRef.current;
    if (!recognition || disabled) return;
    if (listening) {
      recognition.stop();
      setListening(false);
      return;
    }
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError('Could not start microphone.');
      setListening(false);
    }
  };

  return (
    <div className="ei-voice-wrap">
      <button
        type="button"
        className={`ei-btn ei-btn-secondary ei-btn-small ei-voice-btn${listening ? ' is-listening' : ''}`}
        onClick={toggle}
        disabled={disabled}
        aria-pressed={listening}
        title={listening ? 'Stop dictation' : 'Dictate description'}
      >
        {listening ? 'Listening…' : 'Mic'}
      </button>
      {error ? <span className="ei-voice-error">{error}</span> : null}
    </div>
  );
};

export default VoiceNotesButton;
