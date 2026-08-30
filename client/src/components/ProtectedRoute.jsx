import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/MonkeyContext';

export default function ProtectedRoute({ children, requireMonkey = true }) {
  const { user, monkey, loading } = useAuth();

  if (loading) {
    return <div className="loading full-page">Loading...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (requireMonkey && !monkey) return <Navigate to="/join" replace />;
  return children;
}
