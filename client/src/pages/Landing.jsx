import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/MonkeyContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user, monkey } = useAuth();

  function handleEnter() {
    if (user && monkey) navigate('/feed');
    else if (user) navigate('/join');
    else navigate('/register');
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
            <span className="feature-emoji">👥</span>
            <span>Add friends and see their posts</span>
          </div>
          <div className="feature">
            <span className="feature-emoji">🍌</span>
            <span>Reward the chaos</span>
          </div>
        </div>
        <button className="landing-cta" onClick={handleEnter}>
          {user && monkey ? 'Back to the Jungle' : user ? 'Pick Your Monkey' : 'Enter the Jungle'}
        </button>
        {!user && (
          <p className="landing-returning">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        )}
        {user && monkey && (
          <p className="landing-returning">
            Welcome back, {monkey.monkey_emoji} {monkey.display_name || monkey.monkey_name}
          </p>
        )}
        <p className="landing-legal">
          <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link>
        </p>
      </div>
    </div>
  );
}
