import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
import { User, UserRole, OrgHierarchy } from '../types';
import { Permissions, getPermissions } from '../utils/permissions';
import { supabase } from '../src/lib/supabase';
import {
  fetchAllUsers,
  fetchUserByAuthId,
  fetchUserByUsername,
  fetchUserByEmail,
  updateUser as updateUserInDb,
  deleteUser as deleteUserInDb,
  permanentlyDeleteUser as permanentlyDeleteUserInDb,
  updateLastLogin,
  fetchDepartments,
  isUsernameAvailable,
  isEmailAvailable
} from '../src/lib/userService';
import { createUserWithAuth } from '../src/lib/authService';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  // Auth state
  isAuthenticated: boolean;
  currentUser: User | null;
  loginError: string | null;
  isLoading: boolean;

  // Permissions
  permissions: Permissions;

  // Auth actions (now async)
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;

  // User management (async)
  orgHierarchy: OrgHierarchy;
  refreshOrgHierarchy: () => Promise<void>;
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'password'>, password: string) => Promise<User>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  permanentlyDeleteUser: (userId: string) => Promise<boolean>;
  importUsersFromCSV: (csvContent: string) => Promise<{ success: number; errors: string[] }>;

  // Helpers
  getUserById: (userId: string) => User | undefined;
  getUsersByRole: (role: UserRole) => User[];
  getUsersByDepartment: (department: string) => User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default empty org hierarchy
const EMPTY_ORG: OrgHierarchy = {
  users: [],
  departments: [],
  lastUpdatedAt: new Date()
};

// Storage key used by Supabase for session persistence
const SUPABASE_STORAGE_KEY = 'pallet-auth-session';

/**
 * Check if a cached session token is expired or invalid
 * This runs BEFORE Supabase tries to use the token, preventing hangs
 */
function clearStaleSessionData(): void {
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!stored) return;

    const parsed = JSON.parse(stored);
    const expiresAt = parsed?.expires_at;

    if (expiresAt) {
      // expires_at is in seconds since epoch
      const expiryTime = expiresAt * 1000;
      const now = Date.now();
      // If token expired more than 1 hour ago, clear it immediately
      // This prevents Supabase from trying to refresh very stale tokens
      if (now > expiryTime + (60 * 60 * 1000)) {
        console.log('[AuthContext] Clearing expired session data from localStorage');
        localStorage.removeItem(SUPABASE_STORAGE_KEY);
      }
    }
  } catch (e) {
    // If we can't parse the stored data, it's corrupted - clear it
    console.log('[AuthContext] Clearing corrupted session data from localStorage');
    localStorage.removeItem(SUPABASE_STORAGE_KEY);
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Clear stale/corrupted session data BEFORE any Supabase operations
  // This prevents Chrome from hanging on bad cached tokens
  useState(() => {
    clearStaleSessionData();
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orgHierarchy, setOrgHierarchy] = useState<OrgHierarchy>(EMPTY_ORG);

  // Use ref for currentUser ID to avoid dependency cycle in refreshOrgHierarchy
  const currentUserIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    currentUserIdRef.current = currentUser?.id;
  }, [currentUser?.id]);

  // Fetch org hierarchy (users and departments) from Supabase
  // Uses ref for currentUser.id to keep this callback stable
  const refreshOrgHierarchy = useCallback(async () => {
    try {
      const [users, departments] = await Promise.all([
        fetchAllUsers(),
        fetchDepartments()
      ]);

      setOrgHierarchy({
        users,
        departments,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: currentUserIdRef.current
      });
    } catch (error) {
      console.error('Failed to fetch org hierarchy:', error);
    }
  }, []);

  // Track the last processed auth user ID to prevent duplicate processing
  const lastProcessedAuthIdRef = useRef<string | null>(null);

  // Flag to suppress SIGNED_OUT events during login cleanup (prevents loading state flicker)
  const loginInProgressRef = useRef(false);

  // Pending auth session — set by onAuthStateChange, processed by a decoupled effect.
  // This separation is CRITICAL: Supabase's onAuthStateChange callback fires while the client
  // may still be holding internal locks (e.g., during token refresh on page reload). Making
  // database queries inside the callback causes them to hang in Chrome. By storing the session
  // in React state and processing it in a useEffect, we give the Supabase client time to
  // complete its internal operations before we make any database calls.
  const [pendingAuthSession, setPendingAuthSession] = useState<Session | null>(null);

  // Handle auth state changes from Supabase (synchronous — no database queries here)
  const handleAuthStateChange = useCallback((event: AuthChangeEvent, session: Session | null) => {
    console.log('[AuthContext] Auth state changed:', event, session?.user?.id);

    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
      // Skip if we already processed this exact auth user
      if (lastProcessedAuthIdRef.current === session.user.id) {
        console.log('[AuthContext] Already processed auth for user:', session.user.id, '- skipping duplicate');
        setIsLoading(false);
        return;
      }
      // Store session for processing in the effect (decoupled from callback)
      setPendingAuthSession(session);
    } else if (event === 'SIGNED_OUT') {
      lastProcessedAuthIdRef.current = null;
      if (!loginInProgressRef.current) {
        setPendingAuthSession(null);
        setCurrentUser(null);
        setIsAuthenticated(false);
        setLoginError(null);
        setIsLoading(false);
      }
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('[AuthContext] Token refreshed for session');
    }

    // For events with no user (null session), stop loading immediately
    if (!session?.user && event !== 'TOKEN_REFRESHED') {
      setIsLoading(false);
    }
  }, []);

  // Process pending auth session — decoupled from onAuthStateChange to avoid Supabase client lock
  useEffect(() => {
    if (!pendingAuthSession) return;

    const session = pendingAuthSession;
    setPendingAuthSession(null);

    const processAuthSession = async () => {
      const userId = session.user!.id;
      lastProcessedAuthIdRef.current = userId;

      try {
        // Brief delay to let Supabase client finish internal token operations
        await new Promise(resolve => setTimeout(resolve, 50));

        // Fetch user profile from our users table using auth_user_id
        console.log('[AuthContext] Looking up user profile by auth_user_id:', userId);
        let userProfile = await fetchUserByAuthId(userId);

        // If no profile found by auth_user_id, try looking up by email as a fallback
        if (!userProfile && session.user!.email) {
          console.log('[AuthContext] No profile found by auth_user_id, trying email lookup:', session.user!.email);
          userProfile = await fetchUserByEmail(session.user!.email);

          if (userProfile) {
            console.log('[AuthContext] Found user by email, auth_user_id link missing - repairing');
            const { error: linkError } = await supabase
              .from('users')
              .update({ auth_user_id: userId })
              .eq('id', userProfile.id);

            if (linkError) {
              console.error('[AuthContext] Failed to repair auth link:', linkError);
            } else {
              console.log('[AuthContext] Repaired auth_user_id link for:', userProfile.username);
            }
          }
        }

        if (userProfile) {
          if (!userProfile.isActive) {
            console.log('[AuthContext] User account is deactivated:', userProfile.username);
            lastProcessedAuthIdRef.current = null;
            await supabase.auth.signOut();
            setLoginError('This account has been deactivated');
            setCurrentUser(null);
            setIsAuthenticated(false);
          } else {
            await updateLastLogin(userProfile.id);
            setCurrentUser({ ...userProfile, lastLoginAt: new Date() });
            setIsAuthenticated(true);
            setLoginError(null);
            console.log('[AuthContext] Login successful for user:', userProfile.username);
            await refreshOrgHierarchy();
          }
        } else {
          console.error('[AuthContext] CRITICAL: No user profile found!');
          console.error('[AuthContext] Auth user ID:', userId);
          console.error('[AuthContext] Auth email:', session.user!.email);
          setLoginError('User profile not found. Please contact your administrator.');
          lastProcessedAuthIdRef.current = null;
          await supabase.auth.signOut();
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('[AuthContext] Error fetching user profile:', error);
        lastProcessedAuthIdRef.current = null;
        setLoginError('Failed to load user profile');
        setCurrentUser(null);
        setIsAuthenticated(false);
      }

      setIsLoading(false);
    };

    processAuthSession();
  }, [pendingAuthSession, refreshOrgHierarchy]);

  // Ref to always call the latest handleAuthStateChange without re-subscribing
  const handleAuthStateChangeRef = useRef(handleAuthStateChange);
  useEffect(() => {
    handleAuthStateChangeRef.current = handleAuthStateChange;
  }, [handleAuthStateChange]);

  // Initialize auth: subscribe to Supabase auth state changes (runs once on mount)
  // INITIAL_SESSION fires automatically with the cached session (or null if none).
  // Session validation for INITIAL_SESSION is handled inside handleAuthStateChange.
  // This eliminates the race condition between initAuth and onAuthStateChange that
  // caused Chrome to hang on the load screen.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => handleAuthStateChangeRef.current(event, session)
    );

    // Safety fallback: if no auth event fires within 8 seconds, stop loading.
    // This prevents the app from being stuck on the spinner forever.
    const safetyTimeout = setTimeout(() => {
      setIsLoading((current) => {
        if (current) {
          console.warn('[AuthContext] Safety timeout: no auth event received in 8s, stopping loader');
        }
        return false;
      });
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Note: org hierarchy is loaded inside handleAuthStateChange after login.
  // No separate effect needed — this prevents duplicate fetches.

  /**
   * Login with username and password
   * Since Supabase Auth requires email, we first look up the email by username
   */
  const login = async (username: string, password: string): Promise<boolean> => {
    setLoginError(null);
    setIsLoading(true);

    console.log('[Auth] Login attempt for username:', username);

    try {
      // Clear any existing stale session before attempting fresh login
      // This fixes the multi-computer login issue where old cached sessions interfere
      // Use a short timeout to prevent hanging on stale sessions
      console.log('[Auth] Clearing any existing session before fresh login...');
      loginInProgressRef.current = true;
      try {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise((resolve) => setTimeout(resolve, 2000)) // 2 second timeout
        ]);
      } catch {
        // Ignore signOut errors - we're just clearing stale data
      }
      loginInProgressRef.current = false;

      // Step 1: Find user by username to get their email
      console.log('[Auth] Step 1: Looking up user by username...');
      const userByUsername = await fetchUserByUsername(username);
      console.log('[Auth] Username lookup result:', userByUsername ? `Found: ${userByUsername.email}` : 'Not found');

      let email: string;

      if (userByUsername && userByUsername.email) {
        email = userByUsername.email;
      } else {
        // Try treating the input as an email directly
        console.log('[Auth] Trying input as email...');
        const userByEmail = await fetchUserByEmail(username);
        console.log('[Auth] Email lookup result:', userByEmail ? `Found: ${userByEmail.email}` : 'Not found');
        if (userByEmail && userByEmail.email) {
          email = userByEmail.email;
        } else {
          console.log('[Auth] FAILED: User not found in users table');
          setLoginError('Invalid username or password');
          setIsLoading(false);
          return false;
        }
      }

      // Step 2: Authenticate with Supabase using email + password
      console.log('[Auth] Step 2: Authenticating with Supabase Auth using email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.log('[Auth] FAILED: Supabase Auth error:', error.message);
        // Map Supabase auth errors to user-friendly messages
        if (error.message.includes('Invalid login credentials')) {
          setLoginError('Invalid username or password');
        } else if (error.message.includes('Email not confirmed')) {
          setLoginError('Please verify your email address');
        } else {
          setLoginError(error.message);
        }
        setIsLoading(false);
        return false;
      }

      console.log('[Auth] SUCCESS: Supabase Auth login successful, user ID:', data.user?.id);
      // Success - the onAuthStateChange handler will update the state
      return true;
    } catch (error) {
      console.error('[Auth] EXCEPTION:', error);
      setLoginError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
      return false;
    }
  };

  /**
   * Logout the current user
   */
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setLoginError(null);
      setIsLoading(false);
    }
  };

  /**
   * Add a new user (creates Supabase Auth account + users table entry)
   */
  const addUser = async (userData: Omit<User, 'id' | 'createdAt' | 'password'>, password: string): Promise<User> => {
    if (!userData.email) {
      throw new Error('Email is required to create a user');
    }

    // Use the auth service to create user with auth
    const result = await createUserWithAuth(
      {
        username: userData.username,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        department: userData.department
      },
      password
    );

    if (!result.success || !result.user) {
      throw new Error(result.error || 'Failed to create user');
    }

    // Refresh org hierarchy to include new user
    await refreshOrgHierarchy();

    return result.user;
  };

  /**
   * Update an existing user
   */
  const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
    // Validate username uniqueness if being changed
    if (updates.username) {
      const usernameAvailable = await isUsernameAvailable(updates.username, userId);
      if (!usernameAvailable) {
        throw new Error('Username is already taken');
      }
    }

    // Validate email uniqueness if being changed
    if (updates.email) {
      const emailAvailable = await isEmailAvailable(updates.email, userId);
      if (!emailAvailable) {
        throw new Error('Email is already in use');
      }
    }

    const updatedUser = await updateUserInDb(userId, updates);

    // Update current user if they updated themselves
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }

    // Refresh org hierarchy
    await refreshOrgHierarchy();
  };

  /**
   * Soft delete a user (deactivate)
   */
  const deleteUser = async (userId: string): Promise<void> => {
    // Don't allow deleting the last admin
    const admins = orgHierarchy.users.filter(u => u.role === 'Admin' && u.isActive);
    const userToDelete = orgHierarchy.users.find(u => u.id === userId);

    if (userToDelete?.role === 'Admin' && admins.length <= 1) {
      throw new Error('Cannot delete the last admin user');
    }

    await deleteUserInDb(userId);

    // Refresh org hierarchy
    await refreshOrgHierarchy();
  };

  /**
   * Permanently delete a user
   */
  const permanentlyDeleteUser = async (userId: string): Promise<boolean> => {
    const userToDelete = orgHierarchy.users.find(u => u.id === userId);

    // Only allow permanent deletion of inactive users
    if (!userToDelete || userToDelete.isActive) {
      console.error('Can only permanently delete inactive users');
      return false;
    }

    // Don't allow deleting yourself
    if (userId === currentUser?.id) {
      console.error('Cannot delete your own account');
      return false;
    }

    try {
      await permanentlyDeleteUserInDb(userId);
      await refreshOrgHierarchy();
      return true;
    } catch (error) {
      console.error('Failed to permanently delete user:', error);
      return false;
    }
  };

  /**
   * Import users from CSV
   */
  const importUsersFromCSV = async (csvContent: string): Promise<{ success: number; errors: string[] }> => {
    const lines = csvContent.trim().split('\n');
    const errors: string[] = [];
    let success = 0;

    // Expected format: username,password,displayName,email,role,department,reportsTo
    if (lines.length < 2) {
      return { success: 0, errors: ['CSV file must have a header row and at least one data row'] };
    }

    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const requiredFields = ['username', 'password', 'displayname', 'email', 'role'];
    const missingFields = requiredFields.filter(f => !header.includes(f));

    if (missingFields.length > 0) {
      return { success: 0, errors: [`Missing required columns: ${missingFields.join(', ')}`] };
    }

    const validRoles: UserRole[] = ['Admin', 'Manager', 'Sales', 'Production', 'Fulfillment', 'ReadOnly'];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());

      if (values.length < header.length) {
        errors.push(`Row ${i + 1}: Not enough columns`);
        continue;
      }

      const getValue = (field: string) => {
        const idx = header.indexOf(field.toLowerCase());
        return idx >= 0 ? values[idx] : '';
      };

      const username = getValue('username');
      const password = getValue('password');
      const displayName = getValue('displayname');
      const email = getValue('email');
      const role = getValue('role') as UserRole;
      const department = getValue('department');
      const reportsTo = getValue('reportsto');

      // Validate
      if (!username || !password || !displayName || !email) {
        errors.push(`Row ${i + 1}: Missing required fields (username, password, displayName, email)`);
        continue;
      }

      if (!validRoles.includes(role)) {
        errors.push(`Row ${i + 1}: Invalid role "${role}". Must be one of: ${validRoles.join(', ')}`);
        continue;
      }

      try {
        await addUser(
          {
            username,
            displayName,
            email,
            role,
            department: department || undefined,
            reportsTo: reportsTo || undefined,
            isActive: true
          },
          password
        );
        success++;
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Refresh org hierarchy after import
    await refreshOrgHierarchy();

    return { success, errors };
  };

  /**
   * Get a user by ID from the cached org hierarchy
   */
  const getUserById = (userId: string): User | undefined => {
    return orgHierarchy.users.find(u => u.id === userId);
  };

  /**
   * Get users by role from the cached org hierarchy
   */
  const getUsersByRole = (role: UserRole): User[] => {
    return orgHierarchy.users.filter(u => u.role === role && u.isActive);
  };

  /**
   * Get users by department from the cached org hierarchy
   */
  const getUsersByDepartment = (department: string): User[] => {
    return orgHierarchy.users.filter(u => u.department === department && u.isActive);
  };

  // Calculate permissions based on current user
  const permissions = useMemo(() => getPermissions(currentUser), [currentUser]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      currentUser,
      loginError,
      isLoading,
      permissions,
      login,
      logout,
      orgHierarchy,
      refreshOrgHierarchy,
      addUser,
      updateUser,
      deleteUser,
      permanentlyDeleteUser,
      importUsersFromCSV,
      getUserById,
      getUsersByRole,
      getUsersByDepartment
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
