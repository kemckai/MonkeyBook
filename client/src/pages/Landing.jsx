import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMonkey } from '../context/MonkeyContext';

export default function Landing() {
  const navigate = useNavigate();
  const { monkey } = useMonkey();

  function handleEnter() {
    if (monkey) {
      navigate('/feed');
    } else {
      navigate('/join');
    }
  }

  return (
    <div className="landing">
      <div className="landing-hero">
        <img src="/monkeybook-logo.png" alt="Monkeybook" className="landing-logo" />
        <h1 className="landing-title">Monkeybook</h1>
        <p className="landing-tagline">
          Say what you really think.<br />
          Nobody knows which monkey you are.
        </p>
        <div className="landing-features">
          <div className="feature">
            <span className="feature-emoji">🐵</span>
            <span>Get a random monkey identity</span>
          </div>
          <div className="feature">
            <span className="feature-emoji">💩</span>
            <span>Be brutally honest</span>
          </div>
          <div className="feature">
            <span className="feature-emoji">🍌</span>
            <span>Reward the chaos</span>
          </div>
        </div>
        <button className="landing-cta" onClick={handleEnter}>
          {monkey ? 'Back to the Jungle' : 'Enter the Jungle'}
        </button>
        {monkey && (
          <p className="landing-returning">
            Welcome back, {monkey.monkey_emoji} {monkey.monkey_name}
          </p>
        )}
      </div>
    </div>
  );
}
