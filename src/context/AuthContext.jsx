import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { clearSupabaseStorage, isSupabaseConfigured, setRememberMe, supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const AUTH_TIMEOUT_MS = 45000;
const PROFILE_TIMEOUT_MS = 10000;
const logDevError = (...args) => {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
};

function withAuthTimeout(promise, action) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`${action} is taking too long. Check Supabase Auth logs and database trigger errors, then try again.`));
      }, AUTH_TIMEOUT_MS);
    }),
  ]);
}

function withProfileTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error('Profile is taking too long to load. Check the customers table and RLS policies.'));
      }, PROFILE_TIMEOUT_MS);
    }),
  ]);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const initializedRef = useRef(false);
  const profileRef = useRef(null);

  const fetchProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      return null;
    }

    setProfileLoading(true);
    try {
      const { data, error } = await withProfileTimeout(
        supabase
          .from('customers')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle(),
      );

      if (error) {
        throw error;
      }

      setProfile(data);
      return data;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error) {
        logDevError(error);
      }

      const currentSession = data?.session ?? null;
      const currentUser = currentSession?.user ?? null;
      setSession(currentSession);
      setUser(currentUser);

      if (currentUser) {
        try {
          await fetchProfile(currentUser);
        } catch (profileError) {
          logDevError(profileError);
        }
      } else {
        setProfile(null);
      }

      initializedRef.current = true;
      setLoading(false);
    }

    initializeSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);
      setUser(nextUser);

      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }

      if (!nextUser) {
        setProfile(null);
        return;
      }

      const shouldRefreshProfile = event === 'SIGNED_IN'
        || event === 'USER_UPDATED'
        || !profileRef.current;

      if (!shouldRefreshProfile) {
        return;
      }

      fetchProfile(nextUser).catch((error) => {
        logDevError(error);
      });
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = useCallback(async ({ name, email, password }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Add your environment variables and restart the dev server.');
    }

    // New registrations default to session-only (no remember me)
    setRememberMe(false);

    const { data, error } = await withAuthTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      }),
      'Account creation',
    );

    if (error) throw error;

    return data;
  }, []);

  const signIn = useCallback(async ({ email, password, rememberMe = false }) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Add your environment variables and restart the dev server.');
    }

    // Store the remember-me preference BEFORE signing in.
    // The Supabase client was already created with the previous preference;
    // on next page load it will read the updated flag.
    setRememberMe(rememberMe);

    const { data, error } = await withAuthTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      'Sign in',
    );
    if (error) throw error;
    return data;
  }, []);

  const resetPassword = useCallback(async (email) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Add your environment variables and restart the dev server.');
    }
    const redirectTo = `${window.location.origin}/login`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    // Immediately clear React state
    setSession(null);
    setUser(null);
    setProfile(null);

    try {
      const { error } = await withAuthTimeout(
        supabase.auth.signOut({ scope: 'local' }),
        'Sign out',
      );
      if (error) throw error;
    } finally {
      // Regardless of success/failure, nuke every Supabase token
      // from localStorage and sessionStorage to prevent stale sessions.
      clearSupabaseStorage();
    }
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!user) throw new Error('You must be signed in to update your profile.');

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  }, [user]);

  const updatePassword = useCallback(async (password) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return data;
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!user) throw new Error('You must be signed in to delete your account.');

    await supabase.from('customers').delete().eq('user_id', user.id);
    await signOut();
  }, [signOut, user]);

  const value = useMemo(() => ({
    session,
    user,
    profile,
    loading,
    profileLoading,
    signUp,
    signIn,
    resetPassword,
    signOut,
    updateProfile,
    updatePassword,
    deleteAccount,
    refreshProfile: () => fetchProfile(user),
    isAdmin: ['admin', 'super_admin'].includes(user?.app_metadata?.role),
    isSuperAdmin: user?.app_metadata?.role === 'super_admin',
  }), [deleteAccount, fetchProfile, loading, profile, profileLoading, resetPassword, session, signIn, signOut, signUp, updatePassword, updateProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
