import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Storage key for Supabase session persistence
const STORAGE_KEY = 'pallet-auth-session';

/**
 * CRITICAL: Clear stale/expired session data BEFORE Supabase client initializes
 * This prevents Supabase from hanging while trying to refresh very old tokens
 * Must run synchronously before createClient() is called
 */
function clearStaleSessionBeforeInit(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const parsed = JSON.parse(stored);
    const expiresAt = parsed?.expires_at;

    if (expiresAt) {
      // expires_at is in seconds since epoch
      const expiryTime = expiresAt * 1000;
      const now = Date.now();
      // If token expired more than 1 hour ago, clear it to prevent refresh hangs
      if (now > expiryTime + (60 * 60 * 1000)) {
        console.log('[Supabase] Clearing expired session data before init');
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch (e) {
    // If data is corrupted/unparseable, clear it
    console.log('[Supabase] Clearing corrupted session data before init');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore if localStorage is unavailable
    }
  }
}

// Run cleanup BEFORE creating the Supabase client
clearStaleSessionBeforeInit();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: STORAGE_KEY,
    flowType: 'pkce' // More secure auth flow
  }
});

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper function to sign in
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
};

// Helper function to sign up
export const signUp = async (email: string, password: string, displayName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName
      }
    }
  });
  if (error) throw error;
  return data;
};

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Helper function to upload art file to storage
export const uploadArtFile = async (
  file: File,
  orderId: string,
  fileType: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${orderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('art-files')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('art-files')
    .getPublicUrl(fileName);

  return publicUrl;
};

// Helper function to download art file from storage
export const downloadArtFile = async (path: string): Promise<Blob> => {
  const { data, error } = await supabase.storage
    .from('art-files')
    .download(path);

  if (error) throw error;
  return data;
};

// Helper function to delete art file from storage
export const deleteArtFile = async (path: string): Promise<void> => {
  const { error } = await supabase.storage
    .from('art-files')
    .remove([path]);

  if (error) throw error;
};

// Helper to generate order number
export const generateOrderNumber = async (prefix: string = 'TBD'): Promise<string> => {
  const { data, error } = await supabase.rpc('generate_order_number', { prefix });
  if (error) throw error;
  return data;
};

// Helper to search orders
export const searchOrders = async (query: string) => {
  const { data, error } = await supabase.rpc('search_orders', {
    search_query: query
  });
  if (error) throw error;
  return data;
};

// Helper to refresh analytics
export const refreshAnalytics = async () => {
  const { error } = await supabase.rpc('refresh_analytics_views');
  if (error) throw error;
};
