import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/MonkeyContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/feed');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle(response) {
    setError('');
    setLoading(true);
    loginWithGoogle(response.credential)
      .then(() => navigate('/feed'))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogle,
      });
      window.google?.accounts.id.renderButton(
        document.getElementById('google-signin'),
        { theme: 'outline', size: 'large', width: 320 }
      );
    };
    document.body.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/monkeybook-logo.png" alt="Monkeybook" className="auth-logo" />
        <h1>Welcome back</h1>
        <p className="auth-sub">Log in to return to the jungle.</p>
        {error && <p className="auth-error">{error}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Logging in...' : 'Log In'}</button>
        </form>
        {GOOGLE_CLIENT_ID && (
          <>
            <div className="auth-divider">or</div>
            <div id="google-signin" className="google-btn-wrap" />
          </>
        )}
        <p className="auth-footer">
          <Link to="/forgot-password">Forgot password?</Link>
          {' · '}
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
