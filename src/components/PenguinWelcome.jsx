import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import WavingPenguin from './WavingPenguin';

const LEAVE_MS = 750;

// Greeting shown before the Penguin AI chat: a waving penguin and an
// "Enter Penguin World" button that plays a zoom-in transition.
export default function PenguinWelcome({ firstName = '', onEnter }) {
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    buttonRef.current?.focus();
    return () => clearTimeout(timerRef.current);
  }, []);

  const enter = () => {
    if (leaving) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setLeaving(true);
    timerRef.current = setTimeout(onEnter, reduced ? 0 : LEAVE_MS);
  };

  return (
    <div className={`pw-splash ${leaving ? 'is-leaving' : ''}`}>
      <div className="pw-sky" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => <span key={i} className={`pw-flake pw-flake-${i % 7}`} />)}
      </div>

      <div className="pw-content">
        <div className="pw-penguin-wrap">
          <div className="pw-bubble" aria-hidden="true">Hi{firstName ? `, ${firstName}` : ''}!</div>
          <WavingPenguin size={260} className="pw-penguin" />
        </div>

        <h1 className="pw-title">Hi{firstName ? ` ${firstName}` : ''}, I'm Penguin</h1>
        <p className="pw-sub">Your AI buddy for job hunting, resume reviews and interview prep.</p>

        <button ref={buttonRef} type="button" className="pw-enter-btn" onClick={enter}>
          Enter Penguin World
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
