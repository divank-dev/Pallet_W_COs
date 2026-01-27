import { supabase } from './supabase';
import type { Database } from './database.types';
import type { User, UserRole } from '../../types';

// Database row type
type DbUser = Database['public']['Tables']['users']['Row'];
type DbUserInsert = Database['public']['Tables']['users']['Insert'];
type DbUserUpdate = Database['public']['Tables']['users']['Update'];

/**
 * Convert database user row to app User type
 */
export function dbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    username: dbUser.username,
    password: '', // Password is managed by Supabase Auth, not stored in users table
    displayName: dbUser.display_name,
    email: dbUser.email ?? undefined,
    role: dbUser.role as UserRole,
    department: dbUser.department ?? undefined,
    reportsTo: dbUser.reports_to ?? undefined,
    isActive: dbUser.is_active,
    createdAt: new Date(dbUser.created_at),
    lastLoginAt: dbUser.last_login_at ? new Date(dbUser.last_login_at) : undefined
  };
}

/**
 * Convert app User type to database insert format
 */
export function userToDbInsert(user: Omit<User, 'id' | 'createdAt' | 'password'>, authUserId?: string): DbUserInsert {
  return {
    auth_user_id: authUserId ?? null,
    username: user.username,
    display_name: user.displayName,
    email: user.email ?? null,
    role: user.role,
    department: user.department ?? null,
    reports_to: user.reportsTo ?? null,
    is_active: user.isActive
  };
}

/**
 * Convert partial User updates to database update format
 */
export function userToDbUpdate(updates: Partial<User>): DbUserUpdate {
  const dbUpdate: DbUserUpdate = {};

  if (updates.username !== undefined) dbUpdate.username = updates.username;
  if (updates.displayName !== undefined) dbUpdate.display_name = updates.displayName;
  if (updates.email !== undefined) dbUpdate.email = updates.email ?? null;
  if (updates.role !== undefined) dbUpdate.role = updates.role;
  if (updates.department !== undefined) dbUpdate.department = updates.department ?? null;
  if (updates.reportsTo !== undefined) dbUpdate.reports_to = updates.reportsTo ?? null;
  if (updates.isActive !== undefined) dbUpdate.is_active = updates.isActive;
  if (updates.lastLoginAt !== undefined) dbUpdate.last_login_at = updates.lastLoginAt?.toISOString() ?? null;

  return dbUpdate;
}

/**
 * Fetch all users from Supabase
 */
export async function fetchAllUsers(): Promise<User[]> {
  console.log('[UserService] fetchAllUsers called');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('display_name');

  console.log('[UserService] fetchAllUsers result - count:', data?.length ?? 0, 'error:', error);

  if (error) throw error;
  return (data ?? []).map(dbUserToUser);
}

/**
 * Fetch a user by their Supabase Auth user ID
 */
export async function fetchUserByAuthId(authUserId: string): Promise<User | null> {
  console.log('[UserService] fetchUserByAuthId:', authUserId);
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  console.log('[UserService] AuthId lookup result - data:', data, 'error:', error);

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('[UserService] No user found with auth_user_id:', authUserId);
      return null;
    }
    console.error('[UserService] Query error:', error);
    throw error;
  }
  return data ? dbUserToUser(data) : null;
}

/**
 * Fetch a user by their username
 */
export async function fetchUserByUsername(username: string): Promise<User | null> {
  console.log('[UserService] fetchUserByUsername:', username);
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', username)
    .single();

  console.log('[UserService] Query result - data:', data, 'error:', error);

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('[UserService] No user found with username:', username);
      return null;
    }
    console.error('[UserService] Query error:', error);
    throw error;
  }
  return data ? dbUserToUser(data) : null;
}

/**
 * Fetch a user by their email
 */
export async function fetchUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw error;
  }
  return data ? dbUserToUser(data) : null;
}

/**
 * Fetch a user by their ID
 */
export async function fetchUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw error;
  }
  return data ? dbUserToUser(data) : null;
}

/**
 * Create a new user in the database
 * Note: This should be called AFTER creating the Supabase Auth account
 */
export async function createUser(
  userData: Omit<User, 'id' | 'createdAt' | 'password'>,
  authUserId?: string
): Promise<User> {
  const dbInsert = userToDbInsert(userData, authUserId);

  const { data, error } = await supabase
    .from('users')
    .insert(dbInsert)
    .select()
    .single();

  if (error) throw error;
  return dbUserToUser(data);
}

/**
 * Update an existing user
 */
export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
  const dbUpdate = userToDbUpdate(updates);

  const { data, error } = await supabase
    .from('users')
    .update(dbUpdate)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return dbUserToUser(data);
}

/**
 * Soft delete a user (set is_active = false)
 */
export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Permanently delete a user from the database
 */
export async function permanentlyDeleteUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Update the last login timestamp for a user
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Get users by role
 */
export async function fetchUsersByRole(role: UserRole): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role)
    .eq('is_active', true)
    .order('display_name');

  if (error) throw error;
  return (data ?? []).map(dbUserToUser);
}

/**
 * Get users by department
 */
export async function fetchUsersByDepartment(department: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('department', department)
    .eq('is_active', true)
    .order('display_name');

  if (error) throw error;
  return (data ?? []).map(dbUserToUser);
}

/**
 * Get all unique departments from users
 */
export async function fetchDepartments(): Promise<string[]> {
  const { data, error } = await supabase
    .from('users')
    .select('department')
    .not('department', 'is', null)
    .eq('is_active', true);

  if (error) throw error;

  const departments = new Set<string>();
  data?.forEach(row => {
    if (row.department) departments.add(row.department);
  });
  return Array.from(departments).sort();
}

/**
 * Link a user profile to a Supabase Auth account
 */
export async function linkUserToAuth(userId: string, authUserId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ auth_user_id: authUserId })
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Check if a username is available
 */
export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  let query = supabase
    .from('users')
    .select('id')
    .ilike('username', username);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data?.length ?? 0) === 0;
}

/**
 * Check if an email is available
 */
export async function isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
  let query = supabase
    .from('users')
    .select('id')
    .ilike('email', email);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data?.length ?? 0) === 0;
}
