/**
 * Reset Users Script
 *
 * This script clears all users from the database and prepares for fresh setup.
 * Run this when you see "users exist but none have authentication linked" error.
 *
 * Usage: Open the browser console at the app URL and paste the contents of resetUsers()
 */

import { supabase } from '../src/lib/supabase';

export async function resetUsers() {
  console.log('[Reset] Starting user reset...');

  try {
    // Delete all users from the users table
    const { error } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that matches all)

    if (error) {
      console.error('[Reset] Failed to delete users:', error);
      return { success: false, error: error.message };
    }

    console.log('[Reset] All users deleted successfully');
    console.log('[Reset] Refresh the page to run setup wizard');

    return { success: true };
  } catch (e) {
    console.error('[Reset] Error:', e);
    return { success: false, error: String(e) };
  }
}
