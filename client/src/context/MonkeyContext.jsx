import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAuthMe,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  googleLogin,
  claimIdentity,
  rerollMonkey,
  updateBio,
} from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [monkey, setMonkey] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await getAuthMe();
    if (!data) {
      setUser(null);
      setMonkey(null);
      return null;
    }
    setUser({ id: data.id, email: data.email, is_admin: data.is_admin });
    setMonkey(data.monkey);
    return data;
  }, []);

  useEffect(() => {
    refresh().catch(console.error).finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    setUser({ id: data.id, email: data.email, is_admin: data.is_admin });
    setMonkey(data.monkey);
    return data;
  }, []);

  const register = useCallback(async (email, password) => {
    const data = await apiRegister(email, password);
    setUser({ id: data.id, email: data.email, is_admin: data.is_admin });
    setMonkey(data.monkey);
    return data;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const data = await googleLogin(credential);
    setUser({ id: data.id, email: data.email, is_admin: data.is_admin });
    setMonkey(data.monkey);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setMonkey(null);
  }, []);

  const claim = useCallback(async () => {
    const identity = await claimIdentity();
    setMonkey(identity);
    return identity;
  }, []);

  const reroll = useCallback(async () => {
    const identity = await rerollMonkey();
    setMonkey(identity);
    return identity;
  }, []);

  const setBio = useCallback(async (bio) => {
    const result = await updateBio(bio);
    setMonkey((m) => (m ? { ...m, bio: result.bio } : m));
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      monkey,
      loading,
      login,
      register,
      loginWithGoogle,
      logout,
      claim,
      reroll,
      setBio,
      refresh,
      setMonkey,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** @deprecated use useAuth */
export function useMonkey() {
  return useAuth();
}

export const MonkeyProvider = AuthProvider;
