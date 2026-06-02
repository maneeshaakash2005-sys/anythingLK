import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

const REMEMBER_ME_KEY = 'orderbase-remember-me';

/**
 * Check if the user previously chose "Remember me".
 * When false, Supabase stores tokens only in memory/sessionStorage
 * so they are cleared when the browser tab/window is closed.
 */
function shouldPersist() {
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Mark "Remember me" preference (called before sign-in). */
export function setRememberMe(value) {
  try {
    if (value) {
      localStorage.setItem(REMEMBER_ME_KEY, 'true');
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  } catch {
    // Storage unavailable — fall through
  }
}

/**
 * Remove every Supabase-related key from both localStorage and sessionStorage.
 * Called on sign-out to guarantee no stale session survives.
 */
export function clearSupabaseStorage() {
  try {
    const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(storageKey);
    // Belt-and-suspenders: also remove any variant keys Supabase may have written
    [localStorage, sessionStorage].forEach((store) => {
      const keysToRemove = [];
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key && (key.startsWith('sb-') || key.startsWith('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => store.removeItem(key));
    });
    localStorage.removeItem(REMEMBER_ME_KEY);
  } catch {
    // Storage unavailable — nothing to clear
  }
}

export const supabase = createClient(supabaseUrl || 'https://example.supabase.co', supabaseAnonKey || 'missing-key', {
  auth: {
    persistSession: shouldPersist(),
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // When persistSession is false Supabase defaults to in-memory storage
    // which is exactly what we want for non-remembered sessions.
  },
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
  },
});
