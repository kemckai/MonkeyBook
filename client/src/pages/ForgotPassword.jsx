import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [devUrl, setDevUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setDevUrl('');
    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
      if (result.dev_reset_url) setDevUrl(result.dev_reset_url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/monkeybook-logo.png" alt="Monkeybook" className="auth-logo" />
        <h1>Forgot password?</h1>
        <p className="auth-sub">Enter your email and we&apos;ll send a reset link.</p>
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}
        {devUrl && (
          <p className="auth-dev-link">
            Dev reset link: <a href={devUrl}>{devUrl}</a>
          </p>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <p className="auth-footer">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
