import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, prefetchUserWorkspace } from '../services/api.js';
import { supabase, isSupabaseConfigured } from '../services/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setUser(null);
      return null;
    }

    // Retry logic for backend API call to handle timing issues
    let retries = 3;
    let lastError;
    while (retries > 0) {
      try {
        const profile = await getMe();
        setUser(profile.user);
        if (profile.user?.id && Number(profile.user.monthly_budget) > 0) {
          prefetchUserWorkspace(profile.user.id);
        }
        return profile.user;
      } catch (error) {
        lastError = error;
        if (error.response?.status === 401 && retries > 1) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 200));
          retries--;
          continue;
        }
        break;
      }
    }
    
    // If all retries failed, set user to null
    console.error('Failed to refresh user profile after retries:', lastError);
    setUser(null);
    return null;
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    refreshUser()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }
      refreshUser().catch(() => setUser(null));
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
