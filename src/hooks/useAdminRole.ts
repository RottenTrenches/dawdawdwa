import { useState, useEffect } from 'react';

// For now, admin access is disabled for public users
// In the future, this could check against a session/cookie or local storage
export const useAdminRole = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(false);

  // Admin functionality is currently disabled
  // All users have equal access to public features

  return { isAdmin, isModerator, loading };
};
