/**
 * Auth Service - Enterprise-Grade Supabase Auth Integration
 *
 * CRITICAL ARCHITECTURE NOTES:
 *
 * 1. SESSION MANAGEMENT:
 *    - Supabase's signUp() auto-signs in the new user, replacing the current session
 *    - This breaks multi-terminal support if not handled properly
 *    - Solution: We save/restore admin sessions during user creation
 *
 * 2. MULTI-TERMINAL SUPPORT:
 *    - Sessions are stored in localStorage by Supabase
 *    - Each browser/terminal has its own session
 *    - JWT tokens are validated server-side, allowing concurrent logins
 *
 * 3. USER CREATION FLOW:
 *    - Setup (no admin logged in): signUp -> signOut (safe)
 *    - Admin creating user: save session -> signUp -> restore session
 */

import { createClient, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { User as AppUser, UserRole } from '../../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

// NOTE: We no longer use hardcoded DEFAULT_USERS for setup.
// Instead, we read existing users from the database and create matching auth accounts.
// This ensures email addresses match between the users table and Supabase Auth.

const DEFAULT_PASSWORD = 'Password123!';

// Delay between auth operations to avoid rate limiting
const AUTH_OPERATION_DELAY_MS = 1000;

// ============================================================================
// TYPES
// ============================================================================

export interface SetupStatus {
  needsSetup: boolean;
  usersTableExists: boolean;
  usersTableCount: number;
  usersWithAuthCount: number;
  message: string;
  details?: {
    missingAuthUsers: string[];
    existingUsers: string[];
  };
}

export interface SetupResult {
  success: boolean;
  usersCreated: string[];
  usersSkipped: string[];
  errors: string[];
}

export interface AuthDiagnostics {
  supabaseConnected: boolean;
  usersTableAccessible: boolean;
  currentSession: boolean;
  sessionUserId: string | null;
  linkedUserProfile: boolean;
  userProfileId: string | null;
  errors: string[];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Delay execution - used to avoid rate limiting
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a consistent log prefix with timestamp
 */
const log = (level: 'INFO' | 'WARN' | 'ERROR', ...args: any[]) => {
  const timestamp = new Date().toISOString();
  const prefix = `[AuthService ${timestamp}] [${level}]`;
  if (level === 'ERROR') {
    console.error(prefix, ...args);
  } else if (level === 'WARN') {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
};

/**
 * Create a secondary Supabase client for admin operations
 * This client is isolated and won't affect the main app's session
 */
const createAdminClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // CRITICAL: Don't persist this session
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'pallet-admin-temp', // Separate storage key for temp operations
      flowType: 'pkce'
    }
  });
};

/**
 * Verify that a user has auth_user_id properly linked
 * Returns the auth_user_id if linked, null otherwise
 */
export async function verifyUserAuthLink(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('auth_user_id')
    .eq('id', userId)
    .single();

  if (error || !data) {
    log('ERROR', `Failed to verify auth link for user ${userId}:`, error);
    return null;
  }

  return data.auth_user_id;
}

/**
 * Repair a user's auth link by finding their auth account and linking it
 * This is useful when auth_user_id is missing but the auth account exists
 */
export async function repairUserAuthLink(
  userId: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  log('INFO', `Attempting to repair auth link for user with email: ${email}`);

  const adminClient = createAdminClient();

  try {
    // Try to sign in with the email/password to get the auth user ID
    const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      log('ERROR', 'Failed to sign in to get auth ID:', signInError);
      return { success: false, error: `Auth account not found or wrong password: ${signInError.message}` };
    }

    if (!signInData.user?.id) {
      return { success: false, error: 'No user ID returned from auth' };
    }

    const authUserId = signInData.user.id;

    // Sign out from the admin client
    await adminClient.auth.signOut();

    // Update the users table with the auth_user_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ auth_user_id: authUserId })
      .eq('id', userId);

    if (updateError) {
      log('ERROR', 'Failed to update auth_user_id:', updateError);
      return { success: false, error: `Database update failed: ${updateError.message}` };
    }

    // Verify the link was saved
    const verifiedId = await verifyUserAuthLink(userId);
    if (verifiedId !== authUserId) {
      log('ERROR', 'Auth link verification failed after update');
      return { success: false, error: 'Link verification failed - auth_user_id not saved' };
    }

    log('INFO', `Successfully repaired auth link for user ${userId}`);
    return { success: true };

  } catch (error) {
    log('ERROR', 'Unexpected error in repairUserAuthLink:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// DIAGNOSTICS
// ============================================================================

/**
 * Run comprehensive diagnostics on the auth system
 * Use this to debug login issues
 */
export async function runAuthDiagnostics(): Promise<AuthDiagnostics> {
  const diagnostics: AuthDiagnostics = {
    supabaseConnected: false,
    usersTableAccessible: false,
    currentSession: false,
    sessionUserId: null,
    linkedUserProfile: false,
    userProfileId: null,
    errors: []
  };

  log('INFO', 'Running auth diagnostics...');

  // Test 1: Supabase connection
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    diagnostics.supabaseConnected = !error;
    if (error) {
      diagnostics.errors.push(`Supabase connection: ${error.message}`);
    }
  } catch (e) {
    diagnostics.errors.push(`Supabase connection: ${e}`);
  }

  // Test 2: Users table access
  try {
    const { data, error } = await supabase.from('users').select('id, username, auth_user_id').limit(10);
    diagnostics.usersTableAccessible = !error && Array.isArray(data);
    if (error) {
      diagnostics.errors.push(`Users table: ${error.message}`);
    }
  } catch (e) {
    diagnostics.errors.push(`Users table: ${e}`);
  }

  // Test 3: Current session
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    diagnostics.currentSession = !!session;
    diagnostics.sessionUserId = session?.user?.id || null;
    if (error) {
      diagnostics.errors.push(`Session check: ${error.message}`);
    }
  } catch (e) {
    diagnostics.errors.push(`Session check: ${e}`);
  }

  // Test 4: Linked user profile (if session exists)
  if (diagnostics.sessionUserId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .eq('auth_user_id', diagnostics.sessionUserId)
        .single();

      diagnostics.linkedUserProfile = !!data;
      diagnostics.userProfileId = data?.id || null;
      if (error && error.code !== 'PGRST116') {
        diagnostics.errors.push(`Profile lookup: ${error.message}`);
      }
    } catch (e) {
      diagnostics.errors.push(`Profile lookup: ${e}`);
    }
  }

  log('INFO', 'Diagnostics complete:', diagnostics);
  return diagnostics;
}

// ============================================================================
// SETUP STATUS CHECK
// ============================================================================

/**
 * Check if the application needs initial setup
 * Returns detailed status about users and auth linkage
 */
export async function checkSetupStatus(): Promise<SetupStatus> {
  log('INFO', 'Checking setup status...');

  try {
    // Check if users table has data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, email, auth_user_id');

    if (usersError) {
      log('ERROR', 'Failed to query users table:', usersError);
      return {
        needsSetup: true,
        usersTableExists: false,
        usersTableCount: 0,
        usersWithAuthCount: 0,
        message: `Database error: ${usersError.message}. Ensure migrations have been run.`
      };
    }

    const allUsers = users || [];
    const usersWithAuth = allUsers.filter(u => u.auth_user_id);
    const usersWithoutAuth = allUsers.filter(u => !u.auth_user_id);

    log('INFO', `Found ${allUsers.length} users, ${usersWithAuth.length} with auth, ${usersWithoutAuth.length} without`);

    // No users at all - need full setup
    if (allUsers.length === 0) {
      return {
        needsSetup: true,
        usersTableExists: true,
        usersTableCount: 0,
        usersWithAuthCount: 0,
        message: 'No users in database. Initial setup required.',
        details: {
          missingAuthUsers: [],
          existingUsers: []
        }
      };
    }

    // Some users but none have auth - need to link
    if (usersWithAuth.length === 0) {
      return {
        needsSetup: true,
        usersTableExists: true,
        usersTableCount: allUsers.length,
        usersWithAuthCount: 0,
        message: `${allUsers.length} users exist but none have authentication linked.`,
        details: {
          missingAuthUsers: usersWithoutAuth.map(u => u.username),
          existingUsers: allUsers.map(u => u.username)
        }
      };
    }

    // All users have auth - setup complete
    if (usersWithoutAuth.length === 0) {
      return {
        needsSetup: false,
        usersTableExists: true,
        usersTableCount: allUsers.length,
        usersWithAuthCount: usersWithAuth.length,
        message: 'Setup complete. All users have authentication linked.',
        details: {
          missingAuthUsers: [],
          existingUsers: allUsers.map(u => u.username)
        }
      };
    }

    // Some users have auth, some don't - partial setup
    return {
      needsSetup: true,
      usersTableExists: true,
      usersTableCount: allUsers.length,
      usersWithAuthCount: usersWithAuth.length,
      message: `Partial setup: ${usersWithAuth.length}/${allUsers.length} users have authentication.`,
      details: {
        missingAuthUsers: usersWithoutAuth.map(u => u.username),
        existingUsers: allUsers.map(u => u.username)
      }
    };

  } catch (error) {
    log('ERROR', 'Setup check failed:', error);
    return {
      needsSetup: true,
      usersTableExists: false,
      usersTableCount: 0,
      usersWithAuthCount: 0,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================================
// INITIAL SETUP
// ============================================================================

/**
 * Run initial setup - creates auth accounts for EXISTING users in the database
 *
 * CRITICAL: This function reads users FROM THE DATABASE and creates matching
 * Supabase Auth accounts. It does NOT use hardcoded user lists.
 *
 * This ensures the email addresses in Supabase Auth match the emails in the users table.
 *
 * IMPORTANT: This function is designed for first-run setup when NO admin is logged in.
 * It uses a separate Supabase client to avoid session conflicts.
 */
export async function runInitialSetup(password: string = DEFAULT_PASSWORD): Promise<SetupResult> {
  log('INFO', 'Starting initial setup...');

  const result: SetupResult = {
    success: false,
    usersCreated: [],
    usersSkipped: [],
    errors: []
  };

  // Step 1: Get all existing users from the database that need auth accounts
  const { data: existingUsers, error: fetchError } = await supabase
    .from('users')
    .select('id, username, email, display_name, role, department, auth_user_id')
    .eq('is_active', true);

  if (fetchError) {
    log('ERROR', 'Failed to fetch users from database:', fetchError);
    result.errors.push(`Database error: ${fetchError.message}`);
    return result;
  }

  if (!existingUsers || existingUsers.length === 0) {
    log('WARN', 'No users found in database. Creating default admin user...');

    // Create a default admin user if none exist
    const { data: newAdmin, error: createError } = await supabase
      .from('users')
      .insert({
        username: 'admin',
        email: 'admin@company.com',
        display_name: 'Administrator',
        role: 'Admin',
        department: 'Administration',
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      log('ERROR', 'Failed to create default admin:', createError);
      result.errors.push(`Failed to create admin: ${createError.message}`);
      return result;
    }

    existingUsers.push(newAdmin);
  }

  log('INFO', `Found ${existingUsers.length} users in database`);

  // Use a separate client for setup operations
  const adminClient = createAdminClient();

  for (let i = 0; i < existingUsers.length; i++) {
    const user = existingUsers[i];
    log('INFO', `Processing user ${i + 1}/${existingUsers.length}: ${user.username} (${user.email})`);

    try {
      // If user already has auth linked, skip
      if (user.auth_user_id) {
        log('INFO', `${user.username} already has auth linked, skipping`);
        result.usersSkipped.push(user.username);
        continue;
      }

      // Check if user has an email - required for auth
      if (!user.email) {
        log('WARN', `${user.username} has no email address, skipping`);
        result.errors.push(`${user.username}: No email address - cannot create auth account`);
        continue;
      }

      // Create Supabase Auth account using isolated client
      // CRITICAL: Use the email FROM THE DATABASE, not a hardcoded value
      log('INFO', `Creating auth account for: ${user.email}`);

      let authUserId: string | null = null;

      const { data: authData, error: authError } = await adminClient.auth.signUp({
        email: user.email,
        password: password,
        options: {
          data: {
            display_name: user.display_name,
            username: user.username
          }
        }
      });

      if (authError) {
        // Handle "already registered" case - try to sign in to get the ID
        if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
          log('INFO', `Auth account exists for ${user.email}, attempting to retrieve ID...`);

          const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
            email: user.email,
            password: password
          });

          if (signInError) {
            log('ERROR', `Cannot sign in to existing auth account for ${user.username}:`, signInError);
            result.errors.push(`${user.username}: Auth exists but password doesn't match. Use password: ${password}`);
            continue;
          }

          authUserId = signInData.user?.id || null;
          await adminClient.auth.signOut();
        } else if (authError.message.includes('rate limit')) {
          log('WARN', `Rate limited while creating ${user.username}`);
          result.errors.push(`${user.username}: Rate limited. Wait a few minutes and retry.`);
          continue;
        } else {
          log('ERROR', `Auth creation failed for ${user.username}:`, authError);
          result.errors.push(`${user.username}: Auth error - ${authError.message}`);
          continue;
        }
      } else {
        authUserId = authData.user?.id || null;
        // Sign out the newly created user from the admin client
        await adminClient.auth.signOut();
      }

      if (!authUserId) {
        log('ERROR', `No auth user ID obtained for ${user.username}`);
        result.errors.push(`${user.username}: Failed to get auth user ID`);
        continue;
      }

      // Link auth_user_id to users table
      log('INFO', `Linking auth ${authUserId} to user ${user.id}`);
      const { error: linkError } = await supabase
        .from('users')
        .update({ auth_user_id: authUserId })
        .eq('id', user.id);

      if (linkError) {
        log('ERROR', `Failed to link auth for ${user.username}:`, linkError);
        result.errors.push(`${user.username}: Failed to link auth - ${linkError.message}`);
        continue;
      }

      // CRITICAL - Verify the link was actually saved
      const verifiedAuthId = await verifyUserAuthLink(user.id);
      if (verifiedAuthId !== authUserId) {
        log('ERROR', `Auth link verification failed for ${user.username}. Expected ${authUserId}, got ${verifiedAuthId}`);
        result.errors.push(`${user.username}: Auth link verification failed - please check database permissions`);
        continue;
      }

      result.usersCreated.push(user.username);
      log('INFO', `Successfully set up user: ${user.username} (auth verified)`);

      // Delay between operations to avoid rate limiting
      if (i < existingUsers.length - 1) {
        await delay(AUTH_OPERATION_DELAY_MS);
      }

    } catch (error) {
      log('ERROR', `Unexpected error for ${user.username}:`, error);
      result.errors.push(`${user.username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  result.success = result.usersCreated.length > 0 || result.usersSkipped.length === existingUsers.length;

  log('INFO', 'Setup complete:', {
    created: result.usersCreated.length,
    skipped: result.usersSkipped.length,
    errors: result.errors.length
  });

  return result;
}

// ============================================================================
// USER CREATION (ADMIN CONTEXT)
// ============================================================================

/**
 * Create a single user with auth account
 *
 * CRITICAL: This function preserves the calling admin's session.
 * It uses an isolated Supabase client to prevent session hijacking.
 */
export async function createUserWithAuth(
  userData: {
    username: string;
    email: string;
    displayName: string;
    role: UserRole;
    department?: string;
  },
  password: string
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  log('INFO', `Creating user: ${userData.username} (${userData.email})`);

  try {
    // Validation
    if (!userData.username || userData.username.length < 2) {
      return { success: false, error: 'Username must be at least 2 characters' };
    }
    if (!userData.email || !userData.email.includes('@')) {
      return { success: false, error: 'Valid email is required' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Check if username already exists
    const { data: existingUsername, error: usernameError } = await supabase
      .from('users')
      .select('id')
      .ilike('username', userData.username)
      .maybeSingle();

    if (usernameError && usernameError.code !== 'PGRST116') {
      return { success: false, error: `Database error: ${usernameError.message}` };
    }
    if (existingUsername) {
      return { success: false, error: 'Username already exists' };
    }

    // Check if email already exists
    const { data: existingEmail, error: emailError } = await supabase
      .from('users')
      .select('id')
      .ilike('email', userData.email)
      .maybeSingle();

    if (emailError && emailError.code !== 'PGRST116') {
      return { success: false, error: `Database error: ${emailError.message}` };
    }
    if (existingEmail) {
      return { success: false, error: 'Email already in use' };
    }

    // Use isolated client to create auth account (won't affect admin's session)
    const adminClient = createAdminClient();

    log('INFO', 'Creating auth account with isolated client...');
    const { data: authData, error: authError } = await adminClient.auth.signUp({
      email: userData.email,
      password: password,
      options: {
        data: {
          display_name: userData.displayName,
          username: userData.username
        }
      }
    });

    if (authError) {
      log('ERROR', 'Auth creation failed:', authError);
      if (authError.message.includes('already registered')) {
        return { success: false, error: 'An account with this email already exists in authentication system' };
      }
      return { success: false, error: `Auth error: ${authError.message}` };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create auth account - no user returned' };
    }

    // Sign out from the isolated client (cleanup)
    await adminClient.auth.signOut();

    // Create user profile in users table
    log('INFO', 'Creating user profile...');
    const { data: newUser, error: profileError } = await supabase
      .from('users')
      .insert({
        username: userData.username,
        email: userData.email,
        display_name: userData.displayName,
        role: userData.role,
        department: userData.department || null,
        auth_user_id: authData.user.id,
        is_active: true
      })
      .select()
      .single();

    if (profileError) {
      log('ERROR', 'Profile creation failed:', profileError);
      // TODO: Consider cleaning up the orphaned auth account
      return { success: false, error: `Profile error: ${profileError.message}` };
    }

    // CRITICAL: Verify the auth_user_id was properly saved
    // This catches silent failures due to RLS policies or other database issues
    const verifiedAuthId = await verifyUserAuthLink(newUser.id);
    if (verifiedAuthId !== authData.user.id) {
      log('ERROR', `Auth link verification failed. Expected ${authData.user.id}, got ${verifiedAuthId}`);
      // Attempt to fix the link
      const { error: fixError } = await supabase
        .from('users')
        .update({ auth_user_id: authData.user.id })
        .eq('id', newUser.id);

      if (fixError) {
        log('ERROR', 'Failed to fix auth link:', fixError);
        return { success: false, error: 'User created but auth link failed. User may not be able to log in.' };
      }

      // Verify again
      const secondVerify = await verifyUserAuthLink(newUser.id);
      if (secondVerify !== authData.user.id) {
        return { success: false, error: 'Auth link could not be established. Check database permissions.' };
      }
    }

    log('INFO', `Successfully created user: ${userData.username} (auth link verified)`);

    return {
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        password: '', // Never expose
        displayName: newUser.display_name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        isActive: newUser.is_active,
        createdAt: new Date(newUser.created_at)
      }
    };

  } catch (error) {
    log('ERROR', 'Unexpected error in createUserWithAuth:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// PASSWORD MANAGEMENT
// ============================================================================

/**
 * Change password for the currently logged-in user
 */
export async function changeOwnPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  log('INFO', 'Changing password for current user');

  try {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      log('ERROR', 'Password change failed:', error);
      return { success: false, error: error.message };
    }

    log('INFO', 'Password changed successfully');
    return { success: true };
  } catch (error) {
    log('ERROR', 'Unexpected error in changeOwnPassword:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send password reset email to a user
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  log('INFO', `Sending password reset email to: ${email}`);

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      log('ERROR', 'Password reset email failed:', error);
      return { success: false, error: error.message };
    }

    log('INFO', 'Password reset email sent');
    return { success: true };
  } catch (error) {
    log('ERROR', 'Unexpected error in sendPasswordResetEmail:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Get current session info (for debugging)
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Verify the current session is valid and linked to a user profile
 */
export async function verifySession(): Promise<{
  valid: boolean;
  authUserId?: string;
  userProfileId?: string;
  username?: string;
  error?: string;
}> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      return { valid: false, error: sessionError.message };
    }

    if (!session) {
      return { valid: false, error: 'No active session' };
    }

    // Look up user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, username')
      .eq('auth_user_id', session.user.id)
      .single();

    if (profileError) {
      return {
        valid: false,
        authUserId: session.user.id,
        error: 'User profile not found for this auth account'
      };
    }

    return {
      valid: true,
      authUserId: session.user.id,
      userProfileId: profile.id,
      username: profile.username
    };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// BATCH REPAIR UTILITIES
// ============================================================================

/**
 * Find all users who are missing auth_user_id links
 * These users won't be able to log in from any terminal
 */
export async function findUsersWithMissingAuthLink(): Promise<Array<{ id: string; username: string; email: string }>> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email')
    .is('auth_user_id', null);

  if (error) {
    log('ERROR', 'Failed to find users with missing auth:', error);
    return [];
  }

  return data || [];
}

/**
 * Attempt to create auth accounts and link them for users missing auth_user_id
 * This is useful for repairing existing databases where setup partially failed
 */
export async function repairAllMissingAuthLinks(
  password: string = DEFAULT_PASSWORD
): Promise<{ repaired: string[]; failed: string[]; errors: string[] }> {
  log('INFO', 'Starting batch repair of missing auth links...');

  const result = {
    repaired: [] as string[],
    failed: [] as string[],
    errors: [] as string[]
  };

  const usersWithMissingAuth = await findUsersWithMissingAuthLink();

  if (usersWithMissingAuth.length === 0) {
    log('INFO', 'No users with missing auth links found');
    return result;
  }

  log('INFO', `Found ${usersWithMissingAuth.length} users with missing auth links`);

  const adminClient = createAdminClient();

  for (const user of usersWithMissingAuth) {
    log('INFO', `Processing: ${user.username} (${user.email})`);

    if (!user.email) {
      result.failed.push(user.username);
      result.errors.push(`${user.username}: No email address - cannot create auth account`);
      continue;
    }

    try {
      // First, try to see if an auth account already exists by signing in
      let authUserId: string | null = null;

      const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
        email: user.email,
        password: password
      });

      if (!signInError && signInData.user) {
        // Auth account exists - just need to link it
        log('INFO', `Found existing auth account for ${user.username}`);
        authUserId = signInData.user.id;
        await adminClient.auth.signOut();
      } else {
        // Need to create new auth account
        log('INFO', `Creating new auth account for ${user.username}`);

        const { data: signUpData, error: signUpError } = await adminClient.auth.signUp({
          email: user.email,
          password: password,
          options: {
            data: {
              username: user.username
            }
          }
        });

        if (signUpError) {
          // Check if it's "already registered" error - try different password handling
          if (signUpError.message.includes('already registered')) {
            result.failed.push(user.username);
            result.errors.push(`${user.username}: Auth account exists but password doesn't match`);
            continue;
          }

          result.failed.push(user.username);
          result.errors.push(`${user.username}: ${signUpError.message}`);
          continue;
        }

        authUserId = signUpData.user?.id || null;
        await adminClient.auth.signOut();
      }

      if (!authUserId) {
        result.failed.push(user.username);
        result.errors.push(`${user.username}: Could not obtain auth user ID`);
        continue;
      }

      // Link the auth_user_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_user_id: authUserId })
        .eq('id', user.id);

      if (updateError) {
        result.failed.push(user.username);
        result.errors.push(`${user.username}: Failed to update database - ${updateError.message}`);
        continue;
      }

      // Verify
      const verified = await verifyUserAuthLink(user.id);
      if (verified !== authUserId) {
        result.failed.push(user.username);
        result.errors.push(`${user.username}: Link verification failed`);
        continue;
      }

      result.repaired.push(user.username);
      log('INFO', `Successfully repaired: ${user.username}`);

      // Delay to avoid rate limiting
      await delay(AUTH_OPERATION_DELAY_MS);

    } catch (error) {
      result.failed.push(user.username);
      result.errors.push(`${user.username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  log('INFO', 'Batch repair complete:', {
    repaired: result.repaired.length,
    failed: result.failed.length
  });

  return result;
}

// ============================================================================
// EXPORTS - HELPERS
// ============================================================================

export function getDefaultPassword(): string {
  return DEFAULT_PASSWORD;
}

/**
 * Get the default users that are seeded in the database
 * These match the SQL migration seed data
 */
export function getDefaultUsers() {
  return [
    { username: 'admin', displayName: 'Administrator', role: 'Admin' as UserRole, department: 'Administration' },
    { username: 'manager', displayName: 'Manager User', role: 'Manager' as UserRole, department: 'Administration' },
    { username: 'sales', displayName: 'Sales User', role: 'Sales' as UserRole, department: 'Sales' },
    { username: 'production', displayName: 'Production User', role: 'Production' as UserRole, department: 'Production' },
    { username: 'fulfillment', displayName: 'Fulfillment User', role: 'Fulfillment' as UserRole, department: 'Fulfillment' },
    { username: 'readonly', displayName: 'ReadOnly User', role: 'ReadOnly' as UserRole, department: 'Administration' },
  ];
}

/**
 * Get users from database that need auth setup
 */
export async function getUsersNeedingAuthSetup(): Promise<Array<{
  id: string;
  username: string;
  email: string;
  displayName: string;
  hasAuth: boolean;
}>> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, display_name, auth_user_id')
    .eq('is_active', true);

  if (error || !data) {
    log('ERROR', 'Failed to fetch users needing setup:', error);
    return [];
  }

  return data.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email || '',
    displayName: u.display_name,
    hasAuth: !!u.auth_user_id
  }));
}

/**
 * Validate that the Supabase environment is properly configured
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!import.meta.env.VITE_SUPABASE_URL) {
    errors.push('VITE_SUPABASE_URL is not set');
  }
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    errors.push('VITE_SUPABASE_ANON_KEY is not set');
  }

  return { valid: errors.length === 0, errors };
}
