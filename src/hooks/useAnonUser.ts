import { useState, useEffect } from 'react';

// Generate a persistent anonymous user ID stored in localStorage
const ANON_USER_KEY = 'rotten_trenches_user_id';

const generateAnonId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useAnonUser = () => {
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Check localStorage for existing ID
    let storedId = localStorage.getItem(ANON_USER_KEY);
    
    if (!storedId) {
      storedId = generateAnonId();
      localStorage.setItem(ANON_USER_KEY, storedId);
    }
    
    setUserId(storedId);
  }, []);

  return {
    userId,
    isReady: userId !== '',
  };
};

// Helper to get user ID synchronously (for non-hook contexts)
export const getAnonUserId = (): string => {
  let storedId = localStorage.getItem(ANON_USER_KEY);
  
  if (!storedId) {
    storedId = generateAnonId();
    localStorage.setItem(ANON_USER_KEY, storedId);
  }
  
  return storedId;
};
