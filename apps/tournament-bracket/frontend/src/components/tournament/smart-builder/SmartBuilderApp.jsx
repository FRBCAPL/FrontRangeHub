import React, { useEffect, useRef, useState } from 'react';
import { createBuilderSession, INITIAL_STATE } from './builderSession.js';
import { FORM_DEFAULTS, parseBuilderForm } from './builderForm.js';
import { UNCALIBRATED_NOTE } from './builderFlags.js';
import { createHandoff, handoffNote, handoffProblem } from './builderHandoff.js';
import SmartBuilderInputs from './SmartBuilderInputs.jsx';
import SmartBuilderStatus from './SmartBuilderStatus.jsx';
import SmartBuilderResults from './SmartBuilderResults.jsx';
import './SmartBuilder.css';

/**
 * Planning screen. The worker starts when the screen opens and is shut down when it closes.
 * `onUseSettings(handoff)`: optional; hands one checked recommendation to the normal setup screen.
 * `showdownOpen`: a Showdown event is already loaded on this tablet (its usual confirmation comes first).
 */
export default function SmartBuilderApp({ onBack, onUseSettings = null, showdownOpen = false, createSession = createBuilderSession }) {
  const [form, setForm] = useState(FORM_DEFAULTS);
  const [state, setState] = useState(INITIAL_STATE);
  const [useError, setUseError] = useState('');
  const session = useRef(null);
  const formRef = useRef(form);

  useEffect(() => {
    const s = createSession({ onChange: setState });
    session.current = s;
    s.update(formRef.current);
    return () => {
      session.current = null;
      s.dispose();
    };
  }, [createSession]);

  const change = (patch) => {
    const next = { ...formRef.current, ...patch };
    formRef.current = next;
    setForm(next);
    setUseError('');
    session.current?.update(next);
  };

  const context = () => ({ currentInputs: parseBuilderForm(formRef.current).raw });
  const use = (m) => {
    const { handoff, problem } = createHandoff(m, state.result, context());
    if (problem) {
      setUseError(problem);
      return;
    }
    onUseSettings(handoff);
  };

  return (
    <div className="sb-app">
      <header className="tb-header">
        <h1>Help me choose</h1>
        <p>Describe your night and the Smart Builder suggests a format and settings that fit.</p>
      </header>
      <p className="sb-preview-note">
        Suggestions only. Nothing is saved{onUseSettings ? '. Use these settings only fills in the normal setup screen, where you review and start the event' : ' and no tournament is created'}.
      </p>
      <SmartBuilderInputs form={form} problems={state.problems} onChange={change} />
      {useError ? <p className="sb-use-error" role="alert">{useError}</p> : null}
      {state.status === 'final'
        ? (
          <SmartBuilderResults
            result={state.result}
            onTry={change}
            onUse={onUseSettings ? use : null}
            useProblem={(m) => handoffProblem(m, state.result, context())}
            useNote={(m) => handoffNote(m, { showdownOpen })}
          />
        )
        : <SmartBuilderStatus state={state} onStop={() => session.current?.stop()} onRetry={() => session.current?.retry()} />}
      <p className="sb-estimate-note">{UNCALIBRATED_NOTE} Times are planning estimates from an assumed pace of play.</p>
      <button type="button" className="tb-btn-new" onClick={onBack}>Back to tournament formats</button>
    </div>
  );
}
