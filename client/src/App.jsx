import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MonkeyProvider } from './context/MonkeyContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Join from './pages/Join';
import Feed from './pages/Feed';
import Thread from './pages/Thread';
import Profile from './pages/Profile';
import Troops from './pages/Troops';
import TroopFeed from './pages/TroopFeed';
import Friends from './pages/Friends';
import Admin from './pages/Admin';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import './App.css';
import WebSocketBridge from './components/WebSocketBridge';

export default function App() {
  return (
    <BrowserRouter>
      <MonkeyProvider>
        <WebSocketBridge />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/join" element={<ProtectedRoute requireMonkey={false}><Join /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/post/:id" element={<ProtectedRoute><Thread /></ProtectedRoute>} />
          <Route path="/monkey/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/troops" element={<ProtectedRoute><Troops /></ProtectedRoute>} />
          <Route path="/troop/:id" element={<ProtectedRoute><TroopFeed /></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireMonkey={false}><Admin /></ProtectedRoute>} />
        </Routes>
      </MonkeyProvider>
    </BrowserRouter>
  );
}
