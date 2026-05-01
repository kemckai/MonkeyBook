import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkIdentity, claimIdentity, rerollIdentity, updateBio } from '../api';

const MonkeyContext = createContext(null);

export function MonkeyProvider({ children }) {
  const [monkey, setMonkey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkIdentity()
      .then(setMonkey)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const claim = useCallback(async () => {
    const identity = await claimIdentity();
    setMonkey(identity);
    return identity;
  }, []);

  const reroll = useCallback(async () => {
    const identity = await rerollIdentity();
    setMonkey(identity);
    return identity;
  }, []);

  const setBio = useCallback(async (bio) => {
    const result = await updateBio(bio);
    setMonkey(m => ({ ...m, bio: result.bio }));
  }, []);

  return (
    <MonkeyContext.Provider value={{ monkey, loading, claim, reroll, setBio, setMonkey }}>
      {children}
    </MonkeyContext.Provider>
  );
}

export function useMonkey() {
  const ctx = useContext(MonkeyContext);
  if (!ctx) throw new Error('useMonkey must be used within MonkeyProvider');
  return ctx;
}
