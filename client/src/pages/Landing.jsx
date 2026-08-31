import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/MonkeyContext';

const PROMO_URL = 'https://monkeybook.fun';
const PROMO_TEXT = 'Join me on Monkeybook — say what you really think. Nobody knows which monkey you are.';

function SharePromo() {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState('');

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(PROMO_URL);
      setCopied(true);
      setShareError('');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShareError('Could not copy — try selecting the link manually.');
    }
  }

  async function shareLink() {
    setShareError('');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Monkeybook',
          text: PROMO_TEXT,
          url: PROMO_URL,
        });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    await copyLink();
  }

  return (
    <div className="landing-share">
      <p className="landing-share__label">Share Monkeybook</p>
      <p className="landing-share__hint">Send this link — friends land here and can sign up free.</p>
      <div className="landing-share__url" aria-label="Promo link">{PROMO_URL}</div>
      <div className="landing-share__actions">
        <button type="button" className="btn-primary btn-sm" onClick={shareLink}>
          Share link
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={copyLink}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
      {shareError && <p className="landing-share__error">{shareError}</p>}
    </div>
  );
}

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
        <SharePromo />
      </div>
    </div>
  );
}
