import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMonkey } from '../context/MonkeyContext';

export default function Join() {
  const navigate = useNavigate();
  const { monkey, claim, reroll } = useMonkey();
  const [preview, setPreview] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (monkey && !preview) {
      navigate('/feed');
      return;
    }
    if (!preview && !monkey) {
      claim().then(setPreview);
    }
  }, [monkey, preview, claim, navigate]);

  async function handleReroll() {
    setRolling(true);
    try {
      const identity = await reroll();
      setPreview(identity);
    } finally {
      setRolling(false);
    }
  }

  function handleAccept() {
    setEntered(true);
    navigate('/feed');
  }

  if (!preview) {
    return (
      <div className="join">
        <div className="join-card">
          <p className="join-loading">Summoning your monkey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="join">
      <div className="join-card">
        <h2 className="join-heading">Your Monkey Identity</h2>
        <div className={`join-reveal ${rolling ? 'rolling' : ''}`}>
          <span className="join-emoji">{preview.monkey_emoji}</span>
          <span className="join-name">{preview.monkey_name}</span>
        </div>
        <p className="join-disclaimer">
          This is you now. Nobody will know who's behind the monkey.
        </p>
        <div className="join-actions">
          <button className="btn-accept" onClick={handleAccept}>
            I Accept My Fate
          </button>
          <button className="btn-reroll" onClick={handleReroll} disabled={rolling}>
            {rolling ? 'Rolling...' : 'Nah, Re-roll'}
          </button>
        </div>
      </div>
    </div>
  );
}
