import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MonkeyProvider } from './context/MonkeyContext';
import Landing from './pages/Landing';
import Join from './pages/Join';
import Feed from './pages/Feed';
import Thread from './pages/Thread';
import Profile from './pages/Profile';
import Troops from './pages/Troops';
import TroopFeed from './pages/TroopFeed';
import './App.css';
import WebSocketBridge from './components/WebSocketBridge';

export default function App() {
  return (
    <BrowserRouter>
      <MonkeyProvider>
        <WebSocketBridge />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/join" element={<Join />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/post/:id" element={<Thread />} />
          <Route path="/monkey/:id" element={<Profile />} />
          <Route path="/troops" element={<Troops />} />
          <Route path="/troop/:id" element={<TroopFeed />} />
        </Routes>
      </MonkeyProvider>
    </BrowserRouter>
  );
}
