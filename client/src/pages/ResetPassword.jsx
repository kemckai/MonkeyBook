import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('Missing reset token');
      return;
    }
    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      setMessage(result.message);
      setTimeout(() => navigate('/login'), 2000);
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
        <h1>Set new password</h1>
        <p className="auth-sub">Choose a new password for your account.</p>
        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <input type="password" placeholder="New password (8+ chars)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          <input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
          <button type="submit" className="btn-primary" disabled={loading || !token}>
            {loading ? 'Saving...' : 'Update Password'}
          </button>
        </form>
        <p className="auth-footer">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
