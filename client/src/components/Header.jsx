import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/MonkeyContext';
import { useTheme } from '../hooks/useTheme';
import { getNotifications, markAllRead } from '../api';
import MonkeyAvatar from './MonkeyAvatar';

export default function Header() {
  const { user, monkey, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const notifRef = useRef(null);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!monkey) return;
    const fetchNotifs = () => {
      getNotifications().then(data => {
        setUnread(data.unread_count);
        setNotifs(data.notifications.slice(0, 10));
      }).catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);

    const onWs = (e) => {
      const { event, data } = e.detail;
      if (event !== 'new_notification') return;
      if (data?.monkey_id != null && data.monkey_id !== monkey.id) return;
      fetchNotifs();
    };
    window.addEventListener('monkeybook-ws', onWs);
    return () => {
      clearInterval(interval);
      window.removeEventListener('monkeybook-ws', onWs);
    };
  }, [monkey]);

  useEffect(() => {
    if (!showNotifs) return;
    function handleOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [showNotifs]);

  async function handleBellClick() {
    setShowNotifs(!showNotifs);
    if (!showNotifs && unread > 0) {
      await markAllRead();
      setUnread(0);
    }
  }

  return (
    <header className="header">
      <Link to="/" className="header-left">
        <img src="/monkeybook-logo.png" alt="Monkeybook" className="logo" />
      </Link>
      <button
        type="button"
        className="nav-menu-btn"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      >
        {menuOpen ? '✕' : '☰'}
      </button>
      {menuOpen && (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
        <Link to="/feed" className="nav-link">Feed</Link>
        <Link to="/friends" className="nav-link">Friends</Link>
        <Link to="/troops" className="nav-link">Troops</Link>
        {user?.is_admin && <Link to="/admin" className="nav-link">Admin</Link>}
      </nav>
      <div className="header-right">
        <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {monkey && (
          <>
            <div className="notif-wrap" ref={notifRef}>
              <button className="bell-btn" onClick={handleBellClick} aria-label="Notifications">
                🔔{unread > 0 && <span className="badge">{unread}</span>}
              </button>
              {showNotifs && (
                <div className="notif-dropdown">
                  {notifs.length === 0 ? (
                    <p className="notif-empty">No notifications yet</p>
                  ) : (
                    notifs.map(n => (
                      <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                        {n.message}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <Link to={`/monkey/${monkey.id}`} className="monkey-badge">
              <MonkeyAvatar monkeyId={monkey.id} size={28} />
              <span className="monkey-name">{monkey.display_name || monkey.monkey_name}</span>
              {monkey.streak_count > 1 && <span className="streak">🔥{monkey.streak_count}</span>}
            </Link>
            <button className="logout-btn" onClick={logout} title="Log out" aria-label="Log out">⎋</button>
          </>
        )}
      </div>
    </header>
  );
}
